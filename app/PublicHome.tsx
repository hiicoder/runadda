"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import ThemeProvider, { applyTheme } from "./components/ThemeProvider"

interface Sponsor { id: string; name: string; logo: string; url: string | null }
interface Testimonial { id: string; name: string; role: string | null; avatar: string | null; quote: string }
interface Slide { id: string; title: string; subtitle: string | null; imageUrl: string | null; ctaLabel: string | null; ctaUrl: string | null }
interface SiteStat { id: string; value: string; label: string }
interface Theme { primary: string; secondary: string; accent: string; neutral: string }
interface SiteData { sponsors: Sponsor[]; testimonials: Testimonial[]; slides: Slide[]; stats: SiteStat[]; events: Event[]; theme?: Theme }

interface Event {
  id: string; title: string; description: string | null
  dateTime: string; location: string; imageUrl: string | null
  _count?: { rsvps: number }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

// ── Fixed Purple Hero (always shown) ─────────────────────────────────────────
function PurpleHero() {
  return (
    <div className="relative bg-hero flex items-center justify-center py-24 px-4 pt-28">
      <div className="text-center text-white max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
          <span>🏃</span> Running Community · Since Day One
        </div>
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight drop-shadow-lg">
          Run<span className="text-yellow-400">adda</span>
        </h1>
        <p className="text-xl sm:text-2xl text-white/90 mt-3 font-semibold italic">
          &ldquo;Har Kadam Me Masti&rdquo;
        </p>
        <p className="text-white/70 mt-4 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Ek vibrant community jahan dosti, masti, fitness aur samajik seva ek saath milte hain.
          Har kadam khushiyon se bhara hai.
        </p>
        <div className="flex gap-3 justify-center mt-8 flex-wrap">
          <Link href="/register" className="btn-accent px-7 py-3 font-bold rounded-full text-sm transition shadow-lg">
            Join the Family 🏃
          </Link>
          <a href="#about"
            className="px-7 py-3 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white font-semibold rounded-full text-sm transition">
            Our Story →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Image Slider (below hero) — shows custom slides from admin, or placeholder ──
function ImageSlider({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Show ALL active slides (with or without image), fall back to placeholders
  const placeholders = [
    { id: "p1", title: "Our Morning Runs 🌅", subtitle: "Every Sunday at 6 AM", imageUrl: null, ctaLabel: null, ctaUrl: null },
    { id: "p2", title: "Club Celebrations 🎉", subtitle: "We run, we celebrate!", imageUrl: null, ctaLabel: null, ctaUrl: null },
    { id: "p3", title: "Trail Adventures 🥾", subtitle: "Explore the outdoors with us", imageUrl: null, ctaLabel: null, ctaUrl: null },
  ]

  const allSlides = slides.length > 0 ? slides : placeholders

  // Restart timer whenever slide count changes (e.g. after data loads)
  useEffect(() => {
    setCurrent(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % allSlides.length), 4000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [allSlides.length])

  const gradients = [
    "from-pink-500 to-orange-400",
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-rose-400",
    "from-cyan-500 to-blue-500",
  ]

  return (
    <div className="relative h-64 sm:h-80 overflow-hidden bg-gray-900">
      {allSlides.map((slide, i) => (
        <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? "opacity-100" : "opacity-0"}`}>
          {slide.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center`}>
              <div className="text-center text-white px-6 opacity-60">
                <p className="text-5xl mb-2">📸</p>
                <p className="text-xs font-medium">Add photos via Admin → Site Editor</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <p className="font-bold text-lg drop-shadow">{slide.title}</p>
            {slide.subtitle && <p className="text-sm text-white/80 mt-0.5">{slide.subtitle}</p>}
            {slide.ctaLabel && slide.ctaUrl && (
              <a href={slide.ctaUrl} className="inline-block mt-2 px-4 py-1.5 bg-yellow-400 text-gray-900 font-bold rounded-full text-xs">{slide.ctaLabel}</a>
            )}
          </div>
        </div>
      ))}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {allSlides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition cursor-pointer ${i === current ? "bg-white" : "bg-white/40"}`} />
        ))}
      </div>
    </div>
  )
}

// ── Stats Bar (dynamic, shown above map) ─────────────────────────────────────
const DEFAULT_STATS = [
  { id: "s1", value: "500+", label: "Active Members" },
  { id: "s2", value: "120+", label: "Events Organized" },
  { id: "s3", value: "50K+", label: "KMs Covered" },
  { id: "s4", value: "3+", label: "Cities" },
]

function StatsBar({ stats }: { stats: SiteStat[] }) {
  const items = stats.length > 0 ? stats : DEFAULT_STATS
  return (
    <div className="bg-accent text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {items.map(s => (
          <div key={s.id}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── About Teaser (links to /about) ───────────────────────────────────────────
function AboutTeaser() {
  return (
    <section id="about" className="py-14 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
          <div className="text-5xl shrink-0">🏃</div>
          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Hamare Baare Mein</span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">Sirf Running Group Nahi, Ek Family Hain Hum</h2>
            <p className="text-gray-600 mt-3 leading-relaxed">
              Run Adda ek vibrant community hai jo dosti, masti, fitness aur samajik seva ko ek saath celebrate karti hai.
              Weekly runs, theme runs, social service drives aur post-run breakfasts — har kadam mein masti hai.
            </p>
          </div>
          <Link href="/about" className="btn-primary shrink-0 px-6 py-3 text-white font-bold rounded-full text-sm transition shadow-md whitespace-nowrap">
            Read Our Story →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Events Section ────────────────────────────────────────────────────────────
function EventsSection({ events }: { events: Event[] }) {
  return (
    <section id="events" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">What&apos;s Coming</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Upcoming Events</h2>
          <p className="text-gray-500 mt-2">Lace up and join us for the next run</p>
        </div>
        {events.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No upcoming events. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(ev => (
              <div key={ev.id} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition group">
                {ev.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.imageUrl} alt={ev.title} className="w-full h-44 object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-5xl">🏃</div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg">{ev.title}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1.5">
                    <span>📅</span> {formatDate(ev.dateTime)} · {formatTime(ev.dateTime)}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                    <span>📍</span> {ev.location}
                  </div>
                  {ev.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ev.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    {ev._count && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {ev._count.rsvps} going
                      </span>
                    )}
                    <Link href="/login"
                      className="ml-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                      RSVP →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition shadow-md">
            View All Events & Join →
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Activities Section ────────────────────────────────────────────────────────
function ActivitiesSection() {
  const activities = [
    { icon: "🏃", name: "Running", desc: "Weekly group runs — subah aur shaam" },
    { icon: "🚴", name: "Cycling", desc: "Weekend cycling rides" },
    { icon: "🚶", name: "Walking", desc: "Casual walks for all levels" },
    { icon: "🏊", name: "Swimming", desc: "Pool & open water sessions" },
    { icon: "💪", name: "Workout", desc: "Fitness & conditioning sessions" },
    { icon: "🌱", name: "Social Service", desc: "Cleanliness drives, tree plantation" },
  ]
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Stay Active</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Activities We Do</h2>
          <p className="text-gray-500 mt-2">Something for every fitness level</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {activities.map(a => (
            <div key={a.name} className="bg-white rounded-2xl p-5 text-center border border-gray-200 hover:border-indigo-300 hover:shadow-md transition group cursor-default">
              <div className="text-4xl mb-3 group-hover:scale-110 transition">{a.icon}</div>
              <p className="font-bold text-gray-900 text-sm">{a.name}</p>
              <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Sponsors Section ──────────────────────────────────────────────────────────
function SponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  const items = sponsors.length > 0 ? sponsors : [
    { id: "1", name: "Nike", logo: "👟", url: null },
    { id: "2", name: "Adidas", logo: "🏃", url: null },
    { id: "3", name: "Garmin", logo: "⌚", url: null },
    { id: "4", name: "Strava", logo: "📊", url: null },
    { id: "5", name: "GU Energy", logo: "⚡", url: null },
    { id: "6", name: "Decathlon", logo: "🏅", url: null },
  ]
  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">Our Sponsors & Partners</p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {items.map(s => (
            <a key={s.id} href={s.url ?? "#"} target={s.url ? "_blank" : undefined} rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition cursor-pointer">
              <span className="text-3xl">{s.logo.startsWith("http") ? "🤝" : s.logo}</span>
              <span className="font-bold text-sm">{s.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Testimonials Section ──────────────────────────────────────────────────────
function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null
  return (
    <section className="py-16 bg-indigo-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">What Members Say</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Member Stories</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-gray-700 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 mt-4">
                {t.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">👤</div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  {t.role && <p className="text-xs text-gray-500">{t.role}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Map Section ───────────────────────────────────────────────────────────────
function MapSection({ stats }: { stats: SiteStat[] }) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Stats bar just above map */}
        <StatsBar stats={stats} />
        <div className="mt-10 text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Find Us</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Our Running Routes</h2>
          <p className="text-gray-500 mt-2">We meet at these locations every week</p>
        </div>
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-72 sm:h-96 bg-indigo-50 flex items-center justify-center">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3025.6924357493467!2d85.10455715575596!3d25.59910141350518!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed5700277c8757%3A0x3a443830b67385dc!2sPatna%20Zoo%20%2C%20Gate%20no%20-%202!5e0!3m2!1sen!2sin!4v1775738376535!5m2!1sen!2sin"
            width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" title="Runadda Running Routes"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: "📍", title: "Main Start Point", desc: "Patna zoo Gate No. 2, every day 5:00 AM to 8:AM" },
            { icon: "🕕", title: "Daily Runs", desc: "Near Patna zoo Gate No. 2, 5:30 AM" },
            { icon: "🚗", title: "Parking Available", desc: "Free parking at all our meeting points" },
          ].map(loc => (
            <div key={loc.title} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3">
              <span className="text-2xl shrink-0">{loc.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{loc.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{loc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact Section ───────────────────────────────────────────────────────────
function ContactSection() {
  return (
    <section id="contact" className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Get In Touch</span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Contact Us</h2>
          <p className="text-gray-500 mt-2">Have a question or want to join? We&apos;d love to hear from you.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            { icon: "📧", label: "Email Us", value: "runadda.in@gmail.com", href: "mailto:runadda.in@gmail.com" },
            { icon: "📸", label: "Instagram", value: "@run_adda", href: "https://www.instagram.com/run_adda?igsh=dnd4MTc2YWIweTQ=" },
            { icon: "💬", label: "WhatsApp", value: "Join our group", href: "https://chat.whatsapp.com/HX3zkBRPkzi2bgEoRlB4Jp?mode=gi_t" },
          ].map(item => (
            <a key={item.label} href={item.href} target={item.href.startsWith("mailto") ? undefined : "_blank"} rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition group">
              <span className="text-3xl group-hover:scale-110 transition">{item.icon}</span>
              <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
              <p className="text-xs text-indigo-600 font-medium">{item.value}</p>
            </a>
          ))}
        </div>

        {/* Quick contact form — opens mailto */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-8">
          <h3 className="font-bold text-gray-900 text-lg mb-1 text-center">Send us a message</h3>
          <p className="text-sm text-gray-500 text-center mb-6">Fill in the form and we&apos;ll get back to you shortly.</p>
          <form onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const name = fd.get("name"); const email = fd.get("email"); const msg = fd.get("message")
            const subject = encodeURIComponent(`Message from ${name} via RunAdda`)
            const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`)
            window.open(`mailto:runadda.in@gmail.com?subject=${subject}&body=${body}`)
          }} className="space-y-4 max-w-lg mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your Name</label>
                <input name="name" required placeholder="Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <input name="email" type="email" required placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea name="message" required rows={4} placeholder="I want to join RunAdda..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none" />
            </div>
            <button type="submit"
              className="w-full py-2.5 btn-primary font-semibold rounded-lg text-sm transition shadow-sm cursor-pointer">
              Send Message 📧
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-20 bg-hero text-white text-center">
      <div className="max-w-2xl mx-auto px-4">
        <span className="text-5xl">🏃</span>
        <h2 className="text-3xl sm:text-4xl font-black mt-4">Safar Ka Hissa Bano!</h2>
        <p className="text-indigo-200 mt-3 text-lg leading-relaxed">
          Agar aap bhi humari masti, daud, friendship aur samajik seva ke safar ka hissa banna chahte hain,
          toh Run Adda ka part ban kar fitness aur seva ke saath chal padiye.
        </p>
        <p className="text-yellow-300 font-semibold mt-2 italic">&ldquo;Har Kadam Me Masti&rdquo;</p>
        <div className="flex gap-4 justify-center mt-8 flex-wrap">
          <Link href="/register"
            className="px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black rounded-full text-base transition shadow-xl">
            Join Run Adda Free 🎉
          </Link>
          <Link href="/login"
            className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold rounded-full text-base transition">
            Already a Member? Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white font-black text-xl mb-2">Run<span className="text-yellow-400">adda</span></h3>
            <p className="text-sm italic text-gray-500">&ldquo;Har Kadam Me Masti&rdquo;</p>
            <p className="text-sm mt-3">A community of passionate runners, cyclists, and fitness enthusiasts.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-white transition">Register</Link></li>
              <li><a href="#about" className="hover:text-white transition">About Us</a></li>
              <li><a href="#events" className="hover:text-white transition">Events</a></li>
              <li><a href="#contact" className="hover:text-white transition">Contact</a></li>
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Follow Us</h4>
            <div className="flex gap-3 flex-wrap">
              {[
                { icon: "📘", label: "Facebook", href: "https://www.facebook.com/share/18BU7H1Gqz/" },
                { icon: "📸", label: "Instagram", href: "https://www.instagram.com/run_adda?igsh=dnd4MTc2YWIweTQ=" },
                { icon: "💬", label: "Whatsapp", href:"https://chat.whatsapp.com/HX3zkBRPkzi2bgEoRlB4Jp?mode=gi_t" },
                // { icon: "🐦", label: "Twitter", href: "#" },
                // { icon: "▶️", label: "YouTube", href: "#" },
              ].map(s => (
                <a key={s.label} href={s.href}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm transition">
                  <span>{s.icon}</span> {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Runadda. Made with ❤️ for runners.
        </div>
      </div>
    </footer>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handler)
    return () => window.removeEventListener("scroll", handler)
  }, [])

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(s => { if (s?.user) setIsLoggedIn(true) })
      .catch(() => {})
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-md" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Runadda" width={32} height={32} className="rounded-lg object-contain" />
          <div className={`font-black text-xl ${scrolled ? "text-gray-900" : "text-white"}`}>
            Run<span className="text-yellow-400">adda</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="#events" className={`text-sm font-medium hidden sm:block transition ${scrolled ? "text-gray-600 hover:text-indigo-600" : "text-white/80 hover:text-white"}`}>
            Events
          </a>
          <a href="#about" className={`text-sm font-medium hidden sm:block transition ${scrolled ? "text-gray-600 hover:text-indigo-600" : "text-white/80 hover:text-white"}`}>
            About
          </a>
          <a href="#contact" className={`text-sm font-medium hidden sm:block transition ${scrolled ? "text-gray-600 hover:text-indigo-600" : "text-white/80 hover:text-white"}`}>
            Contact
          </a>
          {isLoggedIn ? (
            <Link href="/dashboard"
              className="text-sm font-bold px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-full transition">
              My Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login"
                className={`text-sm font-semibold px-4 py-2 rounded-full transition ${scrolled ? "text-indigo-600 border border-indigo-200 hover:bg-indigo-50" : "text-white border border-white/30 hover:bg-white/10"}`}>
                Sign In
              </Link>
              <Link href="/register"
                className="text-sm font-bold px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-full transition">
                Join Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PublicHome() {
  const [siteData, setSiteData] = useState<SiteData | null>(null)
  const [ready, setReady] = useState(false)
  const [skipLoader] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem("runadda_loaded") === "1"
  })

  useEffect(() => {
    // Show cached data instantly on return visits
    const cached = sessionStorage.getItem("runadda_site_data")
    if (cached) {
      try {
        const data = JSON.parse(cached) as SiteData
        setSiteData(data)
        if (data.theme) applyTheme(data.theme)
        setReady(true)
      } catch { /* ignore bad cache */ }
    }

    // Always fetch fresh data in background
    async function loadData() {
      try {
        const res = await fetch("/api/public/site")
        if (res.ok) {
          const data = await res.json()
          setSiteData(data)
          if (data.theme) applyTheme(data.theme)
          sessionStorage.setItem("runadda_site_data", JSON.stringify(data))
        } else if (!cached) {
          setSiteData({ sponsors: [], testimonials: [], slides: [], stats: [], events: [] })
        }
      } catch {
        if (!cached) setSiteData({ sponsors: [], testimonials: [], slides: [], stats: [], events: [] })
      } finally {
        setReady(true)
        sessionStorage.setItem("runadda_loaded", "1")
      }
    }
    loadData()
  }, [])

  return (
    <>
      {/* Full-screen loader — shown until DB responds, skipped on return visits */}
      {!skipLoader && (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 transition-opacity duration-700 ${ready ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <div className="text-center text-white">
            <Image src="/logo.png" alt="Runadda" width={80} height={80} className="rounded-2xl object-contain mx-auto mb-4 shadow-xl" />
            <div className="text-4xl font-black mb-1">
              Run<span className="text-yellow-400">adda</span>
            </div>
            <p className="text-white/70 italic text-sm mb-8">&ldquo;Har Kadam Me Masti&rdquo;</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}

      {/* Main content — fades in when ready, instant on return visits */}
      <div className={`min-h-screen bg-white transition-opacity duration-500 ${ready || skipLoader ? "opacity-100" : "opacity-0"}`}>
        {siteData?.theme && <ThemeProvider theme={siteData.theme} />}
        <Navbar />
        <PurpleHero />
        {siteData && <ImageSlider slides={siteData.slides} />}
        <AboutTeaser />
        <EventsSection events={siteData?.events ?? []} />
        <ActivitiesSection />
        {siteData && <SponsorsSection sponsors={siteData.sponsors} />}
        {siteData && <TestimonialsSection testimonials={siteData.testimonials} />}
        <MapSection stats={siteData?.stats ?? []} />
        <ContactSection />
        <CTASection />
        <Footer />
      </div>
    </>
  )
}
