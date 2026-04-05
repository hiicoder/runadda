import { NextRequest, NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"
import { saveStravaTokens } from "@/lib/strava/token-manager"
import { prisma } from "@/lib/prisma"

/**
 * Step 1: Redirect user to Strava OAuth
 */
export async function GET(request: NextRequest) {
  try {
    await getRequiredSession()
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/strava/connect/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
  })

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`
  )
}
