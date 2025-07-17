import NextAuth from "next-auth"

const handler = NextAuth({
  providers: [
    // Add your providers here
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session }) {
      return session
    },
  },
})

export { handler as GET, handler as POST }