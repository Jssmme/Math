import { useState, useEffect, useCallback, useRef } from 'react'

const CACHE_KEY = 'notepad_calc_rates'
const REFRESH_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours

const API_LIST = [
  { url: 'https://open.er-api.com/v6/latest/USD', transform: j => ({ ...j.rates, USD: 1 }) },
  { url: 'https://api.exchangerate-api.com/v4/latest/USD', transform: j => ({ ...j.rates, USD: 1 }) },
]

/**
 * Fetch rates from the first working API source.
 */
async function fetchRates() {
  for (const api of API_LIST) {
    try {
      const res = await fetch(api.url)
      if (!res.ok) continue
      const json = await res.json()
      const data = api.transform(json)
      if (data && Object.keys(data).length > 10) {
        return data
      }
    } catch (_) {}
  }
  throw new Error('all rate APIs failed')
}

export function useRates() {
  const [rates, setRates] = useState({})
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'cached' | 'offline'
  const [updatedAt, setUpdatedAt] = useState(null)
  const [flash, setFlash] = useState(0) // increment to trigger flash
  const mounting = useRef(true)

  const saveCache = useCallback((data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
    } catch (_) {}
  }, [])

  const loadCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const { data, ts } = JSON.parse(raw)
      return { data, ts }
    } catch (_) {
      return null
    }
  }, [])

  const applyFresh = useCallback((data) => {
    setRates(data)
    const now = new Date()
    setUpdatedAt(now)
    setStatus('ok')
    saveCache(data)
    setFlash(f => f + 1)
  }, [saveCache])

  const applyCached = useCallback((data, ts) => {
    setRates(data)
    setUpdatedAt(new Date(ts))
    setStatus('cached')
  }, [])

  const refreshRates = useCallback(async () => {
    setStatus(s => s === 'loading' ? 'loading' : 'loading')
    try {
      const data = await fetchRates()
      applyFresh(data)
    } catch (_) {
      const cached = loadCache()
      if (cached) {
        applyCached(cached.data, cached.ts)
      } else {
        setStatus('offline')
      }
    }
  }, [applyFresh, applyCached, loadCache])

  // Initialise: load cache immediately, then refresh in background
  useEffect(() => {
    const cached = loadCache()
    if (cached) {
      applyCached(cached.data, cached.ts)
      // Refresh in background if stale
      if (Date.now() - cached.ts > REFRESH_INTERVAL) {
        refreshRates()
      }
    } else {
      // No cache — fetch fresh
      refreshRates()
    }
    mounting.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { rates, status, updatedAt, refreshRates, flash }
}
