# Переезд на Render — пошагово

Цель: бот работает на Render, **не засыпает** каждые 15 минут, все траты
пишутся в тот же Google Sheets, что и раньше. Данные не теряются — они лежат
во внешней таблице, а не на хостинге.

---

## 0. Почему раньше падало и как чиним

- Render free tier **усыпляет сервис после 15 минут без входящих HTTP-запросов**.
- Бот работает через polling (сам ходит в Telegram) → входящего трафика нет →
  Render усыпляет → бот молчит.
- **Фикс:** сервис пингует свой `/health` каждые 10 минут (`keepalive_loop` в
  коде) **плюс** внешний пингер cron-job.org стучит туда же — чтобы поднять
  сервис, даже если он всё-таки уснул. Двойная страховка, всё бесплатно.

---

## 1. Код на GitHub

Render деплоит из Git-репозитория.

```bash
cd /Users/mac/fin_bot/fin_bot
git init                     # если ещё не репозиторий
git add .
git commit -m "Render migration: keepalive + render.yaml"
git remote add origin git@github.com:xraaff/expense-bot-final.git   # свой репозиторий
git push -u origin main
```

Если репозиторий уже есть — просто `git add . && git commit && git push`.

---

## 2. Собрать значения переменных окружения

Берём из старого Railway-проекта (Variables) — значения те же:

| Переменная | Откуда взять |
|---|---|
| `BOT_TOKEN` | токен из @BotFather |
| `SPREADSHEET_ID` | ID таблицы из URL Google Sheets |
| `GOOGLE_CREDS_JSON_BASE64` | JSON сервис-аккаунта → в base64 (см. ниже) |
| `AUTH_KEY_VOVA` | ключ авторизации Vova |
| `AUTH_KEY_KARINA` | ключ авторизации Karina |
| `WEBAPP_URL` | **пока пропусти** — заполнишь после шага 4 |

Сделать base64 из JSON-файла кредов (одной строкой, без переносов):

```bash
base64 -i service-account.json | tr -d '\n' | pbcopy   # скопирует в буфер
```

> ⚠️ Тот же сервис-аккаунт (client_email) уже расшарен на таблицу «Family
> Expenses». Ничего пере-расшаривать не нужно — данные и история за март
> останутся на месте.

---

## 3. Создать сервис на Render

**Вариант A — через Blueprint (проще, читает `render.yaml`):**
1. Render Dashboard → **New → Blueprint**.
2. Подключи GitHub-репозиторий `expense-bot-final`.
3. Render увидит `render.yaml` и предложит создать сервис `expense-bot`.
4. Впиши значения секретов из шага 2 (кроме `WEBAPP_URL`).
5. Apply → пойдёт первый деплой.

**Вариант B — вручную:**
1. **New → Web Service** → подключи репозиторий.
2. Runtime: **Docker**. Plan: **Free**.
3. В разделе Environment добавь все переменные из шага 2.
4. Create Web Service.

---

## 4. Прописать WEBAPP_URL и передеплоить

1. После первого деплоя Render даст публичный URL, например
   `https://expense-bot-xxxx.onrender.com`.
2. Render Dashboard → сервис → **Environment** → добавь/поправь
   `WEBAPP_URL` = этот URL (без слэша в конце).
3. **Manual Deploy → Deploy latest commit** (или сохранение env-переменной само
   перезапустит сервис).

`WEBAPP_URL` нужен и для кнопки Mini App в боте, и для self-ping keep-alive.

---

## 5. Внешний пингер (cron-job.org) — страховка от засыпания

1. Зайди на https://cron-job.org (бесплатно), зарегистрируйся.
2. **Create cronjob**:
   - **URL:** `https://expense-bot-xxxx.onrender.com/health`
   - **Schedule:** каждые **10 минут** (`*/10 * * * *`).
   - Метод: GET.
3. Save. Теперь даже если внутренний self-ping не сработает, внешний разбудит
   сервис.

> Альтернатива: UptimeRobot (интервал минимум 5 мин на free) — тоже подойдёт.

---

## 6. Проверка

- Открой лог сервиса в Render — должны идти строки
  `Sheets initialized OK`, `Keep-alive enabled: every 600s`,
  `keepalive ping ... -> 200`.
- Открой `https://expense-bot-xxxx.onrender.com/health` в браузере →
  `{"status":"ok",...}`.
- В Telegram: `/start` → кнопка «Добавить расход» → запиши тестовый расход →
  проверь, что строка появилась в листе RAW.
- Подожди 20+ минут без активности и снова напиши боту — должен отвечать сразу
  (не «просыпаться» 30-60 сек). Если просыпается — проверь, что пингер настроен.

---

## 7. Что можно выключить на Railway

Когда убедился, что Render работает и пишет в таблицу — останови/удали старый
Railway-сервис, чтобы два бота не поллили один токен одновременно (иначе Telegram
будет отдавать апдейты то одному, то другому).

> ⚠️ Нельзя держать **два** запущенных инстанса с одним `BOT_TOKEN` на polling —
> будут конфликты `getUpdates`. На время миграции держи включённым только один.
