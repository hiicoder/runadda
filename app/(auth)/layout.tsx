import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex flex-col items-center group">
            <Image src="/logo.png" alt="Runadda logo" width={64} height={64} className="rounded-2xl object-contain mb-3 shadow-lg group-hover:scale-105 transition" />
            <h1 className="text-2xl font-bold text-gray-900">Run<span className="text-indigo-600">adda</span></h1>
          </a>
          <p className="text-sm text-gray-500 mt-1 italic">Har Kadam Me Masti</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
