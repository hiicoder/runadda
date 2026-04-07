import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 60 // cache for 60 seconds

export async function GET() {
  try {
    const [sponsors, testimonials, slides, stats, about] = await Promise.all([
      prisma.sponsor.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.testimonial.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.siteSlide.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.siteStat.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.aboutContent.findMany({ where: { active: true }, orderBy: [{ section: 'asc' }, { order: 'asc' }] }),
    ])
    return NextResponse.json({ sponsors, testimonials, slides, stats, about })
  } catch (err) {
    console.error('[/api/public/site]', err)
    return NextResponse.json({ sponsors: [], testimonials: [], slides: [], stats: [], about: [] })
  }
}
