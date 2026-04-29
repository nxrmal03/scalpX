import { useEffect, useRef } from 'react'

const fmt = (n, decimals = 2) =>
  n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })

export default function MarketCard({ name, price, change, change_pct, unit = '', status, large = false, proxy = false }) {
  const cardRef = useRef(null)
  const prevPct = useRef(change_pct)

  // Flash animation on price change
  useEffect(() => {
    if (change_pct == null || prevPct.current === change_pct) return
    const el = cardRef.current
    if (!el) return
    el.classList.remove('flash-bull', 'flash-bear')
    void el.offsetWidth
    el.classList.add(change_pct > prevPct.current ? 'flash-bull' : 'flash-bear')
    prevPct.current = change_pct
    const id = setTimeout(() => el.classList.remove('flash-bull', 'flash-bear'), 600)
    return () => clearTimeout(id)
  }, [change_pct])

  const isUp      = change_pct > 0
  const isDown    = change_pct < 0
  const isLoading = status === undefined || price == null

  return (
    <div
      ref={cardRef}
      className={`card p-4 flex flex-col gap-2 relative overflow-hidden
        ${large ? 'md:p-5' : ''}
        ${isLoading ? 'animate-pulse' : ''}`}
    >
      {/* Background accent stripe */}
      {!isLoading && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl
            ${isUp ? 'bg-bull' : isDown ? 'bg-bear' : 'bg-slate-600'}`}
        />
      )}

      {/* Name row */}
      <div className="flex items-start justify-between gap-1">
        <span className={`text-slate-400 font-medium leading-tight ${large ? 'text-sm' : 'text-xs'}`}>
          {name}
          {proxy && <span className="ml-1 text-[10px] text-slate-600 align-super">*proxy</span>}
        </span>
        {!isLoading && (
          <span className={`text-xs ${isUp ? 'text-bull' : isDown ? 'text-bear' : 'text-slate-500'}`}>
            {isUp ? '▲' : isDown ? '▼' : '●'}
          </span>
        )}
      </div>

      {/* Price */}
      {isLoading ? (
        <div className="h-7 bg-surface-border rounded w-3/4" />
      ) : (
        <p className={`font-mono font-semibold text-white leading-none
          ${large ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
          {unit === '₹' || unit === '$' ? unit : ''}{fmt(price)}
          {unit === '%' ? '%' : ''}
        </p>
      )}

      {/* Change row */}
      {isLoading ? (
        <div className="h-4 bg-surface-border rounded w-1/2" />
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-mono text-xs ${isUp ? 'text-bull' : isDown ? 'text-bear' : 'text-slate-500'}`}>
            {change > 0 ? '+' : ''}{fmt(change)}
          </span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded
            ${isUp ? 'badge-bull' : isDown ? 'badge-bear' : 'badge-neutral'}`}>
            {change_pct > 0 ? '+' : ''}{fmt(change_pct)}%
          </span>
        </div>
      )}

      {/* Flash keyframe injected via style tag */}
      <style>{`
        .flash-bull { animation: flashBull 0.6s ease-out; }
        .flash-bear { animation: flashBear 0.6s ease-out; }
        @keyframes flashBull { 0%,100%{background:transparent} 30%{background:rgba(0,200,83,0.08)} }
        @keyframes flashBear { 0%,100%{background:transparent} 30%{background:rgba(255,23,68,0.08)} }
      `}</style>
    </div>
  )
}
