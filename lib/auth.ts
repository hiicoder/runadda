import { NextAuthOptions, Session, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH] Missing credentials")
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user || !user.passwordHash) {
            console.error("[AUTH] User not found or no password hash:", credentials.email)
            return null
          }

          // Block login if email not verified (skip for admin/editor)
          if (!user.emailVerified && user.role === "USER") {
            console.error("[AUTH] Email not verified:", credentials.email)
            throw new Error("EMAIL_NOT_VERIFIED")
          }

          // Block login if user is blocked by admin
          if (user.blocked) {
            console.error("[AUTH] User is blocked:", credentials.email)
            throw new Error("USER_BLOCKED")
          }

          const passwordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!passwordValid) {
            console.error("[AUTH] Invalid password for:", credentials.email)
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            isMember: user.isMember,
            stravaConnected: user.stravaConnected,
          }
        } catch (err) {
          console.error("[AUTH] Database error during authorize:", err)
          throw err
        }
      },
    }),
    // Google OAuth (only enabled if credentials are configured)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    // Strava is handled via custom /api/strava/connect flow, not NextAuth OAuth
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, embed user fields into the JWT
      if (user) {
        token.userId = user.id
        const u = user as typeof user & { role?: string; stravaConnected?: boolean; isMember?: boolean }
        token.role = (u.role ?? "USER") as "USER" | "EDITOR" | "ADMIN"
        token.isMember = u.isMember ?? false
        token.stravaConnected = u.stravaConnected ?? false
      }

      if (trigger === "update" && token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
          select: { role: true, stravaConnected: true, isMember: true },
        })
        if (dbUser) {
          token.role = dbUser.role as "USER" | "EDITOR" | "ADMIN"
          token.isMember = dbUser.isMember
          token.stravaConnected = dbUser.stravaConnected
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId
        session.user.role = token.role
        session.user.isMember = token.isMember
        session.user.stravaConnected = token.stravaConnected
      }
      return session
    },
    async signIn({ user, account }) {
      // Handle Google account linking to existing email/password account
      if (account?.provider === "google" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        })

        if (existingUser) {
          const alreadyLinked = existingUser.accounts.some(
            (a: { provider: string }) => a.provider === "google"
          )
          if (!alreadyLinked) {
            // Link the Google account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })
          }
          return true
        }
      }
      return true
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Returns the current session or throws a redirect to /login.
 * Use in API routes and server components that require authentication.
 */
export async function getRequiredSession(): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error("UNAUTHORIZED")
  }
  return session
}

/**
 * Returns the current session or throws if the user is not an admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await getRequiredSession()
  if (session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN")
  }
  return session
}

/**
 * Returns the current session or throws if the user is not an admin or editor.
 */
export async function requireAdminOrEditor(): Promise<Session> {
  const session = await getRequiredSession()
  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR") {
    throw new Error("FORBIDDEN")
  }
  return session
}
