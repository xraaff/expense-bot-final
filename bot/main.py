"""
Expense Tracker Telegram Bot v4
Google Sheets (RAW/META) · Auth · Stats · Rates · Export CSV
"""
import os, json, logging, base64, traceback, io, csv, time
from datetime import datetime, date, timedelta
from pathlib import Path

from aiohttp import web
import aiohttp
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, MenuButtonWebApp, BufferedInputFile
import gspread
from google.oauth2.service_account import Credentials

# ─── ENV ───
BOT_TOKEN = os.environ["BOT_TOKEN"]
SPREADSHEET_ID = os.environ["SPREADSHEET_ID"]
WEBAPP_URL = os.environ["WEBAPP_URL"]
PORT = int(os.environ.get("PORT", 8080))
AUTH_KEY_VOVA = os.environ.get("AUTH_KEY_VOVA", "")
AUTH_KEY_KARINA = os.environ.get("AUTH_KEY_KARINA", "")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("expense-bot")

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

RAW_HEADER = ["id", "date", "amount", "currency", "category", "description", "payer", "source", "user_id", "created_at"]

# ─── GOOGLE SHEETS SINGLETON ───
_gc = None
_sh = None
_ws_cache = {}

def _get_creds_dict():
    b64 = os.environ.get("GOOGLE_CREDS_JSON_BASE64", "")
    if b64:
        raw = base64.b64decode(b64)
        return json.loads(raw)
    raw = os.environ.get("GOOGLE_CREDS_JSON", "")
    if not raw:
        raise RuntimeError("No GOOGLE_CREDS_JSON or GOOGLE_CREDS_JSON_BASE64 in env")
    return json.loads(raw)

def _init_sheets():
    global _gc, _sh, _ws_cache
    creds_dict = _get_creds_dict()
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    _gc = gspread.authorize(creds)
    _sh = _gc.open_by_key(SPREADSHEET_ID)
    titles = [ws.title for ws in _sh.worksheets()]
    log.info("Spreadsheet opened. Worksheets: %s", titles)

    # ensure RAW
    if "RAW" not in titles:
        ws = _sh.add_worksheet(title="RAW", rows=5000, cols=len(RAW_HEADER))
        ws.update("A1:J1", [RAW_HEADER], value_input_option="RAW")
        ws.format("A1:J1", {"textFormat": {"bold": True}})
        ws.freeze(rows=1)
        log.info("Created worksheet RAW with header")
    else:
        ws = _sh.worksheet("RAW")
        # verify header
        row1 = ws.row_values(1)
        if row1 != RAW_HEADER:
            log.warning("RAW header mismatch: %s — overwriting", row1)
            ws.update("A1:J1", [RAW_HEADER], value_input_option="RAW")
    _ws_cache["RAW"] = ws if "RAW" not in _ws_cache else _sh.worksheet("RAW")

    # ensure META
    if "META" not in titles:
        meta = _sh.add_worksheet(title="META", rows=100, cols=3)
        meta.update("A1:C1", [["key", "value", "updated_at"]], value_input_option="RAW")
        meta.format("A1:C1", {"textFormat": {"bold": True}})
        # seed default categories
        _meta_set_internal(meta, "categories", json.dumps([], ensure_ascii=False))
        _meta_set_internal(meta, "sources", json.dumps([], ensure_ascii=False))
        log.info("Created worksheet META")
    _ws_cache["META"] = _sh.worksheet("META") if "META" not in titles else _sh.worksheet("META")

    _ws_cache["RAW"] = _sh.worksheet("RAW")
    _ws_cache["META"] = _sh.worksheet("META")

def _meta_set_internal(ws, key, value):
    """Set a key in META (internal, no cache lookup)."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        cell = ws.find(key, in_column=1)
        if cell:
            ws.update(f"B{cell.row}:C{cell.row}", [[value, ts]], value_input_option="RAW")
            return
    except Exception:
        pass
    ws.append_row([key, value, ts], value_input_option="RAW")

def get_ws(name="RAW"):
    global _gc, _sh, _ws_cache
    if _sh is None:
        _init_sheets()
    if name in _ws_cache:
        return _ws_cache[name]
    ws = _sh.worksheet(name)
    _ws_cache[name] = ws
    return ws

def _reauth_and_retry(name="RAW"):
    """Re-authorize if token expired."""
    global _gc, _sh, _ws_cache
    _ws_cache.clear()
    _init_sheets()
    return get_ws(name)

# ─── SHEETS OPERATIONS ───

def sheets_add(data):
    try:
        ws = get_ws("RAW")
        row = [
            data.get("id", ""),
            data.get("date", ""),
            data.get("amount", ""),
            data.get("currency", "UAH"),
            data.get("category", ""),
            data.get("description", ""),
            data.get("payer", ""),
            data.get("source", ""),
            data.get("user_id", ""),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        ]
        ws.append_row(row, value_input_option="USER_ENTERED")
        log.info("RAW append OK: id=%s amount=%s", data.get("id"), data.get("amount"))
        return {"ok": True}
    except gspread.exceptions.APIError as e:
        if "401" in str(e) or "403" in str(e):
            ws = _reauth_and_retry("RAW")
            row = [
                data.get("id", ""),
                data.get("date", ""),
                data.get("amount", ""),
                data.get("currency", "UAH"),
                data.get("category", ""),
                data.get("description", ""),
                data.get("payer", ""),
                data.get("source", ""),
                data.get("user_id", ""),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ]
            ws.append_row(row, value_input_option="USER_ENTERED")
            log.info("RAW append OK (re-auth): id=%s", data.get("id"))
            return {"ok": True}
        raise
    except Exception:
        log.error("sheets_add FAILED:\n%s", traceback.format_exc())
        raise

def sheets_update(data):
    try:
        ws = get_ws("RAW")
        eid = data.get("id", "")
        if not eid:
            return {"ok": False, "error": "no id"}
        cell = ws.find(eid, in_column=1)
        if not cell:
            return {"ok": False, "error": f"id {eid} not found"}
        r = cell.row
        # update fields B-H (date, amount, currency, category, description, payer, source)
        vals = [
            data.get("date", ws.cell(r, 2).value or ""),
            data.get("amount", ws.cell(r, 3).value or ""),
            data.get("currency", ws.cell(r, 4).value or ""),
            data.get("category", ws.cell(r, 5).value or ""),
            data.get("description", ws.cell(r, 6).value or ""),
            data.get("payer", ws.cell(r, 7).value or ""),
            data.get("source", ws.cell(r, 8).value or ""),
        ]
        ws.update(f"B{r}:H{r}", [vals], value_input_option="USER_ENTERED")
        log.info("RAW update OK: row=%d id=%s", r, eid)
        return {"ok": True}
    except Exception:
        log.error("sheets_update FAILED:\n%s", traceback.format_exc())
        raise

def sheets_delete(data):
    try:
        ws = get_ws("RAW")
        eid = data.get("id", "")
        if not eid:
            return {"ok": False, "error": "no id"}
        cell = ws.find(eid, in_column=1)
        if not cell:
            return {"ok": False, "error": f"id {eid} not found"}
        ws.delete_rows(cell.row)
        log.info("RAW delete OK: row=%d id=%s", cell.row, eid)
        return {"ok": True}
    except Exception:
        log.error("sheets_delete FAILED:\n%s", traceback.format_exc())
        raise

def sheets_get_all_raw():
    """Return all rows from RAW as list of dicts."""
    ws = get_ws("RAW")
    records = ws.get_all_records()
    return records

def sheets_get_raw_values():
    """Return all values from RAW (including header)."""
    ws = get_ws("RAW")
    return ws.get_all_values()

# ─── META OPERATIONS ───

def meta_get(key):
    ws = get_ws("META")
    try:
        cell = ws.find(key, in_column=1)
        if cell:
            return ws.cell(cell.row, 2).value
    except Exception:
        pass
    return None

def meta_set(key, value):
    ws = get_ws("META")
    _meta_set_internal(ws, key, value)

def meta_get_categories():
    raw = meta_get("categories")
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            pass
    return []

def meta_get_sources():
    raw = meta_get("sources")
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            pass
    return []

# ─── RATES CACHE ───
_rates_cache = {"data": None, "ts": 0}

async def fetch_rates(base="UAH"):
    now = time.time()
    if _rates_cache["data"] and (now - _rates_cache["ts"]) < 3600:
        return _rates_cache["data"]
    try:
        # Try frankfurter.app first (free, no key)
        url = f"https://api.frankfurter.app/latest?from={base}&to=USD,PLN,EUR"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    rates = data.get("rates", {})
                    result = {"ok": True, "base": base, "rates": rates, "ts": now}
                    _rates_cache["data"] = result
                    _rates_cache["ts"] = now
                    log.info("Rates fetched: %s", rates)
                    return result
    except Exception:
        log.warning("Rates fetch failed:\n%s", traceback.format_exc())
    # fallback hardcoded approx rates
    if base == "UAH":
        fallback = {"USD": 0.024, "PLN": 0.096, "EUR": 0.022}
    elif base == "USD":
        fallback = {"UAH": 41.5, "PLN": 4.0, "EUR": 0.92}
    elif base == "PLN":
        fallback = {"UAH": 10.4, "USD": 0.25, "EUR": 0.23}
    else:
        fallback = {}
    result = {"ok": False, "base": base, "rates": fallback, "ts": now, "fallback": True}
    _rates_cache["data"] = result
    _rates_cache["ts"] = now
    return result

# ─── BOT ───
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = types.InlineKeyboardMarkup(inline_keyboard=[
        [types.InlineKeyboardButton(
            text="+ Добавить расход",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )]
    ])
    await message.answer(
        "Привет! Я трекер расходов 💰\n\n"
        "Нажми кнопку ниже или используй:\n"
        "/add — форма расхода\n"
        "/stats — ссылка на таблицу\n"
        "/export — CSV за текущий месяц",
        reply_markup=kb
    )
    try:
        await bot.set_chat_menu_button(
            chat_id=message.chat.id,
            menu_button=MenuButtonWebApp(
                text="Расход", web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
    except Exception as e:
        log.warning("Menu btn: %s", e)

@dp.message(Command("add"))
async def cmd_add(message: types.Message):
    kb = types.InlineKeyboardMarkup(inline_keyboard=[
        [types.InlineKeyboardButton(
            text="+ Добавить расход",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )]
    ])
    await message.answer("Заполни форму:", reply_markup=kb)

@dp.message(Command("stats"))
async def cmd_stats(message: types.Message):
    await message.answer(
        f"📊 Таблица: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}"
    )

@dp.message(Command("export"))
async def cmd_export(message: types.Message):
    try:
        await message.answer("⏳ Готовлю CSV...")
        all_vals = sheets_get_raw_values()
        if len(all_vals) <= 1:
            await message.answer("Таблица пуста.")
            return

        # Filter current month
        now = datetime.now()
        month_str = now.strftime("%Y-%m")
        header = all_vals[0]
        date_idx = header.index("date") if "date" in header else 1

        filtered = [header]
        for row in all_vals[1:]:
            if len(row) > date_idx and row[date_idx].startswith(month_str):
                filtered.append(row)

        if len(filtered) <= 1:
            # No data for current month, export all
            filtered = all_vals

        buf = io.StringIO()
        writer = csv.writer(buf)
        for row in filtered:
            writer.writerow(row)

        csv_bytes = buf.getvalue().encode("utf-8-sig")
        fname = f"expenses_{month_str}.csv"
        doc = BufferedInputFile(csv_bytes, filename=fname)
        await message.answer_document(doc, caption=f"📋 Расходы за {month_str}\nСтрок: {len(filtered)-1}")
    except Exception as e:
        log.error("Export error:\n%s", traceback.format_exc())
        await message.answer(f"Ошибка экспорта: {e}")

@dp.message()
async def handle_webapp_data(message: types.Message):
    if message.web_app_data:
        try:
            data = json.loads(message.web_app_data.data)
            data["user_id"] = str(message.from_user.id)
            if not data.get("id"):
                data["id"] = datetime.now().strftime("%s") + str(message.from_user.id)[-4:]
            result = sheets_add(data)
            if result.get("ok"):
                await message.answer(
                    f"✅ Записано! {data.get('amount','?')} {data.get('currency','')} "
                    f"— {data.get('category','')}\n"
                    f"{data.get('description','')}\n"
                    f"Платил: {data.get('payer','')}"
                )
            else:
                await message.answer(f"❌ Ошибка: {result.get('error')}")
        except Exception as e:
            log.error("WA data error:\n%s", traceback.format_exc())
            await message.answer(f"Ошибка: {e}")

# ─── AIOHTTP WEB SERVER ───
app = web.Application()
WEBAPP_DIR = Path(__file__).parent.parent / "webapp"

async def serve_webapp(request):
    return web.FileResponse(WEBAPP_DIR / "index.html")

async def serve_static(request):
    fn = request.match_info["filename"]
    fp = WEBAPP_DIR / fn
    return web.FileResponse(fp) if fp.exists() else web.Response(status=404)

async def health(request):
    try:
        ws = get_ws("RAW")
        row1 = ws.row_values(1)
        if row1 == RAW_HEADER:
            return web.json_response({"status": "ok", "worksheets": [w.title for w in _sh.worksheets()]})
        return web.json_response({"status": "fail", "error": "RAW header mismatch", "got": row1}, status=500)
    except Exception as e:
        log.error("Health check error:\n%s", traceback.format_exc())
        return web.json_response({"status": "fail", "error": str(e)}, status=500)

async def api_auth(request):
    try:
        data = await request.json()
        key = data.get("key", "")
        user_id = data.get("user_id", "")
        chat_id = data.get("chat_id", "")
        if key == AUTH_KEY_VOVA and AUTH_KEY_VOVA:
            log.info("Auth OK: Vova (user_id=%s)", user_id)
            return web.json_response({"ok": True, "role": "Vova"})
        if key == AUTH_KEY_KARINA and AUTH_KEY_KARINA:
            log.info("Auth OK: Karina (user_id=%s)", user_id)
            return web.json_response({"ok": True, "role": "Karina"})
        log.warning("Auth FAIL: bad key from user_id=%s", user_id)
        return web.json_response({"ok": False, "error": "invalid key"})
    except Exception as e:
        log.error("Auth error:\n%s", traceback.format_exc())
        return web.json_response({"ok": False, "error": str(e)}, status=500)

async def api_expense(request):
    try:
        data = await request.json()
        action = data.pop("_action", "add")
        log.info("api_expense action=%s data=%s", action, {k: v for k, v in data.items() if k != "source"})

        if action == "update":
            result = sheets_update(data)
        elif action == "delete":
            result = sheets_delete(data)
        else:
            # Generate ID if missing
            if not data.get("id"):
                data["id"] = datetime.now().strftime("%Y%m%d%H%M%S") + str(hash(str(data)))[-4:]
            result = sheets_add(data)

        return web.json_response(result)
    except Exception as e:
        log.error("api_expense error:\n%s", traceback.format_exc())
        return web.json_response({"ok": False, "error": str(e)}, status=500)

async def api_stats(request):
    try:
        date_from = request.query.get("from", "")
        date_to = request.query.get("to", "")
        records = sheets_get_all_raw()

        # Filter by date range
        filtered = []
        for r in records:
            d = str(r.get("date", ""))
            if date_from and d < date_from:
                continue
            if date_to and d > date_to:
                continue
            filtered.append(r)

        # Totals per currency
        totals_cur = {}
        for r in filtered:
            cur = str(r.get("currency", "UAH"))
            try:
                amt = float(r.get("amount", 0))
            except (ValueError, TypeError):
                amt = 0
            totals_cur[cur] = totals_cur.get(cur, 0) + amt

        # Totals by category
        totals_cat = {}
        for r in filtered:
            cat = str(r.get("category", ""))
            cur = str(r.get("currency", "UAH"))
            try:
                amt = float(r.get("amount", 0))
            except (ValueError, TypeError):
                amt = 0
            key = cat
            if key not in totals_cat:
                totals_cat[key] = {}
            totals_cat[key][cur] = totals_cat[key].get(cur, 0) + amt

        # Totals by day
        totals_day = {}
        for r in filtered:
            d = str(r.get("date", ""))
            cur = str(r.get("currency", "UAH"))
            try:
                amt = float(r.get("amount", 0))
            except (ValueError, TypeError):
                amt = 0
            if d not in totals_day:
                totals_day[d] = {}
            totals_day[d][cur] = totals_day[d].get(cur, 0) + amt

        return web.json_response({
            "ok": True,
            "count": len(filtered),
            "totals_currency": totals_cur,
            "totals_category": totals_cat,
            "totals_day": totals_day,
            "rows": filtered,
        })
    except Exception as e:
        log.error("api_stats error:\n%s", traceback.format_exc())
        return web.json_response({"ok": False, "error": str(e)}, status=500)

async def api_rates(request):
    base = request.query.get("base", "UAH")
    result = await fetch_rates(base)
    return web.json_response(result)

async def api_meta_get(request):
    try:
        categories = meta_get_categories()
        sources = meta_get_sources()
        return web.json_response({"ok": True, "categories": categories, "sources": sources})
    except Exception as e:
        log.error("api_meta_get error:\n%s", traceback.format_exc())
        return web.json_response({"ok": False, "error": str(e)}, status=500)

async def api_meta_update(request):
    try:
        data = await request.json()
        action = data.get("action", "")
        target = data.get("target", "")  # "categories" or "sources"

        if target == "categories":
            items = meta_get_categories()
        elif target == "sources":
            items = meta_get_sources()
        else:
            return web.json_response({"ok": False, "error": "bad target"})

        if action == "add":
            item = data.get("item", {})
            if item and item not in items:
                items.append(item)
        elif action == "rename":
            old_name = data.get("old_name", "")
            new_name = data.get("new_name", "")
            new_icon = data.get("new_icon", "")
            for i, it in enumerate(items):
                n = it.get("n", it) if isinstance(it, dict) else it
                if n == old_name:
                    if isinstance(it, dict):
                        items[i]["n"] = new_name
                        if new_icon:
                            items[i]["i"] = new_icon
                    else:
                        items[i] = new_name
                    break
        elif action == "delete":
            name = data.get("name", "")
            items = [it for it in items if (it.get("n", it) if isinstance(it, dict) else it) != name]
        else:
            return web.json_response({"ok": False, "error": "bad action"})

        meta_set(target, json.dumps(items, ensure_ascii=False))
        log.info("META %s %s: %s", target, action, data)
        return web.json_response({"ok": True, target: items})
    except Exception as e:
        log.error("api_meta_update error:\n%s", traceback.format_exc())
        return web.json_response({"ok": False, "error": str(e)}, status=500)

# ─── ROUTES ───
app.router.add_get("/", serve_webapp)
app.router.add_get("/health", health)
app.router.add_post("/api/auth", api_auth)
app.router.add_post("/api/expense", api_expense)
app.router.add_get("/api/stats", api_stats)
app.router.add_get("/api/rates", api_rates)
app.router.add_get("/api/meta", api_meta_get)
app.router.add_post("/api/meta", api_meta_update)
app.router.add_get("/{filename}", serve_static)

# ─── STARTUP ───
async def on_startup(_):
    import asyncio
    try:
        _init_sheets()
        log.info("Sheets initialized OK")
    except Exception:
        log.error("Sheets init FAILED:\n%s", traceback.format_exc())
    asyncio.create_task(dp.start_polling(bot))

app.on_startup.append(on_startup)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=PORT)
