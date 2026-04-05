"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMember, setIsMember] = useState(false)

  // Fetch fresh membership status from DB — avoids stale JWT
  useEffect(() => {
    if (!session) return
    fetch("/api/me")
      .then(r => r.json() as Promise<{ isMember: boolean; role: string }>)
      .then(d => setIsMember(d.isMember || d.role === "ADMIN"))
      .catch(() => {})
  }, [session])

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    ...(isMember ? [
      { href: "/activities", label: "Activities", icon: "🏅" },
      { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
    ] : []),
    { href: "/events", label: "Events", icon: "📅" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600 text-lg shrink-0">
              <span className="text-xl">🏃</span>
              <span>Run<span className="text-gray-800">adda</span></span>
            </Link>
            <div className="flex items-center gap-1 flex-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === link.href
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span>{link.icon}</span> {link.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
            >
              <span>🚪</span> Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
