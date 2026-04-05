import LoginForm from "./LoginForm"

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Error connecting to OAuth provider",
  OAuthCallback: "OAuth callback error",
  OAuthCreateAccount: "Could not create OAuth account",
  EmailCreateAccount: "Could not create account",
  Callback: "Authentication callback error",
  OAuthAccountNotLinked: "Email already in use with a different provider",
  CredentialsSignin: "Invalid email or password",
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string; registered?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, callbackUrl, registered } = await searchParams

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "An authentication error occurred") : undefined
  const successMessage = registered === "true" ? "Account created — please sign in." : undefined

  return (
    <>
      {successMessage && (
        <div role="status" className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          ✓ {successMessage}
        </div>
      )}
      <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} errorMessage={errorMessage} />
    </>
  )
}
