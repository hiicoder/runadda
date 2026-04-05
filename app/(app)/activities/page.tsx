"use client"

import { useEffect, useState } from "react"
import { getActivityIcon, getActivityLabel } from "@/lib/activity-types"

interface Activity {
  id: string
  activityType: string
  distance: number
  movingTime: number
  pace: number
  elevationGain: number
  date: string
}

function formatDistance(m: number) { return (m / 1000).toFixed(2) + " km" }
function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${sec}s`
}
function formatPace(spm: number) {
  if (spm === 0) return "—"
  const s = spm * 1000
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")} /km`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")

  useEffect(() => {
    fetch("/api/activities")
      .then(r => r.json() as Promise<Activity[]>)
      .then(data => { setActivities(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const types = ["All", ...Array.from(new Set(activities.map(a => a.activityType))).sort()]
  const filtered = filter === "All" ? activities : activities.filter(a => a.activityType === filter)

  // Summary stats per type
  const statsByType = activities.reduce<Record<string, { count: number; distance: number }>>((acc, a) => {
    if (!acc[a.activityType]) acc[a.activityType] = { count: 0, distance: 0 }
    acc[a.activityType].count++
    acc[a.activityType].distance += a.distance
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Activities</h1>
          <p className="text-gray-500 text-sm mt-1">{activities.length} total activities synced from Strava</p>
        </div>
        <a href="/profile" className="text-sm text-indigo-600 hover:underline font-medium">🔄 Sync more</a>
      </div>

      {/* Activity type summary cards */}
      {!loading && Object.keys(statsByType).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(statsByType).map(([type, stats]) => (
            <button key={type} onClick={() => setFilter(filter === type ? "All" : type)}
              className={`p-3 rounded-xl border text-center transition cursor-pointer ${filter === type ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 hover:border-indigo-300 text-gray-700"}`}>
              <div className="text-2xl mb-1">{getActivityIcon(type)}</div>
              <div className="text-xs font-semibold truncate">{getActivityLabel(type)}</div>
              <div className={`text-xs mt-0.5 ${filter === type ? "text-indigo-200" : "text-gray-400"}`}>{stats.count} · {formatDistance(stats.distance)}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {types.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${filter === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {t === "All" ? "All" : `${getActivityIcon(t)} ${getActivityLabel(t)}`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 animate-pulse">Loading activities…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <span className="text-5xl">🏅</span>
          <p className="mt-4 text-gray-500 font-medium">No activities yet</p>
          <p className="text-gray-400 text-sm mt-1">Connect Strava and sync to see your activities here.</p>
          <a href="/profile" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">Go to Profile</a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Activity</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Duration</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Pace</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Elevation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((act, i) => (
                <tr key={act.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getActivityIcon(act.activityType)}</span>
                      <span className="font-medium text-gray-900">{getActivityLabel(act.activityType)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(act.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatDistance(act.distance)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{formatTime(act.movingTime)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{formatPace(act.pace)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{act.elevationGain.toFixed(0)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
