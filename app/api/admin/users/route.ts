import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    await requireAdmin()

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isMember: true,
        stravaConnected: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get blocked status via raw query (field may not be in generated client yet)
    const blockedRows = await prisma.$queryRaw<{ id: string; blocked: boolean }[]>`
      SELECT id, COALESCE(blocked, false) as blocked FROM "User"
    `
    const blockedMap = new Map(blockedRows.map(r => [r.id, r.blocked]))

    // Cross-reference email verification status from Supabase Auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceKey) {
      try {
        const adminClient = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
        const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const supabaseUsers = data?.users ?? []

        // Build a map of email -> email_confirmed_at from Supabase
        const verifiedMap = new Map<string, string | null>()
        for (const u of supabaseUsers) {
          if (u.email) verifiedMap.set(u.email, u.email_confirmed_at ?? null)
        }

        // Merge: if Supabase says verified but Prisma doesn't, update Prisma
        const updates: Promise<unknown>[] = []
        const merged = users.map(u => {
          const supabaseVerified = verifiedMap.get(u.email)
          const isVerified = !!(supabaseVerified || u.emailVerified)

          // Sync to Prisma if Supabase has it but Prisma doesn't
          if (supabaseVerified && !u.emailVerified) {
            updates.push(
              prisma.user.update({
                where: { id: u.id },
                data: { emailVerified: new Date(supabaseVerified) },
              })
            )
          }

          return { ...u, blocked: blockedMap.get(u.id) ?? false, emailVerified: isVerified ? (u.emailVerified ?? supabaseVerified) : null }
        })

        // Fire and forget sync
        if (updates.length > 0) Promise.all(updates).catch(() => {})

        return NextResponse.json(merged)
      } catch {
        // Supabase unavailable — fall back to Prisma data
      }
    }

    return NextResponse.json(users.map(u => ({ ...u, blocked: blockedMap.get(u.id) ?? false })))
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
