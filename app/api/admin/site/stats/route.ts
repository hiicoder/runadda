import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrEditor } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdminOrEditor()
    return NextResponse.json(await prisma.siteStat.findMany({ orderBy: { order: 'asc' } }))
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()
    const body = await req.json() as { value: string; label: string; order?: number }
    const stat = await prisma.siteStat.create({ data: { value: body.value, label: body.label, order: body.order ?? 0 } })
    return NextResponse.json(stat)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
