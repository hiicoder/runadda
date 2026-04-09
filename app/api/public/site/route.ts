import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 60

const defaultTheme = { primary: '#6366f1', secondary: '#7c3aed', accent: '#facc15', neutral: '#1e293b' }

export async function GET() {
  try {
    const [sponsors, testimonials, slides, stats, about, events] = await Promise.all([
      prisma.sponsor.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.testimonial.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.siteSlide.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.siteStat.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.aboutContent.findMany({ where: { active: true }, orderBy: [{ section: 'asc' }, { order: 'asc' }] }),
      prisma.event.findMany({
        where: { dateTime: { gte: new Date() } },
        orderBy: { dateTime: 'asc' },
        take: 10,
        select: {
          id: true, title: true, description: true,
          dateTime: true, location: true, imageUrl: true,
          _count: { select: { rsvps: true } },
        },
      }),
    ])

    // Theme is optional — if table doesn't exist yet, fall back to defaults
    let theme = defaultTheme
    try {
      const dbTheme = await prisma.siteTheme.findFirst({ where: { isActive: true } })
      if (dbTheme) theme = { primary: dbTheme.primary, secondary: dbTheme.secondary, accent: dbTheme.accent, neutral: dbTheme.neutral }
    } catch { /* table may not exist yet */ }

    return NextResponse.json({ sponsors, testimonials, slides, stats, about, events, theme })
  } catch (err) {
    console.error('[/api/public/site]', err)
    return NextResponse.json({ sponsors: [], testimonials: [], slides: [], stats: [], about: [], events: [], theme: defaultTheme })
  }
}
