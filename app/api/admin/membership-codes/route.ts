import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function generateCode(): string {
  // Format: RUN-XXXX-XXXX (uppercase alphanumeric, easy to share)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `RUN-${seg(4)}-${seg(4)}`
}

// GET — list all codes
export async function GET() {
  try {
    await requireAdmin()
    const codes = await prisma.membershipCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { usedBy: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json(codes)
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — generate new code(s)
export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json() as { count?: number }
    const count = Math.min(Math.max(1, body.count ?? 1), 20)

    const codes = []
    for (let i = 0; i < count; i++) {
      let code = generateCode()
      // Ensure uniqueness
      while (await prisma.membershipCode.findUnique({ where: { code } })) {
        code = generateCode()
      }
      const created = await prisma.membershipCode.create({ data: { code } })
      codes.push(created)
    }

    return NextResponse.json(codes)
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
