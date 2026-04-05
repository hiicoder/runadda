"use client"

import { useState } from "react"

export default function StravaSync() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSync() {
    setStatus("syncing")
    setMessage("")
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" })
      const data = await res.json() as { synced?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? "Sync failed")
      setStatus("done")
      setMessage(`✓ Synced ${data.synced} run${data.synced !== 1 ? "s" : ""}. Refresh the page to see updated stats.`)
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Sync failed")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="px-4 py-2 bg-[#fc4c02] hover:bg-[#e04400] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition shrink-0 cursor-pointer"
      >
        {status === "syncing" ? "⏳ Syncing…" : "🔄 Sync Activities"}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {message}
        </p>
      )}
    </div>
  )
}
