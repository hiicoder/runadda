import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for RunAdda running community app. Learn how we collect, use and protect your data.",
  alternates: { canonical: "https://runadda.in/privacy" },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-16 px-4 text-center text-white">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl mb-6">
          <span>🏃</span> Run<span className="text-yellow-400">adda</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black">Privacy Policy</h1>
        <p className="text-indigo-200 mt-2 text-sm">Last updated: April 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Introduction</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Welcome to RunAdda ("we", "our", or "us"). We are committed to protecting your personal data and respecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our platform at <strong>runadda.vercel.app</strong>.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Information We Collect</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">When you register or use RunAdda, we may collect:</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span>•</span> Account information: name, email address, profile picture</li>
            <li className="flex gap-2"><span>•</span> Strava profile data: athlete name, profile photo, athlete ID</li>
            <li className="flex gap-2"><span>•</span> Strava activity data: runs, rides, walks — including distance, duration, pace, and elevation</li>
            <li className="flex gap-2"><span>•</span> Usage data: pages visited, features used within the app</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. How We Use Your Data</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span>•</span> Display your running activities and personal stats on your dashboard</li>
            <li className="flex gap-2"><span>•</span> Calculate leaderboard rankings within the RunAdda community</li>
            <li className="flex gap-2"><span>•</span> Provide weekly summaries and progress insights</li>
            <li className="flex gap-2"><span>•</span> Verify membership eligibility based on activity data</li>
            <li className="flex gap-2"><span>•</span> Improve the platform experience for all users</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Strava Integration</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            RunAdda uses the <strong>Strava API</strong> to fetch your activity data. We request only the <code className="bg-gray-100 px-1 rounded text-xs">activity:read_all</code> scope, which allows us to read your activities. We do <strong>not</strong> write, modify, or delete any data on your Strava account.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            By connecting your Strava account, you also agree to <a href="https://www.strava.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Strava's Privacy Policy</a> and <a href="https://www.strava.com/legal/api" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Strava API Agreement</a>.
          </p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
            <strong>Data we cache from Strava:</strong> activity type, distance, moving time, pace, elevation gain, and date. We do not store GPS routes, heart rate, or any sensitive health metrics.
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. Data Sharing</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            We do <strong>not</strong> sell, trade, rent, or share your personal data with any third parties for marketing or commercial purposes. Your data is only used within RunAdda to provide the service described above.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. Data Storage & Security</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Your data is stored securely in a PostgreSQL database hosted on Supabase with encrypted connections. Access is restricted to authenticated users only. We follow industry-standard security practices to protect your information.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. Your Rights</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span>•</span> <strong>Disconnect Strava</strong> at any time from your Profile page — this revokes our access to your Strava data</li>
            <li className="flex gap-2"><span>•</span> <strong>Request data deletion</strong> by contacting us at <a href="mailto:support@runadda.com" className="text-indigo-600 hover:underline">support@runadda.com</a></li>
            <li className="flex gap-2"><span>•</span> <strong>Access your data</strong> — all your activity data is visible on your dashboard and activities page</li>
            <li className="flex gap-2"><span>•</span> <strong>Revoke Strava access</strong> directly from <a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Strava Settings → My Apps</a></li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">8. Contact</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:
          </p>
          <p className="mt-3 text-sm font-semibold text-indigo-700">
            📧 <a href="mailto:support@runadda.com" className="hover:underline">support@runadda.com</a>
          </p>
        </section>

        <div className="text-center pt-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline font-medium">
            ← Back to RunAdda
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} RunAdda. All rights reserved.
      </div>
    </div>
  )
}
