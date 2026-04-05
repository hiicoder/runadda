import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrEditor } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdminOrEditor()
    return NextResponse.json(await prisma.testimonial.findMany({ orderBy: { order: 'asc' } }))
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()
    const body = await req.json() as { name: string; role?: string; avatar?: string; quote: string; order?: number }
    const t = await prisma.testimonial.create({
      data: { name: body.name, role: body.role, avatar: body.avatar, quote: body.quote, order: body.order ?? 0 },
    })
    return NextResponse.json(t)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
