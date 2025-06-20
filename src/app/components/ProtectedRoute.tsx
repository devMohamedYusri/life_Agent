// app/components/ProtectedRoute.js
'use client'

import { useAuthStore } from "@//lib/stores/authStore"
import { useRouter } from "next/navigation"
import { ReactNode, useEffect } from "react"

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, loading, initialized, initialize } = useAuthStore()
    const router = useRouter()

    useEffect(() => {
        // Initialize auth on mount
        initialize()
    }, [initialize])

    useEffect(() => {
        // Only redirect if we're fully initialized, not loading, and there's no user
        if (initialized && !loading && !user) {
            router.push('/auth/signin')
        }
    }, [user, loading, initialized, router])

    // Show loading spinner while initializing or loading
    if (!initialized || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    // If no user after initialization, show nothing (will redirect)
    if (!user) {
        return null
    }

    // User is authenticated, show children
    return <>{children}</>
}