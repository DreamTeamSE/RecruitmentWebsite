"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = "/auth/signin" 
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (requireAuth && status === "unauthenticated") {
      router.push(redirectTo)
      return
    }

    // Check if email is verified for authenticated users
    if (requireAuth && session && session.user && !(session.user as { emailVerified?: boolean }).emailVerified) {
      router.push("/auth/verify-request")
      return
    }
  }, [session, status, requireAuth, redirectTo, router])

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if authentication is required but user is not authenticated
  if (requireAuth && (status === "unauthenticated" || (session && session.user && !('emailVerified' in session.user && session.user.emailVerified)))) {
    return null
  }

  return <>{children}</>
}
