import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrEditor } from '@/lib/auth'

// PATCH — activate a theme (deactivates all others)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrEditor()
    const { id } = await params
    // Deactivate all, then activate selected
    await prisma.siteTheme.updateMany({ data: { isActive: false } })
    const theme = await prisma.siteTheme.update({ where: { id }, data: { isActive: true } })
    return NextResponse.json(theme)
  } catch (err) {
    console.error('[theme PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// DELETE — remove a theme
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrEditor()
    const { id } = await params
    await prisma.siteTheme.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[theme DELETE]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
