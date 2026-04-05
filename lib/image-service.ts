/**
 * Image_Service — handles event image uploads.
 * Providers: 'local' (default, no config needed), 's3', 'cloudinary'
 * Set IMAGE_PROVIDER env var to switch. Defaults to 'local'.
 */

import path from "path"
import fs from "fs/promises"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImageUploadError"
  }
}

function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageUploadError(`File too large. Max size is 5 MB.`)
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ImageUploadError(`File type '${file.type}' is not allowed. Use JPEG, PNG, WebP, or GIF.`)
  }
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }
  return map[mimeType] ?? "bin"
}

function generateKey(mimeType: string): string {
  const uuid = crypto.randomUUID()
  const ext = getExtension(mimeType)
  return `events/${uuid}.${ext}`
}

/** Saves image to /public/uploads and returns the public URL path */
async function uploadToLocal(file: File): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "events")
  await fs.mkdir(uploadsDir, { recursive: true })

  const uuid = crypto.randomUUID()
  const ext = getExtension(file.type)
  const filename = `${uuid}.${ext}`
  const filePath = path.join(uploadsDir, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return `/uploads/events/${filename}`
}

async function uploadToS3(file: File): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET
  const region = process.env.AWS_REGION

  if (!bucket || !region) {
    throw new ImageUploadError("S3 provider requires AWS_S3_BUCKET and AWS_REGION env vars")
  }

  const key = generateKey(file.type)
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

  const response = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type, "Content-Length": String(file.size) },
  })

  if (!response.ok) {
    throw new ImageUploadError(`S3 upload failed: ${response.status} ${response.statusText}`)
  }

  return url
}

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new ImageUploadError(
      "Cloudinary provider requires CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET env vars"
    )
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", uploadPreset)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  )

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText)
    throw new ImageUploadError(`Cloudinary upload failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as { secure_url?: string; error?: { message: string } }

  if (data.error) throw new ImageUploadError(`Cloudinary error: ${data.error.message}`)
  if (!data.secure_url) throw new ImageUploadError("Cloudinary returned no URL")

  return data.secure_url
}

/**
 * Uploads an event image to the configured storage provider.
 * Defaults to 'local' if IMAGE_PROVIDER is not set.
 */
export async function uploadEventImage(file: File): Promise<string> {
  validateFile(file)

  const provider = process.env.IMAGE_PROVIDER ?? "local"

  switch (provider) {
    case "local":
      return uploadToLocal(file)
    case "s3":
      return uploadToS3(file)
    case "cloudinary":
      return uploadToCloudinary(file)
    default:
      throw new ImageUploadError(
        `Unknown IMAGE_PROVIDER: '${provider}'. Use 'local', 's3', or 'cloudinary'.`
      )
  }
}
