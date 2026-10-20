import type { ButtonHTMLAttributes } from 'react';
import { cardKey, type Card } from '@binh/rules';

const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  card: Card;
  selected?: boolean;
  faceDown?: boolean;
  highlight?: boolean;
}

export default function CardView({ card, selected, faceDown, highlight, className = '', ...rest }: Props) {
  if (faceDown) {
    return <button type="button" className="playing-card back" aria-label="Lá úp" disabled />;
  }
  const red = card.suit === 'H' || card.suit === 'D';
  const classes = ['playing-card', red && 'red', selected && 'selected', highlight && 'highlight', className];
  return (
    <button type="button" className={classes.filter(Boolean).join(' ')} aria-label={cardKey(card)} {...rest}>
      <span className="rank">{RANK_LABEL[card.rank] ?? card.rank}</span>
      <span className="suit">{SUIT_SYMBOL[card.suit]}</span>
    </button>
  );
}
