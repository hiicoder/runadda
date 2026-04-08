"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function PageLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  // Show on initial load
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  // Show on route change
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [pathname])

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300">
      <div className="bg-white/90 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-700">Loading…</p>
        <p className="text-xs text-gray-400">Hang tight, waking up the server</p>
      </div>
    </div>
  )
}
