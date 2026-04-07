import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 60

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
    return NextResponse.json({ sponsors, testimonials, slides, stats, about, events })
  } catch (err) {
    console.error('[/api/public/site]', err)
    return NextResponse.json({ sponsors: [], testimonials: [], slides: [], stats: [], about: [], events: [] })
  }
}
