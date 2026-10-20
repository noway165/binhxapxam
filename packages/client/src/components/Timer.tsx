import { useEffect, useState } from 'react';

/** Counts down to a server deadline (epoch ms); red under 10 seconds. */
export default function Timer({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  return (
    <span className={left <= 10 ? 'timer urgent' : 'timer'} aria-label="Thời gian còn lại">
      ⏱ {left}s
    </span>
  );
}
