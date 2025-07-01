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
          const state = get(); // Access the current state

          // Manually check persisted state for expiration due to skipHydration: true
          if (typeof window !== 'undefined') {
            const storedAuth = localStorage.getItem('auth-storage');
            if (storedAuth) {
              try {
                const parsedStored = JSON.parse(storedAuth);
                if (parsedStored?.state?.user?.expiresAt && Date.now() > parsedStored.state.user.expiresAt) {
                  console.log("Persisted session expired in localStorage. Clearing user data.");
                  // Clear the stored state immediately
                  localStorage.removeItem('auth-storage');
                  set({ user: null, loading: false, initialized: true });
                  await authService.signOut(); // Ensure the backend session is also cleared
                  return; // Exit early as user is no longer valid
                }
              } catch (e) {
                console.error("Error parsing stored auth data:", e);
                // If parsing fails, treat as no stored data
                localStorage.removeItem('auth-storage');
              }
            }
          }

          const currentUser = await authService.getCurrentUser();
          set({ user: currentUser, loading: false, initialized: true });

          const handleAuthChange = (event, session) => {
            if (event === 'SIGNED_IN') {
              const userWithExpiry = {
                ...session.user,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
              };
              set({ user: userWithExpiry });
            }
            else if (event === 'SIGNED_OUT') {
              set({ user: null });
            }
          };

          authService.onAuthStateChange(handleAuthChange);
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
          
          if (!error) {
            const userWithExpiry = {
              ...data.user,
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
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

      signOut: async () => {
        try {
          set({ loading: true })
          const { error } = await authService.signOut()
          if (!error) set({ user: null })
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

      clearAuth: () => set({ user: null, loading: false, initialized: false })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      skipHydration: true,
      
      // Add session expiration check during rehydration
      onRehydrateStorage: () => (state) => {
        if (state?.user?.expiresAt && Date.now() > state.user.expiresAt) {
          state.clearAuth()
        }
      }
    }
  )
)

/* eslint-enable */