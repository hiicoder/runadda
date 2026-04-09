import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrEditor } from '@/lib/auth'

export async function GET() {
  const theme = await prisma.siteTheme.findFirst()
  return NextResponse.json(theme ?? {
    primary: '#6366f1', secondary: '#7c3aed', accent: '#facc15', neutral: '#1e293b'
  })
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()
    const { primary, secondary, accent, neutral } = await req.json()
    const existing = await prisma.siteTheme.findFirst()
    const theme = existing
      ? await prisma.siteTheme.update({ where: { id: existing.id }, data: { primary, secondary, accent, neutral } })
      : await prisma.siteTheme.create({ data: { primary, secondary, accent, neutral } })
    return NextResponse.json(theme)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
