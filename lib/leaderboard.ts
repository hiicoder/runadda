import { prisma } from '@/lib/prisma'

export type LeaderboardFilter = 'weekly' | 'monthly' | 'all-time'
export type LeaderboardSort = 'distance' | 'movingTime' | 'pace' | 'elevationGain'

// Activity category groupings
export const ACTIVITY_CATEGORIES: Record<string, string[]> = {
  All: [],
  Running: ['Run', 'VirtualRun', 'TrailRun'],
  Cycling: ['Ride', 'VirtualRide', 'EBikeRide', 'MountainBikeRide', 'GravelRide'],
  Walking: ['Walk', 'Hike'],
  Swimming: ['Swim', 'OpenWaterSwim'],
  Workout: ['Workout', 'WeightTraining', 'Crossfit', 'Elliptical', 'StairStepper', 'Yoga', 'Pilates'],
  Other: [],
}

export interface LeaderboardEntry {
  userId: string
  name: string | null
  image: string | null
  totalDistance: number
  totalMovingTime: number
  averagePace: number
  totalElevationGain: number
  activityCount: number
}

export interface MonthlyTopper {
  category: string
  userId: string
  name: string | null
  image: string | null
  value: number
  unit: string
  activityCount: number
}

const cache = new Map<string, { data: unknown; expiresAt: number }>()
const TTL_MS = 5 * 60 * 1000

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setUTCHours(0, 0, 0, 0)
  monday.setUTCDate(now.getUTCDate() - diff)
  return monday
}

function getMonthStart(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function getTypesForCategory(category: string): string[] | undefined {
  if (category === 'All') return undefined
  if (category === 'Other') {
    const known = Object.values(ACTIVITY_CATEGORIES).flat()
    return undefined // handled separately
  }
  return ACTIVITY_CATEGORIES[category]
}

export async function getLeaderboard(
  filter: LeaderboardFilter,
  sort: LeaderboardSort,
  category = 'All'
): Promise<LeaderboardEntry[]> {
  const cacheKey = `leaderboard:${filter}:${sort}:${category}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data as LeaderboardEntry[]

  let dateFilter: Date | undefined
  if (filter === 'weekly') dateFilter = getWeekStart()
  else if (filter === 'monthly') dateFilter = getMonthStart()

  // Build type filter
  let typeFilter: string[] | undefined
  if (category !== 'All') {
    if (category === 'Other') {
      const known = Object.values(ACTIVITY_CATEGORIES).flat()
      // We'll filter in JS for "Other"
      typeFilter = undefined
    } else {
      typeFilter = ACTIVITY_CATEGORIES[category] ?? undefined
    }
  }

  const activities = await prisma.cachedStravaActivity.findMany({
    where: {
      ...(dateFilter ? { date: { gte: dateFilter } } : {}),
      ...(typeFilter ? { activityType: { in: typeFilter } } : {}),
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  })

  // For "Other" category, exclude known types
  const knownTypes = Object.values(ACTIVITY_CATEGORIES).flat()
  const filtered = category === 'Other'
    ? activities.filter(a => !knownTypes.includes(a.activityType))
    : activities

  const aggregated = new Map<string, {
    userId: string; name: string | null; image: string | null
    totalDistance: number; totalMovingTime: number
    totalElevationGain: number; activityCount: number
  }>()

  for (const a of filtered) {
    const ex = aggregated.get(a.userId)
    if (ex) {
      ex.totalDistance += a.distance
      ex.totalMovingTime += a.movingTime
      ex.totalElevationGain += a.elevationGain
      ex.activityCount++
    } else {
      aggregated.set(a.userId, {
        userId: a.userId, name: a.user.name, image: a.user.image,
        totalDistance: a.distance, totalMovingTime: a.movingTime,
        totalElevationGain: a.elevationGain, activityCount: 1,
      })
    }
  }

  const entries: LeaderboardEntry[] = Array.from(aggregated.values()).map(agg => ({
    ...agg,
    averagePace: agg.totalDistance > 0 ? agg.totalMovingTime / agg.totalDistance : 0,
  }))

  const sortKey: Record<LeaderboardSort, keyof LeaderboardEntry> = {
    distance: 'totalDistance', movingTime: 'totalMovingTime',
    pace: 'averagePace', elevationGain: 'totalElevationGain',
  }
  entries.sort((a, b) => (b[sortKey[sort]] as number) - (a[sortKey[sort]] as number))

  cache.set(cacheKey, { data: entries, expiresAt: Date.now() + TTL_MS })
  return entries
}

export async function getMonthlyToppers(): Promise<MonthlyTopper[]> {
  const cacheKey = 'monthly-toppers'
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data as MonthlyTopper[]

  const monthStart = getMonthStart()

  const activities = await prisma.cachedStravaActivity.findMany({
    where: { date: { gte: monthStart } },
    include: { user: { select: { id: true, name: true, image: true } } },
  })

  const knownTypes = Object.values(ACTIVITY_CATEGORIES).flat()

  const toppers: MonthlyTopper[] = []

  for (const [category, types] of Object.entries(ACTIVITY_CATEGORIES)) {
    if (category === 'All' || category === 'Other') continue

    const catActivities = activities.filter(a => types.includes(a.activityType))
    if (catActivities.length === 0) continue

    // Aggregate by user
    const byUser = new Map<string, { name: string | null; image: string | null; distance: number; count: number }>()
    for (const a of catActivities) {
      const ex = byUser.get(a.userId)
      if (ex) { ex.distance += a.distance; ex.count++ }
      else byUser.set(a.userId, { name: a.user.name, image: a.user.image, distance: a.distance, count: 1 })
    }

    // Find top user by distance
    let topUserId = '', topDist = 0, topCount = 0, topName: string | null = null, topImage: string | null = null
    for (const [uid, data] of byUser) {
      if (data.distance > topDist) {
        topDist = data.distance; topUserId = uid
        topName = data.name; topImage = data.image; topCount = data.count
      }
    }

    if (topUserId) {
      toppers.push({
        category,
        userId: topUserId,
        name: topName,
        image: topImage,
        value: topDist,
        unit: 'km',
        activityCount: topCount,
      })
    }
  }

  cache.set(cacheKey, { data: toppers, expiresAt: Date.now() + TTL_MS })
  return toppers
}

export function clearLeaderboardCache(): void { cache.clear() }
