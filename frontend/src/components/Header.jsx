import { useState, useEffect } from 'react'

function SessionBadge({ label, open }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
      ${open
        ? 'bg-bull-dim border-bull/30 text-bull'
        : 'bg-surface-muted border-surface-border text-slate-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-bull animate-pulse' : 'bg-slate-600'}`} />
      {label}
    </span>
  )
}

function getSessionStatus() {
  const now = new Date()
  const utcH = now.getUTCHours()
  const utcM = now.getUTCMinutes()
  const utcTime = utcH * 60 + utcM

  // UTC offsets for rough session windows (excludes holidays/DST edge cases)
  const usOpen   = utcTime >= 830  && utcTime < 1300   // ~14:30–21:00 IST
  const asiaOpen = utcTime >= 0    && utcTime < 390    // ~00:00–06:30 UTC
  const euOpen   = utcTime >= 430  && utcTime < 1130   // ~08:00–17:00 UTC
  // NSE: 09:15–15:30 IST = 03:45–10:00 UTC
  const istMin   = ((utcH + 5) * 60 + utcM + 30) % 1440
  const nseOpen  = istMin >= 555 && istMin < 930

  return { usOpen, asiaOpen, euOpen, nseOpen }
}

export default function Header({ connected, lastUpdated }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const sessions = getSessionStatus()

  const timeIST = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const dateIST = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <header className="border-b border-surface-border bg-surface-muted/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bull/80 to-info/60 flex items-center justify-center text-sm font-bold">
            M
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight tracking-tight">ScalpX</h1>
            <p className="text-slate-500 text-[10px] leading-none">Global Trading Dashboard</p>
          </div>
        </div>

        {/* Session pills */}
        <div className="hidden md:flex items-center gap-2">
          <SessionBadge label="NSE"   open={sessions.nseOpen}  />
          <SessionBadge label="Asia"  open={sessions.asiaOpen} />
          <SessionBadge label="EU"    open={sessions.euOpen}   />
          <SessionBadge label="US"    open={sessions.usOpen}   />
        </div>

        {/* Clock + connection */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="font-mono text-white text-sm font-medium">{timeIST} IST</p>
            <p className="text-slate-500 text-[10px]">{dateIST}</p>
          </div>

          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border
            ${connected
              ? 'text-bull border-bull/25 bg-bull-dim'
              : 'text-bear border-bear/25 bg-bear-dim'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
            {connected ? 'LIVE' : 'RECONNECTING…'}
          </div>
        </div>
      </div>
    </header>
  )
}
