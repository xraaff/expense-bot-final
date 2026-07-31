import {
  ShoppingCart, Coffee, Car, House, Pill, TShirt, Repeat, GameController,
  Briefcase, GraduationCap, Sparkle, Baby, Dog, Gift, Tag,
  Users, CreditCard, Money, Coins, Bank, HandHeart, Wallet,
  type Icon,
} from '@phosphor-icons/react';

const CATEGORY: Record<string, Icon> = {
  'Продукты': ShoppingCart,
  'Кафе': Coffee,
  'Транспорт': Car,
  'Жильё': House,
  'Здоровье': Pill,
  'Одежда': TShirt,
  'Подписки': Repeat,
  'Развлечения': GameController,
  'Бизнес': Briefcase,
  'Образование': GraduationCap,
  'Красота': Sparkle,
  'Детское': Baby,
  'Себек бебек': Dog,
  'Подарки': Gift,
};

const SOURCE: Record<string, Icon> = {
  'Общий': Users,
  'Карта Vova': CreditCard,
  'Карта Karina': CreditCard,
  'Наличные': Money,
  'Наличные Vova': Money,
  'Наличные Karina': Money,
  'USDT Vova': Coins,
  'Держ выплата': Bank,
  'Мама Карины': HandHeart,
  'Мама Вовы': HandHeart,
};

export function categoryIcon(name: string): Icon {
  return CATEGORY[name] ?? Tag;
}

export function sourceIcon(name: string): Icon {
  return SOURCE[name] ?? Wallet;
}
