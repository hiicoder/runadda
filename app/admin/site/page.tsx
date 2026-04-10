"use client"

import { useEffect, useState } from "react"
import ImageUpload from "@/app/components/ImageUpload"

interface Sponsor { id: string; name: string; logo: string; url: string | null; order: number; active: boolean }
interface Testimonial { id: string; name: string; role: string | null; avatar: string | null; quote: string; order: number; active: boolean }
interface Slide { id: string; title: string; subtitle: string | null; imageUrl: string | null; ctaLabel: string | null; ctaUrl: string | null; order: number; active: boolean }

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
const btnSm = "text-xs px-2.5 py-1 rounded-lg cursor-pointer transition"

function ImgHint({ text }: { text: string }) {
  return <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">💡 {text}</p>
}

function Section({ title, icon, desc, children }: { title: string; icon: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <span>{icon}</span>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6 space-y-4">
        {desc && <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{desc}</p>}
        {children}
      </div>
    </div>
  )
}

// ── Dummy data notice ─────────────────────────────────────────────────────────
function DummyNotice({ items }: { items: unknown[] }) {
  if (items.length > 0) return null
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
      <span className="text-base shrink-0">💡</span>
      <div>
        <p className="font-semibold">Showing placeholder data on the landing page</p>
        <p className="mt-0.5 text-amber-700">Add your real content using the form above. Once you add at least one item, the placeholders will be replaced automatically.</p>
      </div>
    </div>
  )
}

// ── Sponsors ──────────────────────────────────────────────────────────────────
function SponsorsEditor() {
  const [items, setItems] = useState<Sponsor[]>([])
  const [form, setForm] = useState({ name: "", logo: "", url: "" })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", logo: "", url: "" })

  async function load() { const r = await fetch("/api/admin/site/sponsors"); if (r.ok) setItems(await r.json()) }
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch("/api/admin/site/sponsors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setForm({ name: "", logo: "", url: "" }); await load(); setSaving(false)
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/site/sponsors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setEditId(null); await load()
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/site/sponsors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }); await load()
  }

  async function del(id: string) {
    if (!confirm("Delete this sponsor?")) return
    await fetch(`/api/admin/site/sponsors/${id}`, { method: "DELETE" }); await load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className={inputCls} placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <input className={inputCls} placeholder="Logo emoji or URL *" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} required />
        <input className={inputCls} placeholder="Website URL (optional)" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
        <button type="submit" disabled={saving} className="sm:col-span-3 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:opacity-50">
          {saving ? "Adding…" : "➕ Add Sponsor"}
        </button>
      </form>
      <DummyNotice items={items} />
      <div className="space-y-2">
        {items.map(s => (
          <div key={s.id} className={`rounded-xl border ${s.active ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-gray-50 opacity-50"}`}>
            {editId === s.id ? (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                <input className={inputCls} value={editForm.logo} onChange={e => setEditForm(f => ({ ...f, logo: e.target.value }))} placeholder="Logo emoji or URL" />
                <input className={inputCls} value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="Website URL" />
                <div className="sm:col-span-3 flex gap-2">
                  <button onClick={() => saveEdit(s.id)} className={`${btnSm} bg-violet-600 text-white hover:bg-violet-700`}>Save</button>
                  <button onClick={() => setEditId(null)} className={`${btnSm} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3">
                <span className="text-2xl">{s.logo.startsWith("http") ? "🖼️" : s.logo}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{s.name}</p>
                  {s.url && <p className="text-xs text-gray-400 truncate">{s.url}</p>}
                </div>
                <button onClick={() => { setEditId(s.id); setEditForm({ name: s.name, logo: s.logo, url: s.url ?? "" }) }}
                  className={`${btnSm} bg-indigo-50 text-indigo-600 hover:bg-indigo-100`}>✏️ Edit</button>
                <button onClick={() => toggle(s.id, !s.active)} className={`${btnSm} border border-gray-200 hover:bg-gray-100 text-gray-600`}>
                  {s.active ? "Hide" : "Show"}
                </button>
                <button onClick={() => del(s.id)} className={`${btnSm} bg-red-50 text-red-600 hover:bg-red-100`}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function TestimonialsEditor() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [form, setForm] = useState({ name: "", role: "", avatar: "", quote: "" })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", role: "", avatar: "", quote: "" })

  async function load() { const r = await fetch("/api/admin/site/testimonials"); if (r.ok) setItems(await r.json()) }
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch("/api/admin/site/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setForm({ name: "", role: "", avatar: "", quote: "" }); await load(); setSaving(false)
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/site/testimonials/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setEditId(null); await load()
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/site/testimonials/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }); await load()
  }

  async function del(id: string) {
    if (!confirm("Delete this testimonial?")) return
    await fetch(`/api/admin/site/testimonials/${id}`, { method: "DELETE" }); await load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={inputCls} placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <input className={inputCls} placeholder="Role (e.g. Marathon Runner)" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
        <div>
          <input className={inputCls} placeholder="Avatar URL (optional)" value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} />
          <ImgHint text="Square photo, 200×200px minimum. Will be shown as a circle." />
        </div>
        <textarea className={inputCls} placeholder="Quote *" value={form.quote} onChange={e => setForm(f => ({ ...f, quote: e.target.value }))} required rows={2} />
        <button type="submit" disabled={saving} className="sm:col-span-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:opacity-50">
          {saving ? "Adding…" : "➕ Add Testimonial"}
        </button>
      </form>
      <DummyNotice items={items} />
      <div className="space-y-2">
        {items.map(t => (
          <div key={t.id} className={`rounded-xl border ${t.active ? "border-gray-200 bg-gray-50" : "border-gray-100 opacity-50"}`}>
            {editId === t.id ? (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                <input className={inputCls} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} placeholder="Role" />
                <div>
                  <input className={inputCls} value={editForm.avatar} onChange={e => setEditForm(f => ({ ...f, avatar: e.target.value }))} placeholder="Avatar URL" />
                  <ImgHint text="Square photo, 200×200px minimum." />
                </div>
                <textarea className={inputCls} value={editForm.quote} onChange={e => setEditForm(f => ({ ...f, quote: e.target.value }))} placeholder="Quote" rows={2} />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(t.id)} className={`${btnSm} bg-violet-600 text-white hover:bg-violet-700`}>Save</button>
                  <button onClick={() => setEditId(null)} className={`${btnSm} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{t.name} {t.role && <span className="text-gray-400 font-normal">· {t.role}</span>}</p>
                  <p className="text-sm text-gray-600 mt-1 italic line-clamp-2">&ldquo;{t.quote}&rdquo;</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditId(t.id); setEditForm({ name: t.name, role: t.role ?? "", avatar: t.avatar ?? "", quote: t.quote }) }}
                    className={`${btnSm} bg-indigo-50 text-indigo-600 hover:bg-indigo-100`}>✏️ Edit</button>
                  <button onClick={() => toggle(t.id, !t.active)} className={`${btnSm} border border-gray-200 hover:bg-gray-100 text-gray-600`}>
                    {t.active ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => del(t.id)} className={`${btnSm} bg-red-50 text-red-600 hover:bg-red-100`}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Slides ────────────────────────────────────────────────────────────────────
function SlidesEditor() {
  const [items, setItems] = useState<Slide[]>([])
  const [form, setForm] = useState({ title: "", subtitle: "", imageUrl: "", ctaLabel: "", ctaUrl: "" })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: "", subtitle: "", imageUrl: "", ctaLabel: "", ctaUrl: "" })

  async function load() { const r = await fetch("/api/admin/site/slides"); if (r.ok) setItems(await r.json()) }
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch("/api/admin/site/slides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setForm({ title: "", subtitle: "", imageUrl: "", ctaLabel: "", ctaUrl: "" }); await load(); setSaving(false)
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/site/slides/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setEditId(null); await load()
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/site/slides/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }); await load()
  }

  async function del(id: string) {
    if (!confirm("Delete this slide?")) return
    await fetch(`/api/admin/site/slides/${id}`, { method: "DELETE" }); await load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={inputCls} placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <input className={inputCls} placeholder="Subtitle (optional)" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
        <div>
          <ImageUpload value={form.imageUrl} onChange={v => setForm(f => ({ ...f, imageUrl: v }))} folder="slides" hint="Best size: 1920×1080px (full screen). Portrait or landscape. Image fills the entire hero — avoid text-heavy photos." />
        </div>
        <input className={inputCls} placeholder="CTA Button Label (e.g. Join Now)" value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} />
        <input className={inputCls} placeholder="CTA URL (e.g. /register)" value={form.ctaUrl} onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))} />
        <button type="submit" disabled={saving} className="sm:col-span-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:opacity-50">
          {saving ? "Adding…" : "➕ Add Slide"}
        </button>
      </form>
      <DummyNotice items={items} />
      <div className="space-y-2">
        {items.map(s => (
          <div key={s.id} className={`rounded-xl border ${s.active ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-gray-50 opacity-50"}`}>
            {editId === s.id ? (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={inputCls} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
                <input className={inputCls} value={editForm.subtitle} onChange={e => setEditForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Subtitle" />
                <div>
                  <ImageUpload value={editForm.imageUrl} onChange={v => setEditForm(f => ({ ...f, imageUrl: v }))} folder="slides" hint="Best size: 1920×1080px (full screen)." />
                </div>
                <input className={inputCls} value={editForm.ctaLabel} onChange={e => setEditForm(f => ({ ...f, ctaLabel: e.target.value }))} placeholder="CTA Label" />
                <input className={inputCls} value={editForm.ctaUrl} onChange={e => setEditForm(f => ({ ...f, ctaUrl: e.target.value }))} placeholder="CTA URL" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(s.id)} className={`${btnSm} bg-violet-600 text-white hover:bg-violet-700`}>Save</button>
                  <button onClick={() => setEditId(null)} className={`${btnSm} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3">
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt={s.title} className="w-16 h-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-10 rounded bg-indigo-100 flex items-center justify-center text-lg shrink-0">🖼️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{s.title}</p>
                  {s.subtitle && <p className="text-xs text-gray-400 truncate">{s.subtitle}</p>}
                </div>
                <button onClick={() => { setEditId(s.id); setEditForm({ title: s.title, subtitle: s.subtitle ?? "", imageUrl: s.imageUrl ?? "", ctaLabel: s.ctaLabel ?? "", ctaUrl: s.ctaUrl ?? "" }) }}
                  className={`${btnSm} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0`}>✏️ Edit</button>
                <button onClick={() => toggle(s.id, !s.active)} className={`${btnSm} border border-gray-200 hover:bg-gray-100 text-gray-600 shrink-0`}>
                  {s.active ? "Hide" : "Show"}
                </button>
                <button onClick={() => del(s.id)} className={`${btnSm} bg-red-50 text-red-600 hover:bg-red-100 shrink-0`}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsEditor() {
  const [items, setItems] = useState<{ id: string; value: string; label: string; order: number; active: boolean }[]>([])
  const [form, setForm] = useState({ value: "", label: "" })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ value: "", label: "" })

  async function load() { const r = await fetch("/api/admin/site/stats"); if (r.ok) setItems(await r.json()) }
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch("/api/admin/site/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setForm({ value: "", label: "" }); await load(); setSaving(false)
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/site/stats/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setEditId(null); await load()
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/site/stats/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }); await load()
  }

  async function del(id: string) {
    if (!confirm("Delete this stat?")) return
    await fetch(`/api/admin/site/stats/${id}`, { method: "DELETE" }); await load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid grid-cols-2 gap-3">
        <input className={inputCls} placeholder="Value (e.g. 500+)" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
        <input className={inputCls} placeholder="Label (e.g. Active Members)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
        <button type="submit" disabled={saving} className="col-span-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:opacity-50">
          {saving ? "Adding…" : "➕ Add Stat"}
        </button>
      </form>
      <DummyNotice items={items} />
      <div className="space-y-2">
        {items.map(s => (
          <div key={s.id} className={`rounded-xl border ${s.active ? "border-gray-200 bg-gray-50" : "border-gray-100 opacity-50"}`}>
            {editId === s.id ? (
              <div className="p-3 grid grid-cols-2 gap-2">
                <input className={inputCls} value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} placeholder="Value" />
                <input className={inputCls} value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} placeholder="Label" />
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(s.id)} className={`${btnSm} bg-violet-600 text-white hover:bg-violet-700`}>Save</button>
                  <button onClick={() => setEditId(null)} className={`${btnSm} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <span className="font-black text-indigo-600 text-lg">{s.value}</span>
                  <span className="text-gray-500 text-sm ml-2">{s.label}</span>
                </div>
                <button onClick={() => { setEditId(s.id); setEditForm({ value: s.value, label: s.label }) }}
                  className={`${btnSm} bg-indigo-50 text-indigo-600 hover:bg-indigo-100`}>✏️ Edit</button>
                <button onClick={() => toggle(s.id, !s.active)} className={`${btnSm} border border-gray-200 hover:bg-gray-100 text-gray-600`}>
                  {s.active ? "Hide" : "Show"}
                </button>
                <button onClick={() => del(s.id)} className={`${btnSm} bg-red-50 text-red-600 hover:bg-red-100`}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── About Content ─────────────────────────────────────────────────────────────
const ABOUT_SECTIONS = ['intro', 'vision', 'mission', 'value']
const SECTION_HINTS: Record<string, string> = {
  intro: 'Main story section — shown as a 2-column layout with text and image.',
  vision: 'Vision card — shown as a colored gradient card.',
  mission: 'Mission card — shown as a colored gradient card.',
  value: 'Core value card — multiple cards shown in a grid. Each can have its own icon.',
}
const DEFAULT_ICONS: Record<string, string> = { intro: '🏃', vision: '🎯', mission: '🚀', value: '❤️' }

function AboutEditor() {
  const [items, setItems] = useState<{ id: string; section: string; title: string; body: string; icon: string | null; imageUrl: string | null; order: number; active: boolean }[]>([])
  const [form, setForm] = useState({ section: "intro", title: "", body: "", icon: "", imageUrl: "" })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ section: "intro", title: "", body: "", icon: "", imageUrl: "" })

  async function load() { const r = await fetch("/api/admin/site/about"); if (r.ok) setItems(await r.json()) }
  useEffect(() => { void load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch("/api/admin/site/about", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setForm({ section: "intro", title: "", body: "", icon: "", imageUrl: "" }); await load(); setSaving(false)
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/site/about/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setEditId(null); await load()
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/site/about/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }); await load()
  }

  async function del(id: string) {
    if (!confirm("Delete this content block?")) return
    await fetch(`/api/admin/site/about/${id}`, { method: "DELETE" }); await load()
  }

  const sectionColors: Record<string, string> = { intro: 'bg-indigo-100 text-indigo-700', vision: 'bg-purple-100 text-purple-700', mission: 'bg-yellow-100 text-yellow-700', value: 'bg-emerald-100 text-emerald-700' }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Section Type</label>
          <select className={inputCls} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
            {ABOUT_SECTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">{SECTION_HINTS[form.section]}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
          <input className={inputCls} placeholder="e.g. Hamare Baare Mein" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Body Text *</label>
          <textarea className={inputCls} placeholder="Content text..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required rows={3} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Icon (emoji) — default: {DEFAULT_ICONS[form.section]}
          </label>
          <input className={inputCls} placeholder={`Default: ${DEFAULT_ICONS[form.section]}`} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">Paste any emoji. Leave blank to use default.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Image (optional — overrides icon)</label>
          <ImageUpload value={form.imageUrl} onChange={v => setForm(f => ({ ...f, imageUrl: v }))} folder="about" hint="If uploaded, image shows instead of icon." />
        </div>
        <button type="submit" disabled={saving} className="sm:col-span-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:opacity-50">
          {saving ? "Adding…" : "➕ Add Content Block"}
        </button>
      </form>
      <DummyNotice items={items} />
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className={`rounded-xl border ${item.active ? "border-gray-200 bg-gray-50" : "border-gray-100 opacity-50"}`}>
            {editId === item.id ? (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select className={inputCls} value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))}>
                  {ABOUT_SECTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <input className={inputCls} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
                <div className="sm:col-span-2">
                  <textarea className={inputCls} value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))} placeholder="Body text" rows={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icon (emoji)</label>
                  <input className={inputCls} value={editForm.icon} onChange={e => setEditForm(f => ({ ...f, icon: e.target.value }))} placeholder={`Default: ${DEFAULT_ICONS[editForm.section]}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Image (optional)</label>
                  <ImageUpload value={editForm.imageUrl} onChange={v => setEditForm(f => ({ ...f, imageUrl: v }))} folder="about" hint="Overrides icon if uploaded." />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(item.id)} className={`${btnSm} bg-violet-600 text-white hover:bg-violet-700`}>Save</button>
                  <button onClick={() => setEditId(null)} className={`${btnSm} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-3 flex items-start gap-3">
                <div className="text-2xl shrink-0">{item.imageUrl ? "🖼️" : (item.icon || DEFAULT_ICONS[item.section])}</div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${sectionColors[item.section] ?? 'bg-gray-100 text-gray-600'}`}>{item.section}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.body}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditId(item.id); setEditForm({ section: item.section, title: item.title, body: item.body, icon: item.icon ?? "", imageUrl: item.imageUrl ?? "" }) }}
                    className={`${btnSm} bg-indigo-50 text-indigo-600 hover:bg-indigo-100`}>✏️ Edit</button>
                  <button onClick={() => toggle(item.id, !item.active)} className={`${btnSm} border border-gray-200 hover:bg-gray-100 text-gray-600`}>
                    {item.active ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => del(item.id)} className={`${btnSm} bg-red-50 text-red-600 hover:bg-red-100`}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
        </button>
      </form>
      <DummyNotice items={items} />
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className={`rounded-xl border ${item.active ? "border-gray-200 bg-gray-50" : "border-gray-100 opacity-50"}`}>
            {editId === item.id ? (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select className={inputCls} value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))}>
                  {ABOUT_SECTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <input className={inputCls} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
                <div className="sm:col-span-2">
                  <textarea className={inputCls} value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))} placeholder="Body text" rows={3} />
                </div>
                <div className="sm:col-span-2">
                  <ImageUpload value={editForm.imageUrl} onChange={v => setEditForm(f => ({ ...f, imageUrl: v }))} folder="about" hint="Recommended: 800×500px." />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(item.id)} className={`${btnSm} bg-violet-600 text-white hover:bg-violet-700`}>Save</button>
                  <button onClick={() => setEditId(null)} className={`${btnSm} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-3 flex items-start gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${sectionColors[item.section] ?? 'bg-gray-100 text-gray-600'}`}>{item.section}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.body}</p>
                  {item.imageUrl && <p className="text-xs text-indigo-500 mt-0.5 truncate">🖼️ {item.imageUrl}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditId(item.id); setEditForm({ section: item.section, title: item.title, body: item.body, imageUrl: item.imageUrl ?? "" }) }}
                    className={`${btnSm} bg-indigo-50 text-indigo-600 hover:bg-indigo-100`}>✏️ Edit</button>
                  <button onClick={() => toggle(item.id, !item.active)} className={`${btnSm} border border-gray-200 hover:bg-gray-100 text-gray-600`}>
                    {item.active ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => del(item.id)} className={`${btnSm} bg-red-50 text-red-600 hover:bg-red-100`}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Theme Editor ──────────────────────────────────────────────────────────────
interface SiteTheme { id: string; name: string; primary: string; secondary: string; accent: string; neutral: string; isActive: boolean }

function ThemeEditor() {
  const [themes, setThemes] = useState<SiteTheme[]>([])
  const [form, setForm] = useState({ name: '', primary: '#6366f1', secondary: '#7c3aed', accent: '#facc15', neutral: '#1e293b' })
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)

  async function load() {
    const r = await fetch('/api/admin/site/theme')
    if (r.ok) setThemes(await r.json())
  }
  useEffect(() => { void load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch('/api/admin/site/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ name: '', primary: '#6366f1', secondary: '#7c3aed', accent: '#facc15', neutral: '#1e293b' })
    await load(); setSaving(false)
  }

  async function activate(id: string) {
    setActivating(id)
    await fetch(`/api/admin/site/theme/${id}`, { method: 'PATCH' })
    await load(); setActivating(null)
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete theme "${name}"?`)) return
    await fetch(`/api/admin/site/theme/${id}`, { method: 'DELETE' })
    await load()
  }

  const colorFields = [
    { key: 'primary', label: 'Primary', desc: 'Buttons, links' },
    { key: 'secondary', label: 'Secondary', desc: 'Hero gradient' },
    { key: 'accent', label: 'Accent', desc: 'CTA, highlights' },
    { key: 'neutral', label: 'Neutral', desc: 'Dark text, footer' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Existing themes */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved Themes</p>
        {themes.length === 0 && <p className="text-sm text-gray-400">No themes yet. Create one below.</p>}
        {themes.map(t => (
          <div key={t.id} className={`rounded-xl border p-4 flex items-center gap-4 ${t.isActive ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-gray-50'}`}>
            {/* Color swatches */}
            <div className="flex gap-1.5 shrink-0">
              {[t.primary, t.secondary, t.accent, t.neutral].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
            {/* Name + preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                {t.isActive && <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
              </div>
              <div className="flex gap-1 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: t.primary }}>Primary</span>
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: t.secondary }}>Secondary</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.accent, color: t.neutral }}>Accent</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              {!t.isActive && (
                <button onClick={() => activate(t.id)} disabled={activating === t.id}
                  className={`${btnSm} bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50`}>
                  {activating === t.id ? '…' : '✓ Apply'}
                </button>
              )}
              <button onClick={() => del(t.id, t.name)}
                className={`${btnSm} bg-red-50 text-red-600 hover:bg-red-100`}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create new theme */}
      <div className="border-t border-gray-200 pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Create New Theme</p>
        <form onSubmit={create} className="space-y-4">
          <input className={inputCls} placeholder="Theme name (e.g. Ocean Blue)" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {colorFields.map(f => (
              <div key={f.key} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 bg-gray-50">
                <input type="color" value={form[f.key]}
                  onChange={e => setForm(c => ({ ...c, [f.key]: e.target.value }))}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white w-full" />
                <p className="text-xs font-semibold text-gray-700">{f.label}</p>
                <p className="text-xs text-gray-400 text-center">{f.desc}</p>
              </div>
            ))}
          </div>
          {/* Live preview */}
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50 border-b border-gray-200">Preview</p>
            <div className="p-4 flex flex-wrap gap-3 items-center" style={{ background: `linear-gradient(135deg, ${form.neutral}, ${form.secondary}, ${form.primary})` }}>
              <button type="button" className="px-4 py-2 rounded-full text-sm font-bold" style={{ backgroundColor: form.accent, color: form.neutral }}>Join Free</button>
              <button type="button" className="px-4 py-2 rounded-full text-sm font-bold text-white border border-white/30">Sign In</button>
              <span className="text-white font-black text-lg">Run<span style={{ color: form.accent }}>adda</span></span>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer disabled:opacity-50">
            {saving ? 'Creating…' : '➕ Create Theme'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminSitePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Landing Page Editor</h1>
        <p className="text-gray-500 text-sm mt-1">Manage what appears on the public Runadda homepage and About page</p>
      </div>

      <Section title="Site Theme Colors" icon="🎨"
        desc="Choose 4 colors that define your brand. Changes apply instantly across the entire website.">
        <ThemeEditor />
      </Section>

      <Section title="Stats Bar" icon="📊"
        desc="The 4 numbers shown above the map (e.g. 500+ Members). Add your real stats — until you add any, default values are shown.">
        <StatsEditor />
      </Section>

      <Section title="About Page Content" icon="📖"
        desc="Content blocks for the /about page. Section types: intro (main story), vision, mission, value (core values). Each can have a title, body text, and optional image.">
        <AboutEditor />
      </Section>

      <Section title="Photo Gallery Slider" icon="🖼️"
        desc="Photos for the image slider below the hero. Recommended: 1280×480px landscape. Until you add slides, placeholder gradient cards are shown.">
        <SlidesEditor />
      </Section>

      <Section title="Sponsors & Partners" icon="🤝"
        desc="Add your real sponsors. Until you add at least one, default placeholder sponsors are shown.">
        <SponsorsEditor />
      </Section>

      <Section title="Member Testimonials" icon="💬"
        desc="Quotes from real members. Section only appears when you have at least one active testimonial.">
        <TestimonialsEditor />
      </Section>
    </div>
  )
}
