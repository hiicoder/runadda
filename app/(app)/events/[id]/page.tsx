import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RsvpForm from './RsvpForm'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface RsvpCounts { JOINED: number; MAYBE: number; CANCELED: number }
interface EventDetail { id: string; title: string; description: string | null; dateTime: string; location: string; imageUrl: string | null }
interface UserRsvp { status: 'JOINED' | 'MAYBE' | 'CANCELED' }

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const res = await fetch(`${protocol}://${host}${path}`, {
      cache: 'no-store', headers: { cookie: headersList.get('cookie') ?? '' },
    })
    if (!res.ok) return fallback
    return res.json()
  } catch { return fallback }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [event, counts, userRsvp] = await Promise.all([
    fetchJson<EventDetail | null>(`/api/events/${id}`, null),
    fetchJson<RsvpCounts>(`/api/events/${id}/rsvp-counts`, { JOINED: 0, MAYBE: 0, CANCELED: 0 }),
    fetchJson<UserRsvp | null>(`/api/events/${id}/my-rsvp`, null),
  ])

  if (!event) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition">
        ← Back to Events
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <span className="text-6xl">🏃</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>📅</span> {formatDate(event.dateTime)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>📍</span> {event.location}
              </div>
            </div>
          </div>

          {event.description && (
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          )}

          {/* RSVP counts */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Going', count: counts.JOINED, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Maybe', count: counts.MAYBE, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
              { label: "Can't go", count: counts.CANCELED, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* RSVP form */}
          <div className="border-t border-gray-100 pt-5">
            <h2 className="font-semibold text-gray-900 mb-3">Your RSVP</h2>
            <RsvpForm eventId={event.id} currentStatus={userRsvp?.status ?? null} />
          </div>
        </div>
      </div>
    </div>
  )
}
