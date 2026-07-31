export type ThemeMode = 'light' | 'dark';

const KEY = 'theme';

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem(KEY, mode);
}

export function initTheme(): ThemeMode {
  const saved = localStorage.getItem(KEY) as ThemeMode | null;
  const tg = (window as any).Telegram?.WebApp;
  const mode: ThemeMode = saved ?? (tg?.colorScheme === 'dark' ? 'dark' : 'light');
  applyTheme(mode);
  return mode;
}
