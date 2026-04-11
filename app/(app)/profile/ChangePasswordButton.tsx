"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export default function ChangePasswordButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confirm) { setMsg("Passwords do not match"); setStatus("error"); return }
    if (newPass.length < 8) { setMsg("Min. 8 characters"); setStatus("error"); return }
    setStatus("loading"); setMsg("")

    // Sign in with current password to verify
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current })
    if (signInErr) { setMsg("Current password is incorrect"); setStatus("error"); return }

    // Update in Supabase Auth
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPass })
    if (updateErr) { setMsg(updateErr.message); setStatus("error"); return }

    // Update in Prisma
    const hash = await bcrypt.hash(newPass, 12)
    await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passwordHash: hash }),
    })

    setStatus("done"); setMsg("Password updated successfully!")
    setCurrent(""); setNewPass(""); setConfirm("")
    setTimeout(() => { setOpen(false); setStatus("idle"); setMsg("") }, 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Password</h3>
          <p className="text-xs text-gray-500 mt-0.5">Change your account password</p>
        </div>
        <button onClick={() => setOpen(v => !v)}
          className="px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition cursor-pointer">
          {open ? "Cancel" : "Change Password"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {msg && (
            <p className={`text-sm font-medium ${status === "done" ? "text-emerald-600" : "text-red-600"}`}>
              {status === "done" ? "✓" : "⚠️"} {msg}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={8}
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>
          <button type="submit" disabled={status === "loading"}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
            {status === "loading" ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}
    </div>
  )
}
