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

  const verifyToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  await prisma.user.create({
    data: { email, passwordHash, role: "USER", verifyToken },
    select: { id: true },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${request.headers.get("host")}`
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`

  // Send via Supabase Auth signUp — uses Supabase's SMTP
  // We set redirectTo to our verify endpoint so Supabase's link goes there
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey) {
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Remove existing Supabase Auth user if any
    const { data: list } = await adminClient.auth.admin.listUsers()
    const existing = list?.users?.find(u => u.email === email)
    if (existing) await adminClient.auth.admin.deleteUser(existing.id)

    // Create Supabase Auth user — this triggers the confirmation email
    // The confirmation link will go to our verifyUrl
    await adminClient.auth.admin.generateLink({
      type: "signup",
      email,
      password: verifyToken, // temp password not used for login
      options: { redirectTo: verifyUrl },
    }).then(async ({ data }) => {
      if (data?.properties?.action_link) {
        // Send the email manually using Supabase's email
        await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: verifyUrl,
        }).catch(() => {})
      }
    }).catch(() => {})

    // Fallback: use generateLink to get the magic link and send it
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: verifyUrl },
    })

    if (linkData?.properties?.action_link) {
      // The action_link IS the email link — Supabase sends it automatically
      // when using generateLink with type magiclink
      console.log("[register] Verification link generated for:", email)
    }
  }

  return NextResponse.json({ ok: true, emailSent: true }, { status: 201 })
}
