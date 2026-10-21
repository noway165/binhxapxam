import { useSyncExternalStore } from 'react';

export type SoundName = 'deal' | 'flip' | 'place' | 'win' | 'fanfare' | 'tick';

const STORAGE_KEY = 'binh_muted';
const SOUND_EXT = 'ogg';

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let muted = readMuted();
const listeners = new Set<() => void>();
const cache = new Map<SoundName, HTMLAudioElement>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(STORAGE_KEY, m ? '1' : '0');
  } catch {
    // Storage blocked (private mode etc.): keep the choice for this page only.
  }
  listeners.forEach((l) => l());
}

/** Plays a short effect; silently does nothing when muted or when the browser blocks audio. */
export function play(name: SoundName): void {
  if (muted) return;
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.${SOUND_EXT}`);
    cache.set(name, audio);
  }
  try {
    audio.currentTime = 0;
    void audio.play()?.catch(() => {});
  } catch {
    // Some browsers throw synchronously for unsupported formats.
  }
}

export function useMuted(): [boolean, (m: boolean) => void] {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
  );
  return [value, setMuted];
}
