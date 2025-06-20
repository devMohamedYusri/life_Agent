import {client} from "../supabase"
import { Database } from "../../types/supabase"
import { notificationService } from "./notifications";

export type Task = Database['public']['Tables']['tasks']['Row'] & { user_id: string, title: string };

export const taskService={
    //get all tasks for user
    async getUserTasks(userId: string){
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

    async getTasksByStatus(userId: string, status: string){
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
      async getTasksDueToday(userId: string){

        const today=new Date().toISOString().split('T')[0]
        const tomorrow=new Date(Date.now()+24*60*60*1000).toISOString().split('T')[0]

        const {data,error}=await client
        .from('tasks')
        .select(`
        *,
        category:categories(category_id, name, color, icon),
        goal:goals(goal_id, title)
      `)
      .eq('user_id',userId)
      .gte("due_date",today)
      .lt('due_date',tomorrow)
      .order('due_date',{ascending:true})

      return {data,error}
    },

    //get overdue tasks

    async getOverdueTasks(userId: string){
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
    async createTask(taskData: Partial<Task>){
        const {data,error}=await client
        .from('tasks')
        .insert(taskData)
        .select(`
            *,
            category:categories(category_id, name, color, icon),
            goal:goals(goal_id, title)
          `)
        .single()

        if (data) {
            await notificationService.create({
                user_id: data.user_id,
                type: 'general',
                title: 'New Task Created',
                message: `You've added a new task: "${data.title}"`,
                entity_id: data.task_id,
                entity_type: 'task',
            });
        }

        return {data,error}
    },

    //update task
    async updateTask(taskId: string, updates: Partial<Task>){
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

        if (data) {
            await notificationService.create({
                user_id: data.user_id,
                type: 'achievement',
                title: 'Task Completed!',
                message: `Great job! You finished: "${data.title}"`,
                entity_id: data.task_id,
                entity_type: 'task',
            });
        }

        return {data,error}
    },


    //delete task
    async deleteTask(taskId: string){
        const {data,error}=await client
        .from('tasks')
        .delete()
        .eq('task_id',taskId)

        return {data,error}
    },

    //mark as completed 
    async completeTask(taskId: string){
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

        if (data) {
            await notificationService.create({
                user_id: data.user_id,
                type: 'achievement',
                title: 'Task Completed!',
                message: `Great job! You finished: "${data.title}"`,
                entity_id: data.task_id,
                entity_type: 'task',
            });
        }

        return {data,error}
    },

    //mark as incompleted

    async uncompleteTask(taskId: string){
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
    async getTasksByGoal(goalId: string){
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

    async getTasksByCategory(taskId: string, categoryId: string){
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