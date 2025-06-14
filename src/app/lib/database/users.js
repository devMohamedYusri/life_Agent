import { client } from "../supabase"
export const userService={
   // get and update user profile
   
   async getUserProfile(userId){
    const {data,error}=await client
    .from('user_profiles')
    .select('*')
    .eq('id',userId)
    .single()

    return {data,error}
   },

   async updateUserProfile(userId,updates){
    const {data,error}=await client
    .from('user_profiles')
    .update(updates)
    .eq('id',userId)
    .select()
    .single()

    return{data,error}

   },

   //get and update user preferences 
   async getUserPreferences(userId){
    const {data,error}=await client
    .from('user_preferences')
    .select('*')
    .eq('id',userId)
    .single()

    return {data,error}
   },

   async updateUserPreferences(userId,preferences){
    const {data,error}=await client
    .from('user_preferences')
    .update(preferences)
    .eq('id',userId)
    .select()
    .single()

    return {data,error}
   },

   //get user stats

   async getUserStats(userId){
    //goals state
    const {data:goals,error:goalsError}=await client
    .from('goals')
    .select('goal_id','status')
    .eq('user_id',userId)

    //tasks state

    const {data:tasks,error:tasksError}=await client
    .from('tasks')
    .select('task_id','status')
    .eq('user_id',userId)


    //habits stats

    const {data:habits,error:habitsError}=await client
    .from('habits')
    .select("habit_id")
    .eq("user_id",userId)

    //check for errors

    if(goalsError || tasksError || habitsError){
        return {data:null,error:goalsError || tasksError || habitsError}
    }


    const stats={
        totalGoals:goals?.length || 0,
        activeGoals:goals?.filter(g=>g.status==="active").length || 0,
        completedGoals:goals?.filter(g=>g.status==='completed').length || 0,
        totalTasks:tasks?.length||0,
        completedTasks:tasks?.filter(t=>t.status==="completed").length || 0,
        pendingTasks:tasks?.filter(t=>t.status==="pending").length || 0,
        totalHabits:habits?.length || 0

    }

    return {data:stats,error:null}
   },


   // update Ai personalization settings
   async updateAISettings(userId,settings){
    const {data,error}=await client
    .from("user_profiles")
    .update({ai_personalization_settings:settings})
    .eq("id",userId)
    .select()
    .single()

    return {data,error}
   },

  
   async updateProfile(userId, updates) {
    const { data, error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .single()

    if (error) throw error
    return { data }
  },

  async deleteAccount(userId) {
    // First delete all user data
    const tables = ['tasks', 'goals', 'habits', 'journal_entries', 'notifications']
    
    for (const table of tables) {
      await client
        .from(table)
        .delete()
        .eq('user_id', userId)
    }

    // Delete profile
    await client
      .from('profiles')
      .delete()
      .eq('id', userId)

    // Delete auth user
    const { error } = await client.auth.admin.deleteUser(userId)
    if (error) throw error
  },

  async getUserStats(userId) {
    const [tasks, goals, habits] = await Promise.all([
      client.from('tasks').select('*').eq('user_id', userId),
      client.from('goals').select('*').eq('user_id', userId),
      client.from('habits').select('*').eq('user_id', userId)
    ])

    const stats = {
      totalTasks: tasks.data?.length || 0,
      completedTasks: tasks.data?.filter(t => t.completed).length || 0,
      pendingTasks: tasks.data?.filter(t => !t.completed).length || 0,
      totalGoals: goals.data?.length || 0,
      activeGoals: goals.data?.filter(g => g.status === 'active').length || 0,
      completedGoals: goals.data?.filter(g => g.status === 'completed').length || 0,
      totalHabits: habits.data?.length || 0
    }

    return { data: stats }
  }
}