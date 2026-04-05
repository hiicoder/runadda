import { NextRequest, NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"
import { saveStravaTokens } from "@/lib/strava/token-manager"
import { prisma } from "@/lib/prisma"
import { fetchRecentActivities } from "@/lib/strava/client"

const SYNC_DAYS = 90

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/profile?strava=denied", request.url))
  }

  let session
  try {
    session = await getRequiredSession()
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`)
    }

    const tokenData = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_at: number
      athlete: { id: number }
    }

    const userId = session.user.id
    const stravaAthleteId = String(tokenData.athlete.id)
    const expiresAt = new Date(tokenData.expires_at * 1000)

    // Save tokens to the currently logged-in user
    // Check if this Strava account is already linked to a different user
    const existingLink = await prisma.user.findUnique({
      where: { stravaId: stravaAthleteId },
      select: { id: true },
    })
    if (existingLink && existingLink.id !== userId) {
      return NextResponse.redirect(new URL("/profile?strava=already_linked", request.url))
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        stravaId: stravaAthleteId,
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaExpiresAt: expiresAt,
        stravaConnected: true,
      },
    })

    // Immediately sync activities
    try {
      const after = Math.floor((Date.now() - SYNC_DAYS * 24 * 60 * 60 * 1000) / 1000)
      const activities = await fetchRecentActivities(tokenData.access_token, after)

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
      }
    } catch (syncErr) {
      // Non-fatal — tokens are saved, user can sync manually
      console.error("[strava/connect] Initial sync failed:", syncErr)
    }

    return NextResponse.redirect(new URL("/profile?strava=connected", request.url))
  } catch (err) {
    console.error("[strava/connect/callback]", err)
    return NextResponse.redirect(new URL("/profile?strava=error", request.url))
  }
}
