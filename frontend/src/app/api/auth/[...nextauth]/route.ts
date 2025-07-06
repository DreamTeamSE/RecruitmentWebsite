import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth/config"

console.log('=== NextAuth Route Handler ===');
console.log('AuthOptions loaded:', !!authOptions);
console.log('Secret configured:', !!authOptions.secret);
console.log('Providers count:', authOptions.providers?.length || 0);

// @ts-expect-error - NextAuth v4 compatibility with Next.js 15
const handler = NextAuth(authOptions)

console.log('NextAuth handler created successfully');

export { handler as GET, handler as POST }
