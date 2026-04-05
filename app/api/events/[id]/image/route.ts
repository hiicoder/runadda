import { NextRequest, NextResponse } from 'next/server'
import { updateEvent } from '@/lib/events'
import { uploadEventImage, ImageUploadError } from '@/lib/image-service'
import { requireAdmin } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const imageUrl = await uploadEventImage(file)
    const event = await updateEvent(id, { imageUrl })

    return NextResponse.json(event)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (err instanceof ImageUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
