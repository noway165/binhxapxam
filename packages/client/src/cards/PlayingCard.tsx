import type { ButtonHTMLAttributes } from 'react';
import { cardKey, type Card } from '@binh/rules';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  highlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** A playing card drawn from the CC0 SVG deck in /public/cards. */
export default function PlayingCard({
  card,
  faceDown,
  selected,
  highlight,
  size = 'md',
  className = '',
  ...rest
}: Props) {
  const classes = ['pcard', `pcard-${size}`, selected && 'selected', highlight && 'highlight', className];
  if (faceDown) {
    return (
      <button type="button" className={classes.filter(Boolean).join(' ')} aria-label="Lá úp" disabled>
        <img src="/cards/back.svg" alt="" draggable={false} />
      </button>
    );
  }
  const key = cardKey(card);
  return (
    <button type="button" className={classes.filter(Boolean).join(' ')} aria-label={key} {...rest}>
      <img src={`/cards/${key}.svg`} alt="" draggable={false} />
    </button>
  );
}
