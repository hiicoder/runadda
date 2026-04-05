import { NextRequest, NextResponse } from 'next/server'
import { listUpcomingEvents, createEvent, ValidationError } from '@/lib/events'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const events = await listUpcomingEvents()
    return NextResponse.json(events)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()

    const event = await createEvent(session.user.id, {
      title: body.title,
      description: body.description,
      dateTime: new Date(body.dateTime),
      location: body.location,
      imageUrl: body.imageUrl,
    })

    return NextResponse.json(event, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message, fields: err.fields }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
