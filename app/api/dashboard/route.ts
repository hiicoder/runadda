import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequiredSession } from '@/lib/auth'

/**
 * Returns the Monday 00:00:00 UTC of the ISO week containing `date`.
 */
function getISOWeekStart(date: Date): Date {
  const d = new Date(date)
  // getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const day = d.getUTCDay()
  // Days since Monday (treat Sunday as 6)
  const diff = (day === 0 ? 6 : day - 1)
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  try {
    const session = await getRequiredSession()
    const userId = session.user.id
    const now = new Date()

    // ── Upcoming events ──────────────────────────────────────────────────────
    const upcomingEvents = await prisma.event.findMany({
      where: { dateTime: { gt: now } },
      orderBy: { dateTime: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        dateTime: true,
        location: true,
        imageUrl: true,
        _count: { select: { rsvps: true } },
      },
    })

    // ── Weekly stats ─────────────────────────────────────────────────────────
    const weekStart = getISOWeekStart(now)

    const weekActivities = await prisma.cachedStravaActivity.findMany({
      where: {
        userId,
        date: { gte: weekStart },
      },
      select: { distance: true, movingTime: true },
    })

    const runCount = weekActivities.length
    const totalDistance = weekActivities.reduce((sum: number, a: { distance: number; movingTime: number }) => sum + a.distance, 0)
    const totalMovingTime = weekActivities.reduce((sum: number, a: { distance: number; movingTime: number }) => sum + a.movingTime, 0)
    const averagePace = totalDistance > 0 ? totalMovingTime / totalDistance : 0

    const weeklyStats = { totalDistance, runCount, averagePace }

    // ── Recent activities (top 5) ─────────────────────────────────────────────
    const recentActivities = await prisma.cachedStravaActivity.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      select: {
        id: true,
        stravaId: true,
        activityType: true,
        distance: true,
        movingTime: true,
        pace: true,
        elevationGain: true,
        date: true,
      },
    })

    // ── 12-week chart data ────────────────────────────────────────────────────
    // Build the 12 week-start dates (current week + 11 prior weeks)
    const currentWeekStart = getISOWeekStart(now)
    const weekStarts: Date[] = []
    for (let i = 11; i >= 0; i--) {
      const ws = new Date(currentWeekStart)
      ws.setUTCDate(ws.getUTCDate() - i * 7)
      weekStarts.push(ws)
    }

    const chartWindowStart = weekStarts[0]

    const chartActivities = await prisma.cachedStravaActivity.findMany({
      where: {
        userId,
        date: { gte: chartWindowStart },
      },
      select: { distance: true, date: true },
    })

    // Sum distances per ISO week
    const distanceByWeek = new Map<string, number>()
    for (const ws of weekStarts) {
      distanceByWeek.set(ws.toISOString(), 0)
    }
    for (const activity of chartActivities) {
      const ws = getISOWeekStart(activity.date)
      const key = ws.toISOString()
      if (distanceByWeek.has(key)) {
        distanceByWeek.set(key, (distanceByWeek.get(key) ?? 0) + activity.distance)
      }
    }

    const chartData = weekStarts.map((ws) => ({
      weekStart: ws.toISOString(),
      totalDistance: distanceByWeek.get(ws.toISOString()) ?? 0,
    }))

    // ── Strava connect prompt ─────────────────────────────────────────────────
    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { stravaConnected: true },
    })

    const showStravaPrompt = !dbUser.stravaConnected

    return NextResponse.json({
      upcomingEvents,
      weeklyStats,
      recentActivities,
      chartData,
      showStravaPrompt,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
