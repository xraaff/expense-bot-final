/** Одна палитра на всё приложение: круговая диаграмма, полосы категорий, столбцы дней. */
export const CATEGORY_PALETTE = [
  '#211C4E', '#2ECC8F', '#5B8DEF', '#F2994A',
  '#9B51E0', '#EB5757', '#27AE60', '#56CCF2',
  '#BB6BD9', '#F2C94C', '#6FCF97', '#828BA5',
];

export function categoryColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

/** Цвет столбца дня по доле от максимума: от спокойного к тревожному. */
export function magnitudeColor(value: number, max: number): string {
  if (max <= 0) return '#2ECC8F';
  const r = value / max;
  if (r >= 0.8) return '#EB5757';
  if (r >= 0.6) return '#F2994A';
  if (r >= 0.4) return '#F2C94C';
  if (r >= 0.2) return '#2ECC8F';
  return '#6FCF97';
}
