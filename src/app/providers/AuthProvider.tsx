// app/providers/AuthProvider.tsx
"use client"

import { ReactNode } from 'react'
import { useAuthInit } from '../lib/hooks/useAuthInit'

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthInit()
  
  // You can optionally provide auth state via context here
  return <>{children}</>
}