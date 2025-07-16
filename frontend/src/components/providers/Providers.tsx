"use client"

import { ReactNode } from "react"
import { ViewModeProvider } from "@/contexts/ViewModeContext"
import { AuthProvider } from "@/contexts/AuthContext"

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ViewModeProvider>
        {children}
      </ViewModeProvider>
    </AuthProvider>
  )
}
