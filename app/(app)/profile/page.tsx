import { headers } from "next/headers"
import { Suspense } from "react"
import StravaStatus from "./StravaStatus"
import MembershipSection from "./MembershipSection"
import LeaderboardPreview from "./LeaderboardPreview"
import EditProfileButton from "./EditProfileButton"
import DeleteAccountButton from "./DeleteAccountButton"

function formatDistance(m: number) { return (m / 1000).toFixed(2) + " km" }
function formatPace(spm: number) {
  if (spm === 0) return "—"
  const s = spm * 1000
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")} /km`
}

interface ProfileData {
  id: string; name: string | null; email: string; image: string | null
  bio: string | null; role: string; isMember: boolean; stravaConnected: boolean
  stats: { totalDistance: number; runCount: number; averagePace: number }
}

async function getProfileData(): Promise<ProfileData | null> {
  try {
    const headersList = await headers()
    const host = headersList.get("host") ?? "localhost:3000"
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
    const res = await fetch(`${protocol}://${host}/api/profile`, {
      cache: "no-store", headers: { cookie: headersList.get("cookie") ?? "" },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export default async function ProfilePage() {
  const profile = await getProfileData()
  if (!profile) return <p className="text-gray-500">Unable to load profile.</p>

  const { name, email, image, bio, isMember, stravaConnected, stats } = profile

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and view your stats</p>
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name ?? "Avatar"} className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-100 shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl shrink-0">👤</div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xl font-bold text-gray-900">{name ?? "(no name)"}</p>
            {isMember && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">MEMBER</span>}
            {stravaConnected && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">STRAVA ✓</span>}
          </div>
          <p className="text-sm text-gray-500">{email}</p>
          {bio && <p className="text-sm text-gray-600 mt-1">{bio}</p>}
        </div>
        <EditProfileButton initialName={name ?? ""} initialBio={bio ?? ""} initialImage={image ?? ""} />
      </div>

      {/* ── Step 1: Connect Strava ── */}
      <Suspense fallback={null}>
        <StravaStatus stravaConnected={stravaConnected} />
      </Suspense>

      {/* ── Step 2: Membership — only visible after Strava is connected ── */}
      {!stravaConnected && !isMember && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-semibold text-amber-900 text-sm">Connect Strava to unlock membership</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You need to connect your Strava account first. This lets the admin verify your activity data before granting membership.
            </p>
          </div>
        </div>
      )}

      {stravaConnected && (
        <MembershipSection isMember={isMember} email={email} />
      )}

      {/* ── Step 3: Stats — only for members ── */}
      {isMember && stravaConnected && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Distance", value: formatDistance(stats.totalDistance), icon: "📏" },
            { label: "Activities", value: String(stats.runCount), icon: "🏅" },
            { label: "Avg Pace", value: formatPace(stats.averagePace), icon: "⚡" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard preview — members only */}
      {isMember && <LeaderboardPreview />}

      {/* Danger zone */}
      <DeleteAccountButton />
    </div>
  )
}
