import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const PROTECTED_ROUTES = [
  "/dashboard", "/profile", "/leaderboard", "/events", "/activities",
  "/api/events", "/api/profile", "/api/dashboard", "/api/leaderboard",
  "/api/strava", "/api/activities", "/api/membership",
]

const ADMIN_ROUTES = ["/admin", "/api/admin"]
// Editor can only access site content management
const EDITOR_ROUTES = ["/admin/site", "/api/admin/site"]

function matches(pathname: string, routes: string[]) {
  return routes.some(r => pathname === r || pathname.startsWith(r + "/"))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Separate admin login
  if (pathname === "/admin/login") return NextResponse.next()

  // Admin/Editor routes — but NOT the admin login page itself
  if (matches(pathname, ADMIN_ROUTES) && pathname !== "/admin/login") {
    if (!token) {
      const url = new URL("/admin/login", req.url)
      url.searchParams.set("callbackUrl", req.url)
      return NextResponse.redirect(url)
    }
    // Editor can only access site routes
    if (token.role === "EDITOR") {
      if (!matches(pathname, EDITOR_ROUTES)) {
        return NextResponse.redirect(new URL("/admin/site", req.url))
      }
      return NextResponse.next()
    }
    if (token.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }
    return NextResponse.next()
  }

  // Protected user routes
  if (matches(pathname, PROTECTED_ROUTES)) {
    if (!token) {
      const url = new URL("/login", req.url)
      url.searchParams.set("callbackUrl", req.url)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
