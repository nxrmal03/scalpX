import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const WS_URL   = API_BASE.replace(/^http/, 'ws') + '/ws'
const API_URL  = API_BASE + '/api/market-data'

/**
 * Manages market data via WebSocket with automatic reconnection.
 * On mount, fires an initial REST fetch so the UI isn't blank while
 * the WS handshake completes.
 */
export function useMarketData() {
  const [data,        setData]        = useState(null)
  const [connected,   setConnected]   = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error,       setError]       = useState(null)
  const [tickCount,   setTickCount]   = useState(0)   // bumped on each update → triggers flash

  const wsRef        = useRef(null)
  const reconnectRef = useRef(null)
  const mountedRef   = useRef(true)

  const handleData = useCallback((raw) => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      setData(parsed)
      setLastUpdated(new Date())
      setTickCount(n => n + 1)
      setError(null)
    } catch {
      /* malformed frame — ignore */
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setConnected(true)
      setError(null)
    }

    ws.onmessage = (e) => {
      if (mountedRef.current) handleData(e.data)
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setError('WebSocket error — retrying…')
      setConnected(false)
    }
  }, [handleData])

  useEffect(() => {
    mountedRef.current = true

    // Initial REST fetch for immediate data while WS connects
    fetch(API_URL)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(handleData)
      .catch(() => {/* backend may not be up yet */})

    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect, handleData])

  return { data, connected, lastUpdated, error, tickCount }
}
