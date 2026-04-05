import { http, HttpResponse } from "msw"
import type { StravaActivity, StravaStats } from "@/lib/strava/client"

export const mockActivities: StravaActivity[] = [
  {
    id: 1001,
    name: "Morning Run",
    distance: 5000,
    moving_time: 1500,
    elapsed_time: 1600,
    total_elevation_gain: 50,
    type: "Run",
    start_date: "2024-01-15T07:00:00Z",
    average_speed: 3.33,
  },
  {
    id: 1002,
    name: "Evening Jog",
    distance: 8000,
    moving_time: 2400,
    elapsed_time: 2500,
    total_elevation_gain: 80,
    type: "Run",
    start_date: "2024-01-16T18:00:00Z",
    average_speed: 3.33,
  },
]

export const mockStats: StravaStats = {
  recent_run_totals: {
    count: 5,
    distance: 30000,
    moving_time: 9000,
    elapsed_time: 9500,
    elevation_gain: 200,
  },
  all_run_totals: {
    count: 120,
    distance: 800000,
    moving_time: 240000,
    elapsed_time: 250000,
    elevation_gain: 5000,
  },
}

export const stravaHandlers = [
  http.get("https://www.strava.com/api/v3/athlete/activities", () => {
    return HttpResponse.json(mockActivities)
  }),

  http.get("https://www.strava.com/api/v3/athletes/:athleteId/stats", () => {
    return HttpResponse.json(mockStats)
  }),
]
