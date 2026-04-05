import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getValidStravaToken, StravaAuthError } from "@/lib/strava/token-manager"
import { fetchRecentActivities, RateLimitError } from "@/lib/strava/client"

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch all users with a valid Strava connection
  const users = await prisma.user.findMany({
    where: {
      stravaId: { not: null },
      stravaConnected: true,
    },
    select: { id: true },
  })

  // Sync window: 7 days ago
  const after = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)

  let synced = 0
  let skipped = 0

  for (const user of users) {
    try {
      const token = await getValidStravaToken(user.id)
      const activities = await fetchRecentActivities(token, after)

      for (const activity of activities) {
        const distance = activity.distance
        const movingTime = activity.moving_time
        const pace = distance > 0 ? movingTime / distance : 0
        const elevationGain = activity.total_elevation_gain
        const date = new Date(activity.start_date)
        const stravaId = String(activity.id)

        await prisma.cachedStravaActivity.upsert({
          where: { stravaId },
          create: {
            userId: user.id,
            stravaId,
            distance,
            movingTime,
            pace,
            elevationGain,
            date,
          },
          update: {
            distance,
            movingTime,
            pace,
            elevationGain,
            date,
          },
        })
      }

      synced++
    } catch (err) {
      if (err instanceof StravaAuthError) {
        console.error(`[sync-strava] Skipping user ${user.id}: ${err.message}`)
        skipped++
        continue
      }

      if (err instanceof RateLimitError) {
        console.error(`[sync-strava] Rate limit hit, halting sync cycle`)
        break
      }

      // Unexpected error — log and skip
      console.error(`[sync-strava] Unexpected error for user ${user.id}:`, err)
      skipped++
    }
  }

  return NextResponse.json({ synced, skipped })
}
