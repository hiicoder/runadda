"use client"

import { useEffect, useState } from "react"
import { getActivityIcon, getActivityLabel } from "@/lib/activity-types"

function formatDistance(meters: number) { return (meters / 1000).toFixed(2) + " km" }
function formatPace(spm: number) {
  if (spm === 0) return "—"
  const s = spm * 1000
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")} /km`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

interface UpcomingEvent { id: string; title: string; dateTime: string; location: string }
interface WeeklyStats { totalDistance: number; runCount: number; averagePace: number }
interface RecentActivity { id: string; distance: number; date: string; activityType: string }
interface ChartPoint { weekStart: string; totalDistance: number }
interface DashboardData {
  showStravaPrompt: boolean
  weeklyStats: WeeklyStats
  upcomingEvents: UpcomingEvent[]
  recentActivities: RecentActivity[]
  chartData: ChartPoint[]
}

const CACHE_KEY = "runadda_dashboard"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-48 mt-2" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
            <Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100"><Skeleton className="h-5 w-32" /></div>
            <div className="p-5 space-y-3">{[1,2,3].map(j => <Skeleton key={j} className="h-12 w-full" />)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Shown to new users who haven't connected Strava yet
function NewUserGuide() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Welcome to Runadda! 🎉</h2>
        <p className="text-sm text-gray-600">Get started in 3 simple steps to unlock all features.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { step: "1", icon: "🔗", title: "Connect Strava", desc: "Link your Strava account to sync your activities automatically.", action: { label: "Connect Strava", href: "/api/strava/connect", orange: true } },
          { step: "2", icon: "🎟️", title: "Get Membership Code", desc: "Ask your admin for a membership code to unlock leaderboard access.", action: { label: "Go to Profile", href: "/profile", orange: false } },
          { step: "3", icon: "🏆", title: "Join the Leaderboard", desc: "Once you're a member, compete with the community on the leaderboard.", action: null },
        ].map(({ step, icon, title, desc, action }) => (
          <div key={step} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
              <span className="text-xl">{icon}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
            {action && (
              <a href={action.href}
                className={`inline-block mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${action.orange ? "bg-[#fc4c02] hover:bg-[#e04400] text-white" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"}`}>
                {action.label}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Show cached data instantly
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) setData(JSON.parse(cached))
    } catch { /* ignore */ }

    // Fetch fresh in background
    fetch("/api/dashboard")
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        setData(d)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(d))
      })
      .catch(() => setError(true))
  }, [])

  if (error && !data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Unable to load dashboard. Please try again.</p>
    </div>
  )

  if (!data) return <DashboardSkeleton />

  const { showStravaPrompt, weeklyStats, upcomingEvents, recentActivities, chartData } = data
  const hasActivity = recentActivities.length > 0 || weeklyStats.totalDistance > 0
  const maxDist = Math.max(...chartData.map(p => p.totalDistance), 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your running overview</p>
      </div>

      {/* New user guide — shown instead of empty components */}
      {showStravaPrompt && <NewUserGuide />}

      {/* Only show stats/chart if user has Strava connected and has activity */}
      {!showStravaPrompt && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Distance This Week", value: formatDistance(weeklyStats.totalDistance), icon: "📏" },
              { label: "Runs This Week", value: String(weeklyStats.runCount), icon: "👟" },
              { label: "Average Pace", value: formatPace(weeklyStats.averagePace), icon: "⚡" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <span className="text-2xl">{icon}</span>
                <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
                <a href="/events" className="text-xs text-indigo-600 hover:underline font-medium">View all →</a>
              </div>
              <div className="p-5 space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No upcoming events</p>
                ) : upcomingEvents.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-sm shrink-0">📅</div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(ev.dateTime)} · {ev.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recent Activities</h2>
              </div>
              <div className="p-5">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">🏃</p>
                    <p className="text-sm text-gray-500">No activities yet</p>
                    <p className="text-xs text-gray-400 mt-1">Sync Strava to see your runs here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivities.map(act => (
                      <div key={act.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getActivityIcon(act.activityType)}</span>
                          <div>
                            <span className="text-sm text-gray-700">{getActivityLabel(act.activityType)}</span>
                            <span className="text-xs text-gray-400 ml-2">{formatDate(act.date)}</span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-indigo-600">{formatDistance(act.distance)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasActivity && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">12-Week Distance</h2>
              </div>
              <div className="p-5 space-y-2">
                {chartData.map(point => {
                  const pct = Math.round((point.totalDistance / maxDist) * 100)
                  return (
                    <div key={point.weekStart} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 shrink-0">{formatDate(point.weekStart)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-16 text-right shrink-0">{formatDistance(point.totalDistance)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Upcoming events always visible even for new users */}
      {showStravaPrompt && upcomingEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
            <a href="/events" className="text-xs text-indigo-600 hover:underline font-medium">View all →</a>
          </div>
          <div className="p-5 space-y-3">
            {upcomingEvents.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-sm shrink-0">📅</div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(ev.dateTime)} · {ev.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
