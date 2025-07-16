import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Protected routes that require authentication
  const protectedRoutes = [
    '/applications-review',
    '/dashboard'
  ]
  
  // Check if the current path starts with any protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  if (isProtectedRoute) {
    // Check for user in localStorage on client side
    // Since this is server-side middleware, we'll rely on the AuthGuard component
    // to handle authentication checks on the client side
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/applications-review/:path*",
    "/dashboard/:path*"
  ]
}