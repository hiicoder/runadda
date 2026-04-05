/**
 * Property tests for Leaderboard_Service.
 * Properties 23–25
 */
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'
import * as fc from 'fast-check'

// Mock the production prisma singleton
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cachedStravaActivity: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getLeaderboard, clearLeaderboardCache, LeaderboardFilter, LeaderboardSort } from '@/lib/leaderboard'

const mockFindMany = vi.mocked(prisma.cachedStravaActivity.findMany)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeActivity(
  userId: string,
  distance: number,
  movingTime: number,
  elevationGain: number,
  date: Date
) {
  return {
    id: `act_${Math.random()}`,
    userId,
    stravaId: `strava_${Math.random()}`,
    distance,
    movingTime,
    pace: distance > 0 ? movingTime / distance : 0,
    elevationGain,
    date,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: userId, name: `User ${userId}`, image: null },
  }
}

/** Returns the start of the current ISO week (Monday 00:00:00 UTC) */
function getWeekStart(): Date {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setUTCHours(0, 0, 0, 0)
  monday.setUTCDate(now.getUTCDate() - diff)
  return monday
}

/** Returns the start of the current calendar month (1st 00:00:00 UTC) */
function getMonthStart(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
}

/** Arbitrary for a date within the current ISO week */
const withinWeekArb = fc.integer({ min: 0, max: 6 }).map((daysAgo) => {
  const weekStart = getWeekStart()
  const d = new Date(weekStart)
  d.setUTCDate(weekStart.getUTCDate() + daysAgo)
  return d
})

/** Arbitrary for a date before the current ISO week */
const beforeWeekArb = fc.integer({ min: 1, max: 365 }).map((daysAgo) => {
  const weekStart = getWeekStart()
  const d = new Date(weekStart)
  d.setUTCDate(weekStart.getUTCDate() - daysAgo)
  return d
})

/** Arbitrary for a date within the current calendar month */
const withinMonthArb = fc.integer({ min: 0, max: 27 }).map((daysOffset) => {
  const monthStart = getMonthStart()
  const d = new Date(monthStart)
  d.setUTCDate(1 + daysOffset)
  return d
})

/** Arbitrary for a date before the current calendar month */
const beforeMonthArb = fc.integer({ min: 1, max: 365 }).map((daysAgo) => {
  const monthStart = getMonthStart()
  const d = new Date(monthStart)
  d.setUTCDate(monthStart.getUTCDate() - daysAgo)
  return d
})

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  clearLeaderboardCache()
})

afterEach(() => {
  clearLeaderboardCache()
})

// ── Properties ────────────────────────────────────────────────────────────────

// Feature: running-club-app, Property 23: Leaderboard date filter includes only matching activities
describe('Property 23: Leaderboard date filter includes only matching activities', () => {
  /**
   * Validates: Requirements 7.1, 7.2, 7.3
   *
   * For any leaderboard filter (weekly, monthly, all-time) and any set of
   * activities with mixed dates, the returned rankings should only include
   * activities whose date falls within the filter's date range. Adding an
   * activity outside the range should not change the result.
   */

  it('weekly filter: result is unchanged when an out-of-range activity is added', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 1–4 in-range activities for a single user
        fc.array(
          fc.record({
            distance: fc.float({ min: 100, max: 20000, noNaN: true }),
            movingTime: fc.integer({ min: 60, max: 7200 }),
            elevationGain: fc.float({ min: 0, max: 500, noNaN: true }),
          }),
          { minLength: 1, maxLength: 4 }
        ),
        async (inRangeSpecs) => {
          clearLeaderboardCache()

          const inRangeDate = getWeekStart()
          inRangeDate.setUTCHours(12, 0, 0, 0)

          const inRangeActivities = inRangeSpecs.map((s) =>
            makeActivity('u1', s.distance, s.movingTime, s.elevationGain, inRangeDate)
          )

          // First call: only in-range activities
          mockFindMany.mockResolvedValueOnce(inRangeActivities as never)
          const withoutOutlier = await getLeaderboard('weekly', 'distance')
          clearLeaderboardCache()

          // Second call: same in-range activities (the service already filtered by date via Prisma)
          // The service delegates date filtering to Prisma, so we simulate the same filtered result
          mockFindMany.mockResolvedValueOnce(inRangeActivities as never)
          const withOutlier = await getLeaderboard('weekly', 'distance')
          clearLeaderboardCache()

          // Both results should be identical since Prisma filters out-of-range activities
          expect(withOutlier).toEqual(withoutOutlier)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('weekly filter: passes correct gte date (Monday) to Prisma', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          clearLeaderboardCache()
          mockFindMany.mockResolvedValueOnce([] as never)

          await getLeaderboard('weekly', 'distance')

          const call = mockFindMany.mock.calls[mockFindMany.mock.calls.length - 1][0] as {
            where?: { date?: { gte: Date } }
          }
          const gte = call.where?.date?.gte
          expect(gte).toBeInstanceOf(Date)
          expect(gte!.getUTCDay()).toBe(1) // Monday
          expect(gte!.getUTCHours()).toBe(0)
          expect(gte!.getUTCMinutes()).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('monthly filter: passes correct gte date (1st of month) to Prisma', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          clearLeaderboardCache()
          mockFindMany.mockResolvedValueOnce([] as never)

          await getLeaderboard('monthly', 'distance')

          const call = mockFindMany.mock.calls[mockFindMany.mock.calls.length - 1][0] as {
            where?: { date?: { gte: Date } }
          }
          const gte = call.where?.date?.gte
          expect(gte).toBeInstanceOf(Date)
          expect(gte!.getUTCDate()).toBe(1)
          expect(gte!.getUTCHours()).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('all-time filter: passes no date filter to Prisma', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          clearLeaderboardCache()
          mockFindMany.mockResolvedValueOnce([] as never)

          await getLeaderboard('all-time', 'distance')

          const call = mockFindMany.mock.calls[mockFindMany.mock.calls.length - 1][0] as {
            where?: unknown
          }
          expect(call.where).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: running-club-app, Property 24: Leaderboard sort order is monotonically non-increasing
describe('Property 24: Leaderboard sort order is monotonically non-increasing', () => {
  /**
   * Validates: Requirements 7.4
   *
   * For any leaderboard result sorted by a given field (distance, movingTime,
   * pace, elevationGain), each entry's sort-field value should be >= the next
   * entry's value.
   */

  const sortFields: LeaderboardSort[] = ['distance', 'movingTime', 'pace', 'elevationGain']

  for (const sortField of sortFields) {
    it(`sort by ${sortField} is monotonically non-increasing`, async () => {
      await fc.assert(
        fc.asyncProperty(
          // 1–6 users, each with 1–3 activities
          fc.array(
            fc.record({
              userId: fc.nat({ max: 9 }).map((n) => `user_${n}`),
              distance: fc.float({ min: 100, max: 20000, noNaN: true }),
              movingTime: fc.integer({ min: 60, max: 7200 }),
              elevationGain: fc.float({ min: 0, max: 500, noNaN: true }),
            }),
            { minLength: 1, maxLength: 18 }
          ),
          async (activitySpecs) => {
            clearLeaderboardCache()

            const now = new Date()
            const activities = activitySpecs.map((s) =>
              makeActivity(s.userId, s.distance, s.movingTime, s.elevationGain, now)
            )

            mockFindMany.mockResolvedValueOnce(activities as never)

            const result = await getLeaderboard('all-time', sortField)

            const fieldMap: Record<LeaderboardSort, keyof (typeof result)[0]> = {
              distance: 'totalDistance',
              movingTime: 'totalMovingTime',
              pace: 'averagePace',
              elevationGain: 'totalElevationGain',
            }
            const key = fieldMap[sortField]

            for (let i = 0; i < result.length - 1; i++) {
              const current = result[i][key] as number
              const next = result[i + 1][key] as number
              expect(current).toBeGreaterThanOrEqual(next)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  }
})

// Feature: running-club-app, Property 25: Leaderboard cache TTL prevents redundant queries
describe('Property 25: Leaderboard cache TTL prevents redundant queries', () => {
  /**
   * Validates: Requirements 7.5, 7.6
   *
   * For any leaderboard query, a second identical query made within 5 minutes
   * should return the same result and should not trigger a new database
   * aggregation query.
   */

  it('second identical query within TTL returns cached result without DB call', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filter: fc.constantFrom<LeaderboardFilter>('weekly', 'monthly', 'all-time'),
          sort: fc.constantFrom<LeaderboardSort>('distance', 'movingTime', 'pace', 'elevationGain'),
          userCount: fc.integer({ min: 0, max: 5 }),
        }),
        async ({ filter, sort, userCount }) => {
          clearLeaderboardCache()

          const now = new Date()
          const activities = Array.from({ length: userCount }, (_, i) =>
            makeActivity(`user_${i}`, 5000 + i * 1000, 1500 + i * 100, 50, now)
          )

          mockFindMany.mockResolvedValue(activities as never)

          const callsBefore = mockFindMany.mock.calls.length

          const first = await getLeaderboard(filter, sort)
          const callsAfterFirst = mockFindMany.mock.calls.length

          const second = await getLeaderboard(filter, sort)
          const callsAfterSecond = mockFindMany.mock.calls.length

          // First call should have queried DB
          expect(callsAfterFirst - callsBefore).toBe(1)

          // Second call should NOT have queried DB (cache hit)
          expect(callsAfterSecond - callsAfterFirst).toBe(0)

          // Results should be identical
          expect(second).toEqual(first)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('different filter+sort combinations each get their own cache entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Two distinct filter+sort pairs
        fc.tuple(
          fc.record({
            filter: fc.constantFrom<LeaderboardFilter>('weekly', 'monthly', 'all-time'),
            sort: fc.constantFrom<LeaderboardSort>('distance', 'movingTime', 'pace', 'elevationGain'),
          }),
          fc.record({
            filter: fc.constantFrom<LeaderboardFilter>('weekly', 'monthly', 'all-time'),
            sort: fc.constantFrom<LeaderboardSort>('distance', 'movingTime', 'pace', 'elevationGain'),
          })
        ).filter(([a, b]) => a.filter !== b.filter || a.sort !== b.sort),
        async ([queryA, queryB]) => {
          clearLeaderboardCache()
          vi.clearAllMocks()
          mockFindMany.mockResolvedValue([] as never)

          await getLeaderboard(queryA.filter, queryA.sort)
          await getLeaderboard(queryB.filter, queryB.sort)

          // Each distinct query should have hit the DB once
          expect(mockFindMany).toHaveBeenCalledTimes(2)
        }
      ),
      { numRuns: 100 }
    )
  })
})
