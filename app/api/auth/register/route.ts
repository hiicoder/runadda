import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createClient } from "@supabase/supabase-js"

const SALT_ROUNDS = 12

const BLOCKED_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "spam4.me", "trashmail.com", "dispostable.com",
  "maildrop.cc", "fakeinbox.com", "mailnull.com", "spamgourmet.com",
  "trashmail.me", "discard.email", "spamhereplease.com", "getairmail.com",
])

function isValidEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
  if (!re.test(email)) return false
  const domain = email.split("@")[1].toLowerCase()
  if (BLOCKED_DOMAINS.has(domain)) return false
  return true
}

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { email, password } = body as Record<string, unknown>

  if (!email || typeof email !== "string")
    return NextResponse.json({ error: "Email is required" }, { status: 400 })

  if (!isValidEmail(email))
    return NextResponse.json({ error: "Please use a valid email address" }, { status: 400 })

  if (!password || typeof password !== "string")
    return NextResponse.json({ error: "Password is required" }, { status: 400 })

  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing)
    return NextResponse.json({ error: "Email is already in use", code: "EMAIL_IN_USE" }, { status: 400 })

  // Send verification email via Supabase Auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL}/login?verified=true`,
        data: { source: "runadda_registration" },
      },
    })
    if (error && error.message !== "User already registered") {
      console.error("[register] Supabase email error:", error.message)
      // Non-fatal — still create the account
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "USER" },
    select: { id: true, email: true },
  })

  return NextResponse.json({ ...user, emailSent: true }, { status: 201 })
}
