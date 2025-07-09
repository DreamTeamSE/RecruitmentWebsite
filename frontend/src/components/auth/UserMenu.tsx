"use client"

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import type { AuthenticatedUser } from '@/models/types/auth';
import { useState } from "react"
import { useViewMode } from '@/contexts/ViewModeContext';

export default function UserMenu() {
  const { data: session, status } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { viewMode, setViewMode, canToggleMode, isAdminMode } = useViewMode()

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse bg-gray-300 rounded-full"></div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/auth/signin"
          className="text-gray-700 hover:text-blue-600 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <span className="hidden md:block">{session?.user?.name}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
            <div className="font-medium truncate">{session?.user?.name}</div>
            <div className="text-gray-500 break-all text-xs">{session?.user?.email}</div>
            <div className="text-xs text-blue-600 capitalize">{(session?.user as AuthenticatedUser)?.role}</div>
            {canToggleMode && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Mode: </span>
                <span className={`capitalize ${isAdminMode ? 'text-red-600' : 'text-green-600'}`}>
                  {viewMode}
                </span>
              </div>
            )}
          </div>
          
          {canToggleMode && (
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="text-xs text-gray-600 mb-2">View Mode</div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('user')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    viewMode === 'user' 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  User
                </button>
                <button
                  onClick={() => setViewMode('admin')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    viewMode === 'admin' 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          )}
          
          <Link
            href={isAdminMode ? "/applications-review" : "/get-involved/join-dte"}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMenuOpen(false)}
          >
            Applications
          </Link>
          
          <button
            onClick={() => {
              setIsMenuOpen(false)
              signOut({ callbackUrl: '/' })
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Click outside to close menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  )
}
