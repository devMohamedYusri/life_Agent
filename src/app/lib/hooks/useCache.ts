// lib/hooks/useCache.ts
import { useState, useEffect } from 'react'

export function useCache<T>(key: string, fetcher: () => Promise<T>, ttl = 5 * 60 * 1000) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < ttl) {
        setData(data)
        setLoading(false)
        return
      }
    }

    fetcher().then(result => {
      setData(result)
      localStorage.setItem(key, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }))
      setLoading(false)
    })
  }, [key])

  return { data, loading }
}