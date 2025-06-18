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
        
        // Check if user's email is verified for protected routes
        if (req.nextUrl.pathname.startsWith("/applications-review")) {
          return Boolean(token.emailVerified)
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
