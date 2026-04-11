"use client"

import { useState } from "react"
import bcrypt from "bcryptjs"

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
  )
}

export default function ChangePasswordButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confirm) { setMsg("Passwords do not match"); setStatus("error"); return }
    if (newPass.length < 8) { setMsg("Min. 8 characters required"); setStatus("error"); return }
    setStatus("loading"); setMsg("")

    // Verify current password against Prisma DB via API
    const verifyRes = await fetch("/api/auth/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: current }),
    })
    if (!verifyRes.ok) {
      setMsg("Current password is incorrect")
      setStatus("error")
      return
    }

    // Update password in Prisma
    const hash = await bcrypt.hash(newPass, 12)
    const updateRes = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passwordHash: hash }),
    })

    if (!updateRes.ok) { setMsg("Failed to update password"); setStatus("error"); return }

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
        <button onClick={() => { setOpen(v => !v); setMsg(""); setStatus("idle") }}
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
          {[
            { label: "Current password", value: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { label: "New password", value: newPass, set: setNewPass, show: showNew, toggle: () => setShowNew(v => !v), hint: "Min. 8 characters" },
            { label: "Confirm new password", value: confirm, set: setConfirm, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
          ].map(({ label, value, set, show, toggle, hint }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={value} onChange={e => set(e.target.value)} required
                  placeholder={hint ?? "••••••••"}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                <button type="button" onClick={toggle} aria-label={show ? "Hide" : "Show"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer">
                  <EyeIcon open={show} />
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={status === "loading"}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
            {status === "loading" ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}
    </div>
  )
}
