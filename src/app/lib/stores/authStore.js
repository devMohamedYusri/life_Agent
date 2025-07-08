// app/lib/stores/authStore.js
"use client"
/* eslint-disable */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '../auth'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      initialized: false,

      // Actions
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      // Initialize auth state with session listener
      initialize: async () => {
        try {
          // Skip if already initialized
          if (get().initialized) return;

          // First, try to get the session (not the user)
          const session = await authService.getCurrentSession();
          
          if (session) {
            const userWithExpiry = {
              ...session.user,
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
            };
            set({ user: userWithExpiry, loading: false, initialized: true });
          } else {
            set({ user: null, loading: false, initialized: true });
          }

          // Set up auth state change listener
          const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              const userWithExpiry = {
                ...session.user,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
              };
              set({ user: userWithExpiry });
            } else if (event === 'SIGNED_OUT') {
              set({ user: null });
            } else if (event === 'USER_UPDATED' && session) {
              const userWithExpiry = {
                ...session.user,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
              };
              set({ user: userWithExpiry });
            } else if (event === 'TOKEN_REFRESHED' && session) {
              const userWithExpiry = {
                ...session.user,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
              };
              set({ user: userWithExpiry });
            }
          });

          // Store subscription for cleanup if needed
          if (typeof window !== 'undefined') {
            window.authSubscription = subscription;
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ user: null, loading: false, initialized: true });
        }
      },

      // Auth methods
      signUp: async (email, password, fullName) => {
        try {
          set({ loading: true })
          const { data, error } = await authService.signUp(email, password, fullName)
          set({ loading: false })
          return error ? { data: null, error } : { data, error: null }
        } catch (error) {
          set({ loading: false })
          return { data: null, error: { message: 'An unexpected error occurred' } }
        }
      },

      signIn: async (email, password) => {
        try {
          set({ loading: true })
          const { data, error } = await authService.signIn(email, password)
          
          if (!error && data?.user) {
            const userWithExpiry = {
              ...data.user,
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
            }
            set({ user: userWithExpiry })
          }
          
          set({ loading: false })
          return error ? { data: null, error } : { data, error: null }
        } catch (error) {
          set({ loading: false })
          return { data: null, error: { message: 'An unexpected error occurred' } }
        }
      },

      signInWithGoogle: async () => {
        try {
          set({ loading: true })
          
          if (typeof window === 'undefined') {
            set({ loading: false })
            return { data: null, error: { message: 'Google sign in is only available in browser' } }
          }

          const { data, error } = await authService.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          })
          
          // Don't set loading to false here as the page will redirect
          return error ? { data: null, error } : { data, error: null }
        } catch (error) {
          set({ loading: false })
          console.error('Google sign in error:', error)
          return { 
            data: null, 
            error: { 
              message: error.message || 'Failed to sign in with Google' 
            } 
          }
        }
      },

      signOut: async () => {
        try {
          set({ loading: true })
          const { error } = await authService.signOut()
          if (!error) {
            set({ user: null })
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-storage')
            }
          }
          set({ loading: false })
          return { error: error || null }
        } catch (error) {
          set({ loading: false })
          return { error: { message: 'An unexpected error occurred' } }
        }
      },

      resetPassword: async (email) => {
        try {
          return await authService.resetPassword(email)
        } catch (error) {
          return { data: null, error: { message: 'An unexpected error occurred' } }
        }
      },

      updateProfile: async (updates) => {
        try {
          set({ loading: true })
          const { data, error } = await authService.updateUser(updates)
          
          if (!error && data?.user) {
            const userWithExpiry = {
              ...data.user,
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
            }
            set({ user: userWithExpiry })
          }
          
          set({ loading: false })
          return error ? { data: null, error } : { data, error: null }
        } catch (error) {
          set({ loading: false })
          return { data: null, error: { message: 'An unexpected error occurred' } }
        }
      },

      clearAuth: () => set({ user: null, loading: false, initialized: false })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      skipHydration: true,
      
      onRehydrateStorage: () => (state) => {
        if (state?.user?.expiresAt && Date.now() > state.user.expiresAt) {
          state.clearAuth()
        }
      }
    }
  )
)

/* eslint-enable */