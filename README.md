# MarketPulse — Real-Time Global Trading Dashboard

A professional intraday trading dashboard tracking global markets, Indian pre-market cues,
key drivers (forex, commodities, bonds), and an AI-computed NIFTY bias score — all updating
every 10 seconds via WebSocket.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           React Frontend (Vite)         │  ← Dark UI, Tailwind CSS
│  WebSocket client + REST initial fetch  │
└──────────────┬──────────────────────────┘
               │ ws://localhost:8000/ws
               │ GET /api/market-data
┌──────────────▼──────────────────────────┐
│       FastAPI Backend (Python)          │
│  Background task → yfinance → cache     │
│  Broadcasts to all WS clients every 10s │
└─────────────────────────────────────────┘
               │
        yfinance (Yahoo Finance)
        No API key required
```

---

## Data Coverage

| Category          | Instruments                                      |
|-------------------|--------------------------------------------------|
| US Markets        | S&P 500, Nasdaq, Dow Jones, VIX                 |
| Asian Markets     | Nikkei 225, Hang Seng, Shanghai Comp., GIFT Nifty* |
| European Markets  | FTSE 100, DAX                                   |
| Indian Markets    | NIFTY 50, BANK NIFTY                            |
| Forex             | USD/INR                                         |
| Commodities       | WTI Crude, Brent Crude, Gold                    |
| Bonds             | US 10Y Yield                                    |

> **\* GIFT Nifty** is not available on Yahoo Finance (NSE IFSC exchange).
> The dashboard shows NIFTY 50 as a proxy.  
> For live GIFT Nifty, integrate one of: Flattrade API, Zerodha Kite WebSocket,
> or the NSE India pre-market endpoint (see "Premium Data" section below).

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- pip, npm

---

### 1 — Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env (optional — defaults work out of the box)
copy .env.example .env

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Data refreshed — 5 symbol groups | 0 client(s)
```

Test the REST endpoint:
```
http://localhost:8000/api/market-data
http://localhost:8000/health
```

---

### 2 — Frontend

Open a **new terminal** in the project root:

```bash
cd frontend

npm install

npm run dev
```

Open **http://localhost:5173** — the dashboard loads immediately with skeleton cards,
then fills with live data within a few seconds.

---

## Features

| Feature                  | Detail                                                      |
|--------------------------|-------------------------------------------------------------|
| Live WebSocket feed      | 10-second refresh, auto-reconnect on disconnect             |
| NIFTY Bias Score         | –100 (bear) to +100 (bull), computed from global cues      |
| Dynamic Alerts           | VIX regime, global direction, INR stress, oil/gold signals  |
| Market Session Badges    | Live NSE / Asia / EU / US open/closed indicators in header  |
| IST Clock                | Real-time clock in Indian Standard Time                     |
| Price flash animation    | Cards flash green/red on each price update                  |
| Skeleton loading states  | Smooth UX before first data arrives                         |
| Responsive layout        | Works on 1080p, 1440p, and tablet                           |
| No API key required      | yfinance uses Yahoo Finance (free, no registration)         |

---

## Environment Variables

`backend/.env`:

```env
HOST=0.0.0.0
PORT=8000
REFRESH_INTERVAL=10        # seconds between data refreshes
```

---

## Premium / Alternative Data Sources

If you need higher reliability, lower latency, or GIFT Nifty data:

| Use Case                   | API                              | Notes                          |
|----------------------------|----------------------------------|--------------------------------|
| GIFT Nifty live            | Flattrade API / Zerodha Kite WS  | Requires broker account        |
| NSE pre-market data        | NSE India unofficial API         | `https://www.nseindia.com/api` |
| US data (pro-grade)        | Finnhub (free tier: 60 req/min)  | `FINNHUB_API_KEY` in .env      |
| Historical + fundamentals  | Alpha Vantage (free: 25/day)     | `ALPHA_VANTAGE_API_KEY`        |
| Crypto + broader markets   | CoinGecko, Polygon.io            | Polygon has 15-min delay free  |

To add a Finnhub fallback, install `httpx` (already in requirements) and call:
```
https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY
```

---

## Project Structure

```
Trading Dashboard Project/
├── backend/
│   ├── main.py            # FastAPI app, WebSocket hub, background refresh loop
│   ├── data_fetcher.py    # yfinance integration, alert engine, bias calculator
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── hooks/
    │   │   └── useMarketData.js   # WS + REST hybrid hook, auto-reconnect
    │   └── components/
    │       ├── Header.jsx         # Clock, session badges, connection status
    │       ├── MarketBias.jsx     # NIFTY bias score banner
    │       ├── AlertsPanel.jsx    # Dynamic market alerts
    │       ├── IndianMarkets.jsx  # NIFTY / BANK NIFTY hero cards
    │       ├── GlobalMarkets.jsx  # US / Asian / European grids
    │       ├── MarketDrivers.jsx  # Forex, commodities, bonds
    │       ├── MarketCard.jsx     # Reusable price card with flash animation
    │       └── StatusBar.jsx      # Footer with data source & last-updated
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Disclaimer

This dashboard is for **informational purposes only**. Market data from Yahoo Finance
may have a 15-minute delay outside market hours. Do not use for automated order execution
without a real-time certified data feed. Always verify prices with your broker before trading.
