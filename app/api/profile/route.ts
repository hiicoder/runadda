import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequiredSession } from '@/lib/auth'

async function buildProfileResponse(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      role: true,
      isMember: true,
      stravaConnected: true,
    },
  })

  const activities = await prisma.cachedStravaActivity.findMany({
    where: { userId },
    select: { distance: true, movingTime: true },
  })

  const runCount = activities.length
  const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0)
  const totalMovingTime = activities.reduce((sum, a) => sum + a.movingTime, 0)
  const averagePace = totalDistance > 0 ? totalMovingTime / totalDistance : 0

  return {
    ...user,
    stats: {
      totalDistance,
      runCount,
      averagePace,
    },
  }
}

export async function GET() {
  try {
    const session = await getRequiredSession()
    const profile = await buildProfileResponse(session.user.id)
    return NextResponse.json(profile)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const body = await request.json()

    const { name, bio, image } = body as { name?: string; bio?: string; image?: string }

    if (name !== undefined && name.trim() === '') {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const updateData: { name?: string; bio?: string; image?: string } = {}
    if (name !== undefined) updateData.name = name
    if (bio !== undefined) updateData.bio = bio
    if (image !== undefined) updateData.image = image

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    const profile = await buildProfileResponse(session.user.id)
    return NextResponse.json(profile)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
