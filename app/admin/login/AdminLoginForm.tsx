"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

export default function AdminLoginForm({ callbackUrl, errorMessage }: { callbackUrl: string; errorMessage?: string }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await signIn("credentials", { email, password, callbackUrl: "/admin" })
    setLoading(false)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to Admin Panel</h2>
      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠️ {errorMessage}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
            placeholder="admin@runningclub.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-gray-400">
        Regular user? <a href="/login" className="text-violet-600 hover:underline">Go to user login</a>
      </p>
    </div>
  )
}
