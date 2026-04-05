"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    // In production this would send a reset email via your email provider.
    // For now we simulate a delay and show a success message.
    await new Promise(r => setTimeout(r, 800))
    setStatus("sent")
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Forgot password?</h2>
      <p className="text-sm text-gray-500 mb-6">Enter your email and we&apos;ll send you a reset link.</p>

      {status === "sent" ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm text-center space-y-2">
          <p className="text-2xl">📧</p>
          <p className="font-semibold">Check your inbox</p>
          <p>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com" autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
          </div>
          <button type="submit" disabled={status === "loading"}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
            {status === "loading" ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">← Back to sign in</Link>
      </p>
    </div>
  )
}
