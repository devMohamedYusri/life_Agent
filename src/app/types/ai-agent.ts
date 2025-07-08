export interface AISuggestion {
  id: string;
  type: 'task' | 'habit' | 'goal' | 'journal';
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low' | 'urgent';
  reason?: string;
  // Optional fields for tasks
  dueDate?: string; // For tasks (ISO string format expected)
  completed?: boolean; // For tasks

  // Optional fields for habits
  frequency?: 'daily' | 'weekly' | 'monthly'; // For habits
  reminderTime?: string; // For habits (HH:MM format)
  targetCount?: number; // For habits

  // Optional fields for goals
  targetDate?: string; // For goals (ISO string format expected), replaces deadline
  progress?: number; // For goals
  goalType?: string; // For goals (e.g., "long-term", "short-term"), replaces goal_type
  status?: 'pending' | 'in-progress' | 'completed' | 'archived' | 'active' | 'paused' | 'cancelled'; // For goals, tasks, and habits, including new statuses

  // Optional fields for journal entries
  entry_date?: string; // For journal entries
  mood?: string; // For journal entries
  tags?: string[] | string; // For journal entries

  // Fields for UI state
  decisionStatus?: 'pending' | 'accepted' | 'rejected';
  isAccepted?: boolean;
  isRefused?: boolean;

  // For complex goals/plans, nested suggestions
  subSuggestions?: AISuggestion[];
  relatedGoalId?: string;
  relatedHabitId?: string;
}

export interface AIInsight {
  id: string;
  content: string;
  metrics: {
    tasksCompleted: number;
    habitsMaintained: number;
    goalsProgress: number;
  };
  timestamp: string;
}

export interface AIFeedback {
  suggestionId: string;
  helpful: boolean;
  comment?: string;
}

export interface AIContext {
  recentTasks?: {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
  }[];
  recentHabits?: {
    id: string;
    name: string;
    streak: number;
    frequency: string;
  }[];
  recentGoals?: {
    id: string;
    title: string;
    progress: number;
    targetDate?: string;
  }[];
  recentJournalEntries?: {
    id: string;
    content: string;
    mood?: string;
    entry_date: string;
  }[];
  recentMessages?: { role: string; content: string; }[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: Date | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: Date;
  user_id: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'short-term' | 'long-term';
  status: 'not_started' | 'in_progress' | 'completed';
  created_at: Date;
  user_id: string;
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_count: number;
  status: 'active' | 'paused' | 'completed';
  created_at: Date;
  user_id: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  tags: string[];
  created_at: Date;
  user_id: string;
} 