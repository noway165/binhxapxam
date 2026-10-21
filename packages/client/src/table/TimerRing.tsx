import { useEffect, useRef, useState } from 'react';
import { play } from '../sound';

const R = 26;
const CIRC = 2 * Math.PI * R;

/** Server-deadline countdown drawn as a shrinking gold ring; ticks during the last 10 s. */
export default function TimerRing({ deadline, totalSec }: { deadline: number; totalSec: number }) {
  const [now, setNow] = useState(Date.now());
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const urgent = left <= 10;

  useEffect(() => {
    if (urgent && left > 0 && lastTick.current !== left) {
      lastTick.current = left;
      play('tick');
    }
  }, [left, urgent]);

  const frac = Math.min(1, Math.max(0, (deadline - now) / (totalSec * 1000)));
  return (
    <div className={urgent ? 'timer-ring urgent' : 'timer-ring'} aria-label="Thời gian còn lại">
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r={R} className="track" />
        <circle
          cx="32"
          cy="32"
          r={R}
          className="bar"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="timer-text">{left}</span>
    </div>
  );
}
