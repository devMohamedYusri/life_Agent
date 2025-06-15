// app/services/ai-plans.ts
import { aiService } from './ai'
import { taskService } from './database/tasks'
import { goalService } from './database/goals'

interface UserPreferences {
  focusAreas: string[];
  workHours: string;
  intensity: 'low' | 'medium' | 'high';
}

interface AITask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  best_time: string;
  time_estimate: string;
}

interface AIHabit {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  description: string;
}

interface AITip {
  title: string;
  description: string;
  category: string;
}

interface Plan {
  tasks: AITask[];
  habits: AIHabit[];
  tips: AITip[];
  goalAlignment: {
    goalId: string;
    alignment: string;
  }[];
  createdAt: string;
}

interface PlanContext {
  tasks: Array<{
    task_id: string;
    title: string;
    completed: boolean;
    created_at: string;
  }>;
  goals: Array<{
    goal_id: string;
    title: string;
    status: string;
  }>;
  completionRate: number;
}

export const aiPlanService = {
  async generatePlan(userId: string, planType: string, preferences: UserPreferences): Promise<Plan> {
    // Fetch user data
    const [tasks, goals] = await Promise.all([
      taskService.getUserTasks(userId),
      goalService.getUserGoals(userId),
    ])

    const currentTasks = tasks.data?.length || 0
    const completedTasks = tasks.data?.filter(t => t.completed).length || 0

    const context: PlanContext = {
      tasks: tasks.data || [],
      goals: goals.data || [],
      completionRate: currentTasks ? (completedTasks / currentTasks) : 0
    }

    // Generate plan using AI
    // const prompt = `
    //   Create a ${planType} productivity plan based on:
    //   - User has ${currentTasks} tasks (${completedTasks} completed)
    //   - Active goals: ${goals.data?.filter(g => g.status === 'active').map(g => g.title).join(', ')}
    //   - Focus areas: ${preferences.focusAreas.join(', ')}
    //   - Work hours: ${preferences.workHours}
    //   - Intensity: ${preferences.intensity}
      
    //   Provide a structured plan with:
    //   1. 5-7 specific tasks with time estimates and best times
    //   2. How these align with their goals
    //   3. 3 habits to build
    //   4. 3 actionable tips
      
    //   Format as JSON.
    // `

    try {
      const response = await aiService.generateTaskRecommendations(context)
      if (!response) {
        throw new Error('No response from AI service')
      }
      // Parse and structure the response
      const parsedResponse = JSON.parse(response) as Plan
      return {
        ...parsedResponse,
        createdAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error generating AI plan:', error)
      throw error
    }
  },

  async savePlan(userId: string, plan: Plan): Promise<void> {
    // Save plan to database or localStorage
    const plans = JSON.parse(localStorage.getItem(`ai-plans-${userId}`) || '[]') as Plan[]
    plans.unshift(plan)
    localStorage.setItem(`ai-plans-${userId}`, JSON.stringify(plans.slice(0, 10)))
  },

  async applyPlanToSchedule(userId: string, plan: Plan): Promise<void> {
    const promises = plan.tasks.map((task: AITask) => {
      return taskService.createTask({
        user_id: userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: calculateDueDate(task.best_time),
        completed: false
      })
    })

    await Promise.all(promises)
  }
}

function calculateDueDate(bestTime: string): string {
  // Parse best time and create appropriate due date
  const today = new Date()
  // Implementation depends on format of bestTime
  return today.toISOString()
}