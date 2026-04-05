import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrEditor } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdminOrEditor()
    const sponsors = await prisma.sponsor.findMany({ orderBy: { order: 'asc' } })
    return NextResponse.json(sponsors)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()
    const body = await req.json() as { name: string; logo: string; url?: string; order?: number }
    const sponsor = await prisma.sponsor.create({ data: { name: body.name, logo: body.logo, url: body.url, order: body.order ?? 0 } })
    return NextResponse.json(sponsor)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
