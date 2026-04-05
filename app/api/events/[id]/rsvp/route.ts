import { NextRequest, NextResponse } from 'next/server'
import { upsertRsvp, type RsvpStatus } from '@/lib/events'
import { getRequiredSession } from '@/lib/auth'

const VALID_STATUSES: RsvpStatus[] = ['JOINED', 'MAYBE', 'CANCELED']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession()
    const { id } = await params
    const body = await request.json()

    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const rsvp = await upsertRsvp(session.user.id, id, body.status as RsvpStatus)
    return NextResponse.json(rsvp)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
