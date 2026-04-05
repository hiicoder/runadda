"use client"

import { useState } from "react"

interface ProfileFormProps {
  initialName: string; initialBio: string; initialImage: string
}

export default function ProfileForm({ initialName, initialBio, initialImage }: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [image, setImage] = useState(initialImage)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setStatus("loading"); setMessage("")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, image }),
      })
      if (res.ok) { setStatus("success"); setMessage("Profile updated successfully.") }
      else {
        const data = await res.json() as { error?: string }
        setStatus("error"); setMessage(data.error ?? "Failed to update profile.")
      }
    } catch { setStatus("error"); setMessage("An unexpected error occurred.") }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "success" && (
        <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">✓ {message}</div>
      )}
      {status === "error" && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">⚠️ {message}</div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3}
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none" />
      </div>
      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
        <input id="image" type="url" value={image} onChange={e => setImage(e.target.value)} placeholder="https://example.com/avatar.png"
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
      </div>
      <button type="submit" disabled={status === "loading"}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
        {status === "loading" ? "Saving…" : "Save changes"}
      </button>
    </form>
  )
}
