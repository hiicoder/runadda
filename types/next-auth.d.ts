import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "USER" | "EDITOR" | "ADMIN"
      isMember: boolean
      stravaConnected: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    role: "USER" | "EDITOR" | "ADMIN"
    isMember: boolean
    stravaConnected: boolean
  }
}
