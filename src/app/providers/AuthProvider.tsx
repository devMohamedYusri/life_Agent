// app/providers/AuthProvider.tsx
"use client"

import { ReactNode } from 'react'

export function AuthProvider({ children }: { children: ReactNode }) {
  // const authState = useAuthInit()
  
  // You can optionally provide auth state via context here
  return <>{children}</>
}