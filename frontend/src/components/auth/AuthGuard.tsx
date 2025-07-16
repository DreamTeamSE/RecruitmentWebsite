"use client"

import { useAuth } from "@/contexts/AuthContext"
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
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // Check if email is verified for authenticated users
    if (requireAuth && user && !user.emailVerified) {
      router.push("/auth/verify-request")
      return
    }
  }, [user, isLoading, isAuthenticated, requireAuth, redirectTo, router])

  // Show loading while checking authentication
  if (isLoading) {
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
  if (requireAuth && (!isAuthenticated || (user && !user.emailVerified))) {
    return null
  }

  return <>{children}</>
}
