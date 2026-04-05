import { NextRequest, NextResponse } from 'next/server'
import { getRsvpCounts } from '@/lib/events'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const counts = await getRsvpCounts(id)
    return NextResponse.json(counts)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
