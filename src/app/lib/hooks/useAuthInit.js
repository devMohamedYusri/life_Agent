// app/lib/hooks/useAuthInit.js
"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from '../stores/authStore'

export const useAuthInit = () => {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])
    
    useEffect(() => {
        if (!mounted) return
        
        let subscription = null
        
        const initAuth = async () => {
            const state = useAuthStore.getState()
            if (!state.initialized) {
                subscription = await state.initialize()
            }
        }
        
        initAuth()
        
        return () => {
            if (subscription) {
                subscription?.unsubscribe()
            }
        }
    }, [mounted])
    
    // Return default values during SSR
    if (!mounted) {
        return {
            user: null,
            loading: true,
            initialized: false
        }
    }
    
    // Use the store directly after mounting
    const state = useAuthStore.getState()
    return {
        user: state.user,
        loading: state.loading,
        initialized: state.initialized
    }
}