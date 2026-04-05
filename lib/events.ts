import { prisma } from '@/lib/prisma'
import type { Event, Rsvp } from '@prisma/client'

export interface CreateEventInput {
  title: string
  description?: string
  dateTime: Date
  location: string
  imageUrl?: string
}

export interface UpdateEventInput {
  title?: string
  description?: string
  dateTime?: Date
  location?: string
  imageUrl?: string
}

export type RsvpStatus = 'JOINED' | 'MAYBE' | 'CANCELED'

export interface RsvpCounts {
  JOINED: number
  MAYBE: number
  CANCELED: number
}

export class ValidationError extends Error {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message)
    this.name = 'ValidationError'
  }
}

export async function listUpcomingEvents(): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      dateTime: { gt: new Date() },
    },
    orderBy: { dateTime: 'asc' },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { rsvps: true } },
    },
  })
}

export async function createEvent(adminId: string, data: CreateEventInput): Promise<Event> {
  const fields: Record<string, string> = {}

  if (!data.title || data.title.trim() === '') fields.title = 'Title is required'
  if (!data.dateTime) fields.dateTime = 'Date and time is required'
  if (!data.location || data.location.trim() === '') fields.location = 'Location is required'

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Missing required fields', fields)
  }

  return prisma.event.create({
    data: {
      title: data.title.trim(),
      description: data.description,
      dateTime: data.dateTime,
      location: data.location.trim(),
      imageUrl: data.imageUrl,
      creatorId: adminId,
    },
  })
}

export async function updateEvent(eventId: string, data: UpdateEventInput): Promise<Event> {
  return prisma.event.update({
    where: { id: eventId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.dateTime !== undefined && { dateTime: data.dateTime }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
    },
  })
}

export async function deleteEvent(eventId: string): Promise<void> {
  await prisma.event.delete({
    where: { id: eventId },
  })
}

export async function upsertRsvp(userId: string, eventId: string, status: RsvpStatus): Promise<Rsvp> {
  return prisma.rsvp.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, status },
    update: { status },
  })
}

export async function getRsvpCounts(eventId: string): Promise<RsvpCounts> {
  const counts = await prisma.rsvp.groupBy({
    by: ['status'],
    where: { eventId },
    _count: { status: true },
  })

  const result: RsvpCounts = { JOINED: 0, MAYBE: 0, CANCELED: 0 }
  for (const row of counts) {
    result[row.status] = row._count.status
  }
  return result
}
