import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrEditor } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdminOrEditor()
    return NextResponse.json(await prisma.aboutContent.findMany({ orderBy: [{ section: 'asc' }, { order: 'asc' }] }))
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()
    const body = await req.json() as { section: string; title: string; body: string; imageUrl?: string; order?: number }
    const item = await prisma.aboutContent.create({
      data: { section: body.section, title: body.title, body: body.body, imageUrl: body.imageUrl, order: body.order ?? 0 },
    })
    return NextResponse.json(item)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
