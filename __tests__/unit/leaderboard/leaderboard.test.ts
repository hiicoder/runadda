/**
 * Unit tests for Leaderboard_Service (lib/leaderboard.ts)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock the production prisma singleton
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cachedStravaActivity: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getLeaderboard, clearLeaderboardCache } from '@/lib/leaderboard'

const mockFindMany = vi.mocked(prisma.cachedStravaActivity.findMany)

function makeActivity(
  userId: string,
  userName: string | null,
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
    pace: movingTime / distance,
    elevationGain,
    date,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: userId, name: userName, image: null },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  clearLeaderboardCache()
})

afterEach(() => {
  clearLeaderboardCache()
})

describe('getLeaderboard — aggregation', () => {
  it('aggregates multiple activities for the same user', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 5000, 1500, 50, now),
      makeActivity('u1', 'Alice', 3000, 900, 30, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'distance')

    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe('u1')
    expect(result[0].totalDistance).toBe(8000)
    expect(result[0].totalMovingTime).toBe(2400)
    expect(result[0].totalElevationGain).toBe(80)
    expect(result[0].activityCount).toBe(2)
  })

  it('computes averagePace as totalMovingTime / totalDistance', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 4000, 2000, 0, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'pace')
    expect(result[0].averagePace).toBeCloseTo(2000 / 4000)
  })

  it('sets averagePace to 0 when totalDistance is 0', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 0, 0, 0, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'pace')
    expect(result[0].averagePace).toBe(0)
  })

  it('returns empty array when no activities exist', async () => {
    mockFindMany.mockResolvedValue([] as never)
    const result = await getLeaderboard('all-time', 'distance')
    expect(result).toHaveLength(0)
  })

  it('handles multiple users independently', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 10000, 3000, 100, now),
      makeActivity('u2', 'Bob', 5000, 1500, 50, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'distance')
    expect(result).toHaveLength(2)
    const alice = result.find((e) => e.userId === 'u1')!
    const bob = result.find((e) => e.userId === 'u2')!
    expect(alice.totalDistance).toBe(10000)
    expect(bob.totalDistance).toBe(5000)
  })
})

describe('getLeaderboard — sorting', () => {
  it('sorts by distance descending', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 3000, 900, 0, now),
      makeActivity('u2', 'Bob', 10000, 3000, 0, now),
      makeActivity('u3', 'Carol', 6000, 1800, 0, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'distance')
    expect(result.map((e) => e.userId)).toEqual(['u2', 'u3', 'u1'])
  })

  it('sorts by movingTime descending', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 5000, 1000, 0, now),
      makeActivity('u2', 'Bob', 5000, 3000, 0, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'movingTime')
    expect(result[0].userId).toBe('u2')
    expect(result[1].userId).toBe('u1')
  })

  it('sorts by elevationGain descending', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 5000, 1500, 200, now),
      makeActivity('u2', 'Bob', 5000, 1500, 50, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'elevationGain')
    expect(result[0].userId).toBe('u1')
  })

  it('sorts by pace descending', async () => {
    const now = new Date()
    // u1: pace = 1500/5000 = 0.3, u2: pace = 3000/5000 = 0.6
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 5000, 1500, 0, now),
      makeActivity('u2', 'Bob', 5000, 3000, 0, now),
    ] as never)

    const result = await getLeaderboard('all-time', 'pace')
    expect(result[0].userId).toBe('u2') // higher pace value = slower runner, sorted desc
  })
})

describe('getLeaderboard — date filtering', () => {
  it('passes a gte date filter for weekly', async () => {
    mockFindMany.mockResolvedValue([] as never)
    await getLeaderboard('weekly', 'distance')

    const call = mockFindMany.mock.calls[0][0] as { where?: { date?: { gte: Date } } }
    expect(call.where?.date?.gte).toBeInstanceOf(Date)
    // Should be Monday of current week
    const gte = call.where!.date!.gte
    expect(gte.getUTCDay()).toBe(1) // Monday
  })

  it('passes a gte date filter for monthly', async () => {
    mockFindMany.mockResolvedValue([] as never)
    await getLeaderboard('monthly', 'distance')

    const call = mockFindMany.mock.calls[0][0] as { where?: { date?: { gte: Date } } }
    expect(call.where?.date?.gte).toBeInstanceOf(Date)
    const gte = call.where!.date!.gte
    expect(gte.getUTCDate()).toBe(1) // First of month
  })

  it('passes no date filter for all-time', async () => {
    mockFindMany.mockResolvedValue([] as never)
    await getLeaderboard('all-time', 'distance')

    const call = mockFindMany.mock.calls[0][0] as { where?: unknown }
    expect(call.where).toBeUndefined()
  })
})

describe('getLeaderboard — TTL cache', () => {
  it('returns cached result on second call without querying DB again', async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      makeActivity('u1', 'Alice', 5000, 1500, 0, now),
    ] as never)

    const first = await getLeaderboard('all-time', 'distance')
    const second = await getLeaderboard('all-time', 'distance')

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('uses separate cache entries for different filter+sort combinations', async () => {
    mockFindMany.mockResolvedValue([] as never)

    await getLeaderboard('weekly', 'distance')
    await getLeaderboard('monthly', 'distance')
    await getLeaderboard('weekly', 'pace')

    expect(mockFindMany).toHaveBeenCalledTimes(3)
  })

  it('re-queries after cache is cleared', async () => {
    mockFindMany.mockResolvedValue([] as never)

    await getLeaderboard('all-time', 'distance')
    clearLeaderboardCache()
    await getLeaderboard('all-time', 'distance')

    expect(mockFindMany).toHaveBeenCalledTimes(2)
  })
})
