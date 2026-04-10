"use client"

import { useRef, useState } from "react"
import Image from "next/image"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  folder: "events" | "slides" | "about" | "testimonials" | "sponsors"
  hint?: string
  preview?: "landscape" | "square"
}

export default function ImageUpload({ value, onChange, folder, hint, preview = "landscape" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null); setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", folder)
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      onChange(data.url!)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${preview === "square" ? "w-16 h-16" : "w-full h-32"}`}>
          <Image src={value} alt="Preview" fill className="object-cover" unoptimized />
          <button type="button" onClick={() => onChange("")}
            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center cursor-pointer hover:bg-red-600">
            ×
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="px-3 py-1.5 text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg transition cursor-pointer disabled:opacity-50">
          {uploading ? "Uploading…" : value ? "Change Image" : "📁 Upload Image"}
        </button>
        {value && !uploading && (
          <span className="text-xs text-gray-400 truncate max-w-xs">Image uploaded ✓</span>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        onChange={handleFile} className="hidden" />

      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      {hint && <p className="text-xs text-gray-400">💡 {hint}</p>}
      <p className="text-xs text-gray-300">Max 8MB · JPEG, PNG, WebP</p>
    </div>
  )
}
