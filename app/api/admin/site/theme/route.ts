import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrEditor } from '@/lib/auth'

const defaultTheme = { primary: '#6366f1', secondary: '#7c3aed', accent: '#facc15', neutral: '#1e293b' }

// GET all themes
export async function GET() {
  try {
    const themes = await prisma.siteTheme.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json(themes)
  } catch {
    return NextResponse.json([])
  }
}

// POST — create new theme
export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()
    const { name, primary, secondary, accent, neutral } = await req.json()
    const theme = await prisma.siteTheme.create({
      data: { name: name || 'Custom Theme', primary, secondary, accent, neutral, isActive: false }
    })
    return NextResponse.json(theme)
  } catch (err) {
    console.error('[theme POST]', err)
    return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 })
  }
}
