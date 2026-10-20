import { useMemo, useState } from 'react';
import { catName, evaluate, foulMessage, foulReason, type Arrangement, type Card } from '@binh/rules';
import CardView from '../components/CardView';
import { CHI_RANGES, fromArrangement, initialSlots, sortWithinChis, swap, toArrangement } from './arrangeState';

interface Props {
  cards: Card[];
  /** Arrangement already on the server (after a reconnect), if any. */
  initial: Arrangement | null;
  /** True after submitting: cards cannot be moved until "Sửa lại". */
  locked: boolean;
  onSubmit: (a: Arrangement) => void;
  onUnsubmit: () => void;
}

const ROWS = [
  { key: 'chi3', title: 'Chi 3' },
  { key: 'chi2', title: 'Chi 2' },
  { key: 'chi1', title: 'Chi 1' },
] as const;

export default function ArrangeBoard({ cards, initial, locked, onSubmit, onUnsubmit }: Props) {
  const [slots, setSlots] = useState(() => (initial ? fromArrangement(initial) : initialSlots(cards)));
  const [selected, setSelected] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const arrangement = useMemo(() => toArrangement(slots), [slots]);
  const foul = foulReason(arrangement);

  function tap(i: number) {
    if (locked) return;
    if (selected === null) return setSelected(i);
    if (selected !== i) setSlots(swap(slots, selected, i));
    setSelected(null);
  }

  function drop(i: number) {
    if (!locked && dragFrom !== null && dragFrom !== i) setSlots(swap(slots, dragFrom, i));
    setDragFrom(null);
    setSelected(null);
  }

  return (
    <section className={foul ? 'board foul' : 'board'}>
      {ROWS.map(({ key, title }) => {
        const [from, to] = CHI_RANGES[key];
        return (
          <div className="chi-row" key={key}>
            <div className="chi-label">
              {title} · <span data-testid={`${key}-name`}>{catName(evaluate(arrangement[key]).cat)}</span>
            </div>
            <div className="cards">
              {slots.slice(from, to).map((card, k) => {
                const i = from + k;
                return (
                  <CardView
                    key={i}
                    data-testid={`slot-${i}`}
                    card={card}
                    selected={selected === i}
                    draggable={!locked}
                    onClick={() => tap(i)}
                    onDragStart={() => setDragFrom(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => drop(i)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      {foul && <p className="error center">{foulMessage(foul)}</p>}
      <div className="row">
        <button disabled={locked} onClick={() => setSlots(sortWithinChis(slots, 'rank'))}>
          Xếp theo giá trị
        </button>
        <button disabled={locked} onClick={() => setSlots(sortWithinChis(slots, 'suit'))}>
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
