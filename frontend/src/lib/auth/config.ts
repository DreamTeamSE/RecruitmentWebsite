/* eslint-disable @typescript-eslint/no-explicit-any */
import CredentialsProvider from 'next-auth/providers/credentials';
// import { getBackendUrl } from '@/lib/constants/string';

// Debug logging for environment variables
console.log('=== NextAuth Environment Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('APP_ENV:', process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET exists:', !!(process.env.NEXTAUTH_SECRET || process.env.NEXT_PUBLIC_NEXTAUTH_SECRET));
console.log('NEXTAUTH_SECRET length:', (process.env.NEXTAUTH_SECRET || process.env.NEXT_PUBLIC_NEXTAUTH_SECRET)?.length || 0);
console.log('NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
console.log('=== End Debug ===');

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
        console.log('=== NextAuth Authorize Called ===');
        console.log('Credentials received:', !!credentials);
        console.log('Email provided:', !!credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Error: Missing email or password');
          throw new Error("Email and password are required")
        }

        // Check if email domain is @dreamteameng.org
        if (!credentials.email.endsWith("@dreamteameng.org")) {
          console.log('Error: Invalid email domain:', credentials.email);
          throw new Error("Only @dreamteameng.org email addresses are allowed")
        }

        try {
          // Call our backend API to authenticate the staff member
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://d2oc9fk5wyihzt.cloudfront.net';
          console.log('Using backend URL:', backendUrl);
          
          const response = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          console.log('Backend response status:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json()
            console.log('Backend error response:', errorData);
            throw new Error(errorData.message || "Authentication failed")
          }

          const data = await response.json()
          console.log('Backend success response received:', !!data);
          console.log('Backend response data:', data);
          
          // The backend returns user data directly, not wrapped in a "staff" object
          // Ensure the account is verified before allowing login
          if (!data.emailVerified) {
            console.log('Error: Email not verified for user:', credentials.email);
            throw new Error("Please verify your email address before signing in")
          }
          
          console.log('User authenticated successfully:', data.email);
          
          // Return user object that NextAuth expects
          return {
            id: data.id,
            email: data.email,
            name: `${data.first_name} ${data.last_name}`,
            role: data.role || "staff",
            emailVerified: data.emailVerified,
          }
        } catch (error) {
          console.log('Authorization error:', error instanceof Error ? error.message : 'Unknown error');
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
      console.log('=== JWT Callback ===');
      console.log('User in JWT callback:', !!user);
      console.log('Token exists:', !!token);
      
      if (user) {
        console.log('Adding user data to token');
        token.role = (user as any).role;
        token.emailVerified = Boolean((user as any).emailVerified);
      }
      return token
    },
    async session({ session, token }: any) {
      console.log('=== Session Callback ===');
      console.log('Session exists:', !!session);
      console.log('Token exists:', !!token);
      
      if (token) {
        console.log('Adding token data to session');
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
  secret: process.env.NEXTAUTH_SECRET || process.env.NEXT_PUBLIC_NEXTAUTH_SECRET || "j9Aupfj+wvAvPqhE3hB5e//Ix1PYwt7JQiZwXSUDrww=",
}
