import MarketCard from './MarketCard'

const DRIVER_NOTES = {
  'USD/INR':      'Higher = INR weak = FII pressure',
  'WTI Crude':    'Higher = import cost ↑ for India',
  'Brent Crude':  'Global oil benchmark',
  'Gold':         'Higher = risk-off sentiment',
  'US 10Y Yield': 'Higher = FII outflow risk',
}

export default function MarketDrivers({ drivers, loading }) {
  return (
    <section>
      <p className="section-title">
        <span className="w-1.5 h-1.5 rounded-full bg-warn" />
        Key Market Drivers
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-3 bg-surface-border rounded w-2/3 mb-3" />
                <div className="h-6 bg-surface-border rounded w-full mb-2" />
                <div className="h-3 bg-surface-border rounded w-1/2" />
              </div>
            ))
          : drivers.map(d => (
              <div key={d.symbol} className="flex flex-col gap-1">
                <MarketCard {...d} />
                <p className="text-[10px] text-slate-600 px-1 leading-tight">
                  {DRIVER_NOTES[d.name] ?? ''}
                </p>
              </div>
            ))}
      </div>
    </section>
  )
}
