"use client"

import { useEffect, useState } from "react"

interface MembershipCode {
  id: string
  code: string
  createdAt: string
  usedAt: string | null
  usedBy: { id: string; name: string | null; email: string } | null
}

export default function AdminMembershipPage() {
  const [codes, setCodes] = useState<MembershipCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [count, setCount] = useState(1)
  const [copied, setCopied] = useState<string | null>(null)

  async function fetchCodes() {
    const res = await fetch("/api/admin/membership-codes")
    if (res.ok) setCodes(await res.json())
    setLoading(false)
  }

  useEffect(() => { void fetchCodes() }, [])

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch("/api/admin/membership-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    })
    if (res.ok) await fetchCodes()
    setGenerating(false)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function copyAll() {
    const unused = codes.filter(c => !c.usedBy).map(c => c.code).join("\n")
    navigator.clipboard.writeText(unused)
    setCopied("all")
    setTimeout(() => setCopied(null), 2000)
  }

  const unused = codes.filter(c => !c.usedBy)
  const used = codes.filter(c => c.usedBy)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Membership Codes</h1>
        <p className="text-gray-500 text-sm mt-1">Generate unique codes and share them with members to activate their membership</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Generated", value: codes.length, color: "text-gray-900" },
          { label: "Available", value: unused.length, color: "text-emerald-600" },
          { label: "Used", value: used.length, color: "text-violet-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Generator */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span>🎟️</span> Generate New Codes</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">How many?</label>
            <input type="number" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition cursor-pointer">
            {generating ? "Generating…" : "⚡ Generate Codes"}
          </button>
          {unused.length > 0 && (
            <button onClick={copyAll}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition cursor-pointer">
              {copied === "all" ? "✓ Copied!" : "📋 Copy All Unused"}
            </button>
          )}
        </div>
      </div>

      {/* Unused codes */}
      {unused.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Available Codes
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{unused.length}</span>
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unused.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <span className="font-mono font-bold text-gray-900 tracking-widest text-sm">{c.code}</span>
                <button onClick={() => copyCode(c.code)}
                  className="text-xs text-violet-600 hover:text-violet-800 font-semibold cursor-pointer ml-2 shrink-0">
                  {copied === c.code ? "✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used codes */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 animate-pulse">Loading…</div>
      ) : used.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span> Used Codes
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{used.length}</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-left">Member</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Used On</th>
                </tr>
              </thead>
              <tbody>
                {used.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono font-bold text-gray-700 tracking-widest">{c.code}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{c.usedBy?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{c.usedBy?.email}</td>
                    <td className="px-6 py-3 text-gray-400 text-xs">
                      {c.usedAt ? new Date(c.usedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && codes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <span className="text-5xl">🎟️</span>
          <p className="mt-4 text-gray-500 font-medium">No codes generated yet</p>
          <p className="text-gray-400 text-sm mt-1">Generate codes above and share them with your members</p>
        </div>
      )}
    </div>
  )
}
