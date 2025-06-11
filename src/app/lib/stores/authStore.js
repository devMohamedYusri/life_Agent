// app/lib/stores/authStore.js
"use client"
/* eslint-disable */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '../auth'

export const useAuthStore = create(
  persist(
    (set) => ({  // Removed unused 'get' parameter
      // State
      user: null,
      loading: true,
      initialized: false,

      // Actions
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      // Initialize auth state
      initialize: async () => {
        try {
          const currentUser = await authService.getCurrentUser()
          set({ user: currentUser, loading: false, initialized: true })
          
          const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
              set({ user: session?.user || null })
            } else if (event === 'SIGNED_OUT') {
              set({ user: null })
            }
          })

          return subscription
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ user: null, loading: false, initialized: true })
        }
      },

      // Sign up
      signUp: async (email, password, fullName) => {
        try {
          set({ loading: true })
          const { data, error } = await authService.signUp(email, password, fullName)
          
          if (error) {
            set({ loading: false })
            return { data: null, error }
          }
          
          set({ loading: false })
          return { data, error: null }  // Fixed: Include error: null for consistency
        } catch (error) {
          set({ loading: false })
          return { data: null, error: { message: 'An unexpected error occurred' } }
        }
      },

      // Sign in
      signIn: async (email, password) => {
        try {
          set({ loading: true })
          const { data, error } = await authService.signIn(email, password)
          
          if (error) {
            set({ loading: false })
            return { data: null, error }
          }
          
          set({ user: data.user, loading: false })
          return { data, error: null }
        } catch (error) {
          set({ loading: false })
          return { data: null, error: { message: 'An unexpected error occurred' } }
        }
      },

      // Sign out
      signOut: async () => {
        try {
          set({ loading: true })
          const { error } = await authService.signOut()
          
          if (error) {
            set({ loading: false })
            return { error }
          }
          
          set({ user: null, loading: false })
          return { error: null }
        } catch (error) {
          set({ loading: false })
          return { error: { message: 'An unexpected error occurred' } }
        }
      },

      // Reset password
      resetPassword: async (email) => {
        try {
          const { data, error } = await authService.resetPassword(email)
          return { data, error }
        } catch (error) {
          return { data: null, error: { message: 'An unexpected error occurred' } }
        }
      },

      // Clear auth state
      clearAuth: () => set({ user: null, loading: false, initialized: false })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      skipHydration: true
    }
  )
)

/* eslint-enable */
