import { Cat, type SpecialKind } from './types';

const CAT_NAMES: Record<Cat, string> = {
  [Cat.ThungPhaSanh]: 'Thùng phá sảnh',
  [Cat.TuQuy]: 'Tứ quý',
  [Cat.CuLu]: 'Cù lũ',
  [Cat.Thung]: 'Thùng',
  [Cat.Sanh]: 'Sảnh',
  [Cat.Xam]: 'Xám cô',
  [Cat.Thu]: 'Thú',
  [Cat.Doi]: 'Đôi',
  [Cat.MauThau]: 'Mậu thầu',
};

const SPECIAL_NAMES: Record<SpecialKind, string> = {
  SANH_RONG: 'Sảnh rồng',
  LUC_PHE_BON: 'Lục phé bôn',
  BA_THUNG: '3 thùng',
  BA_SANH: '3 sảnh',
};

export function catName(cat: Cat): string {
  return CAT_NAMES[cat];
}

export function specialName(k: SpecialKind): string {
  return SPECIAL_NAMES[k];
}
