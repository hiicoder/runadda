"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface AboutItem { id: string; section: string; title: string; body: string; icon: string | null; imageUrl: string | null }
interface Theme { primary: string; secondary: string; accent: string; neutral: string }
interface SiteData { about: AboutItem[]; theme?: Theme }

const DEFAULT_ICONS: Record<string, string> = { intro: "🏃", vision: "🎯", mission: "🚀", value: "❤️" }

const DEFAULT_CONTENT: AboutItem[] = [
  { id: "d1", section: "intro", title: "Hamare Baare Mein", icon: "🏃", body: "Run Adda ek vibrant aur inclusive running community hai jo dosti, masti, fitness aur social service ko ek saath celebrate karti hai. Humara naam hi sab kuch keh deta hai - ek 'Adda' jahan har kadam khushiyon aur samajik seva se bhara hua hai.", imageUrl: null },
  { id: "d2", section: "vision", title: "Hamara Vision", icon: "🎯", body: "Har ek kadam ko masti, positivity aur seva ke jazbe se bhar dena, aur health, happiness aur community well-being ko promote karte hue ek strong community banana.", imageUrl: null },
  { id: "d3", section: "mission", title: "Hamara Mission", icon: "🚀", body: "Har umra aur background ke logon ko encourage karna fitness aur running ke zariye apne aap ko sudharne aur samajik seva mein yogdaan dene ke liye.", imageUrl: null },
  { id: "d4", section: "value", title: "Inclusivity", icon: "🤝", body: "Har koi welcome hai — beginner ho ya experienced runner. Koi judgment nahi, sirf support aur encouragement.", imageUrl: null },
  { id: "d5", section: "value", title: "Fun & Friendship", icon: "😄", body: "Har run ek adventure hai. Hum daud ke saath khushi aur bonding bhi banatte hain.", imageUrl: null },
  { id: "d6", section: "value", title: "Health & Fitness", icon: "💪", body: "Apne shaaririk aur maansik swasthya ko promote karna — ek kadam ek baar mein.", imageUrl: null },
  { id: "d7", section: "value", title: "Community Service", icon: "❤️", body: "Hum har kadam ke saath samajik sudhar mein yogdaan dene ke liye pratibaddh hain, jaise charity runs, environmental drives, aur needy logon ke liye fundraisers.", imageUrl: null },
]

const CACHE_KEY = "runadda_about_data"

export default function AboutPage() {
  const [items, setItems] = useState<AboutItem[]>([])
  const [theme, setTheme] = useState<Theme>({ primary: "#6366f1", secondary: "#7c3aed", accent: "#facc15", neutral: "#1e293b" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load cache instantly
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const d = JSON.parse(cached) as SiteData
        mergeContent(d)
        setLoading(false)
      }
    } catch { /* ignore */ }

    // Fetch fresh in background
    fetch("/api/public/site")
      .then(r => r.json() as Promise<SiteData>)
      .then(d => {
        mergeContent(d)
        setLoading(false)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(d))
      })
      .catch(() => { setItems(DEFAULT_CONTENT); setLoading(false) })
  }, [])

  // Merge DB content with defaults — only replace sections that have DB data
  function mergeContent(d: SiteData) {
    if (!d.theme) return setItems(DEFAULT_CONTENT)
    if (d.theme) setTheme(d.theme)

    const dbItems = d.about ?? []
    const dbSections = new Set(dbItems.map(i => i.section))

    // For each section: use DB data if exists, else use defaults for that section
    const merged = [
      ...(dbSections.has("intro") ? dbItems.filter(i => i.section === "intro") : DEFAULT_CONTENT.filter(i => i.section === "intro")),
      ...(dbSections.has("vision") ? dbItems.filter(i => i.section === "vision") : DEFAULT_CONTENT.filter(i => i.section === "vision")),
      ...(dbSections.has("mission") ? dbItems.filter(i => i.section === "mission") : DEFAULT_CONTENT.filter(i => i.section === "mission")),
      ...(dbSections.has("value") ? dbItems.filter(i => i.section === "value") : DEFAULT_CONTENT.filter(i => i.section === "value")),
    ]
    setItems(merged.length ? merged : DEFAULT_CONTENT)
  }

  const intro = items.filter(i => i.section === "intro")
  const vision = items.filter(i => i.section === "vision")
  const mission = items.filter(i => i.section === "mission")
  const values = items.filter(i => i.section === "value")

  const heroStyle = { background: `linear-gradient(135deg, ${theme.neutral} 0%, ${theme.secondary} 50%, ${theme.primary} 100%)` }
  const ctaStyle = { background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div style={heroStyle} className="text-white py-20 px-4 text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm mb-6 transition">← Back to Home</Link>
        <h1 className="text-4xl sm:text-5xl font-black">About <span style={{ color: theme.accent }}>Runadda</span></h1>
        <p className="text-white/80 mt-3 text-lg italic">&ldquo;Har Kadam Me Masti&rdquo;</p>
      </div>

      {loading && !items.length ? (
        <div className="flex items-center justify-center py-24 text-gray-400 animate-pulse">Loading…</div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-16 space-y-16">

          {/* Intro */}
          {intro.map(item => (
            <section key={item.id} className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide mb-3 text-white"
                  style={{ backgroundColor: theme.primary }}>
                  {item.icon || DEFAULT_ICONS.intro} Our Story
                </div>
                <h2 className="text-3xl font-black text-gray-900">{item.title}</h2>
                <p className="text-gray-600 mt-4 leading-relaxed text-lg">{item.body}</p>
              </div>
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.title} className="rounded-2xl shadow-lg w-full h-64 object-cover" />
              ) : (
                <div className="rounded-2xl h-64 flex items-center justify-center text-7xl"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}20, ${theme.secondary}20)` }}>
                  {item.icon || "🏃"}
                </div>
              )}
            </section>
          ))}

          {/* Vision & Mission */}
          {(vision.length > 0 || mission.length > 0) && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...vision, ...mission].map(item => (
                <div key={item.id} className="rounded-2xl p-6 text-white"
                  style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})` }}>
                  <div className="text-3xl mb-3">{item.icon || DEFAULT_ICONS[item.section]}</div>
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
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.primary }}>Hamari Pehchaan</span>
                <h2 className="text-3xl font-black text-gray-900 mt-1">Core Values</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {values.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition"
                    style={{ borderColor: `${theme.primary}30` }}>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover rounded-xl mb-4" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}30, ${theme.secondary}30)` }}>
                        {item.icon || "❤️"}
                      </div>
                    )}
                    <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                    <p className="text-gray-600 mt-2 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Join CTA */}
          <section className="rounded-2xl p-10 text-white text-center" style={ctaStyle}>
            <h2 className="text-2xl font-black">Safar Ka Hissa Bano!</h2>
            <p className="text-white/80 mt-2">Fitness aur seva ke saath chal padiye — Run Adda ka part ban kar.</p>
            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <Link href="/register"
                className="px-6 py-2.5 font-bold rounded-full text-sm transition"
                style={{ backgroundColor: theme.accent, color: theme.neutral }}>
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
