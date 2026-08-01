export type ThemeMode = 'light' | 'dark';

const KEY = 'theme';

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem(KEY, mode);
}

export function initTheme(): ThemeMode {
  // Приложение оформлено под фирменный знак на белом. Тёмную схему Telegram
  // намеренно игнорируем — иначе на телефоне получается каша.
  applyTheme('light');
  return 'light';
}
