/**
 * Image Service — Supabase Storage
 * Bucket: "images" (public bucket in Supabase)
 * Folders: events/, slides/, testimonials/, about/
 */

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImageUploadError"
  }
}

export function validateImageFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageUploadError("File too large. Max size is 8 MB.")
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ImageUploadError("Only JPEG, PNG, and WebP images are allowed.")
  }
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  }
  return map[mimeType] ?? "jpg"
}

export async function uploadToSupabase(file: File, folder: string): Promise<string> {
  validateImageFile(file)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new ImageUploadError("Supabase storage not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  }

  const ext = getExtension(file.type)
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/images/${filename}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: file,
    }
  )

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new ImageUploadError(`Upload failed: ${err}`)
  }

  return `${supabaseUrl}/storage/v1/object/public/images/${filename}`
}

// Kept for backward compat with event image route
export async function uploadEventImage(file: File): Promise<string> {
  return uploadToSupabase(file, "events")
}
