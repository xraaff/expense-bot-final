# Fintech Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переписать фронтенд Telegram Mini App на React + React Aria Components с финтех-layout, выкатив его на `/v2` рядом с работающим старым интерфейсом.

**Architecture:** Новый фронт живёт в `frontend/`, собирается Vite в `frontend/dist`, копируется многостадийным Docker-билдом в `webapp/v2` и раздаётся aiohttp по маршрутам `/v2` и `/v2/{path}`. HTTP API и схема Google Sheets не меняются — новый фронт говорит с теми же эндпоинтами, что и старый. Старый `webapp/index.html` остаётся на `/` как рабочий откат до финального переключения.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme`), `react-aria-components`, `tailwindcss-react-aria-components`, `@phosphor-icons/react` (duotone), `recharts`, Vitest + React Testing Library + jsdom.

## Global Constraints

Требования действуют для всех задач без исключения.

- HTTP API не меняется: `/api/auth`, `/api/expense`, `/api/stats`, `/api/rates`, `/api/meta` — контракты побайтово те же.
- Схема Google Sheets не меняется: листы `RAW` и `META`, порядок колонок, формат даты `YYYY-MM-DD`, формат `created_at` `YYYY-MM-DD HH:MM:SS`.
- `vite.config.ts`: `base: '/v2/'`.
- `vite.config.ts`: `build.target: ['es2020', 'safari14']` — Telegram Desktop рапортует WebApp API 6.0, старый WebKit.
- Tailwind v4 конфигурируется из CSS через `@theme`. Файла `tailwind.config.ts` в проекте нет.
- Палитра неизменна: `--grad: linear-gradient(135deg,#AA00FF 0%,#FF9500 40%,#FFE620 70%,#68CE66 100%)`, `--ac: #FF9500`, тёмная `--bg #08080a --s1 #111114 --s2 #19191f`, светлая `--bg #f5f5f7 --s1 #ffffff --s2 #ededf0`.
- Градиент применяется ровно к трём сущностям: сумма-герой, первичная кнопка и логотип на экране входа. Больше нигде.
- Семантические цвета: `--pos #68CE66`, `--neg #FF5A5F`.
- Контраст WCAG AA: основной текст ≥ 7:1 к фону, вторичный ≥ 4.5:1.
- Веса шрифта 300–600. Вес ≥ 700 на финансовых данных не используется.
- Все числовые значения: `font-variant-numeric: tabular-nums`.
- Кривые движения: вход `cubic-bezier(0.16, 1, 0.3, 1)`, выход `cubic-bezier(0.55, 0, 1, 0.45)`.
- **Инвариант видимости:** базовое состояние элемента — видимое. Видимость никогда не зависит от того, отработала ли анимация. Любая анимация имеет явный кадр `from`. Класс `opacity-0` на корне экрана или контейнера запрещён.
- Иконки Phosphor duotone, импортируются поштучно для tree-shaking.
- Библиотеки управления состоянием не вводятся: только `useState`, `useReducer`, `useContext`.
- `webapp/index.html` не редактируется ни в одной задаче, кроме финальной задачи переключения.

---

## File Structure

| Файл | Ответственность |
|---|---|
| `frontend/package.json` | Зависимости и скрипты `dev`, `build`, `test` |
| `frontend/vite.config.ts` | База `/v2/`, target, разделение чанков, плагины React и Tailwind |
| `frontend/vitest.config.ts` | Окружение jsdom, setup-файл |
| `frontend/index.html` | HTML-оболочка, подключение Telegram WebApp SDK |
| `frontend/src/styles.css` | Токены палитры через `@theme`, светлая и тёмная темы, базовые слои |
| `frontend/src/main.tsx` | Точка входа, монтирование, `ErrorBoundary` |
| `frontend/src/app.tsx` | Оболочка: гейт авторизации, табы, шторка |
| `frontend/src/lib/types.ts` | Доменные типы, общие для всего фронта |
| `frontend/src/lib/money.ts` | Форматирование сумм, конвертация валют, дельта |
| `frontend/src/lib/aggregate.ts` | Агрегации: месяц, категории, плательщики, дни |
| `frontend/src/lib/icons.ts` | Соответствие категория и источник → иконка Phosphor |
| `frontend/src/lib/api.ts` | Типизированные обёртки над HTTP-эндпоинтами |
| `frontend/src/lib/theme.ts` | Тема из Telegram и `localStorage` |
| `frontend/src/lib/useExpenses.ts` | Загрузка, кэш, оптимистичные мутации |
| `frontend/src/components/ErrorBoundary.tsx` | Перехват исключений, читаемое сообщение вместо белого экрана |
| `frontend/src/components/MoneyText.tsx` | Отрисовка сумм с `tabular-nums` |
| `frontend/src/components/Skeleton.tsx` | Состояния загрузки |
| `frontend/src/components/EmptyState.tsx` | Пустые состояния |
| `frontend/src/components/CategoryTile.tsx` | Плитка категории с иконкой |
| `frontend/src/components/TxRow.tsx` | Строка операции |
| `frontend/src/components/KpiHero.tsx` | Сумма месяца и дельта |
| `frontend/src/components/PayerSplit.tsx` | Распределение Vova и Karina |
| `frontend/src/sheets/AddExpenseSheet.tsx` | Шторка создания и редактирования траты |
| `frontend/src/screens/Overview.tsx` | Главный экран |
| `frontend/src/screens/Operations.tsx` | Календарь и список операций |
| `frontend/src/screens/Analytics.tsx` | Графики, ленивый чанк |
| `bot/main.py` | Добавляются маршруты `/v2`, `/v2/{path}` и команда `/beta` |
| `Dockerfile` | Многостадийная сборка: Node собирает фронт, Python раздаёт |

---

### Task 1: Каркас, сборка и раздача на /v2

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/app.tsx`, `frontend/src/styles.css`, `frontend/.gitignore`
- Modify: `bot/main.py` (маршруты до catch-all), `Dockerfile` (многостадийность)

**Interfaces:**
- Consumes: ничего.
- Produces: рабочий конвейер сборки; `GET /v2` отдаёт React-приложение.

- [ ] **Step 1: Инициализировать пакет**

`frontend/package.json`:

```json
{
  "name": "expense-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-aria-components": "^1.5.0",
    "@phosphor-icons/react": "^2.1.7",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "tailwindcss-react-aria-components": "^2.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.8",
    "jsdom": "^25.0.1",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.6.3"
  }
}
```

- [ ] **Step 2: Настроить Vite**

`frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/v2/',
  plugins: [react(), tailwindcss()],
  build: {
    target: ['es2020', 'safari14'],
    rollupOptions: {
      output: {
        manualChunks: { charts: ['recharts'] },
      },
    },
  },
});
```

`frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

`frontend/.gitignore`:

```
node_modules
dist
```

- [ ] **Step 3: Создать оболочку приложения**

`frontend/index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <title>Homebase</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/styles.css` (минимальный на этом шаге, наполняется в Task 2):

```css
@import "tailwindcss";
@plugin "tailwindcss-react-aria-components";
```

`frontend/src/app.tsx`:

```tsx
export default function App() {
  return <div className="p-6 text-lg">v2 online</div>;
}
```

`frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Проверить, что сборка проходит**

Run: `cd frontend && npm install && npm run build`
Expected: сборка успешна, в `frontend/dist/index.html` пути к ассетам начинаются с `/v2/`.

- [ ] **Step 5: Добавить маршруты в бэкенд**

В `bot/main.py` рядом с `WEBAPP_DIR` добавить:

```python
V2_DIR = WEBAPP_DIR / "v2"

async def serve_v2_index(request):
    idx = V2_DIR / "index.html"
    if not idx.exists():
        return web.Response(status=404, text="v2 build not found")
    return web.FileResponse(idx)

async def serve_v2_static(request):
    rel = request.match_info["path"]
    fp = (V2_DIR / rel).resolve()
    if not str(fp).startswith(str(V2_DIR.resolve())) or not fp.is_file():
        return web.Response(status=404)
    return web.FileResponse(fp)
```

Зарегистрировать **строго до** строки `app.router.add_get("/{filename}", serve_static)`:

```python
app.router.add_get("/v2", serve_v2_index)
app.router.add_get("/v2/", serve_v2_index)
app.router.add_get("/v2/{path:.*}", serve_v2_static)
```

Проверка обхода каталога в `serve_v2_static` обязательна: без неё `/v2/../../etc/passwd` читает файлы вне каталога сборки.

- [ ] **Step 6: Сделать сборку многостадийной**

`Dockerfile` целиком:

```dockerfile
FROM node:20-slim AS ui
WORKDIR /ui
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=ui /ui/dist ./webapp/v2
CMD ["python", "bot/main.py"]
```

- [ ] **Step 7: Проверить раздачу локально**

Run:

```bash
cd frontend && npm run build && mkdir -p ../webapp/v2 && cp -r dist/* ../webapp/v2/
cd .. && python3 -c "import ast;ast.parse(open('bot/main.py').read());print('main.py ok')"
```

Expected: `main.py ok`, каталог `webapp/v2/index.html` существует.

- [ ] **Step 8: Закоммитить**

```bash
git add frontend Dockerfile bot/main.py
git commit -m "feat: scaffold React frontend and serve it at /v2"
```

---

### Task 2: Токены палитры, темы и проверка контраста

**Files:**
- Modify: `frontend/src/styles.css`
- Create: `frontend/src/lib/theme.ts`, `frontend/src/lib/contrast.ts`, `frontend/src/lib/contrast.test.ts`, `frontend/vitest.config.ts`, `frontend/src/test-setup.ts`

**Interfaces:**
- Consumes: каркас из Task 1.
- Produces: `contrastRatio(hexA: string, hexB: string): number`; `applyTheme(mode: 'light' | 'dark'): void`; `initTheme(): 'light' | 'dark'`; CSS-токены `--bg --s1 --s2 --tx --tx2 --tx3 --ac --pos --neg --grad`.

- [ ] **Step 1: Написать падающий тест контраста**

`frontend/src/lib/contrast.test.ts`:

```ts
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
```

- [ ] **Step 2: Настроить Vitest и убедиться, что тест падает**

`frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

`frontend/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Run: `cd frontend && npx vitest run src/lib/contrast.test.ts`
Expected: FAIL — модуль `./contrast` не найден.

- [ ] **Step 3: Реализовать вычисление контраста**

`frontend/src/lib/contrast.ts`:

```ts
function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 4: Прогнать тест**

Run: `cd frontend && npx vitest run src/lib/contrast.test.ts`
Expected: PASS, пять тестов.

- [ ] **Step 5: Записать токены в CSS**

`frontend/src/styles.css` целиком:

```css
@import "tailwindcss";
@plugin "tailwindcss-react-aria-components";

@theme {
  --color-ac: #FF9500;
  --color-pos: #68CE66;
  --color-neg: #FF5A5F;
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.55, 0, 1, 0.45);
}

:root {
  --bg: #f5f5f7;
  --s1: #ffffff;
  --s2: #ededf0;
  --tx: #111114;
  --tx2: #5a5a6b;
  --tx3: #7b7b8c;
  --bd: rgb(0 0 0 / 0.10);
  --grad: linear-gradient(135deg,#AA00FF 0%,#FF9500 40%,#FFE620 70%,#68CE66 100%);
}

:root[data-theme="dark"] {
  --bg: #08080a;
  --s1: #111114;
  --s2: #19191f;
  --tx: #f4f4f8;
  --tx2: #a5a5b8;
  --tx3: #8a8a9a;
  --bd: rgb(255 255 255 / 0.08);
}

html, body { background: var(--bg); color: var(--tx); }

body {
  font-family: Poppins, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.tnum { font-variant-numeric: tabular-nums; }

.gradient-text {
  background: var(--grad);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

Значения `--tx2` подняты относительно старого интерфейса (`#8a8a9a` в тёмной, `#6b6b78` в светлой) именно ради прохождения порога 4.5:1 — это и проверяет тест из шага 1.

- [ ] **Step 6: Реализовать переключение темы**

`frontend/src/lib/theme.ts`:

```ts
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
```

- [ ] **Step 7: Закоммитить**

```bash
git add frontend/src/styles.css frontend/src/lib frontend/vitest.config.ts frontend/src/test-setup.ts
git commit -m "feat: palette tokens, theme switching, WCAG contrast test"
```

---

### Task 3: Доменные типы и денежная арифметика

**Files:**
- Create: `frontend/src/lib/types.ts`, `frontend/src/lib/money.ts`, `frontend/src/lib/money.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `type Currency = 'UAH' | 'USD' | 'PLN'`
  - `interface Expense { id: string; date: string; amount: number; currency: Currency; category: string; description: string; payer: string; source: string; user_id: string; created_at: string }`
  - `interface ExpenseInput { id?: string; date: string; amount: number; currency: Currency; category: string; description: string; payer: string; source: string; user_id: string }`
  - `type Rates = Record<string, number>` — курсы с базой UAH, как их отдаёт `/api/rates`
  - `formatMoney(value: number, currency: Currency, opts?: { compact?: boolean }): string`
  - `convert(amount: number, from: Currency, to: Currency, rates: Rates): number`
  - `pctDelta(current: number, previous: number): number | null`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/lib/money.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatMoney, convert, pctDelta } from './money';

const RATES = { USD: 0.024, PLN: 0.096, EUR: 0.022 };

describe('formatMoney', () => {
  it('печатает гривну без дробей', () => {
    expect(formatMoney(1234, 'UAH')).toBe('1 234 ₴');
  });
  it('печатает доллар', () => {
    expect(formatMoney(700, 'USD')).toBe('700 $');
  });
  it('сжимает крупные суммы', () => {
    expect(formatMoney(1250000, 'UAH', { compact: true })).toBe('1,3M ₴');
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
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/lib/money.test.ts`
Expected: FAIL — модуль `./money` не найден.

- [ ] **Step 3: Написать типы**

`frontend/src/lib/types.ts`:

```ts
export type Currency = 'UAH' | 'USD' | 'PLN';
export type Rates = Record<string, number>;

export interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string;
  payer: string;
  source: string;
  user_id: string;
  created_at: string;
}

export interface ExpenseInput {
  id?: string;
  date: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string;
  payer: string;
  source: string;
  user_id: string;
}

export interface CategoryMeta {
  n: string;
  i?: string;
}
```

- [ ] **Step 4: Реализовать денежную арифметику**

`frontend/src/lib/money.ts`:

```ts
import type { Currency, Rates } from './types';

export const SYMBOLS: Record<Currency, string> = { UAH: '₴', USD: '$', PLN: 'zł' };

export function formatMoney(
  value: number,
  currency: Currency,
  opts: { compact?: boolean } = {}
): string {
  const n = new Intl.NumberFormat('ru-RU', {
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(value);
  return `${n} ${SYMBOLS[currency]}`;
}

export function convert(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  const rateFrom = from === 'UAH' ? 1 : rates[from];
  const rateTo = to === 'UAH' ? 1 : rates[to];
  if (!rateFrom || !rateTo) return amount;
  const inBase = amount / rateFrom;
  return inBase * rateTo;
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
```

Курсы приходят с базой UAH: `rates.USD = 0.024` означает «1 UAH = 0.024 USD». Поэтому перевод в базу — деление на курс исходной валюты, из базы — умножение на курс целевой.

- [ ] **Step 5: Прогнать тесты**

Run: `cd frontend && npx vitest run src/lib/money.test.ts`
Expected: PASS, двенадцать тестов. Если формат сжатия отличается от `1,3M` в вашей версии ICU, привести ожидание теста к фактическому выводу `Intl` — эталон здесь сам `Intl`, а не строка.

- [ ] **Step 6: Закоммитить**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/money.ts frontend/src/lib/money.test.ts
git commit -m "feat: domain types and money formatting/conversion"
```

---

### Task 4: Агрегации

**Files:**
- Create: `frontend/src/lib/aggregate.ts`, `frontend/src/lib/aggregate.test.ts`

**Interfaces:**
- Consumes: `Expense`, `Currency`, `Rates` из `./types`; `convert` из `./money`.
- Produces:
  - `monthKey(date: string): string` — из `2026-03-14` в `2026-03`
  - `totalFor(items: Expense[], to: Currency, rates: Rates): number`
  - `filterMonth(items: Expense[], month: string): Expense[]`
  - `byCategory(items: Expense[], to: Currency, rates: Rates): { category: string; total: number }[]` — по убыванию
  - `byPayer(items: Expense[], to: Currency, rates: Rates): Record<string, number>`
  - `byDay(items: Expense[], to: Currency, rates: Rates): Record<string, number>`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/lib/aggregate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { monthKey, totalFor, filterMonth, byCategory, byPayer, byDay } from './aggregate';
import type { Expense } from './types';

const RATES = { USD: 0.024, PLN: 0.096 };

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH',
  category: 'Продукты', description: '', payer: 'Vova',
  source: 'Общий', user_id: '1', created_at: '2026-03-03 10:00:00', ...p,
});

const ITEMS: Expense[] = [
  mk({ id: 'a', date: '2026-03-03', amount: 200, category: 'Продукты', payer: 'Vova' }),
  mk({ id: 'b', date: '2026-03-03', amount: 300, category: 'Кафе', payer: 'Karina' }),
  mk({ id: 'c', date: '2026-03-05', amount: 24, currency: 'USD', category: 'Продукты', payer: 'Vova' }),
  mk({ id: 'd', date: '2026-04-01', amount: 999, category: 'Кафе', payer: 'Vova' }),
];

describe('monthKey', () => {
  it('обрезает дату до месяца', () => {
    expect(monthKey('2026-03-14')).toBe('2026-03');
  });
});

describe('filterMonth', () => {
  it('оставляет только нужный месяц', () => {
    expect(filterMonth(ITEMS, '2026-03').map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('totalFor', () => {
  it('суммирует с приведением валют', () => {
    expect(totalFor(filterMonth(ITEMS, '2026-03'), 'UAH', RATES)).toBeCloseTo(1500, 5);
  });
  it('на пустом списке возвращает ноль', () => {
    expect(totalFor([], 'UAH', RATES)).toBe(0);
  });
});

describe('byCategory', () => {
  it('группирует и сортирует по убыванию', () => {
    const r = byCategory(filterMonth(ITEMS, '2026-03'), 'UAH', RATES);
    expect(r[0]).toEqual({ category: 'Продукты', total: 1200 });
    expect(r[1]).toEqual({ category: 'Кафе', total: 300 });
  });
});

describe('byPayer', () => {
  it('разносит суммы по плательщикам', () => {
    const r = byPayer(filterMonth(ITEMS, '2026-03'), 'UAH', RATES);
    expect(r.Vova).toBeCloseTo(1200, 5);
    expect(r.Karina).toBeCloseTo(300, 5);
  });
});

describe('byDay', () => {
  it('разносит суммы по дням', () => {
    const r = byDay(filterMonth(ITEMS, '2026-03'), 'UAH', RATES);
    expect(r['2026-03-03']).toBeCloseTo(500, 5);
    expect(r['2026-03-05']).toBeCloseTo(1000, 5);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/lib/aggregate.test.ts`
Expected: FAIL — модуль `./aggregate` не найден.

- [ ] **Step 3: Реализовать агрегации**

`frontend/src/lib/aggregate.ts`:

```ts
import type { Currency, Expense, Rates } from './types';
import { convert } from './money';

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function filterMonth(items: Expense[], month: string): Expense[] {
  return items.filter((e) => monthKey(e.date) === month);
}

export function totalFor(items: Expense[], to: Currency, rates: Rates): number {
  return items.reduce((sum, e) => sum + convert(e.amount, e.currency, to, rates), 0);
}

function groupSum(
  items: Expense[],
  to: Currency,
  rates: Rates,
  key: (e: Expense) => string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of items) {
    const k = key(e);
    out[k] = (out[k] ?? 0) + convert(e.amount, e.currency, to, rates);
  }
  return out;
}

export function byCategory(
  items: Expense[],
  to: Currency,
  rates: Rates
): { category: string; total: number }[] {
  const grouped = groupSum(items, to, rates, (e) => e.category);
  return Object.entries(grouped)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function byPayer(items: Expense[], to: Currency, rates: Rates): Record<string, number> {
  return groupSum(items, to, rates, (e) => e.payer);
}

export function byDay(items: Expense[], to: Currency, rates: Rates): Record<string, number> {
  return groupSum(items, to, rates, (e) => e.date);
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/lib/aggregate.test.ts`
Expected: PASS, восемь тестов.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/lib/aggregate.ts frontend/src/lib/aggregate.test.ts
git commit -m "feat: expense aggregations by month, category, payer, day"
```

---

### Task 5: Иконки категорий и источников

**Files:**
- Create: `frontend/src/lib/icons.ts`, `frontend/src/lib/icons.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: `categoryIcon(name: string): Icon`; `sourceIcon(name: string): Icon`. Тип `Icon` импортируется из `@phosphor-icons/react`.

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/lib/icons.test.ts`:

```ts
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
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/lib/icons.test.ts`
Expected: FAIL — модуль `./icons` не найден.

- [ ] **Step 3: Реализовать соответствие**

`frontend/src/lib/icons.ts`:

```ts
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
```

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/lib/icons.test.ts`
Expected: PASS, шесть тестов.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/lib/icons.ts frontend/src/lib/icons.test.ts
git commit -m "feat: Phosphor icon mapping for categories and sources"
```

---

### Task 6: Клиент HTTP API

**Files:**
- Create: `frontend/src/lib/api.ts`, `frontend/src/lib/api.test.ts`

**Interfaces:**
- Consumes: типы из `./types`.
- Produces:
  - `fetchStats(from: string, to: string): Promise<Expense[]>`
  - `saveExpense(input: ExpenseInput, action: 'add' | 'update' | 'delete'): Promise<void>` — бросает `Error` при `ok: false`
  - `fetchMeta(): Promise<{ categories: CategoryMeta[]; sources: string[] }>`
  - `fetchRates(base?: Currency): Promise<Rates>`
  - `authenticate(key: string, userId: string, chatId: string): Promise<string | null>` — возвращает роль либо `null`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/lib/api.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchStats, saveExpense, fetchRates, authenticate } from './api';

const mockFetch = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, json: async () => body,
  }));

afterEach(() => vi.unstubAllGlobals());

describe('fetchStats', () => {
  it('возвращает строки из ответа', async () => {
    mockFetch({ ok: true, rows: [{ id: 'a', amount: 5 }] });
    const rows = await fetchStats('2026-03-01', '2026-03-31');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('a');
  });

  it('передаёт диапазон в query', async () => {
    mockFetch({ ok: true, rows: [] });
    await fetchStats('2026-03-01', '2026-03-31');
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('from=2026-03-01');
    expect(url).toContain('to=2026-03-31');
  });
});

describe('saveExpense', () => {
  const input = {
    date: '2026-03-03', amount: 100, currency: 'UAH' as const, category: 'Кафе',
    description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  };

  it('шлёт действие в поле _action', async () => {
    mockFetch({ ok: true });
    await saveExpense(input, 'add');
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)._action).toBe('add');
  });

  it('бросает ошибку, когда бэкенд вернул ok:false', async () => {
    mockFetch({ ok: false, error: 'id not found' });
    await expect(saveExpense(input, 'update')).rejects.toThrow('id not found');
  });
});

describe('fetchRates', () => {
  it('возвращает курсы', async () => {
    mockFetch({ ok: true, base: 'UAH', rates: { USD: 0.024 } });
    expect(await fetchRates('UAH')).toEqual({ USD: 0.024 });
  });
  it('на сетевой ошибке отдаёт пустой объект', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchRates('UAH')).toEqual({});
  });
});

describe('authenticate', () => {
  it('возвращает роль при успехе', async () => {
    mockFetch({ ok: true, role: 'Vova' });
    expect(await authenticate('key', '1', '2')).toBe('Vova');
  });
  it('возвращает null при неверном ключе', async () => {
    mockFetch({ ok: false });
    expect(await authenticate('bad', '1', '2')).toBeNull();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/lib/api.test.ts`
Expected: FAIL — модуль `./api` не найден.

- [ ] **Step 3: Реализовать клиент**

`frontend/src/lib/api.ts`:

```ts
import type { CategoryMeta, Currency, Expense, ExpenseInput, Rates } from './types';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await r.json()) as T;
}

export async function fetchStats(from: string, to: string): Promise<Expense[]> {
  const r = await fetch(`/api/stats?from=${from}&to=${to}`);
  const j = (await r.json()) as { ok: boolean; rows?: Expense[] };
  return j.rows ?? [];
}

export async function saveExpense(
  input: ExpenseInput,
  action: 'add' | 'update' | 'delete'
): Promise<void> {
  const j = await postJson<{ ok: boolean; error?: string }>('/api/expense', {
    ...input,
    _action: action,
  });
  if (!j.ok) throw new Error(j.error ?? 'Не удалось сохранить');
}

export async function fetchMeta(): Promise<{ categories: CategoryMeta[]; sources: string[] }> {
  try {
    const r = await fetch('/api/meta');
    const j = (await r.json()) as { ok: boolean; categories?: CategoryMeta[]; sources?: string[] };
    return { categories: j.categories ?? [], sources: j.sources ?? [] };
  } catch {
    return { categories: [], sources: [] };
  }
}

export async function fetchRates(base: Currency = 'UAH'): Promise<Rates> {
  try {
    const r = await fetch(`/api/rates?base=${base}`);
    const j = (await r.json()) as { rates?: Rates };
    return j.rates ?? {};
  } catch {
    return {};
  }
}

export async function authenticate(
  key: string,
  userId: string,
  chatId: string
): Promise<string | null> {
  const j = await postJson<{ ok: boolean; role?: string }>('/api/auth', {
    key,
    user_id: userId,
    chat_id: chatId,
  });
  return j.ok ? (j.role ?? null) : null;
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/lib/api.test.ts`
Expected: PASS, восемь тестов.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/api.test.ts
git commit -m "feat: typed API client for expenses, meta, rates, auth"
```

---

### Task 7: Состояние с оптимистичными мутациями

**Files:**
- Create: `frontend/src/lib/useExpenses.ts`, `frontend/src/lib/useExpenses.test.tsx`

**Interfaces:**
- Consumes: `fetchStats`, `saveExpense` из `./api`; типы из `./types`.
- Produces: `useExpenses(range: { from: string; to: string }): { items: Expense[]; loading: boolean; error: string | null; add(i: ExpenseInput): Promise<void>; update(e: Expense): Promise<void>; remove(id: string): Promise<void>; reload(): Promise<void> }`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/lib/useExpenses.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExpenses } from './useExpenses';
import * as api from './api';
import type { Expense } from './types';

const existing: Expense = {
  id: 'a', date: '2026-03-03', amount: 200, currency: 'UAH', category: 'Кафе',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00',
};

const input = {
  date: '2026-03-04', amount: 50, currency: 'UAH' as const, category: 'Продукты',
  description: 'хлеб', payer: 'Vova', source: 'Общий', user_id: '1',
};

const RANGE = { from: '2026-03-01', to: '2026-03-31' };

beforeEach(() => {
  vi.spyOn(api, 'fetchStats').mockResolvedValue([existing]);
});

describe('useExpenses', () => {
  it('загружает операции при монтировании', async () => {
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
  });

  it('добавляет операцию оптимистично, до ответа сервера', async () => {
    let resolveSave: () => void = () => {};
    vi.spyOn(api, 'saveExpense').mockReturnValue(
      new Promise<void>((res) => { resolveSave = res; })
    );
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { void result.current.add(input); });
    expect(result.current.items).toHaveLength(2);

    await act(async () => { resolveSave(); });
    expect(result.current.items).toHaveLength(2);
  });

  it('откатывает добавление, если сервер ответил ошибкой', async () => {
    vi.spyOn(api, 'saveExpense').mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.add(input); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.error).toBe('boom');
  });

  it('удаляет операцию оптимистично и откатывает при ошибке', async () => {
    vi.spyOn(api, 'saveExpense').mockRejectedValue(new Error('нет доступа'));
    const { result } = renderHook(() => useExpenses(RANGE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.remove('a'); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.error).toBe('нет доступа');
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/lib/useExpenses.test.tsx`
Expected: FAIL — модуль `./useExpenses` не найден.

- [ ] **Step 3: Реализовать хук**

`frontend/src/lib/useExpenses.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { fetchStats, saveExpense } from './api';
import type { Expense, ExpenseInput } from './types';

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function useExpenses(range: { from: string; to: string }) {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchStats(range.from, range.to));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { void reload(); }, [reload]);

  const add = useCallback(async (input: ExpenseInput) => {
    const optimistic: Expense = {
      ...input,
      id: input.id ?? newId(),
      created_at: stamp(),
    };
    setItems((prev) => [...prev, optimistic]);
    setError(null);
    try {
      await saveExpense({ ...input, id: optimistic.id }, 'add');
    } catch (e) {
      setItems((prev) => prev.filter((x) => x.id !== optimistic.id));
      setError(e instanceof Error ? e.message : 'Не удалось записать');
    }
  }, []);

  const update = useCallback(async (next: Expense) => {
    let previous: Expense | undefined;
    setItems((prev) => {
      previous = prev.find((x) => x.id === next.id);
      return prev.map((x) => (x.id === next.id ? next : x));
    });
    setError(null);
    try {
      await saveExpense(next, 'update');
    } catch (e) {
      if (previous) {
        const restore = previous;
        setItems((prev) => prev.map((x) => (x.id === restore.id ? restore : x)));
      }
      setError(e instanceof Error ? e.message : 'Не удалось изменить');
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    let removed: Expense | undefined;
    setItems((prev) => {
      removed = prev.find((x) => x.id === id);
      return prev.filter((x) => x.id !== id);
    });
    setError(null);
    try {
      await saveExpense({ id } as unknown as ExpenseInput, 'delete');
    } catch (e) {
      if (removed) {
        const restore = removed;
        setItems((prev) => [...prev, restore]);
      }
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }, []);

  return { items, loading, error, add, update, remove, reload };
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/lib/useExpenses.test.tsx`
Expected: PASS, четыре теста.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/lib/useExpenses.ts frontend/src/lib/useExpenses.test.tsx
git commit -m "feat: expenses state with optimistic add/update/remove and rollback"
```

---

### Task 8: Базовые компоненты и инвариант видимости

**Files:**
- Create: `frontend/src/components/ErrorBoundary.tsx`, `frontend/src/components/MoneyText.tsx`, `frontend/src/components/Skeleton.tsx`, `frontend/src/components/EmptyState.tsx`, `frontend/src/components/components.test.tsx`

**Interfaces:**
- Consumes: `formatMoney` из `../lib/money`.
- Produces:
  - `<ErrorBoundary>{children}</ErrorBoundary>`
  - `<MoneyText value={number} currency={Currency} compact?={boolean} className?={string} />`
  - `<Skeleton className?={string} />`
  - `<EmptyState icon={Icon} title={string} hint?={string} />`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/components/components.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tag } from '@phosphor-icons/react';
import { ErrorBoundary } from './ErrorBoundary';
import { MoneyText } from './MoneyText';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

function Boom(): JSX.Element {
  throw new Error('сломалось');
}

describe('ErrorBoundary', () => {
  it('показывает текст ошибки вместо пустого экрана', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('сломалось');
    spy.mockRestore();
  });

  it('рендерит детей, когда ошибки нет', () => {
    render(<ErrorBoundary><span>ок</span></ErrorBoundary>);
    expect(screen.getByText('ок')).toBeInTheDocument();
  });
});

describe('MoneyText', () => {
  it('печатает сумму с символом валюты', () => {
    render(<MoneyText value={1234} currency="UAH" />);
    expect(screen.getByText('1 234 ₴')).toBeInTheDocument();
  });

  it('всегда несёт класс табулярных цифр', () => {
    render(<MoneyText value={1} currency="USD" />);
    expect(screen.getByText('1 $')).toHaveClass('tnum');
  });
});

describe('инвариант видимости', () => {
  it('Skeleton не скрыт нулевой прозрачностью', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className).not.toContain('opacity-0');
  });

  it('EmptyState не скрыт нулевой прозрачностью', () => {
    const { container } = render(<EmptyState icon={Tag} title="Пусто" />);
    expect(container.firstElementChild?.className).not.toContain('opacity-0');
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/components/components.test.tsx`
Expected: FAIL — модули компонентов не найдены.

- [ ] **Step 3: Реализовать компоненты**

`frontend/src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { message: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(e: unknown): State {
    return { message: e instanceof Error ? e.message : String(e) };
  }

  componentDidCatch(e: Error, info: ErrorInfo): void {
    console.error('UI crash', e, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children;
    return (
      <div role="alert" className="m-4 rounded-2xl border p-5 text-sm"
           style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-2 font-medium">Интерфейс упал</p>
        <p className="mb-4 break-words" style={{ color: 'var(--tx2)' }}>{this.state.message}</p>
        <button className="rounded-xl px-4 py-2 text-white" style={{ background: 'var(--color-ac)' }}
                onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
      </div>
    );
  }
}
```

`frontend/src/components/MoneyText.tsx`:

```tsx
import { formatMoney } from '../lib/money';
import type { Currency } from '../lib/types';

interface Props {
  value: number;
  currency: Currency;
  compact?: boolean;
  className?: string;
}

export function MoneyText({ value, currency, compact, className = '' }: Props) {
  return <span className={`tnum ${className}`}>{formatMoney(value, currency, { compact })}</span>;
}
```

`frontend/src/components/Skeleton.tsx`:

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: 'var(--s2)', minHeight: '1rem' }}
    />
  );
}
```

`frontend/src/components/EmptyState.tsx`:

```tsx
import type { Icon } from '@phosphor-icons/react';

interface Props { icon: Icon; title: string; hint?: string }

export function EmptyState({ icon: IconCmp, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <IconCmp size={40} weight="duotone" color="var(--color-ac)" />
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm" style={{ color: 'var(--tx2)' }}>{hint}</p>}
    </div>
  );
}
```

Ни один компонент не имеет базовой нулевой прозрачности — это и закрепляют два последних теста шага 1.

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/components/components.test.tsx`
Expected: PASS, шесть тестов.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/components
git commit -m "feat: base components with error boundary and visibility invariant tests"
```

---

### Task 9: Шторка добавления траты

**Files:**
- Create: `frontend/src/sheets/AddExpenseSheet.tsx`, `frontend/src/sheets/AddExpenseSheet.test.tsx`
- Create: `frontend/src/components/CategoryTile.tsx`

**Interfaces:**
- Consumes: `ExpenseInput`, `Currency`, `Expense`; `categoryIcon`, `sourceIcon`.
- Produces:
  - `<CategoryTile name={string} selected={boolean} onSelect={() => void} />`
  - `<AddExpenseSheet isOpen={boolean} onOpenChange={(open: boolean) => void} categories={string[]} sources={string[]} role={string} userId={string} initial?={Expense} onSubmit={(i: ExpenseInput) => Promise<void>} onDelete?={(id: string) => Promise<void>} />`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/sheets/AddExpenseSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExpenseSheet } from './AddExpenseSheet';

const base = {
  isOpen: true,
  onOpenChange: () => {},
  categories: ['Продукты', 'Кафе'],
  sources: ['Общий', 'Наличные'],
  role: 'Vova',
  userId: '821378781',
};

describe('AddExpenseSheet', () => {
  it('кнопка записи заблокирована, пока нет суммы и категории', () => {
    render(<AddExpenseSheet {...base} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Записать' })).toBeDisabled();
  });

  it('после заполнения суммы и категории отправляет корректные данные', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AddExpenseSheet {...base} onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '250');
    await user.click(screen.getByRole('button', { name: 'Кафе' }));
    await user.click(screen.getByRole('button', { name: 'Записать' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.amount).toBe(250);
    expect(payload.category).toBe('Кафе');
    expect(payload.currency).toBe('UAH');
    expect(payload.payer).toBe('Vova');
    expect(payload.user_id).toBe('821378781');
  });

  it('в режиме правки показывает удаление', () => {
    const initial = {
      id: 'a', date: '2026-03-03', amount: 200, currency: 'UAH' as const, category: 'Кафе',
      description: '', payer: 'Vova', source: 'Общий', user_id: '1',
      created_at: '2026-03-03 10:00:00',
    };
    render(<AddExpenseSheet {...base} initial={initial} onSubmit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/sheets/AddExpenseSheet.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать плитку категории**

`frontend/src/components/CategoryTile.tsx`:

```tsx
import { Button } from 'react-aria-components';
import { categoryIcon } from '../lib/icons';

interface Props { name: string; selected: boolean; onSelect: () => void }

export function CategoryTile({ name, selected, onSelect }: Props) {
  const IconCmp = categoryIcon(name);
  return (
    <Button
      aria-label={name}
      onPress={onSelect}
      className="flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3
                 transition-colors duration-200"
      style={{
        borderColor: selected ? 'var(--color-ac)' : 'var(--bd)',
        background: selected ? 'rgb(255 149 0 / 0.08)' : 'var(--s1)',
      }}
    >
      <IconCmp size={24} weight="duotone" color="var(--color-ac)" />
      <span className="text-xs font-medium leading-tight" style={{ color: 'var(--tx)' }}>
        {name}
      </span>
    </Button>
  );
}
```

Подпись использует основной цвет текста и вес 500 — в старом интерфейсе она была третичным серым и не читалась.

- [ ] **Step 4: Реализовать шторку**

`frontend/src/sheets/AddExpenseSheet.tsx`:

```tsx
import { useState } from 'react';
import {
  Button, Dialog, Modal, ModalOverlay, TextField, Label, Input, TextArea,
  ToggleButton, ToggleButtonGroup,
} from 'react-aria-components';
import { CategoryTile } from '../components/CategoryTile';
import { sourceIcon } from '../lib/icons';
import type { Currency, Expense, ExpenseInput } from '../lib/types';

const CURRENCIES: Currency[] = ['UAH', 'USD', 'PLN'];

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  sources: string[];
  role: string;
  userId: string;
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseSheet(props: Props) {
  const { isOpen, onOpenChange, categories, sources, role, userId, initial } = props;
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'UAH');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [source, setSource] = useState(initial?.source ?? sources[0] ?? 'Общий');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [payer, setPayer] = useState(initial?.payer ?? role);
  const [date] = useState(initial?.date ?? today());
  const [busy, setBusy] = useState(false);

  const numeric = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(numeric) && numeric > 0 && category !== '';

  async function submit(): Promise<void> {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await props.onSubmit({
        id: initial?.id,
        date, amount: numeric, currency, category,
        description, payer, source, user_id: userId,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 bg-black/40"
    >
      <Modal className="fixed inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl"
             style={{ background: 'var(--bg)' }}>
        <Dialog aria-label="Новая трата" className="outline-none">
          <div className="space-y-5 p-5 pb-8">
            <TextField value={amount} onChange={setAmount} className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                     style={{ color: 'var(--tx2)' }}>
                Сумма
              </Label>
              <Input
                inputMode="decimal"
                placeholder="0"
                className="tnum w-full rounded-2xl border px-4 py-3 text-3xl font-medium outline-none"
                style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}
              />
            </TextField>

            <ToggleButtonGroup
              selectionMode="single"
              selectedKeys={[currency]}
              onSelectionChange={(k) => {
                const v = [...k][0] as Currency | undefined;
                if (v) setCurrency(v);
              }}
              className="flex gap-2"
            >
              {CURRENCIES.map((c) => (
                <ToggleButton key={c} id={c}
                  className="flex-1 rounded-xl border py-2 text-sm font-medium
                             selected:border-[var(--color-ac)] selected:text-[var(--color-ac)]"
                  style={{ borderColor: 'var(--bd)' }}>
                  {c}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                 style={{ color: 'var(--tx2)' }}>Категория</p>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((c) => (
                  <CategoryTile key={c} name={c} selected={category === c}
                                onSelect={() => setCategory(c)} />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                 style={{ color: 'var(--tx2)' }}>Источник денег</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((s) => {
                  const IconCmp = sourceIcon(s);
                  const on = source === s;
                  return (
                    <Button key={s} aria-label={s} onPress={() => setSource(s)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                      style={{
                        borderColor: on ? 'var(--color-ac)' : 'var(--bd)',
                        color: on ? 'var(--color-ac)' : 'var(--tx)',
                      }}>
                      <IconCmp size={14} weight="duotone" />
                      {s}
                    </Button>
                  );
                })}
              </div>
            </section>

            <TextField value={description} onChange={setDescription} className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                     style={{ color: 'var(--tx2)' }}>Описание</Label>
              <TextArea rows={2} placeholder="На что потрачено"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }} />
            </TextField>

            <ToggleButtonGroup
              selectionMode="single"
              selectedKeys={[payer]}
              onSelectionChange={(k) => {
                const v = [...k][0] as string | undefined;
                if (v) setPayer(v);
              }}
              className="flex gap-2"
            >
              {['Vova', 'Karina'].map((p) => (
                <ToggleButton key={p} id={p}
                  className="flex-1 rounded-xl border py-2 text-sm font-medium
                             selected:border-[var(--color-ac)] selected:text-[var(--color-ac)]"
                  style={{ borderColor: 'var(--bd)' }}>
                  {p}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Button isDisabled={!valid || busy} onPress={submit}
              className="w-full rounded-2xl py-4 text-base font-semibold text-black
                         disabled:opacity-40"
              style={{ background: 'var(--grad)' }}>
              Записать
            </Button>

            {initial && props.onDelete && (
              <Button aria-label="Удалить"
                onPress={() => { void props.onDelete!(initial.id); onOpenChange(false); }}
                className="w-full rounded-2xl border py-3 text-sm font-medium"
                style={{ borderColor: 'var(--bd)', color: 'var(--color-neg)' }}>
                Удалить
              </Button>
            )}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
```

Градиент здесь на первичной кнопке — одно из двух разрешённых мест по глобальным ограничениям.

- [ ] **Step 5: Прогнать тесты**

Run: `cd frontend && npx vitest run src/sheets/AddExpenseSheet.test.tsx`
Expected: PASS, три теста.

- [ ] **Step 6: Закоммитить**

```bash
git add frontend/src/sheets frontend/src/components/CategoryTile.tsx
git commit -m "feat: add-expense bottom sheet on React Aria Modal"
```

---

### Task 10: Экран «Обзор»

**Files:**
- Create: `frontend/src/components/KpiHero.tsx`, `frontend/src/components/PayerSplit.tsx`, `frontend/src/components/TxRow.tsx`, `frontend/src/screens/Overview.tsx`, `frontend/src/screens/Overview.test.tsx`

**Interfaces:**
- Consumes: `filterMonth`, `totalFor`, `byCategory`, `byPayer`, `monthKey`; `MoneyText`, `EmptyState`; `categoryIcon`.
- Produces:
  - `<KpiHero total={number} deltaPct={number | null} currency={Currency} />`
  - `<PayerSplit totals={Record<string, number>} currency={Currency} />`
  - `<TxRow expense={Expense} currency={Currency} rates={Rates} onPress={() => void} />`
  - `<Overview items={Expense[]} currency={Currency} rates={Rates} month={string} onPickExpense={(e: Expense) => void} />`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/screens/Overview.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Overview } from './Overview';
import type { Expense } from '../lib/types';

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH', category: 'Продукты',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00', ...p,
});

const ITEMS = [
  mk({ id: 'a', amount: 200, category: 'Продукты', payer: 'Vova' }),
  mk({ id: 'b', amount: 300, category: 'Кафе', payer: 'Karina' }),
  mk({ id: 'c', date: '2026-02-10', amount: 1000, category: 'Кафе', payer: 'Vova' }),
];

const props = {
  items: ITEMS, currency: 'UAH' as const, rates: {}, month: '2026-03',
  onPickExpense: vi.fn(),
};

describe('Overview', () => {
  it('показывает итог текущего месяца', () => {
    render(<Overview {...props} />);
    expect(screen.getByText('500 ₴')).toBeInTheDocument();
  });

  it('показывает дельту к прошлому месяцу', () => {
    render(<Overview {...props} />);
    expect(screen.getByTestId('delta')).toHaveTextContent('50');
  });

  it('перечисляет категории по убыванию', () => {
    render(<Overview {...props} />);
    const names = screen.getAllByTestId('cat-name').map((n) => n.textContent);
    expect(names).toEqual(['Кафе', 'Продукты']);
  });

  it('показывает распределение плательщиков', () => {
    render(<Overview {...props} />);
    expect(screen.getByTestId('payer-Vova')).toHaveTextContent('200 ₴');
    expect(screen.getByTestId('payer-Karina')).toHaveTextContent('300 ₴');
  });

  it('на пустом месяце показывает пустое состояние', () => {
    render(<Overview {...props} items={[]} />);
    expect(screen.getByText('Трат пока нет')).toBeInTheDocument();
  });
});
```

Пояснение к ожиданию дельты: март — 500, февраль — 1000, снижение на 50 процентов.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/screens/Overview.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать компоненты обзора**

`frontend/src/components/KpiHero.tsx`:

```tsx
import { MoneyText } from './MoneyText';
import type { Currency } from '../lib/types';

interface Props { total: number; deltaPct: number | null; currency: Currency }

export function KpiHero({ total, deltaPct, currency }: Props) {
  const positive = deltaPct !== null && deltaPct <= 0;
  return (
    <section className="px-5 pt-6 pb-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
         style={{ color: 'var(--tx2)' }}>
        Потрачено за месяц
      </p>
      <MoneyText value={total} currency={currency}
                 className="gradient-text block text-5xl font-medium tracking-[-0.02em]" />
      {deltaPct !== null && (
        <p data-testid="delta" className="tnum mt-2 text-sm font-medium"
           style={{ color: positive ? 'var(--color-pos)' : 'var(--color-neg)' }}>
          {positive ? '↓' : '↑'} {Math.abs(deltaPct).toFixed(0)}% к прошлому месяцу
        </p>
      )}
    </section>
  );
}
```

`frontend/src/components/PayerSplit.tsx`:

```tsx
import { MoneyText } from './MoneyText';
import type { Currency } from '../lib/types';

interface Props { totals: Record<string, number>; currency: Currency }

export function PayerSplit({ totals, currency }: Props) {
  const names = Object.keys(totals);
  const sum = names.reduce((a, n) => a + totals[n], 0);
  if (sum === 0) return null;
  return (
    <section className="mx-5 mb-4 rounded-2xl border p-4"
             style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--s2)' }}>
        {names.map((n, i) => (
          <div key={n} style={{
            width: `${(totals[n] / sum) * 100}%`,
            background: i === 0 ? 'var(--color-ac)' : 'var(--color-pos)',
          }} />
        ))}
      </div>
      <div className="flex justify-between">
        {names.map((n) => (
          <p key={n} data-testid={`payer-${n}`} className="text-sm">
            <span style={{ color: 'var(--tx2)' }}>{n} </span>
            <MoneyText value={totals[n]} currency={currency} className="font-medium" />
          </p>
        ))}
      </div>
    </section>
  );
}
```

`frontend/src/components/TxRow.tsx`:

```tsx
import { Button } from 'react-aria-components';
import { MoneyText } from './MoneyText';
import { categoryIcon } from '../lib/icons';
import type { Currency, Expense, Rates } from '../lib/types';
import { convert } from '../lib/money';

interface Props {
  expense: Expense;
  currency: Currency;
  rates: Rates;
  onPress: () => void;
}

export function TxRow({ expense, currency, rates, onPress }: Props) {
  const IconCmp = categoryIcon(expense.category);
  const value = convert(expense.amount, expense.currency, currency, rates);
  return (
    <Button onPress={onPress}
      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-200">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--s2)' }}>
        <IconCmp size={18} weight="duotone" color="var(--color-ac)" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{expense.category}</span>
        <span className="block truncate text-xs" style={{ color: 'var(--tx2)' }}>
          {expense.description || expense.source}
        </span>
      </span>
      <MoneyText value={value} currency={currency} className="text-sm font-medium" />
    </Button>
  );
}
```

- [ ] **Step 4: Реализовать экран**

`frontend/src/screens/Overview.tsx`:

```tsx
import { Meter, Label } from 'react-aria-components';
import { KpiHero } from '../components/KpiHero';
import { PayerSplit } from '../components/PayerSplit';
import { TxRow } from '../components/TxRow';
import { MoneyText } from '../components/MoneyText';
import { EmptyState } from '../components/EmptyState';
import { Receipt } from '@phosphor-icons/react';
import { byCategory, byPayer, filterMonth, totalFor } from '../lib/aggregate';
import { pctDelta } from '../lib/money';
import type { Currency, Expense, Rates } from '../lib/types';

interface Props {
  items: Expense[];
  currency: Currency;
  rates: Rates;
  month: string;
  onPickExpense: (e: Expense) => void;
}

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function Overview({ items, currency, rates, month, onPickExpense }: Props) {
  const current = filterMonth(items, month);
  const previous = filterMonth(items, previousMonth(month));
  const total = totalFor(current, currency, rates);
  const delta = pctDelta(total, totalFor(previous, currency, rates));
  const cats = byCategory(current, currency, rates).slice(0, 5);
  const recent = [...current].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  if (current.length === 0) {
    return (
      <div>
        <KpiHero total={0} deltaPct={null} currency={currency} />
        <EmptyState icon={Receipt} title="Трат пока нет"
                    hint="Нажмите плюс, чтобы записать первую" />
      </div>
    );
  }

  return (
    <div className="pb-28">
      <KpiHero total={total} deltaPct={delta} currency={currency} />
      <PayerSplit totals={byPayer(current, currency, rates)} currency={currency} />

      <section className="mx-5 mb-4 rounded-2xl border p-4"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>Категории</p>
        <div className="space-y-3">
          {cats.map((c) => (
            <Meter key={c.category} value={c.total} maxValue={total} className="block">
              <div className="mb-1 flex justify-between text-sm">
                <Label data-testid="cat-name" className="font-medium">{c.category}</Label>
                <MoneyText value={c.total} currency={currency} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--s2)' }}>
                <div className="h-full rounded-full transition-[width] duration-500"
                     style={{ width: `${(c.total / total) * 100}%`, background: 'var(--color-ac)' }} />
              </div>
            </Meter>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>Последние операции</p>
        {recent.map((e) => (
          <TxRow key={e.id} expense={e} currency={currency} rates={rates}
                 onPress={() => onPickExpense(e)} />
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Прогнать тесты**

Run: `cd frontend && npx vitest run src/screens/Overview.test.tsx`
Expected: PASS, пять тестов.

- [ ] **Step 6: Закоммитить**

```bash
git add frontend/src/screens/Overview.tsx frontend/src/screens/Overview.test.tsx frontend/src/components
git commit -m "feat: Overview screen with KPI hero, payer split, top categories"
```

---

### Task 11: Экран «Операции»

**Files:**
- Create: `frontend/src/screens/Operations.tsx`, `frontend/src/screens/Operations.test.tsx`

**Interfaces:**
- Consumes: `byDay`, `TxRow`, `EmptyState`, `MoneyText`.
- Produces: `<Operations items={Expense[]} currency={Currency} rates={Rates} onPickExpense={(e: Expense) => void} />`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/screens/Operations.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Operations } from './Operations';
import type { Expense } from '../lib/types';

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH', category: 'Продукты',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00', ...p,
});

const ITEMS = [
  mk({ id: 'a', amount: 200, category: 'Продукты', description: 'молоко' }),
  mk({ id: 'b', amount: 300, category: 'Кафе', description: 'латте' }),
];

const props = { items: ITEMS, currency: 'UAH' as const, rates: {}, onPickExpense: vi.fn() };

describe('Operations', () => {
  it('показывает все операции', () => {
    render(<Operations {...props} />);
    expect(screen.getAllByTestId('tx')).toHaveLength(2);
  });

  it('фильтрует по поисковому запросу', async () => {
    const user = userEvent.setup();
    render(<Operations {...props} />);
    await user.type(screen.getByRole('searchbox', { name: 'Поиск' }), 'латте');
    expect(screen.getAllByTestId('tx')).toHaveLength(1);
  });

  it('на пустом списке показывает пустое состояние', () => {
    render(<Operations {...props} items={[]} />);
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/screens/Operations.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать экран**

`frontend/src/screens/Operations.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { SearchField, Label, Input, Button } from 'react-aria-components';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { TxRow } from '../components/TxRow';
import { EmptyState } from '../components/EmptyState';
import { MoneyText } from '../components/MoneyText';
import { byDay } from '../lib/aggregate';
import type { Currency, Expense, Rates } from '../lib/types';

interface Props {
  items: Expense[];
  currency: Currency;
  rates: Rates;
  onPickExpense: (e: Expense) => void;
}

export function Operations({ items, currency, rates, onPickExpense }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
    );
  }, [items, query]);

  const days = useMemo(() => {
    const totals = byDay(filtered, currency, rates);
    return Object.keys(totals).sort((a, b) => b.localeCompare(a)).map((d) => ({
      date: d,
      total: totals[d],
      rows: filtered.filter((e) => e.date === d),
    }));
  }, [filtered, currency, rates]);

  return (
    <div className="pb-28">
      <div className="px-5 pt-5 pb-3">
        <SearchField value={query} onChange={setQuery} className="block">
          <Label className="sr-only">Поиск</Label>
          <div className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
            <MagnifyingGlass size={16} weight="duotone" color="var(--tx2)" />
            <Input placeholder="Поиск по тратам"
                   className="w-full bg-transparent text-sm outline-none"
                   style={{ color: 'var(--tx)' }} />
          </div>
        </SearchField>
      </div>

      {days.length === 0 ? (
        <EmptyState icon={MagnifyingGlass} title="Ничего не найдено"
                    hint="Измените запрос или период" />
      ) : (
        days.map((d) => (
          <section key={d.date} className="mb-2">
            <div className="flex items-baseline justify-between px-5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                 style={{ color: 'var(--tx2)' }}>{d.date}</p>
              <MoneyText value={d.total} currency={currency}
                         className="text-xs" />
            </div>
            {d.rows.map((e) => (
              <div key={e.id} data-testid="tx">
                <TxRow expense={e} currency={currency} rates={rates}
                       onPress={() => onPickExpense(e)} />
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/screens/Operations.test.tsx`
Expected: PASS, три теста.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/screens/Operations.tsx frontend/src/screens/Operations.test.tsx
git commit -m "feat: Operations screen with search and per-day grouping"
```

---

### Task 12: Экран «Аналитика»

**Files:**
- Create: `frontend/src/screens/Analytics.tsx`, `frontend/src/screens/Analytics.test.tsx`

**Interfaces:**
- Consumes: `byCategory`, `byDay`, `EmptyState`.
- Produces: `<Analytics items={Expense[]} currency={Currency} rates={Rates} />`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/screens/Analytics.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Analytics } from './Analytics';
import type { Expense } from '../lib/types';

const mk = (p: Partial<Expense>): Expense => ({
  id: 'x', date: '2026-03-03', amount: 100, currency: 'UAH', category: 'Продукты',
  description: '', payer: 'Vova', source: 'Общий', user_id: '1',
  created_at: '2026-03-03 10:00:00', ...p,
});

describe('Analytics', () => {
  it('перечисляет категории с суммами', () => {
    render(<Analytics items={[mk({ amount: 200 }), mk({ id: 'b', amount: 300, category: 'Кафе' })]}
                      currency="UAH" rates={{}} />);
    expect(screen.getByText('Кафе')).toBeInTheDocument();
    expect(screen.getByText('Продукты')).toBeInTheDocument();
  });

  it('на пустых данных показывает пустое состояние', () => {
    render(<Analytics items={[]} currency="UAH" rates={{}} />);
    expect(screen.getByText('Нет данных за период')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/screens/Analytics.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать экран**

`frontend/src/screens/Analytics.tsx`:

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { ChartPie } from '@phosphor-icons/react';
import { EmptyState } from '../components/EmptyState';
import { MoneyText } from '../components/MoneyText';
import { byCategory, byDay } from '../lib/aggregate';
import type { Currency, Expense, Rates } from '../lib/types';

const PALETTE = ['#AA00FF', '#FF9500', '#FFE620', '#68CE66', '#FF5A5F', '#8a8a9a'];

interface Props { items: Expense[]; currency: Currency; rates: Rates }

export function Analytics({ items, currency, rates }: Props) {
  if (items.length === 0) {
    return <EmptyState icon={ChartPie} title="Нет данных за период"
                       hint="Запишите первую трату" />;
  }

  const cats = byCategory(items, currency, rates);
  const daily = Object.entries(byDay(items, currency, rates))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({ date: date.slice(8), total }));

  return (
    <div className="space-y-4 px-5 pt-5 pb-28">
      <section className="rounded-2xl border p-4"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>Структура трат</p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={cats} dataKey="total" nameKey="category"
                   innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                {cats.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 space-y-2">
          {cats.map((c, i) => (
            <li key={c.category} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full"
                    style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="flex-1">{c.category}</span>
              <MoneyText value={c.total} currency={currency} className="font-medium" />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border p-4"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
           style={{ color: 'var(--tx2)' }}>По дням</p>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <XAxis dataKey="date" tick={{ fill: 'var(--tx2)', fontSize: 10 }}
                     axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--s2)' }}
                       contentStyle={{
                         background: 'var(--s1)', border: '1px solid var(--bd)',
                         borderRadius: 12, fontSize: 12,
                       }} />
              <Bar dataKey="total" fill="var(--color-ac)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/screens/Analytics.test.tsx`
Expected: PASS, два теста. Если Recharts в jsdom предупреждает о нулевых размерах контейнера, это не влияет на утверждения — тесты проверяют список категорий, а не сам холст.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/screens/Analytics.tsx frontend/src/screens/Analytics.test.tsx
git commit -m "feat: Analytics screen with donut and daily bars"
```

---

### Task 13: Оболочка приложения, авторизация и навигация

**Files:**
- Modify: `frontend/src/app.tsx`, `frontend/src/main.tsx`
- Create: `frontend/src/app.test.tsx`

**Interfaces:**
- Consumes: все экраны, `useExpenses`, `fetchMeta`, `fetchRates`, `authenticate`, `initTheme`.
- Produces: смонтированное приложение; `App` — экспорт по умолчанию.

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/app.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './app';
import * as api from './lib/api';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'fetchStats').mockResolvedValue([]);
  vi.spyOn(api, 'fetchMeta').mockResolvedValue({ categories: [], sources: [] });
  vi.spyOn(api, 'fetchRates').mockResolvedValue({});
});

describe('App', () => {
  it('без сохранённой роли показывает экран входа', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('с сохранённой ролью сразу показывает обзор', async () => {
    localStorage.setItem('role', 'Vova');
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Обзор' })).toBeInTheDocument()
    );
  });

  it('корень приложения не скрыт нулевой прозрачностью', async () => {
    localStorage.setItem('role', 'Vova');
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    expect(container.firstElementChild?.className).not.toContain('opacity-0');
  });

  it('неверный ключ показывает сообщение об ошибке', async () => {
    vi.spyOn(api, 'authenticate').mockResolvedValue(null);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Ключ доступа'), 'плохой');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => expect(screen.getByText('Неверный ключ')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/app.test.tsx`
Expected: FAIL — приложение ещё отдаёт заглушку «v2 online».

- [ ] **Step 3: Реализовать оболочку**

`frontend/src/app.tsx`:

```tsx
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Tabs, TabList, Tab, TabPanel, Button, TextField, Label, Input,
} from 'react-aria-components';
import { Plus, House, ListBullets, ChartPie } from '@phosphor-icons/react';
import { Overview } from './screens/Overview';
import { Operations } from './screens/Operations';
import { AddExpenseSheet } from './sheets/AddExpenseSheet';
import { Skeleton } from './components/Skeleton';
import { useExpenses } from './lib/useExpenses';
import { authenticate, fetchMeta, fetchRates } from './lib/api';
import { initTheme } from './lib/theme';
import { monthKey } from './lib/aggregate';
import type { Currency, Expense, Rates } from './lib/types';

const Analytics = lazy(() =>
  import('./screens/Analytics').then((m) => ({ default: m.Analytics }))
);

const DEFAULT_CATEGORIES = [
  'Продукты', 'Кафе', 'Транспорт', 'Жильё', 'Здоровье', 'Одежда',
  'Подписки', 'Развлечения', 'Бизнес', 'Образование', 'Красота',
];
const DEFAULT_SOURCES = ['Общий', 'Карта Vova', 'Карта Karina', 'Наличные'];

function rangeLastMonths(count: number): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + 1, 1));
  return { from: start.toISOString().slice(0, 10), to };
}

export default function App() {
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('role'));
  const [key, setKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [currency] = useState<Currency>('UAH');
  const [rates, setRates] = useState<Rates>({});
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>(undefined);

  const range = useMemo(() => rangeLastMonths(3), []);
  const { items, loading, error, add, update, remove } = useExpenses(range);

  useEffect(() => { initTheme(); }, []);

  useEffect(() => {
    if (!role) return;
    void fetchRates('UAH').then(setRates);
    void fetchMeta().then((m) => {
      if (m.categories.length) {
        setCategories([...DEFAULT_CATEGORIES, ...m.categories.map((c) => c.n)]);
      }
      if (m.sources.length) setSources([...DEFAULT_SOURCES, ...m.sources]);
    });
  }, [role]);

  async function doAuth(): Promise<void> {
    const tg = (window as any).Telegram?.WebApp;
    const uid = String(tg?.initDataUnsafe?.user?.id ?? 'web');
    const cid = String(tg?.initDataUnsafe?.chat?.id ?? '');
    const r = await authenticate(key, uid, cid);
    if (r) {
      localStorage.setItem('role', r);
      setRole(r);
      setAuthError('');
    } else {
      setAuthError('Неверный ключ');
    }
  }

  if (!role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-8">
        <h1 className="gradient-text text-2xl font-semibold">Homebase</h1>
        <TextField value={key} onChange={setKey} className="w-full space-y-2">
          <Label className="text-sm" style={{ color: 'var(--tx2)' }}>Ключ доступа</Label>
          <Input type="password"
                 className="w-full rounded-2xl border px-4 py-3 outline-none"
                 style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }} />
        </TextField>
        {authError && <p className="text-sm" style={{ color: 'var(--color-neg)' }}>{authError}</p>}
        <Button onPress={doAuth}
                className="w-full rounded-2xl py-3 font-semibold text-black"
                style={{ background: 'var(--grad)' }}>
          Войти
        </Button>
      </div>
    );
  }

  const userId = String((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? 'web');
  const month = monthKey(new Date().toISOString().slice(0, 10));

  return (
    <div className="min-h-screen">
      {error && (
        <p role="status" className="px-5 py-2 text-xs" style={{ color: 'var(--color-neg)' }}>
          {error}
        </p>
      )}

      <Tabs defaultSelectedKey="overview">
        <TabPanel id="overview">
          {loading ? <Skeleton className="m-5 h-40" /> : (
            <Overview items={items} currency={currency} rates={rates} month={month}
                      onPickExpense={(e) => { setEditing(e); setSheetOpen(true); }} />
          )}
        </TabPanel>
        <TabPanel id="operations">
          <Operations items={items} currency={currency} rates={rates}
                      onPickExpense={(e) => { setEditing(e); setSheetOpen(true); }} />
        </TabPanel>
        <TabPanel id="analytics">
          <Suspense fallback={<Skeleton className="m-5 h-56" />}>
            <Analytics items={items} currency={currency} rates={rates} />
          </Suspense>
        </TabPanel>

        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-5">
          <TabList aria-label="Разделы"
            className="flex items-center gap-1 rounded-full border px-2 py-1.5 shadow-lg"
            style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
            <Tab id="overview" className="flex flex-col items-center rounded-full px-4 py-1.5 text-[10px]
                                          selected:text-[var(--color-ac)]">
              <House size={20} weight="duotone" />Обзор
            </Tab>
            <Tab id="operations" className="flex flex-col items-center rounded-full px-4 py-1.5 text-[10px]
                                            selected:text-[var(--color-ac)]">
              <ListBullets size={20} weight="duotone" />Операции
            </Tab>
            <Button aria-label="Добавить трату"
              onPress={() => { setEditing(undefined); setSheetOpen(true); }}
              className="mx-1 flex h-11 w-11 items-center justify-center rounded-full text-black"
              style={{ background: 'var(--grad)' }}>
              <Plus size={22} weight="bold" />
            </Button>
            <Tab id="analytics" className="flex flex-col items-center rounded-full px-4 py-1.5 text-[10px]
                                           selected:text-[var(--color-ac)]">
              <ChartPie size={20} weight="duotone" />Аналитика
            </Tab>
          </TabList>
        </div>
      </Tabs>

      <AddExpenseSheet
        isOpen={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditing(undefined); }}
        categories={categories}
        sources={sources}
        role={role}
        userId={userId}
        initial={editing}
        onSubmit={async (input) => {
          if (editing) await update({ ...editing, ...input, id: editing.id });
          else await add(input);
        }}
        onDelete={editing ? (id) => remove(id) : undefined}
      />
    </div>
  );
}
```

`frontend/src/main.tsx` — обернуть приложение защитой от падений:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
```

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run`
Expected: PASS, все наборы целиком.

- [ ] **Step 5: Собрать и убедиться в разделении чанков**

Run: `cd frontend && npm run build`
Expected: сборка успешна, в `dist/assets` присутствует отдельный чанк с `recharts`.

- [ ] **Step 6: Закоммитить**

```bash
git add frontend/src/app.tsx frontend/src/main.tsx frontend/src/app.test.tsx
git commit -m "feat: app shell with auth gate, tab navigation, sheet wiring"
```

---

### Task 14: Дата траты через DatePicker

**Files:**
- Modify: `frontend/src/sheets/AddExpenseSheet.tsx`, `frontend/src/sheets/AddExpenseSheet.test.tsx`, `frontend/package.json`

**Interfaces:**
- Consumes: шторка из Task 9.
- Produces: в шторке появляется выбор даты; в payload поле `date` берётся из выбранного значения.

- [ ] **Step 1: Добавить зависимость дат**

В `frontend/package.json` в `dependencies` добавить `"@internationalized/date": "^3.6.0"` и выполнить `cd frontend && npm install`. Пакет требуется компонентам `DatePicker` и `Calendar` из React Aria.

- [ ] **Step 2: Написать падающий тест**

Дописать в `frontend/src/sheets/AddExpenseSheet.test.tsx`:

```tsx
it('по умолчанию подставляет сегодняшнюю дату', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<AddExpenseSheet {...base} onSubmit={onSubmit} />);

  await user.type(screen.getByRole('textbox', { name: 'Сумма' }), '100');
  await user.click(screen.getByRole('button', { name: 'Кафе' }));
  await user.click(screen.getByRole('button', { name: 'Записать' }));

  const today = new Date().toISOString().slice(0, 10);
  expect(onSubmit.mock.calls[0][0].date).toBe(today);
});

it('показывает группу полей выбора даты', () => {
  render(<AddExpenseSheet {...base} onSubmit={vi.fn()} />);
  expect(screen.getByRole('group', { name: 'Дата' })).toBeInTheDocument();
});
```

- [ ] **Step 3: Прогнать и убедиться, что второй тест падает**

Run: `cd frontend && npx vitest run src/sheets/AddExpenseSheet.test.tsx`
Expected: FAIL на тесте про группу «Дата» — такого элемента ещё нет.

- [ ] **Step 4: Встроить DatePicker**

В `frontend/src/sheets/AddExpenseSheet.tsx` расширить импорты:

```tsx
import {
  Button, Dialog, Modal, ModalOverlay, TextField, Label, Input, TextArea,
  ToggleButton, ToggleButtonGroup,
  DatePicker, Group, DateInput, DateSegment, Popover, Calendar,
  CalendarGrid, CalendarCell, Heading,
} from 'react-aria-components';
import { CalendarDate, getLocalTimeZone, today as todayIn } from '@internationalized/date';
```

Заменить строку состояния даты:

```tsx
const [date, setDate] = useState<CalendarDate>(
  initial ? new CalendarDate(
    Number(initial.date.slice(0, 4)),
    Number(initial.date.slice(5, 7)),
    Number(initial.date.slice(8, 10))
  ) : todayIn(getLocalTimeZone())
);
```

В `submit` передавать строку:

```tsx
date: date.toString(),
```

`CalendarDate.toString()` даёт формат `YYYY-MM-DD` — ровно тот, что ожидает лист `RAW`.

Вставить блок выбора даты сразу после поля суммы:

```tsx
<DatePicker aria-label="Дата" value={date} onChange={(v) => v && setDate(v)}
            className="space-y-2">
  <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
         style={{ color: 'var(--tx2)' }}>Дата</Label>
  <Group aria-label="Дата"
         className="flex items-center justify-between rounded-2xl border px-4 py-3"
         style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
    <DateInput className="tnum flex gap-0.5 text-sm">
      {(segment) => <DateSegment segment={segment} className="px-0.5 outline-none
                                                             focus:text-[var(--color-ac)]" />}
    </DateInput>
    <Button className="text-sm" style={{ color: 'var(--color-ac)' }}>Выбрать</Button>
  </Group>
  <Popover className="rounded-2xl border p-3 shadow-xl"
           style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
    <Dialog>
      <Calendar>
        <header className="mb-2 flex items-center justify-between">
          <Button slot="previous" className="px-2">‹</Button>
          <Heading className="text-sm font-medium" />
          <Button slot="next" className="px-2">›</Button>
        </header>
        <CalendarGrid className="text-sm">
          {(d) => <CalendarCell date={d}
                    className="flex h-9 w-9 items-center justify-center rounded-lg
                               selected:bg-[var(--color-ac)] selected:text-black" />}
        </CalendarGrid>
      </Calendar>
    </Dialog>
  </Popover>
</DatePicker>
```

- [ ] **Step 5: Прогнать тесты**

Run: `cd frontend && npx vitest run src/sheets/AddExpenseSheet.test.tsx`
Expected: PASS, пять тестов.

- [ ] **Step 6: Закоммитить**

```bash
git add frontend/src/sheets frontend/package.json frontend/package-lock.json
git commit -m "feat: pick expense date with React Aria DatePicker"
```

---

### Task 15: DateRangePicker и календарь-хитмап в «Операциях»

**Files:**
- Modify: `frontend/src/screens/Operations.tsx`, `frontend/src/screens/Operations.test.tsx`

**Interfaces:**
- Consumes: экран из Task 11; `byDay` из `../lib/aggregate`.
- Produces: фильтр по произвольному периоду и месячный хитмап трат.

- [ ] **Step 1: Написать падающие тесты**

Дописать в `frontend/src/screens/Operations.test.tsx`:

```tsx
it('показывает выбор периода', () => {
  render(<Operations {...props} />);
  expect(screen.getByRole('group', { name: 'Период' })).toBeInTheDocument();
});

it('рисует хитмап с ячейкой на каждый день с тратами', () => {
  render(<Operations {...props} />);
  expect(screen.getByTestId('heat-2026-03-03')).toBeInTheDocument();
});

it('насыщенность ячейки пропорциональна сумме дня', () => {
  const items = [
    mk({ id: 'a', date: '2026-03-03', amount: 100 }),
    mk({ id: 'b', date: '2026-03-04', amount: 400 }),
  ];
  render(<Operations {...props} items={items} />);
  const weak = screen.getByTestId('heat-2026-03-03').style.opacity;
  const strong = screen.getByTestId('heat-2026-03-04').style.opacity;
  expect(Number(strong)).toBeGreaterThan(Number(weak));
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/screens/Operations.test.tsx`
Expected: FAIL — ни группы «Период», ни ячеек хитмапа нет.

- [ ] **Step 3: Добавить период и хитмап**

В `frontend/src/screens/Operations.tsx` расширить импорты:

```tsx
import {
  SearchField, Label, Input, Button,
  DateRangePicker, Group, DateInput, DateSegment, Popover, Dialog,
  RangeCalendar, CalendarGrid, CalendarCell, Heading,
} from 'react-aria-components';
import { getLocalTimeZone, today as todayIn, type CalendarDate } from '@internationalized/date';
```

Добавить состояние периода и фильтрацию по нему:

```tsx
const [range, setRange] = useState<{ start: CalendarDate; end: CalendarDate }>(() => {
  const t = todayIn(getLocalTimeZone());
  return { start: t.subtract({ months: 1 }), end: t };
});

const inRange = useMemo(() => {
  const from = range.start.toString();
  const to = range.end.toString();
  return items.filter((e) => e.date >= from && e.date <= to);
}, [items, range]);
```

Далее в `filtered` фильтровать не `items`, а `inRange`:

```tsx
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
  if (!q) return inRange;
  return inRange.filter(
    (e) =>
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q)
  );
}, [inRange, query]);
```

Вставить перед полем поиска выбор периода:

```tsx
<DateRangePicker aria-label="Период" value={range}
                 onChange={(v) => v && setRange(v as { start: CalendarDate; end: CalendarDate })}
                 className="mb-3 space-y-2">
  <Label className="text-[10px] font-semibold uppercase tracking-[0.15em]"
         style={{ color: 'var(--tx2)' }}>Период</Label>
  <Group aria-label="Период"
         className="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
         style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
    <DateInput slot="start" className="tnum flex gap-0.5 text-sm">
      {(s) => <DateSegment segment={s} className="px-0.5 outline-none" />}
    </DateInput>
    <span style={{ color: 'var(--tx2)' }}>—</span>
    <DateInput slot="end" className="tnum flex gap-0.5 text-sm">
      {(s) => <DateSegment segment={s} className="px-0.5 outline-none" />}
    </DateInput>
    <Button className="ml-auto text-sm" style={{ color: 'var(--color-ac)' }}>Выбрать</Button>
  </Group>
  <Popover className="rounded-2xl border p-3 shadow-xl"
           style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
    <Dialog>
      <RangeCalendar>
        <header className="mb-2 flex items-center justify-between">
          <Button slot="previous" className="px-2">‹</Button>
          <Heading className="text-sm font-medium" />
          <Button slot="next" className="px-2">›</Button>
        </header>
        <CalendarGrid className="text-sm">
          {(d) => <CalendarCell date={d}
                    className="flex h-9 w-9 items-center justify-center rounded-lg
                               selected:bg-[var(--color-ac)] selected:text-black" />}
        </CalendarGrid>
      </RangeCalendar>
    </Dialog>
  </Popover>
</DateRangePicker>
```

Вставить хитмап сразу под поиском:

```tsx
{(() => {
  const totals = byDay(filtered, currency, rates);
  const dates = Object.keys(totals).sort();
  if (dates.length === 0) return null;
  const max = Math.max(...dates.map((d) => totals[d]));
  return (
    <div className="mb-3 flex flex-wrap gap-1 px-5">
      {dates.map((d) => (
        <span key={d} data-testid={`heat-${d}`} title={d}
              className="h-6 w-6 rounded-md"
              style={{
                background: 'var(--color-ac)',
                opacity: String(Math.max(0.15, totals[d] / max)),
              }} />
      ))}
    </div>
  );
})()}
```

Минимум `0.15` не даёт самым мелким тратам стать невидимыми — это тот же инвариант видимости, что и в глобальных ограничениях.

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && npx vitest run src/screens/Operations.test.tsx`
Expected: PASS, шесть тестов.

- [ ] **Step 5: Закоммитить**

```bash
git add frontend/src/screens/Operations.tsx frontend/src/screens/Operations.test.tsx
git commit -m "feat: date range filter and spending heatmap in Operations"
```

---

### Task 16: Уведомления и управление своими категориями

**Files:**
- Modify: `frontend/src/lib/api.ts`, `frontend/src/lib/api.test.ts`, `frontend/src/app.tsx`
- Create: `frontend/src/components/Toast.tsx`, `frontend/src/components/CategoryMenu.tsx`, `frontend/src/components/CategoryMenu.test.tsx`

**Interfaces:**
- Consumes: `api`, `CategoryTile`.
- Produces:
  - `updateMeta(payload: MetaUpdate): Promise<void>` где
    `type MetaUpdate = { action: 'add'; target: 'categories' | 'sources'; item: unknown } | { action: 'rename'; target: 'categories' | 'sources'; old_name: string; new_name: string; new_icon?: string } | { action: 'delete'; target: 'categories' | 'sources'; name: string }`
  - `<Toast message={string | null} onRetry?={() => void} onDismiss={() => void} />`
  - `<CategoryMenu name={string} onRename={(name: string) => void} onDelete={(name: string) => void} />`

- [ ] **Step 1: Написать падающие тесты**

Дописать в `frontend/src/lib/api.test.ts`:

```ts
import { updateMeta } from './api';

describe('updateMeta', () => {
  it('шлёт действие и цель', async () => {
    mockFetch({ ok: true });
    await updateMeta({ action: 'delete', target: 'categories', name: 'Крипта' });
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.action).toBe('delete');
    expect(body.target).toBe('categories');
    expect(body.name).toBe('Крипта');
  });

  it('бросает ошибку при ok:false', async () => {
    mockFetch({ ok: false, error: 'bad target' });
    await expect(
      updateMeta({ action: 'delete', target: 'categories', name: 'X' })
    ).rejects.toThrow('bad target');
  });
});
```

`frontend/src/components/CategoryMenu.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryMenu } from './CategoryMenu';
import { Toast } from './Toast';

describe('CategoryMenu', () => {
  it('открывает пункты переименования и удаления', async () => {
    const user = userEvent.setup();
    render(<CategoryMenu name="Крипта" onRename={vi.fn()} onDelete={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Действия с категорией Крипта' }));
    expect(await screen.findByRole('menuitem', { name: 'Переименовать' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toBeInTheDocument();
  });

  it('вызывает удаление с именем категории', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<CategoryMenu name="Крипта" onRename={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Действия с категорией Крипта' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Удалить' }));
    expect(onDelete).toHaveBeenCalledWith('Крипта');
  });
});

describe('Toast', () => {
  it('ничего не рендерит без сообщения', () => {
    const { container } = render(<Toast message={null} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('показывает сообщение и кнопку повтора', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<Toast message="Не удалось записать" onRetry={onRetry} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Не удалось записать');
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/lib/api.test.ts src/components/CategoryMenu.test.tsx`
Expected: FAIL — `updateMeta` и оба компонента не существуют.

- [ ] **Step 3: Дописать updateMeta**

В `frontend/src/lib/api.ts` добавить тип и функцию:

```ts
export type MetaTarget = 'categories' | 'sources';

export type MetaUpdate =
  | { action: 'add'; target: MetaTarget; item: unknown }
  | { action: 'rename'; target: MetaTarget; old_name: string; new_name: string; new_icon?: string }
  | { action: 'delete'; target: MetaTarget; name: string };

export async function updateMeta(payload: MetaUpdate): Promise<void> {
  const j = await postJson<{ ok: boolean; error?: string }>('/api/meta', payload);
  if (!j.ok) throw new Error(j.error ?? 'Не удалось сохранить справочник');
}
```

- [ ] **Step 4: Реализовать компоненты**

`frontend/src/components/Toast.tsx`:

```tsx
import { Button } from 'react-aria-components';

interface Props {
  message: string | null;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function Toast({ message, onRetry, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite"
         className="fixed inset-x-4 bottom-24 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg"
         style={{ borderColor: 'var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button onPress={onRetry} className="font-medium" style={{ color: 'var(--color-ac)' }}>
          Повторить
        </Button>
      )}
      <Button aria-label="Закрыть" onPress={onDismiss} style={{ color: 'var(--tx2)' }}>×</Button>
    </div>
  );
}
```

`frontend/src/components/CategoryMenu.tsx`:

```tsx
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { DotsThree } from '@phosphor-icons/react';

interface Props {
  name: string;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}

export function CategoryMenu({ name, onRename, onDelete }: Props) {
  return (
    <MenuTrigger>
      <Button aria-label={`Действия с категорией ${name}`} className="p-1"
              style={{ color: 'var(--tx2)' }}>
        <DotsThree size={18} weight="bold" />
      </Button>
      <Popover className="rounded-xl border py-1 shadow-xl"
               style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
        <Menu className="min-w-40 outline-none">
          <MenuItem onAction={() => onRename(name)}
                    className="cursor-pointer px-4 py-2 text-sm outline-none focus:bg-[var(--s2)]">
            Переименовать
          </MenuItem>
          <MenuItem onAction={() => onDelete(name)}
                    className="cursor-pointer px-4 py-2 text-sm outline-none focus:bg-[var(--s2)]"
                    style={{ color: 'var(--color-neg)' }}>
            Удалить
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
```

- [ ] **Step 5: Подключить Toast к ошибкам приложения**

В `frontend/src/app.tsx` заменить блок вывода ошибки на компонент:

```tsx
import { Toast } from './components/Toast';
```

```tsx
const [dismissed, setDismissed] = useState(false);
useEffect(() => { setDismissed(false); }, [error]);
```

```tsx
<Toast message={dismissed ? null : error}
       onRetry={() => { setDismissed(true); void reload(); }}
       onDismiss={() => setDismissed(true)} />
```

`reload` добавить в деструктуризацию `useExpenses`.

- [ ] **Step 6: Прогнать тесты**

Run: `cd frontend && npx vitest run`
Expected: PASS, все наборы.

- [ ] **Step 7: Закоммитить**

```bash
git add frontend/src/components/Toast.tsx frontend/src/components/CategoryMenu.tsx \
        frontend/src/components/CategoryMenu.test.tsx frontend/src/lib/api.ts \
        frontend/src/lib/api.test.ts frontend/src/app.tsx
git commit -m "feat: retryable error toast and custom category menu"
```

---

### Task 17: Аналитика — сравнение периодов и источники

**Files:**
- Modify: `frontend/src/lib/aggregate.ts`, `frontend/src/lib/aggregate.test.ts`, `frontend/src/screens/Analytics.tsx`, `frontend/src/screens/Analytics.test.tsx`

**Interfaces:**
- Consumes: `byCategory`, `byDay`, `totalFor`, `pctDelta`.
- Produces: `bySource(items: Expense[], to: Currency, rates: Rates): { source: string; total: number }[]` — по убыванию; `<Analytics items={Expense[]} currency={Currency} rates={Rates} month={string} />`

- [ ] **Step 1: Написать падающие тесты**

Дописать в `frontend/src/lib/aggregate.test.ts`:

```ts
import { bySource } from './aggregate';

describe('bySource', () => {
  it('группирует по источнику и сортирует по убыванию', () => {
    const items = [
      mk({ id: 'a', amount: 100, source: 'Общий' }),
      mk({ id: 'b', amount: 400, source: 'Наличные' }),
      mk({ id: 'c', amount: 50, source: 'Общий' }),
    ];
    const r = bySource(items, 'UAH', RATES);
    expect(r[0]).toEqual({ source: 'Наличные', total: 400 });
    expect(r[1]).toEqual({ source: 'Общий', total: 150 });
  });
});
```

Дописать в `frontend/src/screens/Analytics.test.tsx`:

```tsx
it('показывает сравнение с предыдущим месяцем', () => {
  const items = [
    mk({ id: 'a', date: '2026-03-03', amount: 500 }),
    mk({ id: 'b', date: '2026-02-03', amount: 1000 }),
  ];
  render(<Analytics items={items} currency="UAH" rates={{}} month="2026-03" />);
  expect(screen.getByTestId('period-delta')).toHaveTextContent('50');
});

it('показывает разбивку по источникам', () => {
  const items = [mk({ id: 'a', amount: 200, source: 'Наличные' })];
  render(<Analytics items={items} currency="UAH" rates={{}} month="2026-03" />);
  expect(screen.getByTestId('src-Наличные')).toHaveTextContent('200 ₴');
});
```

В существующих тестах `Analytics` добавить пропс `month="2026-03"`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd frontend && npx vitest run src/lib/aggregate.test.ts src/screens/Analytics.test.tsx`
Expected: FAIL — `bySource` не существует, у `Analytics` нет пропса `month`.

- [ ] **Step 3: Добавить агрегацию по источникам**

В `frontend/src/lib/aggregate.ts` дописать:

```ts
export function bySource(
  items: Expense[],
  to: Currency,
  rates: Rates
): { source: string; total: number }[] {
  const grouped = groupSum(items, to, rates, (e) => e.source);
  return Object.entries(grouped)
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total);
}
```

- [ ] **Step 4: Расширить экран аналитики**

В `frontend/src/screens/Analytics.tsx` изменить сигнатуру и добавить два блока:

```tsx
import { byCategory, byDay, bySource, filterMonth, totalFor } from '../lib/aggregate';
import { pctDelta } from '../lib/money';
import { sourceIcon } from '../lib/icons';

interface Props { items: Expense[]; currency: Currency; rates: Rates; month: string }

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
```

Внутри компонента заменить исходные данные на отфильтрованные по месяцу и посчитать дельту:

```tsx
const current = filterMonth(items, month);
const previousTotal = totalFor(filterMonth(items, previousMonth(month)), currency, rates);
const currentTotal = totalFor(current, currency, rates);
const delta = pctDelta(currentTotal, previousTotal);
```

Далее `cats`, `daily` и `srcs` считать от `current`, а не от `items`:

```tsx
const cats = byCategory(current, currency, rates);
const srcs = bySource(current, currency, rates);
const daily = Object.entries(byDay(current, currency, rates))
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([date, total]) => ({ date: date.slice(8), total }));
```

Условие пустого состояния заменить на `if (current.length === 0)`.

Добавить блок сравнения перед структурой трат:

```tsx
{delta !== null && (
  <section className="rounded-2xl border p-4"
           style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
       style={{ color: 'var(--tx2)' }}>Против прошлого месяца</p>
    <p data-testid="period-delta" className="tnum text-2xl font-medium"
       style={{ color: delta <= 0 ? 'var(--color-pos)' : 'var(--color-neg)' }}>
      {delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(0)}%
    </p>
    <p className="mt-1 text-xs" style={{ color: 'var(--tx2)' }}>
      было <MoneyText value={previousTotal} currency={currency} />
    </p>
  </section>
)}
```

Добавить блок источников в конце:

```tsx
<section className="rounded-2xl border p-4"
         style={{ borderColor: 'var(--bd)', background: 'var(--s1)' }}>
  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em]"
     style={{ color: 'var(--tx2)' }}>Источники денег</p>
  <ul className="space-y-2">
    {srcs.map((s) => {
      const IconCmp = sourceIcon(s.source);
      return (
        <li key={s.source} data-testid={`src-${s.source}`}
            className="flex items-center gap-2 text-sm">
          <IconCmp size={16} weight="duotone" color="var(--color-ac)" />
          <span className="flex-1">{s.source}</span>
          <MoneyText value={s.total} currency={currency} className="font-medium" />
        </li>
      );
    })}
  </ul>
</section>
```

- [ ] **Step 5: Передать месяц из оболочки**

В `frontend/src/app.tsx` в панели аналитики добавить пропс:

```tsx
<Analytics items={items} currency={currency} rates={rates} month={month} />
```

- [ ] **Step 6: Прогнать тесты**

Run: `cd frontend && npx vitest run`
Expected: PASS, все наборы.

- [ ] **Step 7: Закоммитить**

```bash
git add frontend/src/lib/aggregate.ts frontend/src/lib/aggregate.test.ts \
        frontend/src/screens/Analytics.tsx frontend/src/screens/Analytics.test.tsx \
        frontend/src/app.tsx
git commit -m "feat: period comparison and source breakdown in Analytics"
```

---

### Task 18: Команда /beta и проверка в Telegram

**Files:**
- Modify: `bot/main.py`

**Interfaces:**
- Consumes: маршрут `/v2` из Task 1.
- Produces: команда бота `/beta`, открывающая новый интерфейс.

- [ ] **Step 1: Добавить команду**

В `bot/main.py` после обработчика `cmd_add` добавить:

```python
@dp.message(Command("beta"))
async def cmd_beta(message: types.Message):
    kb = types.InlineKeyboardMarkup(inline_keyboard=[
        [types.InlineKeyboardButton(
            text="Открыть новый интерфейс",
            web_app=WebAppInfo(url=with_cache_bust(WEBAPP_URL + "/v2"))
        )]
    ])
    await message.answer("Бета нового интерфейса:", reply_markup=kb)
```

- [ ] **Step 2: Проверить синтаксис**

Run: `python3 -c "import ast; ast.parse(open('bot/main.py').read()); print('ok')"`
Expected: `ok`

- [ ] **Step 3: Закоммитить и выкатить**

```bash
git add bot/main.py
git commit -m "feat: /beta command opening the v2 interface"
git push origin main
```

- [ ] **Step 4: Проверить на живом сервисе**

После завершения деплоя на Render выполнить:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://expense-bot-axmu.onrender.com/v2
```

Expected: `200`

- [ ] **Step 5: Проверить в браузере фактическую видимость**

Открыть `https://expense-bot-axmu.onrender.com/v2`, выставить роль и убедиться, что
корневой контейнер действительно видим:

```js
localStorage.setItem('role','Vova'); location.reload();
// после перезагрузки:
getComputedStyle(document.querySelector('#root > div')).opacity  // ожидается "1"
```

Проверять именно вычисленную прозрачность, а не `display` и высоту: 2026-07-30 форма имела
`display: block` и высоту 1194 при `opacity: 0` и выглядела как белый экран.

- [ ] **Step 6: Проверить в Telegram**

Отправить боту `/beta`, открыть интерфейс, записать тестовую трату, убедиться, что строка
появилась в листе `RAW`, и что переключение вкладок работает.

---

### Task 19: Переключение главной страницы на v2

**Files:**
- Modify: `bot/main.py`

**Interfaces:**
- Consumes: подтверждённый в Task 18 рабочий интерфейс на `/v2`.
- Produces: `/` отдаёт новый интерфейс.

Выполнять **только после явного подтверждения пользователя**, что интерфейс на `/v2`
проверен в Telegram и пригоден.

- [ ] **Step 1: Переключить корневой маршрут**

Заменить тело `serve_webapp` в `bot/main.py`:

```python
async def serve_webapp(request):
    v2 = WEBAPP_DIR / "v2" / "index.html"
    if v2.exists():
        return web.FileResponse(v2)
    return web.FileResponse(WEBAPP_DIR / "index.html")
```

Фоллбэк на старый файл сохраняется: если сборка не попала в образ, интерфейс не пропадает.

- [ ] **Step 2: Проверить синтаксис**

Run: `python3 -c "import ast; ast.parse(open('bot/main.py').read()); print('ok')"`
Expected: `ok`

- [ ] **Step 3: Закоммитить и выкатить**

```bash
git add bot/main.py
git commit -m "feat: serve v2 interface from the root route"
git push origin main
```

- [ ] **Step 4: Проверить после деплоя**

Run: `curl -s https://expense-bot-axmu.onrender.com/health`
Expected: `{"status": "ok", ...}`

Открыть бота, выполнить `/start`, открыть интерфейс кнопкой и записать трату.

---

## Итоговая проверка по критериям приёмки

Пройти список из раздела 11 спеки после Task 19:

- [ ] `/v2` открывается в Telegram и показывает заполненный интерфейс (Task 18)
- [ ] Создание, изменение и удаление траты отражаются в листе `RAW` (Task 18)
- [ ] Пользовательские категории и источники читаются и правятся через `/api/meta` (Task 16)
- [ ] Переключение валют пересчитывает суммы по курсам `/api/rates` (Task 3, Task 6)
- [ ] Светлая и тёмная темы проходят порог контраста (тест из Task 2)
- [ ] Ни один экран не теряет видимость при отключённых анимациях (тесты Task 8 и Task 13)
- [ ] Запись траты ощущается мгновенной (тесты Task 7)
- [ ] Старый интерфейс доступен как фоллбэк (Task 19)
