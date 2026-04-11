import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=InvalidVerificationLink", req.url))
  }

  const user = await prisma.user.findUnique({
    where: { verifyToken: token },
    select: { id: true, emailVerified: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=VerificationFailed", req.url))
  }

  // Mark as verified and clear the token
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verifyToken: null },
  })

  return NextResponse.redirect(new URL("/login?error=verified", req.url))
}
