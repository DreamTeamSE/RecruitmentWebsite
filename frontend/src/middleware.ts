import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user has a valid token
        if (!token) return false
        
        // Require email verification for ALL protected routes
        if (!token.emailVerified) {
          return false
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/applications-review/:path*",
    "/dashboard/:path*"
  ]
}
