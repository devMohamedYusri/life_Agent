// app/lib/hooks/useClientAuthStore.js
"use client"

import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

// This hook ensures we only access the store on the client
export const useClientAuthStore = (selector) => {
  const [state, setState] = useState(null)
  
  useEffect(() => {
    // Subscribe to the store only on the client
    const unsubscribe = useAuthStore.subscribe((state) => {
      setState(selector ? selector(state) : state)
    })
    
    // Get initial state
    setState(selector ? selector(useAuthStore.getState()) : useAuthStore.getState())
    
    return unsubscribe
  }, [])
  
  return state
}