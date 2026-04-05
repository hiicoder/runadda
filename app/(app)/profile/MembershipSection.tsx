"use client"

import { useState } from "react"

interface MembershipSectionProps {
  isMember: boolean
  email: string
}

export default function MembershipSection({ isMember, email }: MembershipSectionProps) {
  const [code, setCode] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading"); setMessage("")
    try {
      const res = await fetch("/api/membership/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setStatus("success")
      setMessage(data.message ?? "Membership activated!")
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to activate")
    }
  }

  function handleEmailAdmin() {
    const subject = encodeURIComponent("Membership Request — Runadda")
    const body = encodeURIComponent(
      `Hi Admin,\n\nI would like to request a membership code for Runadda.\n\nMy registered email: ${email}\n\nThank you!`
    )
    window.open(`mailto:admin@runningclub.com?subject=${subject}&body=${body}`)
    setEmailSent(true)
  }

  if (isMember) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
        <span className="text-2xl">🏅</span>
        <div>
          <p className="font-semibold text-emerald-800 text-sm">Active Member</p>
          <p className="text-xs text-emerald-600 mt-0.5">You have full access to leaderboard, Strava sync, and all member features.</p>
        </div>
        <span className="ml-auto text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-full font-bold">MEMBER</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-5">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🔒</span>
        <div>
          <h3 className="font-bold text-gray-900">Step 2 — Activate Membership</h3>
          <p className="text-sm text-gray-500 mt-1">
            Enter the membership code given to you by the admin. Members get access to the leaderboard and activity tracking.
          </p>
        </div>
      </div>

      {/* Code activation */}
      <form onSubmit={handleActivate} className="flex gap-2">
        <input
          value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="RUN-XXXX-XXXX"
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest"
          maxLength={13}
        />
        <button type="submit" disabled={status === "loading" || !code.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition cursor-pointer shrink-0">
          {status === "loading" ? "Checking…" : "Activate"}
        </button>
      </form>

      {status === "success" && <p className="text-sm text-emerald-600 font-medium">✓ {message}</p>}
      {status === "error" && <p className="text-sm text-red-600">⚠️ {message}</p>}

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">Don&apos;t have a code?</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <button onClick={handleEmailAdmin}
        className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold rounded-lg text-sm transition cursor-pointer flex items-center justify-center gap-2">
        {emailSent ? "✓ Email opened!" : "📧 Email Admin to Request Membership"}
      </button>
    </div>
  )
}
