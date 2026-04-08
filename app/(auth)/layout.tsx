export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex flex-col items-center group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg group-hover:bg-indigo-700 transition">
              <span className="text-2xl">🏃</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Run<span className="text-indigo-600">adda</span></h1>
          </a>
          <p className="text-sm text-gray-500 mt-1 italic">Har Kadam Mein Masti</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
