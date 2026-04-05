import { NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getRequiredSession()
    const activities = await prisma.cachedStravaActivity.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        stravaId: true,
        activityType: true,
        distance: true,
        movingTime: true,
        pace: true,
        elevationGain: true,
        date: true,
      },
    })
    return NextResponse.json(activities)
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
