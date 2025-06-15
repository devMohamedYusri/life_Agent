import { client } from '@//lib/supabase'
import { Database } from '../../../types/supabase'

export type Habit = Database['public']['Tables']['habits']['Row']
export type HabitCompletion = Database['public']['Tables']['habit_completions']['Row']

export const habitService = {
  async getUserHabits(userId: string) {
    try {
      const { data, error } = await client
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching habits:', error)
      return { data: null, error }
    }
  },

  async createHabit(habit: Partial<Habit> & { user_id: string }) {
    try {
      const { data, error } = await client
        .from('habits')
        .insert(habit)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error creating habit:', error)
      return { data: null, error }
    }
  },

  async updateHabit(habitId: string, updates: Partial<Habit>) {
    try {
      const { data, error } = await client
        .from('habits')
        .update(updates)
        .eq('id', habitId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error updating habit:', error)
      return { data: null, error }
    }
  },

  async deleteHabit(habitId: string) {
    try {
      const { error } = await client
        .from('habits')
        .delete()
        .eq('id', habitId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error deleting habit:', error)
      return { error }
    }
  },

  async getHabitCompletions(userId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await client
        .from('habit_completions')
        .select(`
          *,
          habits!inner (
            habit_id,
            title,
            description,
            frequency
          )
        `)
        .eq('user_id', userId)
        .gte('completion_date', startDate)
        .lte('completion_date', endDate)
        .order('completion_date', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching habit completions:', error)
      return { data: null, error }
    }
  },

  async completeHabit(completion: Partial<HabitCompletion> & { user_id: string; habit_id: string }) {
    try {
      const { data, error } = await client
        .from('habit_completions')
        .insert({
          ...completion,
          completion_date: new Date().toISOString(),
          is_completed: true
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error completing habit:', error)
      return { data: null, error }
    }
  },

  async deleteHabitCompletion(completionId: string) {
    try {
      const { error } = await client
        .from('habit_completions')
        .delete()
        .eq('id', completionId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error deleting habit completion:', error)
      return { error }
    }
  },

  async gethabitstreak(habitId: string, userId: string) {
    try {
      const { data, error } = await client
        .from('habit_completions')
        .select('completion_date')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .order('completion_date', { ascending: false })

      if (error) throw error
      
      let streak = 0
      if (data && data.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let currentDate = new Date(data[0].completion_date)
        currentDate.setHours(0, 0, 0, 0)

        if (currentDate.getTime() === today.getTime()) {
          streak = 1
          for (let i = 1; i < data.length; i++) {
            const nextDate = new Date(data[i].completion_date)
            nextDate.setHours(0, 0, 0, 0)
            const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
            
            if (diffDays === 1) {
              streak++
              currentDate = nextDate
            } else {
              break
            }
          }
        }
      }
      
      return { data: streak, error: null }
    } catch (error) {
      console.error('Error getting habit streak:', error)
      return { data: 0, error }
    }
  },

  async getBatchHabitCompletions(userId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await client
        .from('habit_completions')
        .select(`
          *,
          habits!inner (
            habit_id,
            title,
            description,
            frequency
          )
        `)
        .eq('user_id', userId)
        .gte('completion_date', startDate)
        .lte('completion_date', endDate)
        .order('completion_date', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching batch habit completions:', error)
      return { data: null, error }
    }
  }
} 