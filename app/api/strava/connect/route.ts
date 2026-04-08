import { NextRequest, NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await getRequiredSession()
  } catch {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const clientId = process.env.STRAVA_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "Strava not configured" }, { status: 500 })
  }

  // Build base URL — strip any trailing slash
  const origin = new URL(request.url).origin.replace(/\/+$/, "")
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ?? origin

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/strava/connect/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
  })

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`
  )
}
