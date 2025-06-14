import {client} from "../supabase"

export const taskService={
    //get all tasks for user
    async getUserTasks(userId){
        const {data,error}=await client
        .from('tasks')
        .select(`
        *,
        category:categories(category_id, name, color, icon),
        goal:goals(goal_id, title)
      `)
      .eq("user_id",userId)
      .order('created_at',{ascending:false})

      return {data,error}
    },

    //get tasks by status

    async getTasksByStatus(userId,status){
        const {data,error}=await client
        .from("tasks")
        .select(`
        *,
        category:categories(category_id, name, color, icon),
        goal:goals(goal_id, title)
      `)
      .eq("user_id",userId)
      .eq('status',status)
      .order('due_date',{ascending:true})
      return {data,error}
    },

    //get tasks ddue today
    // async getTasksDueToday(userId){
      async getTasksDueToday(){

        const today=new Date().toISOString().split('T')[0]
        const tomorrow=new Date(Date.now()+24*60*60*1000).toISOString().split('T')[0]

        const {data,error}=await client
        .from('tasks')
        .select(`
        *,
        category:categories(category_id, name, color, icon),
        goal:goals(goal_id, title)
      `)
      .eq('user_id",user_id')
      .gte("due_date",today)
      .lt('due_date',tomorrow)
      .order('due_date',{ascending:true})

      return {data,error}
    },

    //get overdue tasks

    async getOverdueTasks(userId){
        const today=new Date().toISOString().split('T')[0]
        const {data,error}=await client
        .from('tasks')
        .select(`
            *,
            category:categories(category_id, name, color, icon),
            goal:goals(goal_id, title)
          `)
        .eq("user_id",userId)
        .lt('due_date',today)
        .neq('status','completed')
        .order('due_date',{ascending:true})

        return {data,error}

    },


    // create new task
    async createTask(taskData){
        const {data,error}=await client
        .from('tasks')
        .insert(taskData)
        .select(`
            *,
            category:categories(category_id, name, color, icon),
            goal:goals(goal_id, title)
          `)
        .single()

        return {data,error}
    },

    //update task
    async updateTask(taskId,updates){
        const {data,error}=await client
        .from('tasks')
        .update(updates)
        .eq('task_id',taskId)
        .select(`
            *,
            category:categories(category_id, name, color, icon),
            goal:goals(goal_id, title)
          `)
        .single()

        return {data,error}
    },


    //delete task
    async deleteTask(taskId){
        const {data,error}=await client
        .from('tasks')
        .delete()
        .eq('task_id',taskId)

        return {data,error}
    },

    //mark as completed 
    async completeTask(taskId){
        const {data,error}=await client
        .from('tasks')
        .update({
            is_completed:true,
            status:"completed",
            completed_at:new Date().toISOString()
        })
        .eq('task_id',taskId)
        .select()
        .single()

        return {data,error}
    },

    //mark as incompleted

    async uncompleteTask(taskId){
        const {data,error}=await client
        .from('tasks')
        .update({
            is_completed:false,
            status:"pending",
            completed_at:null
        })
        .eq('task_id',taskId)
        .select()
        .single()

        return {data,error}
    },

    // get tasks by goal
    async getTasksByGoal(goalId){
        const {data,error}=await client
        .from("tasks")
        .select(`
            *,
            category:categories(category_id, name, color, icon),
            goal:goals(goal_id, title)
          `)
        .eq('goal_id',goalId)
        .order('created_at',{ascending:false})

        return {data,error}
    },

    //get tasks by category

    async getTasksByCategory(taskId,categoryId){
        const {data,error}=await client
        .from('tasks')
        .select(`
            *,
            goal:goals(goal_id, title)
          `)
        .eq('task_id',taskId)
        .eq('category_id', categoryId)
        .order('created_at',{ascending:false})

        return {data,error}
    }
}