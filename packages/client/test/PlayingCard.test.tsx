import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseCards } from '@binh/rules';
import PlayingCard from '../src/cards/PlayingCard';

const [AS] = parseCards('AS');

describe('PlayingCard', () => {
  it('shows the card face SVG and names the card', () => {
    render(<PlayingCard card={AS} />);
    const btn = screen.getByRole('button', { name: 'AS' });
    expect(btn.querySelector('img')!.getAttribute('src')).toMatch(/\/cards\/AS\.svg$/);
  });

  it('face down shows the back and is disabled', () => {
    render(<PlayingCard card={AS} faceDown />);
    const btn = screen.getByRole('button', { name: 'Lá úp' });
    expect(btn).toBeDisabled();
    expect(btn.querySelector('img')!.getAttribute('src')).toMatch(/\/cards\/back\.svg$/);
  });

  it('marks the selected card', () => {
    render(<PlayingCard card={AS} selected />);
    expect(screen.getByRole('button', { name: 'AS' })).toHaveClass('selected');
  });
});
