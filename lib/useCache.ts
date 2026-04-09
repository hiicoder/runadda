"use client"

import { useEffect, useState } from "react"

export function useCache<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    // Load from cache instantly
    try {
      const cached = sessionStorage.getItem(key)
      if (cached) setData(JSON.parse(cached))
    } catch { /* ignore */ }

    // Fetch fresh in background
    fetcher().then(d => {
      setData(d)
      sessionStorage.setItem(key, JSON.stringify(d))
    }).catch(() => {})
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return data
}
