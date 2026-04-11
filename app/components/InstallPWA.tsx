"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type Platform = "android" | "ios" | "desktop" | null

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return "android"
  if (/iphone|ipad|ipod/i.test(ua)) return "ios"
  return "desktop"
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
}

// Inline banner for dashboard
export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return }
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent) }
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
    setPrompt(null); setInstalling(false)
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

// Floating install button for landing page — works on all platforms
export function InstallButton({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<Platform>(null)
  const [installed, setInstalled] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return }
    setPlatform(detectPlatform())
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent) }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => {
      setInstalled(true)
      setPrompt(null)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
    })
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (installed && !showSuccess) return null

  async function handleClick() {
    if (prompt) {
      setInstalling(true)
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === "accepted") {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 4000)
        setInstalled(true)
      }
      setPrompt(null); setInstalling(false)
    } else if (platform === "ios") {
      setShowIOSGuide(v => !v)
    }
  }

  const label = installing ? "Installing…" : "📲 Install App"

  return (
    <>
      {/* Success toast */}
      {showSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm">RunAdda installed!</p>
            <p className="text-xs text-gray-400">Find it on your home screen 🏃</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="ml-2 text-gray-500 hover:text-white cursor-pointer text-lg leading-none">×</button>
        </div>
      )}

      {!installed && (
        <div className={`relative ${className ?? ""}`}>
          <button onClick={handleClick} disabled={installing}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/30 text-white text-sm font-semibold rounded-full transition cursor-pointer disabled:opacity-60">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {label}
          </button>

          {/* iOS install guide tooltip */}
          {showIOSGuide && (
            <div className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 text-gray-800">
              <p className="font-bold text-sm mb-2">Install on iPhone/iPad</p>
              <ol className="text-xs space-y-1.5 text-gray-600">
                <li>1. Tap the <strong>Share</strong> button <span className="text-lg">⎙</span> at the bottom of Safari</li>
                <li>2. Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong></li>
                <li>3. Tap <strong>Add</strong> — done!</li>
              </ol>
              <button onClick={() => setShowIOSGuide(false)}
                className="mt-3 text-xs text-indigo-600 font-medium cursor-pointer">Got it ✓</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
