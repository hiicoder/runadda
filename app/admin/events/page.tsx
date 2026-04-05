'use client'

import { useEffect, useState, useRef } from 'react'

interface EventItem {
  id: string; title: string; description: string | null
  dateTime: string; location: string; imageUrl: string | null
}
interface EventForm { title: string; description: string; dateTime: string; location: string }
interface RsvpEntry {
  id: string; status: 'JOINED' | 'MAYBE' | 'CANCELED'
  user: { id: string; name: string | null; email: string; image: string | null }
}

const STATUS_STYLE: Record<string, string> = {
  JOINED: 'bg-emerald-50 text-emerald-700',
  MAYBE: 'bg-amber-50 text-amber-700',
  CANCELED: 'bg-red-50 text-red-600',
}
const STATUS_LABEL: Record<string, string> = { JOINED: '✅ Going', MAYBE: '🤔 Maybe', CANCELED: '❌ Can\'t go' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function toDatetimeLocal(iso: string) {
  const d = new Date(iso), pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm: EventForm = { title: '', description: '', dateTime: '', location: '' }

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EventForm>(emptyForm)
  const [createForm, setCreateForm] = useState<EventForm>(emptyForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null)
  const [rsvpEventId, setRsvpEventId] = useState<string | null>(null)
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([])
  const [loadingRsvps, setLoadingRsvps] = useState(false)

  async function loadRsvps(eventId: string) {
    if (rsvpEventId === eventId) { setRsvpEventId(null); return }
    setRsvpEventId(eventId); setLoadingRsvps(true)
    const res = await fetch(`/api/admin/events/${eventId}/rsvps`)
    if (res.ok) setRsvps(await res.json())
    setLoadingRsvps(false)
  }

  async function fetchEvents() {
    const res = await fetch('/api/events')
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }
  useEffect(() => { void fetchEvents() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setCreating(true); setCreateError(null)
    const res = await fetch('/api/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    if (res.ok) { setCreateForm(emptyForm); await fetchEvents() }
    else { const d = await res.json() as { error?: string }; setCreateError(d.error ?? 'Failed') }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event and all its RSVPs?')) return
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) await fetchEvents()
  }

  async function handleEdit(e: React.FormEvent, id: string) {
    e.preventDefault()
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) { setEditingId(null); await fetchEvents() }
    else { const d = await res.json() as { error?: string }; alert(d.error ?? 'Failed') }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingUploadId) return
    setUploadingId(pendingUploadId)
    const formData = new FormData(); formData.append('file', file)
    const res = await fetch(`/api/events/${pendingUploadId}/image`, { method: 'POST', body: formData })
    if (res.ok) await fetchEvents()
    else alert('Image upload failed')
    setUploadingId(null); setPendingUploadId(null); e.target.value = ''
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
        <p className="text-gray-500 text-sm mt-1">Create, edit, and delete running events</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span>➕</span> Create New Event</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input className={inputCls} placeholder="e.g. Saturday Morning Run" value={createForm.title}
              onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location *</label>
            <input className={inputCls} placeholder="e.g. Central Park" value={createForm.location}
              onChange={e => setCreateForm(f => ({ ...f, location: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time *</label>
            <input className={inputCls} type="datetime-local" value={createForm.dateTime}
              onChange={e => setCreateForm(f => ({ ...f, dateTime: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input className={inputCls} placeholder="Optional description" value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {createError && <p className="col-span-2 text-red-600 text-sm">⚠️ {createError}</p>}
          <div className="col-span-2">
            <button type="submit" disabled={creating}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
              {creating ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Image upload hint */}
      <div className="hidden" id="img-hint" />

      {/* Event list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <span>📋</span> All Events
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{events.length}</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">💡 Event cover image: recommended <strong>1200×630px</strong> (landscape). JPEG or PNG, max 5MB.</p>
        {loading ? (
          <div className="text-center py-12 text-gray-400 animate-pulse">Loading…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <span className="text-4xl">📅</span>
            <p className="mt-3 text-gray-500">No events yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {editingId === event.id ? (
                  <form onSubmit={e => handleEdit(e, event.id)} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input className={inputCls} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                      <input className={inputCls} value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
                      <input className={inputCls} type="datetime-local" value={editForm.dateTime} onChange={e => setEditForm(f => ({ ...f, dateTime: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input className={inputCls} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition cursor-pointer">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-4 p-4">
                    {event.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.imageUrl} alt={event.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-violet-100 flex items-center justify-center text-2xl shrink-0">🏃</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{event.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{formatDate(event.dateTime)} · {event.location}</p>
                      {event.description && <p className="text-sm text-gray-400 mt-0.5 truncate">{event.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setEditingId(event.id); setEditForm({ title: event.title, description: event.description ?? '', dateTime: toDatetimeLocal(event.dateTime), location: event.location }) }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition cursor-pointer">✏️ Edit</button>
                      <button onClick={() => { setPendingUploadId(event.id); fileInputRef.current?.click() }} disabled={uploadingId === event.id}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition cursor-pointer disabled:opacity-50"
                        title="Recommended: 1200×630px, max 5MB, JPEG/PNG/WebP">
                        {uploadingId === event.id ? '⏳' : '🖼️'} Image
                      </button>
                      <button onClick={() => loadRsvps(event.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${rsvpEventId === event.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}>
                        👥 RSVPs
                      </button>
                      <button onClick={() => handleDelete(event.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition cursor-pointer">🗑️ Delete</button>
                    </div>
                  </div>
                )}
                {/* RSVP panel */}
                {rsvpEventId === event.id && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">RSVP List</p>
                    {loadingRsvps ? (
                      <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
                    ) : rsvps.length === 0 ? (
                      <p className="text-sm text-gray-400">No RSVPs yet for this event.</p>
                    ) : (
                      <div className="space-y-2">
                        {/* Summary counts */}
                        <div className="flex gap-3 mb-3">
                          {(['JOINED', 'MAYBE', 'CANCELED'] as const).map(s => {
                            const count = rsvps.filter(r => r.status === s).length
                            return (
                              <span key={s} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[s]}`}>
                                {STATUS_LABEL[s]} · {count}
                              </span>
                            )
                          })}
                        </div>
                        {/* Individual entries */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {rsvps.map(r => (
                            <div key={r.id} className="flex items-center gap-2.5 bg-white rounded-lg border border-gray-200 px-3 py-2">
                              {r.user.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.user.image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs shrink-0">👤</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{r.user.name ?? 'Unknown'}</p>
                                <p className="text-xs text-gray-400 truncate">{r.user.email}</p>
                              </div>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLE[r.status]}`}>
                                {r.status === 'JOINED' ? '✅' : r.status === 'MAYBE' ? '🤔' : '❌'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
