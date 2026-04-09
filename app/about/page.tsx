"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface AboutItem { id: string; section: string; title: string; body: string; imageUrl: string | null }
interface SiteData { about: AboutItem[] }

const SECTION_ICONS: Record<string, string> = { intro: "🏃", vision: "🎯", mission: "🚀", value: "❤️" }
const SECTION_COLORS: Record<string, string> = {
  intro: "from-indigo-600 to-purple-600",
  vision: "from-purple-600 to-pink-500",
  mission: "from-yellow-500 to-orange-500",
  value: "from-emerald-500 to-teal-500",
}

// Default content shown when DB is empty
const DEFAULT_CONTENT: AboutItem[] = [
  { id: "d1", section: "intro", title: "Hamare Baare Mein", body: "Run Adda ek vibrant aur inclusive running community hai jo dosti, masti, fitness aur social service ko ek saath celebrate karti hai. Humara naam hi sab kuch keh deta hai — ek 'Adda' jahan har kadam khushiyon aur samajik seva se bhara hua hai. Hum sirf running group nahi, ek family hain jo har milestone aur har kadam par saath khade hai.", imageUrl: null },
  { id: "d2", section: "vision", title: "Hamara Vision", body: "Har ek kadam ko masti, positivity aur seva ke jazbe se bhar dena, aur health, happiness aur community well-being ko promote karte hue ek strong community banana.", imageUrl: null },
  { id: "d3", section: "mission", title: "Hamara Mission", body: "Har umra aur background ke logon ko encourage karna fitness aur running ke zariye apne aap ko sudharne aur samajik seva mein yogdaan dene ke liye.", imageUrl: null },
  { id: "d4", section: "value", title: "Inclusivity", body: "Har koi welcome hai — beginner ho ya experienced runner. Koi judgment nahi, sirf support aur encouragement.", imageUrl: null },
  { id: "d5", section: "value", title: "Fun & Friendship", body: "Har run ek adventure hai. Hum daud ke saath khushi aur bonding bhi baantte hain. Post-run breakfasts aur motivational sessions bhi hote hain.", imageUrl: null },
  { id: "d6", section: "value", title: "Health & Fitness", body: "Apne shaaririk aur maansik swasthya ko promote karna — ek kadam ek baar mein. Weekly runs, fitness challenges aur outstation events.", imageUrl: null },
  { id: "d7", section: "value", title: "Community Service", body: "Charity runs, cleanliness drives, tree plantation, aur needy logon ke liye fundraisers — seva hi seva. Har kadam ke saath samajik sudhar.", imageUrl: null },
]

export default function AboutPage() {
  const [items, setItems] = useState<AboutItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/public/site")
      .then(r => r.json() as Promise<SiteData>)
      .then(d => { setItems(d.about?.length ? d.about : DEFAULT_CONTENT); setLoading(false) })
      .catch(() => { setItems(DEFAULT_CONTENT); setLoading(false) })
  }, [])

  const intro = items.filter(i => i.section === "intro")
  const vision = items.filter(i => i.section === "vision")
  const mission = items.filter(i => i.section === "mission")
  const values = items.filter(i => i.section === "value")

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white py-20 px-4 text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-indigo-300 hover:text-white text-sm mb-6 transition">← Back to Home</Link>
        <h1 className="text-4xl sm:text-5xl font-black">About <span className="text-yellow-400">Runadda</span></h1>
        <p className="text-white/80 mt-3 text-lg italic">&ldquo;Har Kadam Me Masti&rdquo;</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 animate-pulse">Loading…</div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-16 space-y-16">

          {/* Intro */}
          {intro.map(item => (
            <section key={item.id} className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide mb-3">
                  {SECTION_ICONS.intro} Our Story
                </div>
                <h2 className="text-3xl font-black text-gray-900">{item.title}</h2>
                <p className="text-gray-600 mt-4 leading-relaxed text-lg">{item.body}</p>
              </div>
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.title} className="rounded-2xl shadow-lg w-full h-64 object-cover" />
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 h-64 flex items-center justify-center text-6xl">🏃</div>
              )}
            </section>
          ))}

          {/* Vision & Mission */}
          {(vision.length > 0 || mission.length > 0) && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...vision, ...mission].map(item => (
                <div key={item.id} className={`rounded-2xl p-6 bg-gradient-to-br ${SECTION_COLORS[item.section]} text-white`}>
                  <div className="text-3xl mb-3">{SECTION_ICONS[item.section]}</div>
                  <h3 className="text-xl font-black">{item.title}</h3>
                  <p className="mt-2 text-white/85 leading-relaxed">{item.body}</p>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="mt-4 rounded-xl w-full h-40 object-cover opacity-90" />
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Core Values */}
          {values.length > 0 && (
            <section>
              <div className="text-center mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Hamari Pehchaan</span>
                <h2 className="text-3xl font-black text-gray-900 mt-1">Core Values</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {values.map((item, i) => (
                  <div key={item.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${Object.values(SECTION_COLORS)[i % 4]} flex items-center justify-center text-xl mb-4`}>
                      {["🤝", "😄", "💪", "❤️"][i % 4]}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                    <p className="text-gray-600 mt-2 leading-relaxed">{item.body}</p>
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.title} className="mt-4 rounded-xl w-full h-40 object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Join CTA */}
          <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-10 text-white text-center">
            <h2 className="text-2xl font-black">Safar Ka Hissa Bano!</h2>
            <p className="text-indigo-200 mt-2">Fitness aur seva ke saath chal padiye — Run Adda ka part ban kar.</p>
            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <Link href="/register" className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-full text-sm transition">
                Join Free 🎉
              </Link>
              <Link href="/" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold rounded-full text-sm transition">
                Back to Home
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
