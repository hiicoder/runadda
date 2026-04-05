import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard, getMonthlyToppers, ACTIVITY_CATEGORIES, type LeaderboardFilter, type LeaderboardSort } from '@/lib/leaderboard'
import { getRequiredSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_FILTERS: LeaderboardFilter[] = ['weekly', 'monthly', 'all-time']
const VALID_SORTS: LeaderboardSort[] = ['distance', 'movingTime', 'pace', 'elevationGain']

export async function GET(request: NextRequest) {
  try {
    const session = await getRequiredSession()

    // Always check DB for isMember — JWT may be stale after membership activation
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    // Also check isMember via a separate query to avoid TS cache issues
    const memberCheck = await prisma.$queryRaw<{ isMember: boolean }[]>`
      SELECT "isMember" FROM "User" WHERE id = ${session.user.id} LIMIT 1
    `
    const isActuallyMember = memberCheck[0]?.isMember ?? false
    const isAllowed = isActuallyMember || dbUser?.role === 'ADMIN' || session.user.role === 'ADMIN'
    if (!isAllowed) {
      return NextResponse.json({ error: 'Members only' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const filterParam = searchParams.get('filter') ?? 'all-time'
    const sortParam = searchParams.get('sort') ?? 'distance'
    const categoryParam = searchParams.get('category') ?? 'All'
    const toppers = searchParams.get('toppers') === 'true'

    if (toppers) {
      const data = await getMonthlyToppers()
      return NextResponse.json(data)
    }

    const filter: LeaderboardFilter = VALID_FILTERS.includes(filterParam as LeaderboardFilter)
      ? (filterParam as LeaderboardFilter) : 'all-time'

    const sort: LeaderboardSort = VALID_SORTS.includes(sortParam as LeaderboardSort)
      ? (sortParam as LeaderboardSort) : 'distance'

    const category = Object.keys(ACTIVITY_CATEGORIES).includes(categoryParam) ? categoryParam : 'All'

    const entries = await getLeaderboard(filter, sort, category)
    return NextResponse.json(entries)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
