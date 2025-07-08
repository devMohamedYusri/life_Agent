// app/services/ai.ts
import { Task as TaskType } from './database/tasks'
import { Goal as GoalType } from './database/goals'
import { Habit } from './database/habits'

// interface TaskContext {
//   task_id: string;
//   title: string;
//   completed: boolean;
//   created_at: string;
// }

// interface GoalContext {
//   goal_id: string;
//   title: string;
//   status: string;
// }

interface JournalEntry {
  created_at: string;
  mood: string;
  content: string;
}

interface UserProfile {
  user_name: string;
  email: string;
  created_at: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

interface TaskRecommendationContext {
  tasks: TaskType[];
  goals: GoalType[];
  completionRate: number;
}
interface AISuggestion {
  type: 'task' | 'goal' | 'habit' | 'journal'
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  frequency?: 'daily' | 'weekly' | 'monthly'
  targetCount?: number
  mood?: string
  tags?: string[]
}

interface AIResponse {
  content: string
  suggestions?: AISuggestion[]
}

interface AIContext {
  recentTasks?: TaskType[];
  recentGoals?: GoalType[];
  recentHabits?: Habit[];
  recentJournalEntries?: JournalEntry[];
  recentMessages?: { role: string; content: string; }[];
}

class AIService {
  private static instance: AIService;
  private apiUrl: string;
  private aiServicesUrl: string;

  private constructor() {
    this.apiUrl = '/api/chat';
    this.aiServicesUrl = '/api/ai-services';
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async getResponse(message: string, context: AIContext = {}): Promise<AIResponse> {
    try {
      console.log('Sending request to chat API:', { message, contextKeys: Object.keys(context) });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, context }),
      });

      const data = await response.json();
      console.log('Chat API response:', data);

      // Handle error responses
      if (!response.ok) {
        console.error('Chat API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        return {
          content: data.error || "I apologize, but I'm having trouble processing your request right now. Please try again later.",
          suggestions: []
        };
      }

      // Ensure we have a valid response format
      if (!data.content) {
        console.error('Invalid response format:', data);
        return {
          content: "I apologize, but I received an invalid response format. Please try again.",
          suggestions: []
        };
      }

      return {
        content: data.content,
        suggestions: data.suggestions || []
      };
    } catch (error) {
      console.error('Error in AI service:', error);
      return {
        content: "I apologize, but I encountered an error while processing your request. Please try again.",
        suggestions: []
      };
    }
  }

  async generateTaskRecommendations(context: TaskRecommendationContext) {
    try {
      const response = await fetch(this.aiServicesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          serviceType: 'recommendations',
          context 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI recommendation error:', errorData);
        return {
          content: errorData.error || "I apologize, but I'm having trouble generating recommendations right now.",
          suggestions: []
        };
      }

      const data = await response.json();
      
      return {
        content: data.content,
        suggestions: data.suggestions || []
      };
    } catch (error) {
      console.error('AI recommendation error:', error);
      return {
        content: "I apologize, but I encountered an error while generating recommendations.",
        suggestions: []
      };
    }
  }

  async analyzeMoodPatterns(entries: JournalEntry[]) {
    try {
      const response = await fetch(this.aiServicesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          serviceType: 'mood-analysis',
          entries 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Mood analysis error:', errorData);
        return errorData.error || null;
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Mood analysis error:', error);
      return null;
    }
  }

  async generateDailyMotivation(userProfile: UserProfile, recentAchievements: Achievement[]) {
    try {
      const response = await fetch(this.aiServicesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          serviceType: 'daily-motivation',
          userProfile, 
          recentAchievements 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Daily motivation error:', errorData);
        return errorData.error || null;
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Daily motivation error:', error);
      return null;
    }
  }
}

export const aiService = AIService.getInstance();