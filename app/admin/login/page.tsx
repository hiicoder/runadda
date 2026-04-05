import AdminLoginForm from "./AdminLoginForm"

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error, callbackUrl } = await searchParams
  const errorMessage = error === "CredentialsSignin" ? "Invalid email or password"
    : error ? "Authentication error" : undefined

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <span className="text-2xl">⚙️</span>
          </div>
          <h1 className="text-2xl font-black text-white">Runadda Admin</h1>
          <p className="text-sm text-violet-300 mt-1">Staff & Editor access only</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <AdminLoginForm callbackUrl={callbackUrl ?? "/admin"} errorMessage={errorMessage} />
        </div>
      </div>
    </div>
  )
}
