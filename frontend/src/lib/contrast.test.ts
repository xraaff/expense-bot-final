import { describe, it, expect } from 'vitest';
import { contrastRatio } from './contrast';

const DARK = { bg: '#08080a', tx: '#f4f4f8', tx2: '#a5a5b8' };
const LIGHT = { bg: '#f5f5f7', tx: '#111114', tx2: '#5a5a6b' };

describe('contrastRatio', () => {
  it('вычисляет известные эталоны', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 2);
  });

  it('основной текст тёмной темы держит 7:1', () => {
    expect(contrastRatio(DARK.tx, DARK.bg)).toBeGreaterThanOrEqual(7);
  });

  it('вторичный текст тёмной темы держит 4.5:1', () => {
    expect(contrastRatio(DARK.tx2, DARK.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('основной текст светлой темы держит 7:1', () => {
    expect(contrastRatio(LIGHT.tx, LIGHT.bg)).toBeGreaterThanOrEqual(7);
  });

  it('вторичный текст светлой темы держит 4.5:1', () => {
    expect(contrastRatio(LIGHT.tx2, LIGHT.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
