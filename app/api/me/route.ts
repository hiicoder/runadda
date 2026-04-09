import { NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getRequiredSession()
    const user = await prisma.$queryRaw<{ isMember: boolean; role: string }[]>`
      SELECT "isMember", role FROM "User" WHERE id = ${session.user.id} LIMIT 1
    `
    return NextResponse.json({
      isMember: user[0]?.isMember ?? false,
      role: user[0]?.role ?? session.user.role,
    })
  } catch {
    return NextResponse.json({ isMember: false, role: "USER" })
  }
}

export async function DELETE() {
  try {
    const session = await getRequiredSession()
    await prisma.user.delete({ where: { id: session.user.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
