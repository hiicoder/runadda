"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Handles Supabase email verification redirect that lands on the homepage
// URL format: /#access_token=...&type=magiclink or type=signup
export default function SupabaseVerifyHandler() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.slice(1))
    const type = params.get("type")
    const accessToken = params.get("access_token")
    const error = params.get("error")

    // Handle error
    if (error) {
      window.location.hash = ""
      router.push(`/login?error=${params.get("error_code") ?? "VerificationFailed"}`)
      return
    }

    // Handle successful email verification
    if ((type === "signup" || type === "magiclink") && accessToken) {
      // Call our API to mark the user as verified in Prisma
      fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      }).then(res => {
        window.location.hash = ""
        if (res.ok) {
          router.push("/login?error=verified")
        } else {
          router.push("/login?error=VerificationFailed")
        }
      }).catch(() => {
        window.location.hash = ""
        router.push("/login?error=VerificationFailed")
      })
    }
  }, [router])

  return null
}
