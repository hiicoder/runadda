"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export default function DeleteAccountButton() {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch("/api/me", { method: "DELETE" })
    if (res.ok) {
      await signOut({ callbackUrl: "/" })
    } else {
      alert("Failed to delete account. Please try again.")
      setLoading(false)
      setConfirm(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
      <h3 className="font-semibold text-red-700 text-sm mb-1">Danger Zone</h3>
      <p className="text-xs text-gray-500 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
      {!confirm ? (
        <button onClick={() => setConfirm(true)}
          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition cursor-pointer">
          Delete My Account
        </button>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-red-700 font-medium">Are you sure? This is permanent.</p>
          <button onClick={handleDelete} disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer disabled:opacity-60">
            {loading ? "Deleting…" : "Yes, delete my account"}
          </button>
          <button onClick={() => setConfirm(false)}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
