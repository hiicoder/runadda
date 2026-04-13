import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for RunAdda",
  alternates: { canonical: "https://runadda.in/terms" },
}

export default function TermsPage() {
  return (
     <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-16 px-4 text-center text-white">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl mb-6">
          <span>🏃</span> Run<span className="text-yellow-400">adda</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black">Terms of Service</h1>
        <p className="text-indigo-200 mt-2 text-sm">Last updated: April 2026</p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">1. Introduction</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Welcome to RunAdda ("we", "our", or "us"). By accessing or using our platform at runadda.in, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">2. Use of Service</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">RunAdda provides a community-based platform for tracking running activities, viewing stats, and participating in member-only leaderboards.</p>
         <p className="text-gray-600 text-sm leading-relaxed mb-3">You agree to use the platform only for lawful purposes and in a fair manner.</p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">3. User Accounts</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">To use certain features, you may be required to connect your Strava account.</p>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">You are responsible for:</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span>•</span> Maintaining the security of your account</li>
            <li className="flex gap-2"><span>•</span> Ensuring the accuracy of your data</li>
            <li className="flex gap-2"><span>•</span> All activities associated with your account</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">4. Strava Integration</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            RunAdda integrates with the <strong>Strava API</strong> to access user-authorized activity data.<br/>
            By connecting your Strava account:
          </p>
            <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span>•</span> You authorize RunAdda to access your activity data</li>
                <li className="flex gap-2"><span>•</span> You agree to Strava’s terms and policies</li>
                <li className="flex gap-2"><span>•</span> RunAdda is not affiliated with, endorsed by, or sponsored by Strava.</li>
            </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">5. Leaderboards & Community Rules</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            RunAdda provides member-only leaderboards based on activity data. By participating, you agree:
            </p>
             <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span>•</span> Not to manipulate or falsify activity data</li>
                <li className="flex gap-2"><span>•</span> Not to engage in unfair practices or cheating</li>
                <li className="flex gap-2"><span>•</span> To respect other members of the community</li>
            </ul>
             <p className="text-gray-600 text-sm leading-relaxed">
                We reserve the right to remove or restrict users who violate these rules.
            </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">6. Data Usage</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Your data is handled in accordance with our Privacy Policy. We use your data to:
            </p>
             <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span>•</span> Display activity stats</li>
                <li className="flex gap-2"><span>•</span> Generate leaderboards</li>
                <li className="flex gap-2"><span>•</span> Improve platform features</li>
            </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">7. Termination</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            We reserve the right to suspend or terminate access to the platform at any time if users violate these Terms or misuse the service.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
            Users may stop using the service at any time by disconnecting their Strava account.
            </p>
        </section>
           <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">8. Disclaimer</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
           RunAdda is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
           To the maximum extent permitted by law, RunAdda shall not be liable for any indirect, incidental, or consequential damages arising from the use of the platform.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">10. Changes to Terms</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
           We may update these Terms from time to time. Continued use of the platform after changes means you accept the updated Terms.
          </p>
        </section>

         <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">11. Contact</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
          If you have any questions about these Terms, please contact us at:
          </p>
           <p className="mt-3 text-sm font-semibold text-indigo-700">
            📧 <a href="mailto:support@runadda.in@gmail.com" className="hover:underline">support@runadda.in@gmail.com</a>
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