import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const VALID_ROLES = ['USER', 'EDITOR', 'ADMIN'] as const
type ValidRole = typeof VALID_ROLES[number]

// PATCH — update role, disconnect strava, revoke membership
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json() as {
      role?: string
      disconnectStrava?: boolean
      revokeMembership?: boolean
    }

    const data: Prisma.UserUpdateInput = {}

    if (body.role) {
      if (!VALID_ROLES.includes(body.role as ValidRole))
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.role = body.role as any
    }

    if (body.disconnectStrava) {
      data.stravaId = null
      data.stravaAccessToken = null
      data.stravaRefreshToken = null
      data.stravaExpiresAt = null
      data.stravaConnected = false
    }

    if (body.revokeMembership) {
      data.isMember = false
      // Also free up the membership code so it can be reused
      await prisma.membershipCode.updateMany({
        where: { usedById: id },
        data: { usedById: null, usedAt: null },
      })
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isMember: true, stravaConnected: true },
    })

    return NextResponse.json(user)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — delete user and all their data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin()
    const { id } = await params

    if (id === session.user.id)
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

    // Free up membership code first
    await prisma.membershipCode.updateMany({
      where: { usedById: id },
      data: { usedById: null, usedAt: null },
    })

    await prisma.user.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
