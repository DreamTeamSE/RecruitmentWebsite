import NextAuth, { NextAuthOptions } from "next-auth"
import { authOptions } from "@/lib/auth/config"

const handler = NextAuth(authOptions as NextAuthOptions)

export { handler as GET, handler as POST }
