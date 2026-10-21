import { useEffect, useState } from 'react';
import {
  catName,
  compareHands,
  evaluate,
  specialName,
  type Arrangement,
  type GameDetail,
  type GameResultPayload,
  type HandValue,
} from '@binh/rules';
import PlayingCard from '../cards/PlayingCard';

const STEP_MS = 1500;
/** Rows top to bottom, like the arrangement board; `step` is when each chi flips. */
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

export default function RevealView({ result, animate, myUserId }: Props) {
  const [step, setStep] = useState(animate ? 0 : 3);
  useEffect(() => {
    if (!animate) return;
    const timers = [1, 2, 3].map((n) => setTimeout(() => setStep(n), n * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const players = normalize(result);
  const names = new Map(players.map((p) => [p.userId, p.username]));
  const contenders = players.filter((p) => !p.foul && !p.special);
  const isBest = (p: Shown, i: number) =>
    contenders.includes(p) &&
    contenders.length > 1 &&
    contenders.every((q) => compareHands(p.hands[i], q.hands[i]) >= 0);

  return (
    <section className="reveal">
      <div className="reveal-players">
        {players.map((p) => (
          <div key={p.userId} className={p.userId === myUserId ? 'reveal-player me' : 'reveal-player'}>
            <div className="reveal-name">
              {p.username}
              {p.special && <span className="badge">{specialName(p.special)}</span>}
              {p.foul && <span className="badge red">Binh lủng</span>}
              {p.autoArranged && <span className="badge gray">Máy xếp</span>}
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
                  <div className="cards small">
                    {p.arrangement[key].map((c, i) => (
                      <PlayingCard key={i} card={c} faceDown={!shown} size="sm" tabIndex={-1} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {step >= 3 && (
        <div className="card-panel summary">
          <h3>Tổng kết</h3>
          <ul className="players">
            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <li key={p.userId}>
                  <span>{p.username}</span>
                  <span>
                    <b className={p.score >= 0 ? 'plus' : 'minus'}>{signed(p.score)}</b>
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
