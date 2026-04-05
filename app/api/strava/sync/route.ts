import { NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"
import { getValidStravaToken, StravaAuthError } from "@/lib/strava/token-manager"
import { fetchRecentActivities, RateLimitError } from "@/lib/strava/client"
import { prisma } from "@/lib/prisma"

// Sync window: 90 days for initial sync
const SYNC_DAYS = 90

export async function POST() {
  try {
    const session = await getRequiredSession()
    const userId = session.user.id

    const token = await getValidStravaToken(userId)
    const after = Math.floor((Date.now() - SYNC_DAYS * 24 * 60 * 60 * 1000) / 1000)
    const activities = await fetchRecentActivities(token, after)

    // Include all activity types (Run, VirtualRun, Walk, Ride, etc.)
    let upserted = 0
    for (const activity of activities) {
      const distance = activity.distance
      const movingTime = activity.moving_time
      const pace = distance > 0 ? movingTime / distance : 0
      const elevationGain = activity.total_elevation_gain
      const date = new Date(activity.start_date)
      const stravaId = String(activity.id)
      const activityType = activity.type

      await prisma.cachedStravaActivity.upsert({
        where: { stravaId },
        create: { userId, stravaId, activityType, distance, movingTime, pace, elevationGain, date },
        update: { activityType, distance, movingTime, pace, elevationGain, date },
      })
      upserted++
    }

    return NextResponse.json({ synced: upserted, total: activities.length, types: [...new Set(activities.map(a => a.type))] })
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (err instanceof StravaAuthError)
      return NextResponse.json({ error: err.message }, { status: 400 })
    if (err instanceof RateLimitError)
      return NextResponse.json({ error: "Strava rate limit hit, try again later" }, { status: 429 })
    console.error("[strava/sync]", err)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
