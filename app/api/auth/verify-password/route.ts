import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string }
    if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true } })
    if (!user?.passwordHash) return NextResponse.json({ error: "No password set" }, { status: 400 })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return NextResponse.json({ error: "Invalid password" }, { status: 401 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
