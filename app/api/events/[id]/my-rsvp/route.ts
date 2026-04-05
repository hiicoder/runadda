import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession()
    const { id } = await params

    const rsvp = await prisma.rsvp.findUnique({
      where: { userId_eventId: { userId: session.user.id, eventId: id } },
      select: { status: true },
    })

    if (!rsvp) {
      return NextResponse.json(null)
    }

    return NextResponse.json({ status: rsvp.status })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
