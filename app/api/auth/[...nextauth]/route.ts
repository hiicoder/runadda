import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth({
  ...authOptions,
  logger: {
    error(code, metadata) {
      console.error("[NEXTAUTH ERROR]", code, metadata)
    },
    warn(code) {
      console.warn("[NEXTAUTH WARN]", code)
    },
  },
})

export { handler as GET, handler as POST }
