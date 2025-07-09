"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { ViewModeProvider } from "@/contexts/ViewModeContext"

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ViewModeProvider>
        {children}
      </ViewModeProvider>
    </SessionProvider>
  )
}
