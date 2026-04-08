'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const ADMIN_LINKS = [
  { href: '/admin/events', label: 'Events', icon: '📅' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/membership', label: 'Membership', icon: '🎟️' },
  { href: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/admin/site', label: 'Site', icon: '🌐' },
]
const EDITOR_LINKS = [
  { href: '/admin/site', label: 'Site Editor', icon: '🌐' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = session?.user?.role === 'ADMIN'
  const navLinks = isAdmin ? ADMIN_LINKS : EDITOR_LINKS

  if (pathname === '/admin/login') return <>{children}</>

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 animate-pulse">Loading…</div>
    </div>
  )

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center bg-white p-10 rounded-2xl border border-gray-200 shadow-sm">
        <span className="text-5xl">🚫</span>
        <p className="mt-4 text-lg font-semibold text-gray-900">Access Denied</p>
        <p className="text-gray-500 text-sm mt-1">You don&apos;t have permission to view this page.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-indigo-600 text-sm font-medium hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-violet-700 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 justify-between">
            <div className="flex items-center gap-2 font-bold text-lg shrink-0">
              <span>⚙️</span> Run<span className="text-yellow-300">adda</span>
              <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold tracking-wide">
                {session.user.role}
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1 flex-1 ml-6">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === link.href ? 'bg-white/20 text-white' : 'text-violet-200 hover:bg-white/10 hover:text-white'
                  }`}>
                  <span>{link.icon}</span> {link.label}
                </Link>
              ))}
            </div>
            <button onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white transition cursor-pointer">
              🚪 Sign out
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(v => !v)}
              className="sm:hidden p-2 rounded-lg text-violet-200 hover:bg-white/10 transition cursor-pointer"
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
          <div className="sm:hidden border-t border-violet-600 bg-violet-800 px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  pathname === link.href ? 'bg-white/20 text-white' : 'text-violet-200 hover:bg-white/10 hover:text-white'
                }`}>
                <span>{link.icon}</span> {link.label}
              </Link>
            ))}
            <button onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white transition cursor-pointer">
              🚪 Sign out
            </button>
          </div>
        )}
      </nav>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  )
}
