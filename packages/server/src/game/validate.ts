import { cardKey, type Arrangement, type Card } from '@binh/rules';

/** Returns an error message, or null if the arrangement is exactly the dealt cards in 5/5/3. */
export function validateArrangement(dealt: Card[], a: Arrangement): string | null {
  if (a.chi1?.length !== 5 || a.chi2?.length !== 5 || a.chi3?.length !== 3) {
    return 'Mỗi chi phải có đúng 5, 5, 3 lá';
  }
  const submitted = [...a.chi1, ...a.chi2, ...a.chi3].map(cardKey);
  const own = new Set(dealt.map(cardKey));
  if (new Set(submitted).size !== 13 || !submitted.every((k) => own.has(k))) {
    return 'Bài nộp không khớp với bài được chia';
  }
  return null;
}
