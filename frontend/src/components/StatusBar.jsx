export default function StatusBar({ connected, lastUpdated, error }) {
  const updated = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
    : '—'

  return (
    <footer className="border-t border-surface-border bg-surface-muted/80 mt-8">
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span>Data: Yahoo Finance (yfinance)</span>
          <span>·</span>
          <span>Refresh: 10s</span>
          <span>·</span>
          <span>
            * GIFT Nifty proxy via NIFTY 50 — for live GIFT Nifty use NSE IFSC / Flattrade API
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-bear">{error}</span>}
          <span>Last update: <span className="text-slate-400 font-mono">{updated} IST</span></span>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
        </div>
      </div>
    </footer>
  )
}
