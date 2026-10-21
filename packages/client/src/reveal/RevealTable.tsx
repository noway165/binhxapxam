import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';
import {
  catName,
  chiValue,
  compareHands,
  evaluate,
  specialName,
  type Arrangement,
  type GameDetail,
  type GameResultPayload,
  type HandValue,
} from '@binh/rules';
import PlayingCard from '../cards/PlayingCard';
import { play } from '../sound';
import { avatarColor, initials } from '../table/avatar';

const STEP_MS = 1500;
const BANNER_MS = 2500;
/** Rows top to bottom, like the arrange tray; `n` is the step at which each chi flips. */
const ROWS = [
  { key: 'chi3', n: 3, title: 'Chi 3' },
  { key: 'chi2', n: 2, title: 'Chi 2' },
  { key: 'chi1', n: 1, title: 'Chi 1' },
] as const;

interface Props {
  result: GameResultPayload | GameDetail;
  animate: boolean;
  myUserId?: string;
}

interface Shown {
  userId: string;
  username: string;
  arrangement: Arrangement;
  hands: HandValue[];
  foul: boolean;
  special: GameDetail['players'][number]['special'];
  autoArranged: boolean;
  score: number;
  roomScore?: number;
}

function normalize(result: Props['result']): Shown[] {
  return result.players.map((p) => ({
    ...p,
    // Saved games (GameDetail) do not carry evaluated hands.
    hands: 'hands' in p ? p.hands : [evaluate(p.arrangement.chi1), evaluate(p.arrangement.chi2), evaluate(p.arrangement.chi3)],
  }));
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Points each player collected against me on chi `i` (0-based): userId → points. */
function gainsOnChi(result: Props['result'], players: Shown[], me: string | undefined, i: number): Map<string, number> {
  const gains = new Map<string, number>();
  if (!me) return gains;
  const hands = new Map(players.map((p) => [p.userId, p.hands]));
  for (const x of result.pairs) {
    if (!x.chi || (x.a !== me && x.b !== me) || x.chi[i] === 0) continue;
    const winner = x.chi[i] > 0 ? x.a : x.b;
    const pts = chiValue((i + 1) as 1 | 2 | 3, hands.get(winner)![i]);
    gains.set(winner, (gains.get(winner) ?? 0) + pts);
  }
  return gains;
}

function bannerFor(result: Props['result'], players: Shown[], me: string | undefined): { text: string; sound: 'fanfare' | 'win' | null } | null {
  const special = players.find((p) => p.userId === me && p.special) ?? players.find((p) => p.special);
  if (special?.special) return { text: `THẮNG TRẮNG — ${specialName(special.special)}`, sound: 'fanfare' };
  if (players.some((p) => p.userId === me && p.foul)) return { text: 'BINH LỦNG', sound: null };
  const sap = result.pairs.find((x) => x.sapHam && (x.a === me || x.b === me));
  if (sap) {
    const iWon = (sap.a === me) === sap.net > 0;
    return { text: 'SẬP HẦM', sound: iWon ? 'win' : null };
  }
  return null;
}

function CountUp({ value, run }: { value: number; run: boolean }) {
  const [shown, setShown] = useState(run ? 0 : value);
  useEffect(() => {
    if (!run) return setShown(value);
    const c = animate(0, value, { duration: 0.8, onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [value, run]);
  return <>{signed(shown)}</>;
}

export default function RevealTable({ result, animate: animated, myUserId }: Props) {
  const [step, setStep] = useState(animated ? 0 : 3);
  useEffect(() => {
    if (!animated) return;
    const timers = [1, 2, 3].map((n) => setTimeout(() => setStep((s) => Math.max(s, n)), n * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [animated]);

  const players = normalize(result);
  // Me last, so on a phone my hand sits at the bottom like on the table.
  const ordered = [...players.filter((p) => p.userId !== myUserId), ...players.filter((p) => p.userId === myUserId)];
  const names = new Map(players.map((p) => [p.userId, p.username]));
  const contenders = players.filter((p) => !p.foul && !p.special);
  const isBest = (p: Shown, i: number) =>
    contenders.includes(p) && contenders.length > 1 && contenders.every((q) => compareHands(p.hands[i], q.hands[i]) >= 0);
  const gains = step >= 1 && step <= 3 ? gainsOnChi(result, players, myUserId, step - 1) : new Map<string, number>();
  const banner = step >= 3 ? bannerFor(result, players, myUserId) : null;
  const [bannerGone, setBannerGone] = useState(false);
  useEffect(() => {
    if (!animated || step < 3) return;
    const t = setTimeout(() => setBannerGone(true), BANNER_MS);
    return () => clearTimeout(t);
  }, [animated, step]);

  useEffect(() => {
    if (!animated || step === 0) return;
    play('flip');
    const mine = myUserId ? gainsOnChi(result, players, myUserId, step - 1).get(myUserId) : undefined;
    if (mine) play('win');
    if (step === 3) {
      const b = bannerFor(result, players, myUserId);
      if (b?.sound) setTimeout(() => play(b.sound!), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, animated]);

  return (
    <section className="reveal">
      <div className="reveal-felt">
        <div className="reveal-players">
          {ordered.map((p) => (
            <div key={p.userId} className={p.userId === myUserId ? 'reveal-player me' : 'reveal-player'}>
              <div className="reveal-name">
                <span className="avatar mini" style={{ background: avatarColor(p.username) }}>
                  {initials(p.username)}
                </span>
                {p.username}
                {p.special && <span className="badge">{specialName(p.special)}</span>}
                {p.foul && <span className="badge red">Binh lủng</span>}
                {p.autoArranged && <span className="badge gray">Máy xếp</span>}
                <AnimatePresence>
                  {gains.get(p.userId) && (
                    <motion.span
                      key={`${step}-${p.userId}`}
                      className="float-gain"
                      initial={{ y: 0, opacity: 1 }}
                      animate={{ y: -26, opacity: 0 }}
                      transition={{ duration: 1.3 }}
                    >
                      +{gains.get(p.userId)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {ROWS.map(({ key, n, title }) => {
                const shown = step >= n;
                const best = shown && isBest(p, n - 1);
                return (
                  <div key={key} data-testid={`row-${p.userId}-chi${n}`} className={best ? 'reveal-row best' : 'reveal-row'}>
                    <span className="chi-label">
                      {title}
                      {shown && ` · ${catName(p.hands[n - 1].cat)}`}
                    </span>
                    <div className="cards">
                      {p.arrangement[key].map((c, i) =>
                        shown ? (
                          <motion.div
                            key={`up-${i}`}
                            initial={animated ? { rotateY: 90 } : false}
                            animate={{ rotateY: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}
                          >
                            <PlayingCard card={c} size="sm" tabIndex={-1} />
                          </motion.div>
                        ) : (
                          <PlayingCard key={`down-${i}`} card={c} faceDown size="sm" />
                        ),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <AnimatePresence>
          {banner && !(animated && bannerGone) && (
            <motion.div
              className={animated ? 'reveal-banner' : 'reveal-banner static'}
              initial={animated ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {banner.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {animated && step < 3 && (
        <button className="skip" onClick={() => setStep(3)}>
          Bỏ qua
        </button>
      )}

      {step >= 3 && (
        <div className="card-panel summary">
          <h3>Tổng kết</h3>
          <ul className="players">
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <li key={p.userId} className={p.userId === myUserId ? 'me' : ''}>
                  <span>{p.username}</span>
                  <span>
                    <b className={p.score >= 0 ? 'plus' : 'minus'}>
                      <CountUp value={p.score} run={animated} />
                    </b>
                    {p.roomScore !== undefined && <span className="muted"> · cả phòng {signed(p.roomScore)}</span>}
                  </span>
                </li>
              ))}
          </ul>
          <ul className="pairs">
            {result.pairs.map((x) => (
              <li key={`${x.a}-${x.b}`}>
                {names.get(x.a)} – {names.get(x.b)}: <b>{signed(x.net)}</b>
                {x.sapHam && <span className="badge">Sập hầm</span>}
                {x.chi === null && x.net !== 0 && <span className="muted"> (trắng/lủng)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
