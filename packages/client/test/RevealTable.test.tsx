import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCards, scoreRound, type GameResultPayload, type PlayerInput } from '@binh/rules';
import RevealTable from '../src/reveal/RevealTable';

const P = (id: string, c1: string, c2: string, c3: string): PlayerInput => ({
  id,
  arrangement: { chi1: parseCards(c1), chi2: parseCards(c2), chi3: parseCards(c3) },
});
const A = P('A', 'KC KD 9H 5S 3D', '7C 7D 4H 2S 6D', 'AS 8C 3C');
const B = P('B', 'QC QD TH 5H 2D', '6C 6H 4S 3S 2C', 'KH JS 9C'); // loses every chi to A
const F = P('F', 'AH 8C 8S 6S 3D', 'JC JS 4H 4S 2D', 'KC 7H 2C'); // foul
const T = P('T', '2H 4H 6H 8H TH', '3S 5S 7S 9S JS', '2C QC KC'); // 3 thùng

function result(players: PlayerInput[]): GameResultPayload {
  const r = scoreRound(players);
  return {
    gameId: 'g1',
    pairs: r.pairs,
    players: r.players.map((o, i) => ({
      userId: o.id,
      username: `user ${o.id}`,
      arrangement: players[i].arrangement,
      hands: o.hands,
      foul: o.foul,
      special: o.special,
      autoArranged: o.id === 'B',
      score: o.score,
      roomScore: o.score,
    })),
  };
}

const faceDown = () => screen.queryAllByLabelText('Lá úp').length;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('RevealTable', () => {
  it('flips chi 1, then chi 2, then chi 3 and shows the summary', () => {
    render(<RevealTable result={result([A, B])} animate myUserId="A" />);
    expect(faceDown()).toBe(26);
    expect(screen.queryByText('Tổng kết')).toBeNull();
    act(() => vi.advanceTimersByTime(1500));
    expect(faceDown()).toBe(16);
    act(() => vi.advanceTimersByTime(3000));
    expect(faceDown()).toBe(0);
    expect(screen.getByText('Tổng kết')).toBeInTheDocument();
  });

  it('labels foul, sập hầm and auto-arranged hands', () => {
    render(<RevealTable result={result([A, B, F])} animate={false} />);
    expect(screen.getByText('Binh lủng')).toBeInTheDocument();
    expect(screen.getAllByText('Sập hầm').length).toBeGreaterThan(0);
    expect(screen.getByText('Máy xếp')).toBeInTheDocument();
  });

  it('labels an instant win', () => {
    render(<RevealTable result={result([T, A])} animate={false} />);
    expect(screen.getAllByText('3 thùng').length).toBeGreaterThan(0);
  });

  it('highlights the strongest chi among players who did not foul', () => {
    render(<RevealTable result={result([A, B, F])} animate={false} />);
    expect(screen.getByTestId('row-A-chi1')).toHaveClass('best');
    expect(screen.getByTestId('row-B-chi1')).not.toHaveClass('best');
    expect(screen.getByTestId('row-F-chi1')).not.toHaveClass('best');
  });

  it('shows everything at once without animation', () => {
    render(<RevealTable result={result([A, B])} animate={false} />);
    expect(faceDown()).toBe(0);
    expect(screen.getByText('Tổng kết')).toBeInTheDocument();
  });

  it('can skip the animation straight to the summary (RF4)', async () => {
    render(<RevealTable result={result([A, B])} animate myUserId="A" />);
    expect(faceDown()).toBe(26);
    act(() => screen.getByRole('button', { name: 'Bỏ qua' }).click());
    expect(faceDown()).toBe(0);
    expect(screen.getByText('Tổng kết')).toBeInTheDocument();
  });

  it('has no skip button when not animating (RF4)', () => {
    render(<RevealTable result={result([A, B])} animate={false} />);
    expect(screen.queryByRole('button', { name: 'Bỏ qua' })).toBeNull();
  });

  it('announces sập hầm and instant wins with a banner', () => {
    const { unmount } = render(<RevealTable result={result([A, B])} animate={false} myUserId="A" />);
    expect(screen.getByText('SẬP HẦM')).toBeInTheDocument();
    unmount();
    render(<RevealTable result={result([T, A])} animate={false} myUserId="A" />);
    expect(screen.getByText(/THẮNG TRẮNG/)).toBeInTheDocument();
  });
});
