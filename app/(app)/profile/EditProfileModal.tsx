"use client"

import { useState, useEffect, useRef } from "react"

interface EditProfileModalProps {
  initialName: string
  initialBio: string
  initialImage: string
  onClose: () => void
  onSaved: (name: string, bio: string, image: string) => void
}

export default function EditProfileModal({
  initialName, initialBio, initialImage, onClose, onSaved,
}: EditProfileModalProps) {
  const [name, setName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [image, setImage] = useState(initialImage)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading"); setMessage("")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, image }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Failed to update profile")
      setStatus("success")
      setMessage("Profile updated!")
      setTimeout(() => { onSaved(name, bio, image); onClose() }, 800)
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-4 ring-indigo-100 shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl shrink-0">👤</div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Avatar URL</label>
              <input
                type="url" value={image} onChange={e => setImage(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 mt-1">💡 Square photo, 200×200px min. Shown as a circle.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Your name"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio} onChange={e => setBio(e.target.value)} rows={3}
              placeholder="Tell the club a bit about yourself…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
            />
          </div>

          {status === "success" && (
            <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
              <span>✓</span> {message}
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span>⚠️</span> {message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={status === "loading"}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer"
            >
              {status === "loading" ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
