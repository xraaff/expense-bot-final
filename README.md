# Expense Tracker Bot v3 - Full Deploy Guide

## Что внутри

Mini App с двумя экранами + островок-навбар:

**Расход** - сумма, UAH/USD/PLN, 11 категорий + свои (сохраняются навсегда), описание, Vova/Karina/Другой источник, выбор даты через календарь-пикер (выбранная дата подсвечена)

**Календарь** - общая сумма за месяц, дни с данными подсвечены, тап на день показывает превью внизу с кнопкой "посмотреть день", внутри дня - каждый расход с кнопками Изменить и Удалить

**Google Sheets** - все данные с уникальными ID, поддержка add/update/delete

---

## ШАГ 1: Telegram Bot (2 мин)

1. Открой **@BotFather** в Telegram
2. `/newbot`
3. Имя: `Vova Karina Expenses` (любое)
4. Username: `vk_expenses_bot` (уникальный, на `bot`)
5. Скопируй токен: `7123456789:AAH...` - это **BOT_TOKEN**

---

## ШАГ 2: Google Service Account (5 мин)

### 2.1 Google Cloud
1. https://console.cloud.google.com/
2. Выпадающий список проектов вверху -> **New Project** -> назови `expenses` -> Create
3. Выбери этот проект

### 2.2 Включить API
1. Меню -> **APIs & Services** -> **Library**
2. Найди **Google Sheets API** -> **Enable**
3. Найди **Google Drive API** -> **Enable**

### 2.3 Service Account
1. **APIs & Services** -> **Credentials** -> **Create Credentials** -> **Service Account**
2. Имя: `expense-bot` -> **Create and Continue** -> пропусти роль -> **Done**
3. Нажми на созданный аккаунт в списке
4. Вкладка **Keys** -> **Add Key** -> **Create New Key** -> **JSON** -> **Create**
5. Скачается JSON -> это **GOOGLE_CREDS_JSON**
6. Из JSON скопируй `client_email` (понадобится для шаринга таблицы)

### 2.4 Google Таблица
1. https://sheets.google.com -> новая таблица
2. Из URL скопируй ID: `docs.google.com/spreadsheets/d/`**ЭТОТ_ID**`/edit` -> это **SPREADSHEET_ID**
3. Кнопка **Поделиться** -> вставь `client_email` из JSON -> **Редактор** -> Отправить

---

## ШАГ 3: GitHub (2 мин)

1. Создай **приватный** репо на GitHub
2. Залей файлы со структурой:

```
expense-bot/
  bot/
    main.py
  webapp/
    index.html
  requirements.txt
  Dockerfile
  Procfile
  .gitignore
```

Команды:
```bash
cd expense-bot
git init
git add .
git commit -m "init"
git remote add origin git@github.com:YOUR/expense-bot.git
git push -u origin main
```

---

## ШАГ 4: Railway (3 мин)

1. https://railway.app -> **Login with GitHub**
2. **New Project** -> **Deploy from GitHub Repo** -> выбери репо
3. Railway обнаружит Dockerfile и начнет билд

### 4.1 Переменные
Твой сервис -> **Variables** -> добавь:

| Variable | Value |
|----------|-------|
| `BOT_TOKEN` | Токен от BotFather |
| `GOOGLE_CREDS_JSON` | Весь JSON в одну строку* |
| `SPREADSHEET_ID` | ID из URL таблицы |
| `WEBAPP_URL` | URL от Railway (шаг 4.2) |
| `PORT` | `8080` |

*JSON в одну строку:
```bash
python3 -c "import json,sys;print(json.dumps(json.load(open('key.json'))))"
```

### 4.2 Домен
1. Сервис -> **Settings** -> **Networking** -> **Generate Domain**
2. Скопируй URL (типа `https://expense-bot-xxx.up.railway.app`)
3. Вернись в Variables -> установи `WEBAPP_URL` = этот URL
4. Дождись redeploy

---

## ШАГ 5: Проверка

1. В Telegram открой бота -> `/start`
2. Нажми "+ Добавить расход"
3. Должна открыться WebView форма
4. Заполни -> отправь
5. Проверь Google Таблицу -> должна появиться строка с ID

---

## Формат таблицы

| id | date | amount | currency | category | description | payer | created_at |
|----|------|--------|----------|----------|-------------|-------|------------|
| m2abc1x | 2026-03-03 | 635 | UAH | Кафе | кофе обед | Karina | 2026-03-03 14:32 |

ID генерируется автоматически, используется для edit/delete.

---

## Редактирование и удаление

В Календаре: тап на день -> кнопка "посмотреть день" -> у каждого расхода кнопки **Изменить** и **Удалить**.

- Изменить: меняет сумму, описание и плательщика (в таблице тоже обновляется)
- Удалить: удаляет строку из таблицы

---

## Анализ в Claude

1. Google Таблица -> **File** -> **Download** -> **CSV**
2. Загрузи в Claude с промтом:

```
Вот CSV с нашими семейными расходами за [период].
Плательщики: Vova и Karina. Иногда "Другой источник".
Валюты: UAH, USD, PLN.

Проанализируй:
1. Общая сумма по каждой валюте, средний расход в день
2. Топ категорий по сумме (таблица + % от общих)
3. Vova vs Karina: кто сколько, на что, баланс
4. Паттерны: дорогие дни, дни недели, крупные vs мелкие
5. Рекомендации по оптимизации

Формат: таблицы, цифры, без воды.
```

---

## Кастомизация

**Валюты** - в `webapp/index.html`, секция `cur`:
```html
<b data-v="EUR">EUR</b>
```

**Категории** - добавляются прямо из приложения кнопкой "+", хранятся в Telegram CloudStorage.

**Плательщики** - в `webapp/index.html`, секция `pRow`:
```html
<button class="pb" data-p="Имя"><span class="dt"></span>Имя</button>
```
