import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { parseCards } from '@binh/rules';
import ArrangeTray from '../src/arrange/ArrangeTray';

// Sorted by rank this deals A K Q J 9 | 8 7 5 4 3 | 2 2 2 → chi 3 (xám) beats chi 2: a foul.
const fouling = parseCards('AS KD QH JC 9S 8D 7H 5C 4S 3D 2C 2D 2H');

const label = (slot: number) => screen.getByTestId(`slot-${slot}`).getAttribute('aria-label');

function setup(locked = false) {
  const onSubmit = vi.fn();
  const onUnsubmit = vi.fn();
  render(<ArrangeTray cards={fouling} initial={null} locked={locked} onSubmit={onSubmit} onUnsubmit={onUnsubmit} />);
  return { onSubmit, onUnsubmit };
}

describe('ArrangeTray', () => {
  it('tapping two cards swaps them', async () => {
    setup();
    const [a, b] = [label(0), label(12)];
    await userEvent.click(screen.getByTestId('slot-0'));
    await userEvent.click(screen.getByTestId('slot-12'));
    expect(label(0)).toBe(b);
    expect(label(12)).toBe(a);
  });

  it('names each chi', () => {
    setup();
    expect(screen.getByTestId('chi3-name')).toHaveTextContent('Xám cô');
    expect(screen.getByTestId('chi1-name')).toHaveTextContent('Mậu thầu');
  });

  it('warns about a foul but still allows submitting', async () => {
    const { onSubmit } = setup();
    expect(screen.getByText('Binh lủng: Chi 3 mạnh hơn Chi 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xong' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].chi3).toHaveLength(3);
  });

  it('when submitted, offers "Sửa lại" and cards cannot be moved', async () => {
    const { onUnsubmit } = setup(true);
    const before = label(0);
    await userEvent.click(screen.getByTestId('slot-0'));
    await userEvent.click(screen.getByTestId('slot-12'));
    expect(label(0)).toBe(before);
    await userEvent.click(screen.getByRole('button', { name: 'Sửa lại' }));
    expect(onUnsubmit).toHaveBeenCalledTimes(1);
  });
});
