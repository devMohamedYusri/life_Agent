// lib/database/habits.js
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

  // Helper function to format date consistently
  formatDate(date) {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // Helper function to get today's date in correct format
  getTodayDate() {
    return this.formatDate(new Date())
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

      const startDateStr = this.formatDate(startDate)
      const endDateStr = this.formatDate(endDate)

      const { data: completions, error: completionsError } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('completion_date', startDateStr)
        .lte('completion_date', endDateStr)
        .order('completion_date', { ascending: false })

      if (completionsError && completionsError.code !== '406') {
        return { data: null, error: completionsError }
      }

      return { 
        data: { ...habit, completions: completions || [] }, 
        error: null 
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
          user_id: habitData.user_id || user.id,
          created_at: new Date().toISOString()
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
        .eq('user_id', user.id)
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

  // Delete habit and all its completions
  async deleteHabit(habitId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      // Delete completions first (if RLS allows cascading delete, this might not be needed)
      await client
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', user.id)

      // Then delete the habit
      const { data, error } = await client
        .from('habits')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
      
      return { data, error }
    } catch (err) {
      console.error('Error deleting habit:', err)
      return { data: null, error: err.message }
    }
  },

  // Get habit logs (completions) for a specific date range
  async getHabitLogs(habitId, startDate, endDate) {
    try {
      // Validate inputs
      if (!habitId) {
        console.error('getHabitLogs called with undefined habitId')
        return { data: [], error: 'Habit ID is required' }
      }

      const user = await this.checkAuth()
      if (!user) {
        console.error('getHabitLogs: User not authenticated')
        return { data: [], error: 'User not authenticated' }
      }

      // Validate and format dates
      const start = new Date(startDate)
      const end = new Date(endDate)
      const today = new Date()
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid dates provided to getHabitLogs:', { startDate, endDate })
        return { data: [], error: 'Invalid date format' }
      }
      
      // Ensure we're not querying future dates
      if (start > today) {
        startDate = this.formatDate(today)
      }
      if (end > today) {
        endDate = this.formatDate(today)
      }
      const { data, error } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .gte('completion_date', startDate)
        .lte('completion_date', endDate)
        .order('completion_date', { ascending: false })
      
      if (error) {
        console.error('Error fetching habit logs:', {
          error,
          params: { habitId, userId: user.id, startDate, endDate }
        })
        // Return empty array instead of throwing for 400/404 errors
        if (error.code === '400' || error.code === '404' || error.code === '22P02') {
          return { data: [], error: null }
        }
        return { data: [], error: error.message }
      }

      // Transform to expected format
      const logs = (data || []).map(completion => ({
        id: completion.id,
        habit_id: completion.habit_id,
        completed_date: completion.completion_date,
        completed: completion.is_completed,
        notes: completion.notes,
        created_at: completion.completed_at
      }))

      return { data: logs, error: null }
    } catch (error) {
      console.error('Error in getHabitLogs:', error)
      return { data: [], error: error.message }
    }
  },

  // Log habit completion for a specific date
  async logHabitCompletion(habitId, completedDate, completed = true, notes = '') {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      // Check if a completion already exists for this date
      const { data: existing } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .eq('completion_date', completedDate)
        .maybeSingle()

      if (existing) {
        if (!completed) {
          // If marking as not completed, delete the record
          const { error } = await client
            .from('habit_completions')
            .delete()
            .eq('id', existing.id)
          
          return { data: null, error }
        } else {
          // Update existing record
          const { data, error } = await client
            .from('habit_completions')
            .update({
              is_completed: completed,
              notes: notes,
              completed_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single()

          return { data, error }
        }
      } else if (completed) {
        // Create new record only if marking as completed
        const { data, error } = await client
          .from('habit_completions')
          .insert({
            habit_id: habitId,
            user_id: user.id,
            completion_date: completedDate,
            is_completed: completed,
            notes: notes,
            completed_at: new Date().toISOString()
          })
          .select()
          .single()

        return { data, error }
      }

      return { data: null, error: null }
    } catch (err) {
      console.error('Error logging habit completion:', err)
      return { data: null, error: err.message }
    }
  },

  // Mark habit as completed for today
  async completeHabitToday(habitId, userId, notes = null) {
    const today = this.getTodayDate()
    return this.logHabitCompletion(habitId, today, true, notes)
  },

  // Mark habit as not completed for today
  async uncompleteHabitToday(habitId, userId) {
    const today = this.getTodayDate()
    return this.logHabitCompletion(habitId, today, false)
  },

  // Get habit completion status for today
  async getHabitCompletionToday(habitId, userId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }

      const today = this.getTodayDate()
      
      const { data, error } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completion_date', today)
        .maybeSingle()
      
      if (error && error.code === '406') {
        return { data: null, error: null }
      }

      return { data, error }
    } catch (err) {
      console.error('Error fetching habit completion:', err)
      return { data: null, error: err.message }
    }
  },

  // Calculate current habit streak
  async getHabitStreak(habitId, userId) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: 0, error: 'User not authenticated' }

      // Get last 365 days of completions
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 365)

      const { data, error } = await client
        .from('habit_completions')
        .select('completion_date')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('completion_date', this.formatDate(startDate))
        .lte('completion_date', this.formatDate(endDate))
        .order('completion_date', { ascending: false })

      if (error && error.code === '406') {
        return { data: 0, error: null }
      }

      if (error || !data || data.length === 0) {
        return { data: 0, error: error?.message || null }
      }

      // Calculate streak
      let streak = 0
      let currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)

      // Convert completion dates to a Set for O(1) lookup
      const completionDates = new Set(data.map(d => d.completion_date))

      // Count consecutive days from today backwards
      while (completionDates.has(this.formatDate(currentDate))) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      }

      // If today isn't completed but yesterday is, check from yesterday
      if (streak === 0) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        
        if (completionDates.has(this.formatDate(yesterday))) {
          streak = 1
          currentDate = new Date(yesterday)
          currentDate.setDate(currentDate.getDate() - 1)
          
          while (completionDates.has(this.formatDate(currentDate))) {
            streak++
            currentDate.setDate(currentDate.getDate() - 1)
          }
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
        .select(`
          *,
          category:categories(category_id, name, color, icon)
        `)
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
      
      if (error && error.code === '406') {
        return { data: [], error: null }
      }

      return { data: data || [], error }
    } catch (err) {
      console.error('Error fetching completion history:', err)
      return { data: [], error: err.message }
    }
  },
   // Add this new method for getting completions for a specific date
   async getHabitCompletionForDate(habitId, userId, date) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: null, error: 'User not authenticated' }
      
      const { data, error } = await client
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completion_date', date)
        .maybeSingle()
      
      if (error && error.code === '406') {
        return { data: null, error: null }
      }

      return { data, error }
    } catch (err) {
      console.error('Error fetching habit completion for date:', err)
      return { data: null, error: err.message }
    }
  },

  // Add batch method to get all completions for multiple habits in a date range
  async getBatchHabitCompletions(userId, startDate, endDate) {
    try {
      const user = await this.checkAuth()
      if (!user) return { data: [], error: 'User not authenticated' }

      const { data, error } = await client
        .from('habit_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('completion_date', startDate)
        .lte('completion_date', endDate)
        .eq('is_completed', true)
      
      if (error && error.code !== '406') {
        console.error('Error fetching batch completions:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error('Error in getBatchHabitCompletions:', err)
      return { data: [], error: err.message }
    }
  },

}