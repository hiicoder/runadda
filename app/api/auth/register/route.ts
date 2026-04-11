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

  // Delete any existing unverified user with this email (re-registration)
  await prisma.user.deleteMany({ where: { email, emailVerified: null } })

  // Generate our own verify token
  const verifyToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  await prisma.user.create({
    data: { email, passwordHash, role: "USER", verifyToken },
    select: { id: true },
  })

  // Send verification email via Supabase Auth signUp
  // Supabase sends a confirmation email with our redirectTo URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${request.headers.get("host")}`

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Delete from Supabase Auth first if exists (so signUp works fresh)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data: existing } = await adminClient.auth.admin.listUsers()
      const existingUser = existing?.users?.find(u => u.email === email)
      if (existingUser) {
        await adminClient.auth.admin.deleteUser(existingUser.id)
      }
    }

    // Sign up in Supabase Auth — this sends the confirmation email
    await supabase.auth.signUp({
      email,
      password: verifyToken, // use token as temp password — we don't use Supabase for login
      options: {
        emailRedirectTo: `${baseUrl}/api/auth/verify-email?token=${verifyToken}`,
      },
    })
  }

  return NextResponse.json({ ok: true, emailSent: true }, { status: 201 })
}
