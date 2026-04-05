'use client'

import { useState } from 'react'

type RsvpStatus = 'JOINED' | 'MAYBE' | 'CANCELED'

interface RsvpFormProps {
  eventId: string
  currentStatus?: RsvpStatus | null
}

const STATUSES: { value: RsvpStatus; label: string; active: string; inactive: string }[] = [
  { value: 'JOINED', label: "✅ I'm going", active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:text-emerald-600' },
  { value: 'MAYBE', label: '🤔 Maybe', active: 'bg-amber-500 text-white border-amber-500', inactive: 'bg-white text-gray-700 border-gray-300 hover:border-amber-400 hover:text-amber-600' },
  { value: 'CANCELED', label: "❌ Can't go", active: 'bg-red-500 text-white border-red-500', inactive: 'bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:text-red-600' },
]

export default function RsvpForm({ eventId, currentStatus }: RsvpFormProps) {
  const [selected, setSelected] = useState<RsvpStatus | null>(currentStatus ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleRsvp(status: RsvpStatus) {
    setSubmitting(true); setError(null); setSuccess(false)
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to submit RSVP')
      }
      setSelected(status); setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        {selected ? `Your current RSVP: ${STATUSES.find(s => s.value === selected)?.label}` : 'Will you attend this event?'}
      </p>
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => handleRsvp(s.value)} disabled={submitting}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition cursor-pointer disabled:opacity-50 ${selected === s.value ? s.active : s.inactive}`}>
            {s.label}
          </button>
        ))}
      </div>
      {success && <p className="mt-2 text-sm text-emerald-600 font-medium">✓ RSVP saved!</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
