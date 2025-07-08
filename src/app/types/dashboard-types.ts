// app/dashboard/types.ts
import { Database } from './supabase';

export interface Task {
    task_id: string;
    id?: string;
    title: string;
    description: string;
    status: string;
    priority: "high" | "medium" | "low";
    due_date: string;
    completed: boolean;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    goal_id?: string;
    category?: {
      category_id: string;
      name: string;
      color: string;
      icon: string;
    };
    goal?: {
      goal_id: string;
      title: string;
    };
  }
  
  export interface DashboardStats {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalHabits: number;
  }
  
  export interface StoredData<T> {
    data: T;
    timestamp: number;
  }
  
  export type ServiceType = 
    | 'recommendations' 
    | 'daily-motivation' 
    | 'mood-analysis';

export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];