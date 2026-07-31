import { describe, it, expect } from 'vitest';
import { formatMoney, convert, pctDelta } from './money';

const RATES = { USD: 0.024, PLN: 0.096, EUR: 0.022 };

describe('formatMoney', () => {
  it('печатает гривну без дробей', () => {
    expect(formatMoney(1234, 'UAH')).toBe('1 234 ₴');
  });
  it('печатает доллар', () => {
    expect(formatMoney(700, 'USD')).toBe('700 $');
  });
  it('сжимает крупные суммы', () => {
    expect(formatMoney(1250000, 'UAH', { compact: true })).toBe('1,3 млн ₴');
  });
  it('округляет дробное до целого', () => {
    expect(formatMoney(99.6, 'UAH')).toBe('100 ₴');
  });
});

describe('convert', () => {
  it('возвращает исходное при совпадении валют', () => {
    expect(convert(100, 'UAH', 'UAH', RATES)).toBe(100);
  });
  it('переводит из базовой валюты', () => {
    expect(convert(1000, 'UAH', 'USD', RATES)).toBeCloseTo(24, 5);
  });
  it('переводит в базовую валюту', () => {
    expect(convert(24, 'USD', 'UAH', RATES)).toBeCloseTo(1000, 5);
  });
  it('переводит между небазовыми валютами', () => {
    expect(convert(24, 'USD', 'PLN', RATES)).toBeCloseTo(96, 5);
  });
  it('возвращает исходное, если курса нет', () => {
    expect(convert(50, 'USD', 'PLN', {})).toBe(50);
  });
  it('возвращает исходное при отрицательном курсе исходной валюты', () => {
    expect(convert(1000, 'USD', 'UAH', { USD: -0.024 })).toBe(1000);
  });
  it('возвращает исходное при отрицательном курсе целевой валюты', () => {
    expect(convert(1000, 'UAH', 'USD', { USD: -0.024 })).toBe(1000);
  });
});

describe('pctDelta', () => {
  it('считает рост', () => {
    expect(pctDelta(110, 100)).toBeCloseTo(10, 5);
  });
  it('считает снижение', () => {
    expect(pctDelta(80, 100)).toBeCloseTo(-20, 5);
  });
  it('возвращает null при нулевой базе', () => {
    expect(pctDelta(50, 0)).toBeNull();
  });
});
