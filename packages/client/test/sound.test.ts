import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let playSpy: ReturnType<typeof vi.fn>;

async function load() {
  vi.resetModules();
  return import('../src/sound');
}

beforeEach(() => {
  localStorage.clear();
  playSpy = vi.fn(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(playSpy as never);
});
afterEach(() => vi.restoreAllMocks());

describe('sound', () => {
  it('is on by default', async () => {
    const s = await load();
    expect(s.isMuted()).toBe(false);
  });

  it('remembers mute across reloads', async () => {
    const s = await load();
    s.setMuted(true);
    expect(localStorage.getItem('binh_muted')).toBe('1');
    const again = await load();
    expect(again.isMuted()).toBe(true);
  });

  it('does not play while muted', async () => {
    const s = await load();
    s.setMuted(true);
    s.play('flip');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('plays when unmuted', async () => {
    const s = await load();
    s.play('flip');
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores a blocked autoplay (RF2)', async () => {
    playSpy.mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
    const s = await load();
    expect(() => s.play('flip')).not.toThrow();
    await Promise.resolve();
  });

  it('survives a broken localStorage (RF2)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const s = await load();
    expect(s.isMuted()).toBe(false);
    expect(() => s.setMuted(true)).not.toThrow();
  });
});
