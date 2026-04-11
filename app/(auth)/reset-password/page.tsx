"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the token in the URL hash — check session is valid
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else setErrorMsg("Invalid or expired reset link. Please request a new one.")
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setErrorMsg("Passwords do not match"); return }
    if (password.length < 8) { setErrorMsg("Password must be at least 8 characters"); return }
    setStatus("loading"); setErrorMsg("")

    // Update password in Supabase Auth
    const { error: supaError } = await supabase.auth.updateUser({ password })
    if (supaError) { setErrorMsg(supaError.message); setStatus("error"); return }

    // Also update in Prisma DB
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const hash = await bcrypt.hash(password, 12)
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, passwordHash: hash }),
      })
    }

    setStatus("done")
    setTimeout(() => router.push("/login"), 2000)
  }

  if (errorMsg && !ready) return (
    <div className="text-center space-y-3 py-4">
      <p className="text-3xl">⚠️</p>
      <p className="font-semibold text-gray-900">Invalid reset link</p>
      <p className="text-sm text-gray-500">{errorMsg}</p>
      <a href="/forgot-password" className="text-indigo-600 text-sm font-medium hover:underline">Request a new link</a>
    </div>
  )

  if (status === "done") return (
    <div className="text-center space-y-3 py-4">
      <p className="text-3xl">✅</p>
      <p className="font-bold text-gray-900">Password updated!</p>
      <p className="text-sm text-gray-500">Redirecting to sign in…</p>
    </div>
  )

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Set new password</h2>
      {errorMsg && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠️ {errorMsg}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              required minLength={8} placeholder="Min. 8 characters"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            required placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
        </div>
        <button type="submit" disabled={status === "loading" || !ready}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
          {status === "loading" ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  )
}
