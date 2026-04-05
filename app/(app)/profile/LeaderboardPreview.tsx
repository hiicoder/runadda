"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Entry {
  userId: string; name: string | null; image: string | null
  totalDistance: number; activityCount: number
}

const MEDALS = ['🥇', '🥈', '🥉']
function fmt(m: number) { return (m / 1000).toFixed(2) + ' km' }

export default function LeaderboardPreview() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard?filter=monthly&sort=distance&category=All')
      .then(r => r.json() as Promise<Entry[]>)
      .then(data => { setEntries(data.slice(0, 5)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🏆</span>
          <h2 className="font-semibold text-gray-900">This Month&apos;s Top Runners</h2>
        </div>
        <Link href="/leaderboard" className="text-xs text-indigo-600 hover:underline font-medium">Full leaderboard →</Link>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-center py-4 text-gray-400 text-sm animate-pulse">Loading…</div>
        ) : entries.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No activity data this month yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={e.userId} className={`flex items-center gap-3 p-2.5 rounded-xl ${i === 0 ? 'bg-amber-50 border border-amber-100' : 'hover:bg-gray-50'}`}>
                <span className="text-lg w-6 text-center">{i < 3 ? MEDALS[i] : <span className="text-sm text-gray-400 font-bold">{i + 1}</span>}</span>
                {e.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm shrink-0">👤</div>
                )}
                <span className="flex-1 font-medium text-gray-900 text-sm truncate">{e.name ?? 'Unknown'}</span>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-indigo-600">{fmt(e.totalDistance)}</p>
                  <p className="text-xs text-gray-400">{e.activityCount} activities</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
