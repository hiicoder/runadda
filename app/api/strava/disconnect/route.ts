import { NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"
import { revokeStravaTokens } from "@/lib/strava/token-manager"

export async function DELETE() {
  try {
    const session = await getRequiredSession()
    await revokeStravaTokens(session.user.id)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
