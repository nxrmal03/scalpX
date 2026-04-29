const COLOR_MAP = {
  green:  { bg: 'bg-bull-dim',  border: 'border-bull/30',  text: 'text-bull',        bar: 'bg-bull'  },
  lime:   { bg: 'bg-bull-dim',  border: 'border-bull/20',  text: 'text-green-400',   bar: 'bg-green-400' },
  red:    { bg: 'bg-bear-dim',  border: 'border-bear/30',  text: 'text-bear',        bar: 'bg-bear'  },
  orange: { bg: 'bg-warn-dim',  border: 'border-warn/30',  text: 'text-orange-400',  bar: 'bg-orange-400' },
  yellow: { bg: 'bg-warn-dim',  border: 'border-warn/30',  text: 'text-warn',        bar: 'bg-warn'  },
}

export default function MarketBias({ bias }) {
  if (!bias) return null

  const c = COLOR_MAP[bias.color] ?? COLOR_MAP.yellow
  const pct = Math.abs(bias.score)   // 0–100

  return (
    <div className={`card p-4 md:p-5 border ${c.border} ${c.bg} animate-slide-up`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">

        {/* Label block */}
        <div className="flex items-center gap-4 min-w-max">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">NIFTY Intraday Bias</p>
            <p className={`text-xl md:text-2xl font-bold font-mono ${c.text}`}>{bias.label}</p>
          </div>
          <div className={`text-3xl font-black font-mono ${c.text} opacity-80`}>
            {bias.score > 0 ? '+' : ''}{bias.score}
          </div>
        </div>

        {/* Score bar */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="relative h-2 bg-surface-border rounded-full overflow-hidden">
            {/* centre line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
            {/* score bar */}
            <div
              className={`absolute top-0 bottom-0 rounded-full transition-all duration-700 ${c.bar}`}
              style={{
                left:  bias.score >= 0 ? '50%' : `${50 - pct / 2}%`,
                width: `${pct / 2}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>–100 Bear</span>
            <span>Neutral 0</span>
            <span>Bull +100</span>
          </div>
        </div>

        {/* Description */}
        <p className="md:max-w-xs text-xs text-slate-400 leading-relaxed">{bias.description}</p>
      </div>
    </div>
  )
}
