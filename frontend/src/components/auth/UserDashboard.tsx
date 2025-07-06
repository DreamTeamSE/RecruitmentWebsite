'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { AuthenticatedUser } from '@/models/types/auth';

export default function UserDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Staff Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">User Information</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {session?.user?.name}</p>
                <p><span className="font-medium">Email:</span> {session?.user?.email}</p>
                <p><span className="font-medium">Role:</span> {(session?.user as AuthenticatedUser)?.role}</p>
                <p><span className="font-medium">Email Verified:</span> {(session?.user as AuthenticatedUser)?.emailVerified ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/applications-review")}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Applications
                </button>
                <button
                  onClick={() => router.push("/applications-review/create")}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Create New Form
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
