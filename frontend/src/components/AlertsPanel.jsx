const TYPE_STYLES = {
  danger:  'border-bear/30  bg-bear-dim  text-bear',
  success: 'border-bull/30  bg-bull-dim  text-bull',
  warning: 'border-warn/30  bg-warn-dim  text-yellow-300',
  info:    'border-info/30  bg-info-dim  text-info',
  neutral: 'border-slate-700 bg-surface-muted text-slate-400',
}

export default function AlertsPanel({ alerts }) {
  if (!alerts?.length) return null

  return (
    <div className="space-y-2 animate-fade-in">
      <p className="section-title">
        <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
        Market Alerts
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-xs leading-relaxed font-medium
              ${TYPE_STYLES[alert.type] ?? TYPE_STYLES.neutral}`}
          >
            {alert.message}
          </div>
        ))}
      </div>
    </div>
  )
}
