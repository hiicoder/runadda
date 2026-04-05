"use client"

import { useSearchParams } from "next/navigation"
import StravaSync from "./StravaSync"

interface StravaStatusProps {
  stravaConnected: boolean
}

const STRAVA_MESSAGES: Record<string, { text: string; color: string }> = {
  connected: { text: "✓ Strava connected! Activities synced — you can now activate membership.", color: "text-emerald-600" },
  error: { text: "⚠️ Strava connection failed. Please try again.", color: "text-red-600" },
  denied: { text: "⚠️ Strava authorization was denied.", color: "text-amber-600" },
  already_linked: { text: "⚠️ This Strava account is already linked to another user.", color: "text-red-600" },
}

export default function StravaStatus({ stravaConnected }: StravaStatusProps) {
  const params = useSearchParams()
  const stravaParam = params.get("strava")
  const msg = stravaParam ? STRAVA_MESSAGES[stravaParam] : null

  return (
    <div className={`rounded-xl border p-4 ${stravaConnected ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{stravaConnected ? "✅" : "🔗"}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-900">
            Step 1 — {stravaConnected ? "Strava Connected" : "Connect Strava"}
          </p>
          {msg ? (
            <p className={`text-xs mt-0.5 font-medium ${msg.color}`}>{msg.text}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              {stravaConnected
                ? "Your activities are synced. Use the button to pull in new runs."
                : "Connect your Strava account to sync activities. Required before membership activation."}
            </p>
          )}
        </div>
        {!stravaConnected && (
          <a href="/api/strava/connect"
            className="px-4 py-2 bg-[#fc4c02] hover:bg-[#e04400] text-white text-sm font-semibold rounded-lg transition shrink-0">
            Connect Strava
          </a>
        )}
      </div>
      {/* Sync button — always visible when connected so user can pull new activities */}
      {stravaConnected && (
        <div className="mt-3 pt-3 border-t border-emerald-200">
          <p className="text-xs text-gray-500 mb-2">Sync your latest activities from Strava:</p>
          <StravaSync />
        </div>
      )}
    </div>
  )
}
