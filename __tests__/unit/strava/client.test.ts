import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/__tests__/mocks/server"
import { mockActivities, mockStats } from "@/__tests__/mocks/strava-handlers"
import {
  fetchRecentActivities,
  fetchAthleteStats,
  RateLimitError,
} from "@/lib/strava/client"
import { StravaAuthError } from "@/lib/strava/token-manager"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const TOKEN = "test-access-token"

describe("fetchRecentActivities", () => {
  it("returns activities from the Strava API", async () => {
    const activities = await fetchRecentActivities(TOKEN, 0)
    expect(activities).toEqual(mockActivities)
  })

  it("passes the after timestamp as a query param", async () => {
    let capturedUrl = ""
    server.use(
      http.get("https://www.strava.com/api/v3/athlete/activities", ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([])
      })
    )
    await fetchRecentActivities(TOKEN, 1700000000)
    expect(capturedUrl).toContain("after=1700000000")
    expect(capturedUrl).toContain("per_page=200")
  })

  it("sends Authorization header", async () => {
    let capturedAuth = ""
    server.use(
      http.get("https://www.strava.com/api/v3/athlete/activities", ({ request }) => {
        capturedAuth = request.headers.get("Authorization") ?? ""
        return HttpResponse.json([])
      })
    )
    await fetchRecentActivities(TOKEN, 0)
    expect(capturedAuth).toBe(`Bearer ${TOKEN}`)
  })

  it("throws StravaAuthError on 401", async () => {
    server.use(
      http.get("https://www.strava.com/api/v3/athlete/activities", () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 })
      )
    )
    await expect(fetchRecentActivities(TOKEN, 0)).rejects.toBeInstanceOf(StravaAuthError)
  })

  it("throws RateLimitError on 429", async () => {
    server.use(
      http.get("https://www.strava.com/api/v3/athlete/activities", () =>
        HttpResponse.json({ message: "Rate limit exceeded" }, { status: 429 })
      )
    )
    await expect(fetchRecentActivities(TOKEN, 0)).rejects.toBeInstanceOf(RateLimitError)
  })

  it("throws generic Error on other non-OK status", async () => {
    server.use(
      http.get("https://www.strava.com/api/v3/athlete/activities", () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 })
      )
    )
    await expect(fetchRecentActivities(TOKEN, 0)).rejects.toThrow("500")
  })
})

describe("fetchAthleteStats", () => {
  it("returns stats from the Strava API", async () => {
    const stats = await fetchAthleteStats(TOKEN, 12345)
    expect(stats).toEqual(mockStats)
  })

  it("sends Authorization header", async () => {
    let capturedAuth = ""
    server.use(
      http.get("https://www.strava.com/api/v3/athletes/:athleteId/stats", ({ request }) => {
        capturedAuth = request.headers.get("Authorization") ?? ""
        return HttpResponse.json(mockStats)
      })
    )
    await fetchAthleteStats(TOKEN, 12345)
    expect(capturedAuth).toBe(`Bearer ${TOKEN}`)
  })

  it("throws StravaAuthError on 401", async () => {
    server.use(
      http.get("https://www.strava.com/api/v3/athletes/:athleteId/stats", () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 })
      )
    )
    await expect(fetchAthleteStats(TOKEN, 12345)).rejects.toBeInstanceOf(StravaAuthError)
  })

  it("throws RateLimitError on 429", async () => {
    server.use(
      http.get("https://www.strava.com/api/v3/athletes/:athleteId/stats", () =>
        HttpResponse.json({ message: "Rate limit exceeded" }, { status: 429 })
      )
    )
    await expect(fetchAthleteStats(TOKEN, 12345)).rejects.toBeInstanceOf(RateLimitError)
  })
})
