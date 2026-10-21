import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { cardKey, catName, evaluate, foulMessage, foulReason, type Arrangement, type Card } from '@binh/rules';
import PlayingCard from '../cards/PlayingCard';
import { play } from '../sound';
import { CHI_RANGES, fromArrangement, initialSlots, sortWithinChis, swap, toArrangement } from './arrangeState';
import { dropSwap, slotAt } from './slotAt';

interface Props {
  cards: Card[];
  /** Arrangement already on the server (after a reconnect), if any. */
  initial: Arrangement | null;
  /** True after submitting: cards cannot be moved until "Sửa lại". */
  locked: boolean;
  onSubmit: (a: Arrangement) => void;
  onUnsubmit: () => void;
  /** Play the deal-and-flip animation when the tray first appears. */
  deal?: boolean;
}

const ROWS = [
  { key: 'chi3', title: 'Chi 3' },
  { key: 'chi2', title: 'Chi 2' },
  { key: 'chi1', title: 'Chi 1' },
] as const;

const DEAL_STAGGER = 0.03;
const DEAL_FLIP_AT_MS = 13 * DEAL_STAGGER * 1000 + 450;

export default function ArrangeTray({ cards, initial, locked, onSubmit, onUnsubmit, deal = false }: Props) {
  const [slots, setSlots] = useState(() => (initial ? fromArrangement(initial) : initialSlots(cards)));
  const [selected, setSelected] = useState<number | null>(null);
  const [faceUp, setFaceUp] = useState(!deal);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const justDragged = useRef(false);
  const arrangement = useMemo(() => toArrangement(slots), [slots]);
  const foul = foulReason(arrangement);

  useEffect(() => {
    if (!deal) return;
    play('deal');
    const t = setTimeout(() => {
      setFaceUp(true);
      play('flip');
    }, DEAL_FLIP_AT_MS);
    return () => clearTimeout(t);
  }, [deal]);

  function update(next: typeof slots) {
    if (next !== slots) {
      setSlots(next);
      play('place');
    }
  }

  function tap(i: number) {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    if (locked) return;
    if (selected === null) return setSelected(i);
    if (selected !== i) update(swap(slots, selected, i));
    setSelected(null);
  }

  function dropped(from: number, point: { x: number; y: number }) {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const rects = slotRefs.current.map((el) => el?.getBoundingClientRect() ?? { left: 0, top: 0, right: -1, bottom: -1 });
    // motion reports page coordinates; the rects are viewport coordinates.
    const target = slotAt({ x: point.x - window.scrollX, y: point.y - window.scrollY }, rects);
    update(dropSwap(slots, from, target, locked));
    setSelected(null);
  }

  return (
    <section className={['tray', foul && 'foul', locked && 'locked'].filter(Boolean).join(' ')}>
      <LayoutGroup>
        {ROWS.map(({ key, title }) => {
          const [from, to] = CHI_RANGES[key];
          return (
            <div className="tray-row" key={key}>
              <div className="chi-label">
                {title} · <span data-testid={`${key}-name`}>{catName(evaluate(arrangement[key]).cat)}</span>
              </div>
              <div className="tray-cards">
                {slots.slice(from, to).map((card, k) => {
                  const i = from + k;
                  const id = cardKey(card);
                  return (
                    <div className="tray-slot" key={i} ref={(el) => void (slotRefs.current[i] = el)}>
                      <motion.div
                        layoutId={id}
                        className="tray-card"
                        drag={!locked && faceUp}
                        dragSnapToOrigin
                        whileDrag={{ scale: 1.08, zIndex: 20 }}
                        onDragEnd={(_, info) => dropped(i, info.point)}
                        initial={deal ? { y: -260, opacity: 0, rotate: -12 } : false}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        transition={{ delay: deal ? i * DEAL_STAGGER : 0, type: 'spring', stiffness: 380, damping: 30 }}
                      >
                        {faceUp ? (
                          <motion.div initial={deal ? { rotateY: 90 } : false} animate={{ rotateY: 0 }}>
                            <PlayingCard
                              data-testid={`slot-${i}`}
                              card={card}
                              selected={selected === i}
                              onClick={() => tap(i)}
                            />
                          </motion.div>
                        ) : (
                          <PlayingCard card={card} faceDown />
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </LayoutGroup>
      {foul && <p className="error center">{foulMessage(foul)}</p>}
      <div className="row tray-actions">
        <button disabled={locked} onClick={() => update(sortWithinChis(slots, 'rank'))}>
          Xếp theo giá trị
        </button>
        <button disabled={locked} onClick={() => update(sortWithinChis(slots, 'suit'))}>
          Xếp theo chất
        </button>
        {locked ? (
          <button className="primary grow" onClick={onUnsubmit}>
            Sửa lại
          </button>
        ) : (
          <button className="primary grow" onClick={() => onSubmit(arrangement)}>
            Xong
          </button>
        )}
      </div>
    </section>
  );
}
