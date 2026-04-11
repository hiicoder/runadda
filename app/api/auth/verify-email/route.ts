import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  // Supabase redirects here after email verification with token_hash in URL
  const { searchParams } = req.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")

  if (!tokenHash || type !== "email") {
    return NextResponse.redirect(new URL("/login?error=InvalidVerificationLink", req.url))
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })

  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL("/login?error=VerificationFailed", req.url))
  }

  // Mark email as verified in Prisma
  await prisma.user.updateMany({
    where: { email: data.user.email, emailVerified: null },
    data: { emailVerified: new Date() },
  })

  return NextResponse.redirect(new URL("/login?error=verified", req.url))
}
