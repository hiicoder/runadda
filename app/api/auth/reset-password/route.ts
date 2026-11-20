import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRequiredSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    // Require user to be authenticated
    const session = await getRequiredSession()
    
    const { email, passwordHash } = await req.json() as { email: string; passwordHash: string }
    if (!email || !passwordHash) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    
    // Only allow users to reset their own password
    if (session.user.email !== email) {
      return NextResponse.json({ error: "Unauthorized: can only reset your own password" }, { status: 403 })
    }
    
    await prisma.user.update({ where: { email }, data: { passwordHash } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
