import { client } from '../supabase'

export const habitService = {
  // Get all habits for user
  async getUserHabits(userId) {
    const { data, error } = await client
      .from('habits')
      .select(`
        *,
        category:categories(category_id, name, color, icon)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Get habit with recent completions
  async getHabitWithCompletions(userId, habitId, days = 30) {
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

    const { data: completions, error: completionsError } = await client
      .from('habit_completions')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .gte('completion_date', startDate.toISOString().split('T')[0])
      .lte('completion_date', endDate.toISOString().split('T')[0])
      .order('completion_date', { ascending: false })

    return { 
      data: { ...habit, completions: completions || [] }, 
      error: completionsError 
    }
  },

  // Create new habit
  async createHabit(habitData) {
    const { data, error } = await client
      .from('habits')
      .insert([habitData])
      .select(`
        *,
        category:categories(category_id, name, color, icon)
      `)
      .single()
    
    return { data, error }
  },

  // Update habit
  async updateHabit(habitId, updates) {
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
  },

  // Delete habit
  async deleteHabit(habitId) {
    const { data, error } = await client
      .from('habits')
      .delete()
      .eq('habit_id', habitId)
    
    return { data, error }
  },

  // Mark habit as completed for today
  async completeHabitToday(habitId, userId, notes = null) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await client
      .from('habit_completions')
      .upsert([{
        habit_id: habitId,
        user_id: userId,
        completion_date: today,
        is_completed: true,
        notes: notes
      }])
      .select()
      .single()
    
    return { data, error }
  },

  // Mark habit as not completed for today
  async uncompleteHabitToday(habitId, userId) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await client
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('completion_date', today)
    
    return { data, error }
  },

  // Get habit completion status for today
  async getHabitCompletionToday(habitId, userId) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await client
      .from('habit_completions')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('completion_date', today)
      .single()
    
    return { data, error }
  },

  // Get habit streak
  async getHabitStreak(habitId, userId) {
    const { data, error } = await client
      .from('habit_completions')
      .select('completion_date, is_completed')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('is_completed', true)
      .order('completion_date', { ascending: false })
      .limit(100)

    if (error) return { data: 0, error }

    if (!data || data.length === 0) return { data: 0, error: null }

    let streak = 0
    const today = new Date()
    
    for (let i = 0; i < data.length; i++) {
      const completionDate = new Date(data[i].completion_date)
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      
      if (completionDate.toDateString() === expectedDate.toDateString()) {
        streak++
      } else {
        break
      }
    }

    return { data: streak, error: null }
  },

  // Get habits by category
  async getHabitsByCategory(userId, categoryId) {
    const { data, error } = await client
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Get habit completion history
  async getHabitCompletionHistory(habitId, userId, startDate, endDate) {
    const { data, error } = await client
      .from('habit_completions')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .gte('completion_date', startDate)
      .lte('completion_date', endDate)
      .order('completion_date', { ascending: true })
    
    return { data, error }
  }
}