import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@supabase/supabase-js"

// GET — our own token-based verification
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=InvalidVerificationLink", req.url))
  }

  const user = await prisma.user.findUnique({
    where: { verifyToken: token },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=VerificationFailed", req.url))
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verifyToken: null },
  })

  return NextResponse.redirect(new URL("/login?verified=true", req.url))
}

// POST — Supabase access token verification (from hash redirect)
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json() as { accessToken: string }
    if (!accessToken) return NextResponse.json({ error: "No token" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get user from Supabase using the access token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    if (error || !user?.email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Mark as verified in Prisma
    const updated = await prisma.user.updateMany({
      where: { email: user.email },
      data: { emailVerified: new Date(), verifyToken: null },
    })

    if (updated.count === 0) {
      // User doesn't exist in Prisma yet — this can happen if Supabase signup
      // was triggered but Prisma user wasn't created. Just return ok.
      return NextResponse.json({ ok: true, note: "no_prisma_user" })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[verify-email POST]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
