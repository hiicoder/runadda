'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getActivityIcon } from '@/lib/activity-types'

type LeaderboardFilter = 'weekly' | 'monthly' | 'all-time'
type LeaderboardSort = 'distance' | 'movingTime' | 'pace' | 'elevationGain'

interface LeaderboardEntry {
  userId: string; name: string | null; image: string | null
  totalDistance: number; totalMovingTime: number; averagePace: number
  totalElevationGain: number; activityCount: number
}

interface MonthlyTopper {
  category: string; userId: string; name: string | null; image: string | null
  value: number; unit: string; activityCount: number
}

const CATEGORIES = ['All', 'Running', 'Cycling', 'Walking', 'Swimming', 'Workout', 'Other']

const CATEGORY_ICONS: Record<string, string> = {
  All: '🏅', Running: '🏃', Cycling: '🚴', Walking: '🚶',
  Swimming: '🏊', Workout: '💪', Other: '⭐',
}

const FILTERS: { value: LeaderboardFilter; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all-time', label: 'All Time' },
]

const SORTS: { value: LeaderboardSort; label: string }[] = [
  { value: 'distance', label: 'Distance' },
  { value: 'movingTime', label: 'Time' },
  { value: 'pace', label: 'Pace' },
  { value: 'elevationGain', label: 'Elevation' },
]

const MEDALS = ['🥇', '🥈', '🥉']

function formatDistance(m: number) { return (m / 1000).toFixed(2) + ' km' }
function formatPace(spm: number) {
  if (spm === 0) return '—'
  const s = spm * 1000
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} /km`
}
function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function getMonthName() {
  return new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

export default function LeaderboardPage() {
  const [isMember, setIsMember] = useState<boolean | null>(null)

  const [filter, setFilter] = useState<LeaderboardFilter>('all-time')
  const [sort, setSort] = useState<LeaderboardSort>('distance')
  const [category, setCategory] = useState('All')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [toppers, setToppers] = useState<MonthlyTopper[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingToppers, setLoadingToppers] = useState(true)

  // Check access by actually calling the API — avoids stale JWT isMember value
  useEffect(() => {
    fetch('/api/leaderboard?toppers=true')
      .then(r => {
        if (r.status === 403) { setIsMember(false); setLoadingToppers(false); return null }
        setIsMember(true)
        return r.json() as Promise<MonthlyTopper[]>
      })
      .then(data => { if (data) setToppers(data); setLoadingToppers(false) })
      .catch(() => setLoadingToppers(false))
  }, [])

  // Load leaderboard on filter/sort/category change — only if member
  useEffect(() => {
    if (!isMember) return
    setLoading(true)
    fetch(`/api/leaderboard?filter=${filter}&sort=${sort}&category=${category}`)
      .then(r => r.json() as Promise<LeaderboardEntry[]>)
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter, sort, category, isMember])

  return (
    <div className="space-y-8">
      {isMember === null ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 animate-pulse">Checking access…</div>
        </div>
      ) : !isMember ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <span className="text-6xl">🏆</span>
            <h2 className="text-2xl font-black text-gray-900 mt-4">Members Only</h2>
            <p className="text-gray-500 mt-2">The leaderboard is exclusive to Runadda members. Activate your membership to compete!</p>
            <Link href="/profile"
              className="mt-6 inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition">
              Activate Membership →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            <p className="text-gray-500 text-sm mt-1">See how the club stacks up across all activities</p>
          </div>

          {/* Monthly Toppers */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🏆</span>
              <h2 className="font-bold text-lg">Monthly Champions — {getMonthName()}</h2>
            </div>
            {loadingToppers ? (
              <div className="text-indigo-200 text-sm animate-pulse">Loading champions…</div>
            ) : toppers.length === 0 ? (
              <p className="text-indigo-200 text-sm">No activity data for this month yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {toppers.map(topper => (
                  <div key={topper.category} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{CATEGORY_ICONS[topper.category] ?? '🏅'}</div>
                    <div className="text-xs font-semibold text-indigo-200 mb-2">{topper.category}</div>
                    {topper.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={topper.image} alt="" className="w-10 h-10 rounded-full object-cover mx-auto mb-1 ring-2 ring-yellow-400" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg mx-auto mb-1">👤</div>
                    )}
                    <p className="font-semibold text-sm truncate">{topper.name ?? 'Unknown'}</p>
                    <p className="text-xs text-indigo-200 mt-0.5">{formatDistance(topper.value)}</p>
                    <p className="text-xs text-indigo-300">{topper.activityCount} activities</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer border ${
                  category === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}>
                <span>{CATEGORY_ICONS[cat]}</span> {cat}
              </button>
            ))}
          </div>

          {/* Filter + Sort controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${
                    filter === f.value ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">Sort by</span>
              <select value={sort} onChange={e => setSort(e.target.value as LeaderboardSort)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Leaderboard table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-gray-400 text-sm animate-pulse">Loading leaderboard…</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <span className="text-5xl">{CATEGORY_ICONS[category]}</span>
              <p className="mt-4 text-gray-500 font-medium">No {category === 'All' ? '' : category.toLowerCase() + ' '}data for this period</p>
              <p className="text-gray-400 text-sm mt-1">Sync your Strava activities to appear here</p>
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
                  {entries.map((entry, i) => (
                    <tr key={entry.userId}
                      className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition ${i === 0 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {i < 3 ? <span className="text-base">{MEDALS[i]}</span> : i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {entry.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm">👤</div>
                          )}
                          <span className="font-medium text-gray-900">{entry.name ?? 'Unknown'}</span>
                          {i === 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Leader</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatDistance(entry.totalDistance)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{formatPace(entry.averagePace)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{entry.totalElevationGain.toFixed(0)} m</td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{entry.activityCount}</td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{formatTime(entry.totalMovingTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
