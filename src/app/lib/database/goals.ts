import {client} from '../supabase'
import { Database } from "../../types/supabase"

export type Goal = Database['public']['Tables']['goals']['Row']

export const goalService={
    // get all goals for user
    async getUserGoals(userId: string){
        const {data,error}=await client
        .from('goals')
        .select(`
        *,
        category:categories(category_id, name, color, icon),
        tasks(task_id, title, is_completed, status)
      `)
      .eq('user_id',userId)
      .order('created_at',{ascending:false})

      return {data,error}
    },

    
        //get goal with detailed status

    async getGoalDetails(goalId: string){
        const {data,error}=await client
        .from('gaols')
        .select(`
            *,
            category:categories(category_id, name, color, icon),
            tasks(task_id, title, is_completed, status, due_date)
        `)
        .eq('goal_id',goalId)
        .single()

        return {data,error}
    },


    //get goals by type

    async getGoalsByType(userId: string, goalType: string){
        const{data,error}=await client
        .from('goals')
        .select(`
            *,
            category:categories(category_id, name, color, icon),
            tasks(task_id, title, is_completed, status)
          `)
        .eq('user_id',userId)
        .eq('goal_type',goalType)
        .order('created_at',{ascending:false})

        return {data,error}
    },

    //get goal by category
    async getGoalByCategory(userId: string, categoryId: string){
        const {data,error}=await client
        .from('goals')
        .select(`
            *,
            tasks(task_id, title, is_completed, status)
        `)
        .eq('user_id',userId)
        .eq('category_id',categoryId)
        .order('created_at',{ascending:false})

        return {data,error}

    },


    //get goals by status
    async getGoalsByStatus(userId: string, status: string) {
        const { data, error } = await client
          .from('goals')
          .select(`
            *,
            category:categories(category_id, name, color, icon),
            tasks(task_id, title, is_completed, status)
          `)
          .eq('user_id', userId)
          .eq('status', status)
          .order('deadline', { ascending: true })
        
        return { data, error }
      },
    //create new goal

    async createGoal(goalData: Partial<Goal>){
        const {data,error}=await client
        .from('goals')
        .insert(goalData)
        .select(`
            *,
            category:categories(category_id, name, color, icon)
        `)
        .single()

        return {data,error}
    },

    //update goal

    async updateGoal(goalId: string, updates: Partial<Goal>){
        const {data,error}=await client
        .from('goals')
        .update(updates)
        .eq('goal_id',goalId)
        .select(`
            *,
            category:categories(category_id, name, color, icon)
        `)
        .single()

        return {data,error}
    },
    //delete goal

    async deleteGoal(goalId: string){
        const {data,error}=await client
        .from('goals')
        .delete()
        .eq('goal_id',goalId)

        return {data,error}
    },

    //update goal progress automaticly

    async updateGoalProgress(goalId: string, progress: number){
        const {data,error}=await client
        .from('goals')
        .update({progress})
        .eq('goal_id',goalId)
        .select()
        .single()

        return {data,error}
       },

    //get goal with tasks
    async getGoalWithTasks(goalId: string){
        const {data,error}=await client
        .from('goals')
        .select(`
            *,
            tasks:tasks(*)
        `)
        .eq('goal_id',goalId)
        .single()

        return {data,error}
    }
}