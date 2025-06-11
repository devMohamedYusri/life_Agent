import { client } from '../supabase'

export const aiPlanService = {
  // Get all AI plans for user
  async getUserAIPlans(userId) {
    const { data, error } = await client
      .from('ai_plans')
      .select(`
        *,
        goal:goals(goal_id, title, status)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Get AI plans by status
  async getAIPlansByStatus(userId, status) {
    const { data, error } = await client
      .from('ai_plans')
      .select(`
        *,
        goal:goals(goal_id, title, status)
      `)
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Create new AI plan
  async createAIPlan(planData) {
    const { data, error } = await client
      .from('ai_plans')
      .insert([planData])
      .select(`
        *,
        goal:goals(goal_id, title, status)
      `)
      .single()
    
    return { data, error }
  },

  // Update AI plan
  async updateAIPlan(planId, updates) {
    const { data, error } = await client
      .from('ai_plans')
      .update(updates)
      .eq('plan_id', planId)
      .select(`
        *,
        goal:goals(goal_id, title, status)
      `)
      .single()
    
    return { data, error }
  },

  // Delete AI plan
  async deleteAIPlan(planId) {
    const { data, error } = await client
      .from('ai_plans')
      .delete()
      .eq('plan_id', planId)
    
    return { data, error }
  },

  // Get AI plan details
  async getAIPlanDetails(planId) {
    const { data, error } = await client
      .from('ai_plans')
      .select(`
        *,
        goal:goals(goal_id, title, status, progress)
      `)
      .eq('plan_id', planId)
      .single()
    
    return { data, error }
  },

  // Get AI plans by goal
  async getAIPlansByGoal(goalId) {
    const { data, error } = await client
      .from('ai_plans')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Mark AI plan as completed
  async completeAIPlan(planId) {
    const { data, error } = await client
      .from('ai_plans')
      .update({ status: 'completed' })
      .eq('plan_id', planId)
      .select()
      .single()
    
    return { data, error }
  },

  // Mark AI plan as cancelled
  async cancelAIPlan(planId) {
    const { data, error } = await client
      .from('ai_plans')
      .update({ status: 'cancelled' })
      .eq('plan_id', planId)
      .select()
      .single()
    
    return { data, error }
  }
}