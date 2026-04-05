import { headers } from 'next/headers'
import Link from 'next/link'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface EventWithCount {
  id: string; title: string; description: string | null
  dateTime: string; location: string; imageUrl: string | null
  _count?: { rsvps: number }
}

async function getEvents(): Promise<EventWithCount[]> {
  try {
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const res = await fetch(`${protocol}://${host}/api/events`, {
      cache: 'no-store', headers: { cookie: headersList.get('cookie') ?? '' },
    })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upcoming Events</h1>
        <p className="text-gray-500 text-sm mt-1">{events.length} event{events.length !== 1 ? 's' : ''} scheduled</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <span className="text-5xl">📅</span>
          <p className="mt-4 text-gray-500 font-medium">No upcoming events</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition group">
              {event.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.imageUrl} alt={event.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <span className="text-5xl">🏃</span>
                </div>
              )}
              <div className="p-5">
                <h2 className="font-semibold text-gray-900 text-lg group-hover:text-indigo-600 transition">
                  <Link href={`/events/${event.id}`}>{event.title}</Link>
                </h2>
                <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500">
                  <span>📅</span> {formatDate(event.dateTime)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <span>📍</span> {event.location}
                </div>
                {event.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center justify-between mt-4">
                  {event._count !== undefined && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {event._count.rsvps} going
                    </span>
                  )}
                  <Link href={`/events/${event.id}`}
                    className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
                    View &amp; RSVP
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
