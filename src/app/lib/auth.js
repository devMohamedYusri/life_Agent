// app/lib/auth.js
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Create a function to get the Supabase client
const getSupabaseClient = () => createClientComponentClient()

export const authService = {
  async signUp(email, password, fullname) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullname,
        },
      },
    });
    return { data, error };
  },

  async signIn(email, password) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const supabase = getSupabaseClient()
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Don't log error for missing session - this is expected when not logged in
        if (error.message !== 'Auth session missing!') {
          console.error('Error getting current user:', error);
        }
        return null;
      }
      
      return user;
    } catch (error) {
      return null;
    }
  },

  async getCurrentSession() {
    const supabase = getSupabaseClient()
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (error.message !== 'Auth session missing!') {
          console.error('Error getting session:', error);
        }
        return null;
      }
      
      return session;
    } catch (error) {
      return null;
    }
  },

  onAuthStateChange(callback) {
    const supabase = getSupabaseClient()
    return supabase.auth.onAuthStateChange(callback);
  },

  async resetPassword(email) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { data, error };
  },

  async signInWithOAuth({ provider, options }) {
    const supabase = getSupabaseClient()
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options
      })
      
      return { data, error }
    } catch (error) {
      console.error('OAuth sign in error:', error)
      return { 
        data: null, 
        error: { 
          message: error.message || `Failed to sign in with ${provider}` 
        } 
      }
    }
  },

  async updateUser(updates) {
    const supabase = getSupabaseClient()
    
    try {
      const { data, error } = await supabase.auth.updateUser(updates)
      return { data, error }
    } catch (error) {
      console.error('Update user error:', error)
      return { 
        data: null, 
        error: { 
          message: error.message || 'Failed to update user profile' 
        } 
      }
    }
  },
};