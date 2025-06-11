import { client } from '../supabase'

export const habitService = {
  // Helper function to check if user is authenticated
  async checkAuth() {
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) {
      console.error('Authentication error:', error)
      return null
    }
    return user
  },

  // Get all habits for user
  async getUserHabits(userId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const { data, error } = await client
        .from('habits')
        .select(`
          *,
          category:categories(category_id, name, color, icon)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      return { data, error }
    } catch (err) {
      console.error('Error fetching user habits:', err)
      return { data: null, error: err.message }
    }
  },

  // Get habit with recent completions
  async getHabitWithCompletions(userId, habitId, days = 30) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const { data: habit, error: habitError } = await client
        .from('habits')
        .select(`
          *,
          category:categories(category_id, name, color, icon)
        `)
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .single()

      if (habitError) return { data: null, error: habitError }

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Use maybeSingle() instead of single() to avoid errors when no data exists
      const { data: completions, error: completionsError } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('completion_date', startDate.toISOString().split('T')[0])
        .lte('completion_date', endDate.toISOString().split('T')[0])
        .order('completion_date', { ascending: false })

      // If we get a 406 error, it's likely RLS - return empty completions array
      if (completionsError && completionsError.code === '406') {
        console.warn('RLS policy issue on habit_completions table. Returning empty completions.')
        return { 
          data: { ...habit, completions: [] }, 
          error: null 
        }
      }

      return { 
        data: { ...habit, completions: completions || [] }, 
        error: completionsError 
      }
    } catch (err) {
      console.error('Error fetching habit with completions:', err)
      return { data: null, error: err.message }
    }
  },

  // Create new habit
  async createHabit(habitData) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const { data, error } = await client
        .from('habits')
        .insert([{
          ...habitData,
          user_id: habitData.user_id || user.id
        }])
        .select(`
          *,
          category:categories(category_id, name, color, icon)
        `)
        .single()
      
      return { data, error }
    } catch (err) {
      console.error('Error creating habit:', err)
      return { data: null, error: err.message }
    }
  },

  // Update habit
  async updateHabit(habitId, updates) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const { data, error } = await client
        .from('habits')
        .update(updates)
        .eq('habit_id', habitId)
        .select(`
          *,
          category:categories(category_id, name, color, icon)
        `)
        .single()
      
      return { data, error }
    } catch (err) {
      console.error('Error updating habit:', err)
      return { data: null, error: err.message }
    }
  },

  // Delete habit
  async deleteHabit(habitId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const { data, error } = await client
        .from('habits')
        .delete()
        .eq('habit_id', habitId)
      
      return { data, error }
    } catch (err) {
      console.error('Error deleting habit:', err)
      return { data: null, error: err.message }
    }
  },

  // Mark habit as completed for today
  async completeHabitToday(habitId, userId, notes = null) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await client
        .from('habit_completions')
        .upsert([{
          habit_id: habitId,
          user_id: userId,
          completion_date: today,
          is_completed: true,
          notes: notes,
          completed_at: new Date().toISOString()
        }], {
          onConflict: 'habit_id,user_id,completion_date'
        })
        .select()
        .single()
      
      // Handle 406 error specifically
      if (error && error.code === '406') {
        console.error('RLS policy issue. Make sure habit_completions table has proper RLS policies.')
        return { data: null, error: 'Permission denied. Please contact support.' }
      }

      return { data, error }
    } catch (err) {
      console.error('Error completing habit:', err)
      return { data: null, error: err.message }
    }
  },

  // Mark habit as not completed for today
  async uncompleteHabitToday(habitId, userId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await client
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completion_date', today)
      
      // Handle 406 error
      if (error && error.code === '406') {
        console.error('RLS policy issue. Make sure habit_completions table has proper RLS policies.')
        return { data: null, error: 'Permission denied. Please contact support.' }
      }

      return { data, error }
    } catch (err) {
      console.error('Error uncompleting habit:', err)
      return { data: null, error: err.message }
    }
  },

  // Get habit completion status for today
  async getHabitCompletionToday(habitId, userId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completion_date', today)
        .maybeSingle() // Use maybeSingle() instead of single()
      
      // Handle 406 error
      if (error && error.code === '406') {
        console.warn('RLS policy issue on habit_completions table.')
        return { data: null, error: null } // Return null data instead of error
      }

      return { data, error }
    } catch (err) {
      console.error('Error fetching habit completion:', err)
      return { data: null, error: err.message }
    }
  },

  // Get habit streak
  async getHabitStreak(habitId, userId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: 0, error: 'User not authenticated' }

      const { data, error } = await client
        .from('habit_completions')
        .select('completion_date, is_completed')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completion_date', { ascending: false })
        .limit(100)

      // Handle 406 error
      if (error && error.code === '406') {
        console.warn('RLS policy issue on habit_completions table.')
        return { data: 0, error: null }
      }

      if (error) return { data: 0, error }

      if (!data || data.length === 0) return { data: 0, error: null }

      let streak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < data.length; i++) {
        const completionDate = new Date(data[i].completion_date)
        completionDate.setHours(0, 0, 0, 0)
        const expectedDate = new Date(today)
        expectedDate.setDate(today.getDate() - i)
        
        if (completionDate.getTime() === expectedDate.getTime()) {
          streak++
        } else {
          break
        }
      }

      return { data: streak, error: null }
    } catch (err) {
      console.error('Error calculating streak:', err)
      return { data: 0, error: err.message }
    }
  },

  // Get habits by category
  async getHabitsByCategory(userId, categoryId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const { data, error } = await client
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
      
      return { data, error }
    } catch (err) {
      console.error('Error fetching habits by category:', err)
      return { data: null, error: err.message }
    }
  },

  // Get habit completion history
  async getHabitCompletionHistory(habitId, userId, startDate, endDate) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const { data, error } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('completion_date', startDate)
        .lte('completion_date', endDate)
        .order('completion_date', { ascending: true })
      
      // Handle 406 error
      if (error && error.code === '406') {
        console.warn('RLS policy issue on habit_completions table.')
        return { data: [], error: null }
      }

      return { data, error }
    } catch (err) {
      console.error('Error fetching completion history:', err)
      return { data: null, error: err.message }
    }
  }
}