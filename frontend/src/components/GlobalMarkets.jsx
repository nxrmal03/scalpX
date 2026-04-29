import MarketCard from './MarketCard'

function MarketRow({ title, flag, items, loading }) {
  return (
    <div>
      <p className="section-title mt-4 first:mt-0">
        <span>{flag}</span>
        {title}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-3 bg-surface-border rounded w-1/2 mb-3" />
                <div className="h-6 bg-surface-border rounded w-3/4 mb-2" />
                <div className="h-3 bg-surface-border rounded w-1/3" />
              </div>
            ))
          : items.map(m => <MarketCard key={m.symbol} {...m} />)}
      </div>
    </div>
  )
}

export default function GlobalMarkets({ usMarkets, asianMarkets, europeanMarkets, loading }) {
  return (
    <section className="card p-4 md:p-5 border-surface-border">
      <p className="section-title">
        <span className="w-1.5 h-1.5 rounded-full bg-info" />
        Global Markets
      </p>

      <MarketRow title="US Markets"       flag="🇺🇸" items={usMarkets}       loading={loading} />
      <MarketRow title="Asian Markets"    flag="🌏" items={asianMarkets}    loading={loading} />
      <MarketRow title="European Markets" flag="🇪🇺" items={europeanMarkets} loading={loading} />
    </section>
  )
}
