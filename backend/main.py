"""
FastAPI backend for the Real-Time Global Market Dashboard.

Architecture:
  - A background asyncio task fetches market data every REFRESH_INTERVAL seconds.
  - All connected WebSocket clients receive the payload immediately after each fetch.
  - A REST GET /api/market-data endpoint serves the last cached payload for the
    initial page load (so the UI shows data before the first WS push arrives).
"""

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Set

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from data_fetcher import DataFetcher

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("dashboard")

REFRESH_INTERVAL = int(os.getenv("REFRESH_INTERVAL", "10"))

# ── Shared state ──────────────────────────────────────────────────────────────
clients: Set[WebSocket] = set()
latest_payload: dict = {}
fetcher = DataFetcher()


async def broadcast(data: dict) -> None:
    if not clients:
        return
    message = json.dumps(data, default=str)
    dead: Set[WebSocket] = set()
    for ws in clients.copy():
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    clients.difference_update(dead)


async def refresh_loop() -> None:
    """Continuously fetch market data and broadcast to all WebSocket clients."""
    global latest_payload
    while True:
        try:
            data = await fetcher.fetch_all()
            latest_payload = data
            await broadcast(data)
            logger.info(
                "Data refreshed — %d symbol groups | %d client(s)",
                5,
                len(clients),
            )
        except Exception as exc:
            logger.exception("Refresh error: %s", exc)
        await asyncio.sleep(REFRESH_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(refresh_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="ScalpX API", version="1.0.0", lifespan=lifespan)

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",   # any Vercel preview URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/market-data")
async def get_market_data():
    """Initial REST fetch — returns latest cached payload or fetches fresh data."""
    if latest_payload:
        return latest_payload
    data = await fetcher.fetch_all()
    return data


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    logger.info("WS connected  total=%d", len(clients))

    # Push latest data immediately so the UI isn't blank on connect
    if latest_payload:
        await websocket.send_text(json.dumps(latest_payload, default=str))

    try:
        while True:
            # Keep the read loop alive; client may send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)
        logger.info("WS disconnected  total=%d", len(clients))


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "clients": len(clients),
        "last_refresh": latest_payload.get("timestamp"),
        "time": datetime.utcnow().isoformat(),
    }
