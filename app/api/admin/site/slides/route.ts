import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrEditor } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdminOrEditor()
    return NextResponse.json(await prisma.siteSlide.findMany({ orderBy: { order: 'asc' } }))
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()
    const body = await req.json() as { title: string; subtitle?: string; imageUrl?: string; ctaLabel?: string; ctaUrl?: string; order?: number }
    const slide = await prisma.siteSlide.create({
      data: { title: body.title, subtitle: body.subtitle, imageUrl: body.imageUrl, ctaLabel: body.ctaLabel, ctaUrl: body.ctaUrl, order: body.order ?? 0 },
    })
    return NextResponse.json(slide)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
