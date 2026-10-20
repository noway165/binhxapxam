export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Hand categories, weakest to strongest. */
export enum Cat {
  MauThau = 0,
  Doi = 1,
  Thu = 2,
  Xam = 3,
  Sanh = 4,
  Thung = 5,
  CuLu = 6,
  TuQuy = 7,
  ThungPhaSanh = 8,
}

export interface HandValue {
  cat: Cat;
  tiebreak: number[];
}

/** chi1 and chi2 hold 5 cards, chi3 holds 3. */
export interface Arrangement {
  chi1: Card[];
  chi2: Card[];
  chi3: Card[];
}

export type SpecialKind = 'SANH_RONG' | 'LUC_PHE_BON' | 'BA_THUNG' | 'BA_SANH';
