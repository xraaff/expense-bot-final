import { describe, it, expect } from 'vitest';
import { ShoppingCart, Coffee, Dog, Tag, CreditCard, Wallet } from '@phosphor-icons/react';
import { categoryIcon, sourceIcon } from './icons';

describe('categoryIcon', () => {
  it('отдаёт корзину для Продуктов', () => {
    expect(categoryIcon('Продукты')).toBe(ShoppingCart);
  });
  it('отдаёт чашку для Кафе', () => {
    expect(categoryIcon('Кафе')).toBe(Coffee);
  });
  it('отдаёт собаку для Себек бебек', () => {
    expect(categoryIcon('Себек бебек')).toBe(Dog);
  });
  it('для неизвестной категории отдаёт ярлык', () => {
    expect(categoryIcon('Крипта')).toBe(Tag);
  });
});

describe('sourceIcon', () => {
  it('отдаёт карту для Карта Vova', () => {
    expect(sourceIcon('Карта Vova')).toBe(CreditCard);
  });
  it('для неизвестного источника отдаёт кошелёк', () => {
    expect(sourceIcon('Монобанка')).toBe(Wallet);
  });
});
