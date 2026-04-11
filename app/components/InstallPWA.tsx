"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => { setInstalled(true); setPrompt(null) })
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (installed || !prompt) return null

  async function handleInstall() {
    if (!prompt) return
    setInstalling(true)
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === "accepted") setInstalled(true)
    setPrompt(null)
    setInstalling(false)
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-indigo-900 text-sm">Install RunAdda App</p>
        <p className="text-xs text-indigo-600 mt-0.5">Add to your home screen for quick access</p>
      </div>
      <button onClick={handleInstall} disabled={installing}
        className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:opacity-60">
        {installing ? "Installing…" : "Install"}
      </button>
    </div>
  )
}
