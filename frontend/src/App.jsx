import { useMarketData }  from './hooks/useMarketData'
import Header             from './components/Header'
import MarketBias         from './components/MarketBias'
import AlertsPanel        from './components/AlertsPanel'
import GlobalMarkets      from './components/GlobalMarkets'
import IndianMarkets      from './components/IndianMarkets'
import MarketDrivers      from './components/MarketDrivers'
import StatusBar          from './components/StatusBar'

export default function App() {
  const { data, connected, lastUpdated, error } = useMarketData()
  const loading = !data

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header connected={connected} lastUpdated={lastUpdated} />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6 space-y-6">

        {/* ── NIFTY Bias banner ── */}
        <MarketBias bias={data?.market_bias} />

        {/* ── Alerts ── */}
        <AlertsPanel alerts={data?.alerts} />

        {/* ── Indian Markets (hero section) ── */}
        <IndianMarkets
          markets={data?.indian_markets ?? []}
          loading={loading}
        />

        {/* ── Global Markets ── */}
        <GlobalMarkets
          usMarkets={data?.us_markets ?? []}
          asianMarkets={data?.asian_markets ?? []}
          europeanMarkets={data?.european_markets ?? []}
          loading={loading}
        />

        {/* ── Key Drivers ── */}
        <MarketDrivers
          drivers={data?.market_drivers ?? []}
          loading={loading}
        />
      </main>

      <StatusBar connected={connected} lastUpdated={lastUpdated} error={error} />
    </div>
  )
}
