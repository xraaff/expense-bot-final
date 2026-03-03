"""
Expense Tracker Telegram Bot v3
Supports add / update / delete expenses in Google Sheets.
"""
import os
import json
import logging
from datetime import datetime
from pathlib import Path

from aiohttp import web
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, MenuButtonWebApp
import gspread
from google.oauth2.service_account import Credentials

BOT_TOKEN = os.environ["BOT_TOKEN"]
GOOGLE_CREDS_JSON = os.environ["GOOGLE_CREDS_JSON"]
SPREADSHEET_ID = os.environ["SPREADSHEET_ID"]
WEBAPP_URL = os.environ["WEBAPP_URL"]
PORT = int(os.environ.get("PORT", 8080))

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def get_sheet():
    creds_dict = json.loads(GOOGLE_CREDS_JSON)
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SPREADSHEET_ID)
    try:
        ws = sh.worksheet("Expenses")
    except gspread.exceptions.WorksheetNotFound:
        ws = sh.add_worksheet(title="Expenses", rows=5000, cols=10)
        ws.update("A1:H1", [[
            "id", "date", "amount", "currency",
            "category", "description", "payer", "created_at"
        ]])
        ws.format("A1:H1", {"textFormat": {"bold": True}})
        ws.freeze(rows=1)
    return ws


def append_expense(data):
    ws = get_sheet()
    ws.append_row([
        data.get("id", ""),
        data.get("date", ""),
        data.get("amount", ""),
        data.get("currency", "UAH"),
        data.get("category", ""),
        data.get("description", ""),
        data.get("payer", ""),
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    ], value_input_option="USER_ENTERED")
    log.info("Added: %s", data.get("id"))


def update_expense(data):
    ws = get_sheet()
    eid = data.get("id", "")
    if not eid:
        return
    try:
        cell = ws.find(eid, in_column=1)
        if cell:
            r = cell.row
            ws.update(f"C{r}", [[data.get("amount", "")]])
            ws.update(f"F{r}", [[data.get("description", "")]])
            ws.update(f"G{r}", [[data.get("payer", "")]])
            log.info("Updated row %d", r)
    except Exception as e:
        log.error("Update err: %s", e)


def delete_expense(data):
    ws = get_sheet()
    eid = data.get("id", "")
    if not eid:
        return
    try:
        cell = ws.find(eid, in_column=1)
        if cell:
            ws.delete_rows(cell.row)
            log.info("Deleted row %d", cell.row)
    except Exception as e:
        log.error("Delete err: %s", e)


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
        "Привет! Я трекер расходов.\n\n"
        "/add - форма\n/stats - таблица",
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
    await message.answer("Заполни:", reply_markup=kb)


@dp.message(Command("stats"))
async def cmd_stats(message: types.Message):
    await message.answer(
        f"Таблица: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}"
    )


@dp.message()
async def handle_webapp_data(message: types.Message):
    if message.web_app_data:
        try:
            data = json.loads(message.web_app_data.data)
            append_expense(data)
            await message.answer(
                f"Записано! {data.get('amount','?')} {data.get('currency','')} "
                f"- {data.get('category','')}\n"
                f"{data.get('description','')}\n"
                f"Платил: {data.get('payer','')}"
            )
        except Exception as e:
            log.error("WA err: %s", e)
            await message.answer(f"Ошибка: {e}")


app = web.Application()
WEBAPP_DIR = Path(__file__).parent.parent / "webapp"


async def serve_webapp(request):
    return web.FileResponse(WEBAPP_DIR / "index.html")


async def serve_static(request):
    fn = request.match_info["filename"]
    fp = WEBAPP_DIR / fn
    return web.FileResponse(fp) if fp.exists() else web.Response(status=404)


async def health(request):
    return web.json_response({"status": "ok"})


async def api_expense(request):
    try:
        data = await request.json()
        action = data.pop("_action", "add")
        if action == "update":
            update_expense(data)
        elif action == "delete":
            delete_expense(data)
        else:
            append_expense(data)
        return web.json_response({"ok": True})
    except Exception as e:
        log.error("API: %s", e)
        return web.json_response({"ok": False, "error": str(e)}, status=500)


app.router.add_get("/", serve_webapp)
app.router.add_get("/health", health)
app.router.add_post("/api/expense", api_expense)
app.router.add_get("/{filename}", serve_static)


async def on_startup(_):
    import asyncio
    asyncio.create_task(dp.start_polling(bot))

app.on_startup.append(on_startup)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=PORT)
