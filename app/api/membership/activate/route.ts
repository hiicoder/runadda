import { NextRequest, NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getRequiredSession()
    const { code } = await req.json() as { code?: string }

    if (!code?.trim()) {
      return NextResponse.json({ error: "Membership code is required" }, { status: 400 })
    }

    const memberCode = await prisma.membershipCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    })

    if (!memberCode) {
      return NextResponse.json({ error: "Invalid membership code" }, { status: 400 })
    }

    if (memberCode.usedById) {
      return NextResponse.json({ error: "This code has already been used" }, { status: 400 })
    }

    // Check user isn't already a member
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isMember: true } })
    if (user?.isMember) {
      return NextResponse.json({ error: "You are already a member" }, { status: 400 })
    }

    // Activate membership
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { isMember: true },
      }),
      prisma.membershipCode.update({
        where: { code: memberCode.code },
        data: { usedById: session.user.id, usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true, message: "Membership activated!" })
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
