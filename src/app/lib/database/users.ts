import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from '@//types/supabase';

export interface UserProfile {
  id: string;
  email: string;
  user_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  ai_personalization_settings?: Record<string, string>;
}

export interface UserStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalHabits: number;
}

export interface UserPreferences {
  id: string;
  theme?: string;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  [key: string]: unknown;
}

export const userService = (supabase: SupabaseClient<Database>) => ({
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // If no profile exists, create a default one
      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([{
            id: userId,
            email: userId, // Will be updated with actual email
            user_name: 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) throw createError;
        return { data: newProfile, error: null };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return { data: null, error };
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  async getUserPreferences(userId: string) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  },

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    const { data, error } = await supabase
      .from('user_preferences')
      .update(preferences)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  async getUserStats(userId: string) {
    // goals stats
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('goal_id, status')
      .eq('user_id', userId);

    // tasks stats
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('task_id, status')
      .eq('user_id', userId);

    // habits stats
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('habit_id')
      .eq('user_id', userId);

    // check for errors
    if (goalsError || tasksError || habitsError) {
      return { data: null, error: goalsError || tasksError || habitsError };
    }

    const stats: UserStats = {
      totalGoals: goals?.length || 0,
      activeGoals: goals?.filter(g => g.status === 'active').length || 0,
      completedGoals: goals?.filter(g => g.status === 'completed').length || 0,
      totalTasks: tasks?.length || 0,
      completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
      pendingTasks: tasks?.filter(t => t.status === 'pending').length || 0,
      totalHabits: habits?.length || 0
    };

    return { data: stats, error: null };
  },

  async updateAISettings(userId: string, settings: Record<string,string>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ai_personalization_settings: settings })
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  async deleteAccount(userId: string) {
    // First delete all user data
    const tables = ['tasks', 'goals', 'habits', 'journal_entries', 'notifications'];
    
    for (const table of tables) {
      await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);
    }

    // Delete profile
    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    // Delete auth user
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
}); 