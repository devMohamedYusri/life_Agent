import { client } from '../supabase'

export const rewardService = {
  // Get all rewards for user
  async getUserRewards(userId) {
    const { data, error } = await client
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Get user's total points
  async getUserTotalPoints(userId) {
    const { data, error } = await client
      .from('rewards')
      .select('points')
      .eq('user_id', userId)

    if (error) return { data: 0, error }

    const totalPoints = data?.reduce((sum, reward) => sum + reward.points, 0) || 0
    return { data: totalPoints, error: null }
  },

  // Get available rewards (not redeemed)
  async getAvailableRewards(userId) {
    const { data, error } = await client
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .is('redeemed_at', null)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Get redeemed rewards
  async getRedeemedRewards(userId) {
    const { data, error } = await client
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .not('redeemed_at', 'is', null)
      .order('redeemed_at', { ascending: false })
    
    return { data, error }
  },

  // Create new reward (add points)
  async createReward(rewardData) {
    const { data, error } = await client
      .from('rewards')
      .insert([rewardData])
      .select()
      .single()
    
    return { data, error }
  },

  // Redeem reward
  async redeemReward(rewardId) {
    const { data, error } = await client
      .from('rewards')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('reward_id', rewardId)
      .select()
      .single()
    
    return { data, error }
  },

  // Delete reward
  async deleteReward(rewardId) {
    const { data, error } = await client
      .from('rewards')
      .delete()
      .eq('reward_id', rewardId)
    
    return { data, error }
  },

  // Get rewards by type
  async getRewardsByType(userId, rewardType) {
    const { data, error } = await client
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('reward_type', rewardType)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // Add points for completing task
  async addTaskCompletionPoints(userId, taskTitle, points = 10) {
    const rewardData = {
      user_id: userId,
      points: points,
      reward_type: 'task_completion',
      reward_description: `Completed task: ${taskTitle}`
    }

    return await this.createReward(rewardData)
  },

  // Add points for completing goal
  async addGoalCompletionPoints(userId, goalTitle, points = 50) {
    const rewardData = {
      user_id: userId,
      points: points,
      reward_type: 'goal_completion',
      reward_description: `Completed goal: ${goalTitle}`
    }

    return await this.createReward(rewardData)
  },

  // Add points for habit streak
  async addHabitStreakPoints(userId, habitTitle, streakDays, points = 5) {
    const rewardData = {
      user_id: userId,
      points: points * streakDays,
      reward_type: 'habit_streak',
      reward_description: `${streakDays}-day streak for: ${habitTitle}`
    }

    return await this.createReward(rewardData)
  },

  // Get rewards summary
  async getRewardsSummary(userId) {
    const { data: rewards, error } = await client
      .from('rewards')
      .select('points, reward_type, redeemed_at')
      .eq('user_id', userId)

    if (error) return { data: null, error }

    const summary = {
      totalPoints: 0,
      availablePoints: 0,
      redeemedPoints: 0,
      rewardsByType: {},
      totalRewards: rewards?.length || 0
    }

    rewards?.forEach(reward => {
      summary.totalPoints += reward.points
      
      if (reward.redeemed_at) {
        summary.redeemedPoints += reward.points
      } else {
        summary.availablePoints += reward.points
      }

      summary.rewardsByType[reward.reward_type] = 
        (summary.rewardsByType[reward.reward_type] || 0) + reward.points
    })

    return { data: summary, error: null }
  }
}