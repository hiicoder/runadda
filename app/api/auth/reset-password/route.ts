import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { email, passwordHash } = await req.json() as { email: string; passwordHash: string }
    if (!email || !passwordHash) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    await prisma.user.update({ where: { email }, data: { passwordHash } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
