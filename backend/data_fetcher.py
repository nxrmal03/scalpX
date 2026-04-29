"""
Market data via Yahoo Finance v7 quote API (direct HTTP, no yfinance).

Why direct API instead of yfinance:
  - yfinance 0.2.40 sends raw requests → Yahoo returns 429 (rate limited)
  - yf.Ticker(session=...) ignores the custom session internally
  - Direct v7/quote with a crumb-authenticated browser session works reliably

Flow:
  1. On first fetch, hit finance.yahoo.com to get cookies, then /v1/test/getcrumb
  2. All 15+ symbols fetched in ONE v7/quote request → ~300 ms round trip
  3. If crumb expires (401), auto-refresh and retry
  4. Background task in main.py calls fetch_all() every 10 s
"""

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# ── Symbol registry ────────────────────────────────────────────────────────────
SYMBOL_MAP: dict[str, list[dict]] = {
    "us_markets": [
        {"name": "S&P 500",   "symbol": "^GSPC",  "unit": "pts"},
        {"name": "Nasdaq",    "symbol": "^IXIC",  "unit": "pts"},
        {"name": "Dow Jones", "symbol": "^DJI",   "unit": "pts"},
        {"name": "VIX",       "symbol": "^VIX",   "unit": ""},
    ],
    "asian_markets": [
        {"name": "Nikkei 225",     "symbol": "^N225",     "unit": "pts"},
        {"name": "Hang Seng",      "symbol": "^HSI",      "unit": "pts"},
        {"name": "Shanghai Comp.", "symbol": "000001.SS", "unit": "pts"},
        # GIFT Nifty (NSE IFSC) is not on Yahoo Finance — proxied with NIFTY 50
        {"name": "GIFT Nifty*",    "symbol": "^NSEI",     "unit": "pts", "proxy": True},
    ],
    "european_markets": [
        {"name": "FTSE 100", "symbol": "^FTSE",  "unit": "pts"},
        {"name": "DAX",      "symbol": "^GDAXI", "unit": "pts"},
    ],
    "indian_markets": [
        {"name": "NIFTY 50",   "symbol": "^NSEI",    "unit": "pts"},
        {"name": "BANK NIFTY", "symbol": "^NSEBANK", "unit": "pts"},
    ],
    "market_drivers": [
        {"name": "USD/INR",      "symbol": "USDINR=X", "unit": "₹"},
        {"name": "WTI Crude",    "symbol": "CL=F",     "unit": "$"},
        {"name": "Brent Crude",  "symbol": "BZ=F",     "unit": "$"},
        {"name": "Gold",         "symbol": "GC=F",     "unit": "$"},
        {"name": "US 10Y Yield", "symbol": "^TNX",     "unit": "%"},
    ],
}

# Yahoo Finance API endpoints
_YF_HOME   = "https://finance.yahoo.com/"
_YF_CRUMB  = "https://query2.finance.yahoo.com/v1/test/getcrumb"
_YF_QUOTE  = "https://query1.finance.yahoo.com/v7/finance/quote"

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}


def _all_unique_symbols() -> list[str]:
    seen: set[str] = set()
    out:  list[str] = []
    for items in SYMBOL_MAP.values():
        for item in items:
            s = item["symbol"]
            if s not in seen:
                seen.add(s)
                out.append(s)
    return out


class DataFetcher:
    def __init__(self) -> None:
        self._session  = self._make_session()
        self._crumb:   Optional[str] = None
        self._symbols  = _all_unique_symbols()
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="yf_direct")

    # ── Session factory ───────────────────────────────────────────────────────

    @staticmethod
    def _make_session() -> requests.Session:
        s = requests.Session()
        s.headers.update(_BROWSER_HEADERS)
        retry = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],  # NOT 429 — we handle that ourselves
            allowed_methods=["GET"],
        )
        adapter = HTTPAdapter(
            max_retries=retry,
            pool_connections=4,
            pool_maxsize=8,
        )
        s.mount("https://", adapter)
        s.mount("http://",  adapter)
        return s

    # ── Crumb management ──────────────────────────────────────────────────────

    def _refresh_crumb(self) -> None:
        """Hit Yahoo home page (sets cookies), then fetch the session crumb."""
        logger.info("Refreshing Yahoo Finance crumb…")
        self._session.get(_YF_HOME, timeout=10)
        r = self._session.get(_YF_CRUMB, timeout=10)
        r.raise_for_status()
        self._crumb = r.text.strip()
        logger.info("Crumb acquired: %s…", self._crumb[:6])

    def _ensure_crumb(self) -> None:
        if not self._crumb:
            self._refresh_crumb()

    # ── Core sync fetch ───────────────────────────────────────────────────────

    def _fetch_quotes_sync(self) -> dict[str, dict]:
        """
        Single v7/quote request → all symbols in one round trip.
        Returns {symbol: {price, change, change_pct, prev_close, day_high, day_low}}.
        """
        self._ensure_crumb()

        symbols_csv = ",".join(self._symbols)
        fields = (
            "regularMarketPrice,regularMarketChange,"
            "regularMarketChangePercent,regularMarketPreviousClose,"
            "regularMarketDayHigh,regularMarketDayLow,regularMarketVolume"
        )
        params = {"symbols": symbols_csv, "fields": fields, "crumb": self._crumb}

        r = self._session.get(_YF_QUOTE, params=params, timeout=15)

        if r.status_code == 401:
            # Crumb expired — refresh once and retry
            logger.warning("Crumb expired, refreshing…")
            self._crumb = None
            self._refresh_crumb()
            params["crumb"] = self._crumb
            r = self._session.get(_YF_QUOTE, params=params, timeout=15)

        if r.status_code == 429:
            logger.warning("Yahoo rate-limit hit (429) — skipping this cycle")
            return {}

        r.raise_for_status()

        results = r.json().get("quoteResponse", {}).get("result", [])

        output: dict[str, dict] = {}
        for q in results:
            sym   = q.get("symbol")
            price = q.get("regularMarketPrice")
            if not sym or price is None:
                continue

            change = q.get("regularMarketChange")
            pct    = q.get("regularMarketChangePercent")
            prev   = q.get("regularMarketPreviousClose")
            high   = q.get("regularMarketDayHigh")
            low    = q.get("regularMarketDayLow")

            output[sym] = {
                "price":      round(float(price),          2),
                "change":     round(float(change), 2) if change is not None else None,
                "change_pct": round(float(pct),    2) if pct    is not None else None,
                "prev_close": round(float(prev),   2) if prev   is not None else None,
                "day_high":   round(float(high),   2) if high   is not None else None,
                "day_low":    round(float(low),    2) if low    is not None else None,
            }

        logger.info(
            "Quote fetch done — %d/%d symbols OK",
            len(output), len(self._symbols),
        )
        return output

    # ── Public async API ──────────────────────────────────────────────────────

    async def fetch_all(self) -> dict:
        loop = asyncio.get_event_loop()
        try:
            raw: dict[str, dict] = await loop.run_in_executor(
                self._executor, self._fetch_quotes_sync
            )
        except Exception as exc:
            logger.error("fetch_quotes_sync raised: %s", exc)
            raw = {}

        output: dict = {
            "timestamp":        datetime.now(timezone.utc).isoformat(),
            "us_markets":       [],
            "asian_markets":    [],
            "european_markets": [],
            "indian_markets":   [],
            "market_drivers":   [],
        }

        named: dict[str, dict] = {}
        for category, items in SYMBOL_MAP.items():
            for item in items:
                data = raw.get(item["symbol"])
                if data:
                    entry = {**item, **data, "status": "ok"}
                else:
                    entry = {**item,
                             "price": None, "change": None,
                             "change_pct": None, "status": "unavailable"}
                output[category].append(entry)
                named[item["name"]] = entry

        output["alerts"]      = self._generate_alerts(named)
        output["market_bias"] = self._calculate_bias(named)
        return output

    # ── Alert engine ──────────────────────────────────────────────────────────

    def _generate_alerts(self, data: dict) -> list[dict]:
        def pct(n: str)   -> float: return (data.get(n) or {}).get("change_pct") or 0.0
        def price(n: str) -> float: return (data.get(n) or {}).get("price")      or 0.0

        alerts: list[dict] = []
        vix      = price("VIX")
        sp_pct   = pct("S&P 500")
        nk_pct   = pct("Nikkei 225")
        hs_pct   = pct("Hang Seng")
        gold_pct = pct("Gold")
        wti_pct  = pct("WTI Crude")
        usdinr   = price("USD/INR")

        if vix > 35:
            alerts.append({"type": "danger",  "priority": 1,
                "message": f"⛔ EXTREME FEAR — VIX {vix:.1f}: Panic selling risk. Avoid aggressive longs."})
        elif vix > 25:
            alerts.append({"type": "danger",  "priority": 1,
                "message": f"⚠️ HIGH VOLATILITY — VIX {vix:.1f}: Elevated stress. Use tight stops."})
        elif vix > 18:
            alerts.append({"type": "warning", "priority": 3,
                "message": f"⚡ Elevated VIX {vix:.1f}: Options pricing risk premium — hedge overnight."})
        elif 0 < vix < 13:
            alerts.append({"type": "info",    "priority": 5,
                "message": f"😌 VIX {vix:.1f}: Complacency zone — low vol may precede sharp reversal."})

        bull = sum(1 for v in [sp_pct, nk_pct, hs_pct] if v > 0.4)
        bear = sum(1 for v in [sp_pct, nk_pct, hs_pct] if v < -0.4)
        if bull >= 2 and sp_pct > 0:
            alerts.append({"type": "success", "priority": 2,
                "message": f"🟢 GLOBAL TAILWIND — S&P {sp_pct:+.1f}% | Nikkei {nk_pct:+.1f}% | HSI {hs_pct:+.1f}%: Gap-up bias."})
        elif bear >= 2 and sp_pct < 0:
            alerts.append({"type": "danger",  "priority": 2,
                "message": f"🔴 GLOBAL HEADWIND — S&P {sp_pct:+.1f}% | Nikkei {nk_pct:+.1f}% | HSI {hs_pct:+.1f}%: Gap-down bias."})
        elif abs(sp_pct) < 0.2 and sp_pct != 0:
            alerts.append({"type": "neutral", "priority": 4,
                "message": "⚪ Flat global cues — range-bound open likely. Watch domestic triggers."})

        if gold_pct > 1.5:
            alerts.append({"type": "warning", "priority": 3,
                "message": f"🥇 Gold +{gold_pct:.1f}%: Risk-off demand. Defensives may outperform."})
        elif gold_pct < -1.5:
            alerts.append({"type": "success", "priority": 4,
                "message": f"🥇 Gold {gold_pct:.1f}%: Risk-on rotation. Cyclicals & banks may lead."})

        if wti_pct > 2.5:
            alerts.append({"type": "warning", "priority": 3,
                "message": f"🛢️ Oil +{wti_pct:.1f}%: Import costs rising — negative for OMCs, aviation."})
        elif wti_pct < -2.5:
            alerts.append({"type": "success", "priority": 4,
                "message": f"🛢️ Oil {wti_pct:.1f}%: Input cost relief — positive for OMCs & logistics."})

        if usdinr > 87:
            alerts.append({"type": "danger",  "priority": 2,
                "message": f"💵 INR WEAK — USD/INR ₹{usdinr:.2f}: FII outflow risk. Watch RBI."})
        elif usdinr > 85:
            alerts.append({"type": "warning", "priority": 3,
                "message": f"💵 INR pressure — USD/INR ₹{usdinr:.2f}: Watch import-heavy sectors."})
        elif 0 < usdinr < 83:
            alerts.append({"type": "success", "priority": 4,
                "message": f"💵 INR strong — USD/INR ₹{usdinr:.2f}: Favorable for FII inflows & IT."})

        alerts.sort(key=lambda a: a["priority"])
        return alerts[:7]

    # ── Bias calculator ───────────────────────────────────────────────────────

    def _calculate_bias(self, data: dict) -> dict:
        def pct(n: str)   -> float: return (data.get(n) or {}).get("change_pct") or 0.0
        def price(n: str) -> float: return (data.get(n) or {}).get("price")      or 0.0

        score = 0.0
        score += pct("S&P 500")       * 12
        score += pct("Nasdaq")        *  6
        score += pct("Dow Jones")     *  4
        score += pct("Nikkei 225")    *  5
        score += pct("Hang Seng")     *  4
        score += pct("Shanghai Comp.")*  2

        vix = price("VIX")
        if   vix > 30:      score -= 25
        elif vix > 22:      score -= 12
        elif 0 < vix < 13:  score +=  8

        score -= pct("Gold")      * 3
        score -= pct("WTI Crude") * 2

        usdinr = price("USD/INR")
        if   usdinr > 86:          score -= 10
        elif 0 < usdinr < 83.5:    score +=  5

        score = max(-100.0, min(100.0, score))

        if   score >=  40: label, color = "STRONGLY BULLISH", "green"
        elif score >=  15: label, color = "BULLISH",          "green"
        elif score >=   5: label, color = "MILDLY BULLISH",   "lime"
        elif score <= -40: label, color = "STRONGLY BEARISH", "red"
        elif score <= -15: label, color = "BEARISH",          "red"
        elif score <=  -5: label, color = "MILDLY BEARISH",   "orange"
        else:              label, color = "NEUTRAL",           "yellow"

        descriptions = {
            "STRONGLY BULLISH": "Strong global tailwinds — momentum longs above key levels.",
            "BULLISH":          "Positive global cues — favour buy-on-dips strategy.",
            "MILDLY BULLISH":   "Slightly positive — selective buying with defined stops.",
            "NEUTRAL":          "Mixed signals — range-bound likely. Trade breakouts only.",
            "MILDLY BEARISH":   "Mild negative bias — cautious; wait for support confirmation.",
            "BEARISH":          "Negative cues — favour sell-on-rallies; keep positions light.",
            "STRONGLY BEARISH": "Severe global headwinds — avoid fresh longs; consider hedges.",
        }

        return {
            "label":       label,
            "score":       round(score, 1),
            "color":       color,
            "description": descriptions[label],
        }
