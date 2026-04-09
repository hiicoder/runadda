"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMember, setIsMember] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
          <div className="flex items-center h-16 justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600 text-lg shrink-0">
              <Image src="/logo.png" alt="Runadda" width={28} height={28} className="rounded-lg object-contain" />
              <span>Run<span className="text-gray-800">adda</span></span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1 flex-1 ml-6">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === link.href ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}>
                  <span>{link.icon}</span> {link.label}
                </Link>
              ))}
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition cursor-pointer">
              <span>🚪</span> Sign out
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(v => !v)}
              className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              aria-label="Toggle menu">
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  pathname === link.href ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                }`}>
                <span>{link.icon}</span> {link.label}
              </Link>
            ))}
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition cursor-pointer">
              <span>🚪</span> Sign out
            </button>
          </div>
        )}
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
