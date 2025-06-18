import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email", 
          placeholder: "your.name@dreamteameng.org" 
        },
        password: { 
          label: "Password", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        // Check if email domain is @dreamteameng.org
        if (!credentials.email.endsWith("@dreamteameng.org")) {
          throw new Error("Only @dreamteameng.org email addresses are allowed")
        }

        try {
          // Call our backend API to authenticate the staff member
          const response = await fetch(`http://localhost:3000/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Authentication failed")
          }

          const data = await response.json()
          
          // Return user object that NextAuth expects
          return {
            id: data.staff.id,
            email: data.staff.email,
            name: `${data.staff.first_name} ${data.staff.last_name}`,
            role: data.staff.role || "staff",
            emailVerified: data.staff.email_verified || false,
          }
        } catch (error) {
          // For now, fallback to hardcoded admin for testing
          // TODO: Remove this fallback once backend auth is ready
          if (credentials.email === "admin@dreamteameng.org" && credentials.password === "password123") {
            return {
              id: "1",
              email: credentials.email,
              name: "Test Admin",
              role: "admin",
              emailVerified: true,
            }
          }
          throw new Error("Invalid credentials")
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.emailVerified = Boolean(user.emailVerified)
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.emailVerified = Boolean(token.emailVerified)
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
