import MarketCard from './MarketCard'

function Skeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-3 bg-surface-border rounded w-1/3 mb-4" />
      <div className="h-8 bg-surface-border rounded w-2/3 mb-3" />
      <div className="h-4 bg-surface-border rounded w-1/2" />
    </div>
  )
}

export default function IndianMarkets({ markets, loading }) {
  return (
    <section>
      <p className="section-title">
        <span className="text-orange-400">🇮🇳</span>
        Indian Markets
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading
          ? [0, 1].map(i => <Skeleton key={i} />)
          : markets.map(m => (
              <MarketCard key={m.symbol} {...m} large />
            ))}
      </div>

      <p className="mt-2 text-[10px] text-slate-600">
        * GIFT Nifty shown as NIFTY 50 proxy — live GIFT Nifty data requires NSE IFSC feed.
      </p>
    </section>
  )
}
