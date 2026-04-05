import { prisma } from "@/lib/prisma"

export interface StravaTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export class StravaAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StravaAuthError"
  }
}

/**
 * Returns a valid Strava access token for the given user.
 * If the stored token is expired, refreshes it via the Strava API.
 * Throws StravaAuthError if the user has no connected Strava account or refresh fails.
 */
export async function getValidStravaToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stravaAccessToken: true,
      stravaRefreshToken: true,
      stravaExpiresAt: true,
      stravaConnected: true,
    },
  })

  if (!user || !user.stravaAccessToken || !user.stravaConnected) {
    throw new StravaAuthError("Strava account is not connected")
  }

  const now = new Date()
  const isExpired = user.stravaExpiresAt ? user.stravaExpiresAt <= now : true

  if (!isExpired) {
    return user.stravaAccessToken
  }

  // Token is expired — attempt refresh
  if (!user.stravaRefreshToken) {
    await prisma.user.update({
      where: { id: userId },
      data: { stravaConnected: false },
    })
    throw new StravaAuthError("No refresh token available; Strava re-authorization required")
  }

  try {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: user.stravaRefreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`Strava refresh returned ${response.status}`)
    }

    const data = await response.json() as {
      access_token: string
      refresh_token: string
      expires_at: number
    }

    const newTokens: StravaTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    }

    await saveStravaTokens(userId, newTokens)
    return newTokens.accessToken
  } catch {
    await prisma.user.update({
      where: { id: userId },
      data: { stravaConnected: false },
    })
    throw new StravaAuthError("Strava token refresh failed; re-authorization required")
  }
}

/**
 * Persists Strava tokens for a user and marks the connection as active.
 */
export async function saveStravaTokens(userId: string, tokens: StravaTokens): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: tokens.accessToken,
      stravaRefreshToken: tokens.refreshToken,
      stravaExpiresAt: tokens.expiresAt,
      stravaConnected: true,
    },
  })
}

/**
 * Clears all Strava token fields and marks the connection as inactive.
 */
export async function revokeStravaTokens(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaExpiresAt: null,
      stravaConnected: false,
    },
  })
}
