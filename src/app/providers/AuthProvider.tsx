// app/providers/AuthProvider.tsx
"use client"

import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '../lib/stores/authStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    // Initialize auth when the provider mounts
    initialize()
  }, [initialize])

  return <>{children}</>
}