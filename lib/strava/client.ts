import { StravaAuthError } from "@/lib/strava/token-manager"

export interface StravaActivity {
  id: number
  name: string
  distance: number        // meters
  moving_time: number     // seconds
  elapsed_time: number    // seconds
  total_elevation_gain: number
  type: string
  start_date: string      // ISO 8601
  average_speed: number   // m/s
}

export interface StravaStats {
  recent_run_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
  all_run_totals: {
    count: number
    distance: number
    moving_time: number
    elapsed_time: number
    elevation_gain: number
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Strava API rate limit exceeded")
    this.name = "RateLimitError"
  }
}

async function handleStravaResponse(response: Response): Promise<void> {
  if (response.ok) return

  if (response.status === 401) {
    throw new StravaAuthError("Strava API returned 401 Unauthorized")
  }

  if (response.status === 429) {
    throw new RateLimitError()
  }

  throw new Error(`Strava API error: ${response.status}`)
}

/**
 * Fetches recent activities for the authenticated athlete.
 * @param accessToken - Valid Strava access token
 * @param after - Unix timestamp; only activities after this time are returned
 */
export async function fetchRecentActivities(
  accessToken: string,
  after: number
): Promise<StravaActivity[]> {
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  await handleStravaResponse(response)

  return response.json() as Promise<StravaActivity[]>
}

/**
 * Fetches all-time and recent stats for a given athlete.
 * @param accessToken - Valid Strava access token
 * @param athleteId - Numeric Strava athlete ID
 */
export async function fetchAthleteStats(
  accessToken: string,
  athleteId: number
): Promise<StravaStats> {
  const url = `https://www.strava.com/api/v3/athletes/${athleteId}/stats`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  await handleStravaResponse(response)

  return response.json() as Promise<StravaStats>
}
