import { useMuted } from '../sound';

export default function SoundToggle() {
  const [muted, setMuted] = useMuted();
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
      title={muted ? 'Bật tiếng' : 'Tắt tiếng'}
      onClick={() => setMuted(!muted)}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
