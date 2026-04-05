"use client"

import { useEffect, useState } from "react"

interface LeaderboardEntry {
  userId: string; name: string | null; image: string | null
  totalDistance: number; totalMovingTime: number; averagePace: number
  totalElevationGain: number; activityCount: number
}
interface MonthlyTopper {
  category: string; userId: string; name: string | null; image: string | null
  value: number; activityCount: number
}

type Filter = 'weekly' | 'monthly' | 'all-time'
type Sort = 'distance' | 'movingTime' | 'pace' | 'elevationGain'

const CATEGORIES = ['All', 'Running', 'Cycling', 'Walking', 'Swimming', 'Workout', 'Other']
const CATEGORY_ICONS: Record<string, string> = { All: '🏅', Running: '🏃', Cycling: '🚴', Walking: '🚶', Swimming: '🏊', Workout: '💪', Other: '⭐' }
const MEDALS = ['🥇', '🥈', '🥉']

function fmt(m: number) { return (m / 1000).toFixed(2) + ' km' }
function fmtTime(s: number) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m` }
function fmtPace(spm: number) { if (!spm) return '—'; const s = spm * 1000; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} /km` }
function monthName() { return new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' }) }

export default function AdminLeaderboardPage() {
  const [filter, setFilter] = useState<Filter>('all-time')
  const [sort, setSort] = useState<Sort>('distance')
  const [category, setCategory] = useState('All')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [toppers, setToppers] = useState<MonthlyTopper[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard?toppers=true').then(r => r.json() as Promise<MonthlyTopper[]>).then(setToppers).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?filter=${filter}&sort=${sort}&category=${category}`)
      .then(r => r.json() as Promise<LeaderboardEntry[]>)
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter, sort, category])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">Full view of all member activity rankings</p>
      </div>

      {/* Monthly Champions */}
      {toppers.length > 0 && (
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🏆</span>
            <h2 className="font-bold text-lg">Monthly Champions — {monthName()}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {toppers.map(t => (
              <div key={t.category} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{CATEGORY_ICONS[t.category] ?? '🏅'}</div>
                <div className="text-xs font-semibold text-violet-200 mb-1">{t.category}</div>
                <p className="font-semibold text-sm truncate">{t.name ?? 'Unknown'}</p>
                <p className="text-xs text-violet-200 mt-0.5">{fmt(t.value)}</p>
                <p className="text-xs text-violet-300">{t.activityCount} activities</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category + Filter + Sort */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer border ${category === cat ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'}`}>
            <span>{CATEGORY_ICONS[cat]}</span> {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(['weekly', 'monthly', 'all-time'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${filter === f ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              {f === 'weekly' ? 'This Week' : f === 'monthly' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">Sort by</span>
          <select value={sort} onChange={e => setSort(e.target.value as Sort)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer">
            <option value="distance">Distance</option>
            <option value="movingTime">Time</option>
            <option value="pace">Pace</option>
            <option value="elevationGain">Elevation</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 animate-pulse">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <span className="text-5xl">{CATEGORY_ICONS[category]}</span>
          <p className="mt-4 text-gray-500">No data for this period</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span>{CATEGORY_ICONS[category]}</span>
            <span className="font-semibold text-gray-900 text-sm">{category} — {filter === 'weekly' ? 'This Week' : filter === 'monthly' ? 'This Month' : 'All Time'}</span>
            <span className="ml-auto text-xs text-gray-400">{entries.length} athletes</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left">Athlete</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Pace</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Elevation</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Activities</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.userId} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${i === 0 ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-4 py-3 font-bold text-gray-400">{i < 3 ? <span className="text-base">{MEDALS[i]}</span> : i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {e.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm">👤</div>
                      )}
                      <span className="font-medium text-gray-900">{e.name ?? 'Unknown'}</span>
                      {i === 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Leader</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-violet-600">{fmt(e.totalDistance)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{fmtPace(e.averagePace)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{e.totalElevationGain.toFixed(0)} m</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{e.activityCount}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{fmtTime(e.totalMovingTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
