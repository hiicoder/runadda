import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const SALT_ROUNDS = 12

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  const { email, password } = body as Record<string, unknown>

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    )
  }

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    )
  }

  // Check for existing user
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Email is already in use", code: "EMAIL_IN_USE" },
      { status: 400 }
    )
  }

  // Hash password — never store plaintext
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "USER",
    },
    select: {
      id: true,
      email: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
