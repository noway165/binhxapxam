export const AVATAR_COLORS = [
  '#b23a48',
  '#2f6f9f',
  '#4f8a3a',
  '#9b5fc0',
  '#c7782b',
  '#2a8c82',
  '#a3486f',
  '#6b6f2a',
] as const;

/** Two capital letters: first letters of the first two name parts, else the first two letters. */
export function initials(name: string): string {
  const parts = name.split(/[\s_]+/).filter(Boolean);
  const s = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return s.toUpperCase();
}

export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
