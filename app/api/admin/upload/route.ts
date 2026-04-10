import { NextRequest, NextResponse } from "next/server"
import { requireAdminOrEditor } from "@/lib/auth"
import { uploadToSupabase, ImageUploadError } from "@/lib/image-service"

const ALLOWED_FOLDERS = ["events", "slides", "about", "testimonials", "sponsors"]

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrEditor()

    const formData = await req.formData()
    const file = formData.get("file")
    const folder = (formData.get("folder") as string) ?? "events"

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 })
    }

    const url = await uploadToSupabase(file, folder)
    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    if (err instanceof Error && (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN")) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    console.error("[upload]", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
