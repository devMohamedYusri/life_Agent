import {client} from "../supabase"
import { Database } from "../../../types/supabase"

export type Category = Database['public']['Tables']['categories']['Row']

export const categoryService = {
    // get all categories 
    async getUserCategories(userId: string) {
        const {data, error} = await client
            .from("categories")
            .select("*")
            .eq('user_id', userId)
            .order("name")

        return {data, error}
    },

    // get category with usage stats
    async getCategoryWithStats(userId: string, categoryId: string) {
        const {data: category, error: categoryError} = await client
            .from("categories")
            .select("*")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .single()

        if (categoryError)
            return {data: null, error: categoryError}

        const {data: goals} = await client
            .from('goals')
            .select("goal_id, status")
            .eq("category_id", categoryId)

        const {data: tasks} = await client
            .from("tasks")
            .select("task_id, status")
            .eq("category_id", categoryId)

        const {data: habits} = await client
            .from('habits')
            .select("habit_id")
            .eq("category_id", categoryId)

        const stats = {
            ...category,
            goalsCount: goals?.length || 0,
            activeGoalsCount: goals?.filter(g => g.status === 'active').length || 0,
            tasksCount: tasks?.length || 0,
            completedTasksCount: tasks?.filter(t => t.status === 'completed').length || 0,
            habitsCount: habits?.length || 0
        }
        
        return {data: stats, error: null}
    },

    // create new category
    async createCategory(categoryData: Partial<Category>) {
        const {data, error} = await client
            .from("categories")
            .insert(categoryData)
            .select()
            .single()

        return {data, error}
    },

    // update category
    async updateCategory(categoryId: string, updates: Partial<Category>) {
        const {data, error} = await client
            .from("categories")
            .update(updates)
            .eq("category_id", categoryId)
            .select()
            .single()

        return {data, error}
    },

    // delete category
    async deleteCategory(categoryId: string) {
        const {data, error} = await client
            .from('categories')
            .delete()
            .eq('category_id', categoryId)
        
        return {data, error}  // Fixed: Added return statement
    },

    // get categories with item counts
    async getCategoriesWithCounts(userId: string) {
        const {data, error} = await client
            .from('categories')
            .select(`
                *,
                goals:goals(count),
                tasks:tasks(count),
                habits:habits(count)
            `)
            .eq("user_id", userId)
            .order('name')

        return {data, error}  // Fixed: Changed 'categories' to 'data'
    }
}