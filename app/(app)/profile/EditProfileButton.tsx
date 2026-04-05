"use client"

import { useState } from "react"
import EditProfileModal from "./EditProfileModal"

interface EditProfileButtonProps {
  initialName: string
  initialBio: string
  initialImage: string
}

export default function EditProfileButton({ initialName, initialBio, initialImage }: EditProfileButtonProps) {
  const [open, setOpen] = useState(false)

  function handleSaved() {
    // Reload to reflect updated name/bio/avatar in the server component
    window.location.reload()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer shadow-sm"
      >
        ✏️ Edit Profile
      </button>

      {open && (
        <EditProfileModal
          initialName={initialName}
          initialBio={initialBio}
          initialImage={initialImage}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
