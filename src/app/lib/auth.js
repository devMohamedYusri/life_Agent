import { client } from '@lib/supabase';

export const authService = {
  async signUp(email, password, fullname) {
    const { data, error } = await client.auth.signUp({
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

  async signIn(email, password) {  // Fixed: was "singIn"
    const { data, error } = await client.auth.signInWithPassword({  // Fixed: case sensitive
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {  // Fixed: was "logOut"
    const { error } = await client.auth.signOut();  // Fixed: case sensitive
    return { error };  // Fixed: return object with error
  },

  async getCurrentUser() {
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    
    return user;  // Fixed: return 'user' not 'data'
  },

  async getCurrentSession() {
    const { data: { session }, error } = await client.auth.getSession();  // Fixed: await and destructure properly
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  },

  onAuthStateChange(callback) {
    return client.auth.onAuthStateChange(callback);
  },

  async resetPassword(email) {
    const { data, error } = await client.auth.resetPasswordForEmail(email);  // Fixed: correct method name and await
    return { data, error };
  }
};