'use client'

import { useEffect, useState } from 'react'

interface UserItem { id: string; name: string | null; email: string; role: 'USER' | 'EDITOR' | 'ADMIN'; isMember: boolean; stravaConnected: boolean }
interface EventItem { id: string; title: string; dateTime: string }
interface Analytics { eventId: string; counts: { JOINED: number; MAYBE: number; CANCELED: number }; total: number }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, Analytics>>({})
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [analyticsVisible, setAnalyticsVisible] = useState(false)

  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    else setError('Failed to load users')
    setLoading(false)
  }
  useEffect(() => { void fetchUsers() }, [])

  async function patch(userId: string, body: object) {
    setActionId(userId)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json() as UserItem
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u))
    } else {
      const d = await res.json() as { error?: string }
      alert(d.error ?? 'Action failed')
    }
    setActionId(null)
  }

  async function deleteUser(userId: string, name: string | null) {
    if (!confirm(`Delete user "${name ?? userId}" and all their data? This cannot be undone.`)) return
    setActionId(userId)
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) setUsers(prev => prev.filter(u => u.id !== userId))
    else { const d = await res.json() as { error?: string }; alert(d.error ?? 'Delete failed') }
    setActionId(null)
  }

  async function loadAnalytics() {
    setLoadingAnalytics(true); setAnalyticsVisible(true)
    const evRes = await fetch('/api/events')
    const evData = await evRes.json() as EventItem[]
    setEvents(evData)
    const results = await Promise.all(evData.map(ev => fetch(`/api/admin/events/${ev.id}/analytics`).then(r => r.ok ? r.json() as Promise<Analytics> : null)))
    const map: Record<string, Analytics> = {}
    results.forEach(r => { if (r) map[r.eventId] = r })
    setAnalyticsMap(map); setLoadingAnalytics(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Members</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">Loading…</div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">⚠️ {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Strava</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm shrink-0">👤</div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name ?? <span className="text-gray-400 italic">No name</span>}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={user.role} disabled={actionId === user.id}
                        onChange={e => patch(user.id, { role: e.target.value })}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer focus:outline-none ${user.role === 'ADMIN' ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        <option value="USER">USER</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {user.isMember ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">🏅 Member</span>
                          <button onClick={() => patch(user.id, { revokeMembership: true })} disabled={actionId === user.id}
                            className="text-xs text-red-500 hover:text-red-700 cursor-pointer disabled:opacity-50" title="Revoke membership">✕</button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not a member</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.stravaConnected ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">✓ Connected</span>
                          <button onClick={() => { if (confirm(`Disconnect Strava for ${user.name ?? user.email}?`)) patch(user.id, { disconnectStrava: true }) }}
                            disabled={actionId === user.id}
                            className="text-xs text-red-500 hover:text-red-700 cursor-pointer disabled:opacity-50" title="Disconnect Strava">✕</button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not connected</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteUser(user.id, user.name)} disabled={actionId === user.id}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition cursor-pointer disabled:opacity-50">
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Analytics */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Participation Analytics</h2>
          {!analyticsVisible && (
            <button onClick={loadAnalytics} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer">
              Load Analytics
            </button>
          )}
        </div>
        <div className="p-6">
          {!analyticsVisible && <p className="text-gray-400 text-sm text-center py-4">Click &quot;Load Analytics&quot; to view RSVP data per event.</p>}
          {loadingAnalytics && <div className="text-center text-gray-400 animate-pulse py-4">Loading…</div>}
          {analyticsVisible && !loadingAnalytics && events.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No events found.</p>}
          {analyticsVisible && !loadingAnalytics && events.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="py-2 text-left">Event</th>
                    <th className="py-2 text-right text-emerald-600">Going</th>
                    <th className="py-2 text-right text-amber-500">Maybe</th>
                    <th className="py-2 text-right text-red-500">Can&apos;t go</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => {
                    const a = analyticsMap[ev.id]
                    return (
                      <tr key={ev.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">{ev.title}</td>
                        <td className="py-3 text-right font-semibold text-emerald-600">{a?.counts.JOINED ?? 0}</td>
                        <td className="py-3 text-right font-semibold text-amber-500">{a?.counts.MAYBE ?? 0}</td>
                        <td className="py-3 text-right font-semibold text-red-500">{a?.counts.CANCELED ?? 0}</td>
                        <td className="py-3 text-right font-bold text-gray-900">{a?.total ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
