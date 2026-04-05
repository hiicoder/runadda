import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const events = await prisma.event.findMany({
    where: { dateTime: { gte: new Date() } },
    orderBy: { dateTime: "asc" },
    take: 10,
    select: {
      id: true, title: true, description: true,
      dateTime: true, location: true, imageUrl: true,
      _count: { select: { rsvps: true } },
    },
  })
  return NextResponse.json(events)
}
