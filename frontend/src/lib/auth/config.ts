/* eslint-disable @typescript-eslint/no-explicit-any */
import CredentialsProvider from 'next-auth/providers/credentials';
import { getBackendUrl } from '@/lib/constants/string';

export const authOptions: any = {
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
          const response = await fetch(`${getBackendUrl()}/api/auth/login`, {
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
          
          // Ensure the account is verified before allowing login
          if (!data.staff.emailVerified) {
            throw new Error("Please verify your email address before signing in")
          }
          
          // Return user object that NextAuth expects
          return {
            id: data.staff.id,
            email: data.staff.email,
            name: `${data.staff.first_name} ${data.staff.last_name}`,
            role: data.staff.role || "staff",
            emailVerified: data.staff.emailVerified,
          }
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Authentication failed")
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = (user as any).role;
        token.emailVerified = Boolean((user as any).emailVerified);
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        (session.user as any).id = token.sub!;
        (session.user as any).role = token.role as string;
        (session.user as any).emailVerified = Boolean(token.emailVerified);
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
