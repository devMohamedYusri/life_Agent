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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

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
  recentMessages?: { role: string; content: string; }[];
}

class AIService {
  private static instance: AIService;
  private apiUrl: string;

  private constructor() {
    this.apiUrl = '/api/chat';
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
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Life Agent'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-sonnet',
          messages: [
            {
              role: "system",
              content: "You are a productivity coach analyzing user's tasks and goals to provide actionable recommendations. Format your response as a JSON object with a 'suggestions' array containing objects with 'type', 'title', 'description', 'priority', and optional 'dueDate' and 'frequency' fields."
            },
            {
              role: "user",
              content: `Based on these metrics:
                - Current tasks: ${context.tasks.length}
                - Active goals: ${context.goals.length}
                - Completion rate: ${context.completionRate}%
                
                Provide 3 specific recommendations to improve productivity. Each recommendation should be actionable and specific.`
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI recommendation error:', errorData);
        return {
          content: "I apologize, but I'm having trouble generating recommendations right now.",
          suggestions: []
        };
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        // Try to parse the response as JSON
        const parsedResponse = JSON.parse(content);
        return {
          content: "Here are some recommendations based on your current activities:",
          suggestions: parsedResponse.suggestions || []
        };
      } catch (e) {
        // If parsing fails, return the raw content
        return {
          content: content,
          suggestions: []
        };
      }
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
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Life Agent'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-opus',
          messages: [
            {
              role: "system",
              content: "You are a mental health assistant analyzing mood patterns from journal entries."
            },
            {
              role: "user",
              content: `Analyze these mood patterns: ${JSON.stringify(entries.map(e => ({
                date: e.created_at,
                mood: e.mood,
                content: e.content.substring(0, 100)
              })))} and provide insights about emotional well-being trends.`
            }
          ],
          max_tokens: 400,
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Mood analysis error:', error);
      return null;
    }
  }

  async generateDailyMotivation(userProfile: UserProfile, recentAchievements: Achievement[]) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Life Agent'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-opus',
          messages: [
            {
              role: "system",
              content: "You are a motivational coach providing personalized daily inspiration."
            },
            {
              role: "user",
              content: `Create a personalized motivational message for ${userProfile.user_name || 'this user'} 
                considering their recent achievements: ${recentAchievements.map(a => a.title).join(', ')}`
            }
          ],
          max_tokens: 150,
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Motivation generation error:', error);
      return null;
    }
  }
}

export const aiService = AIService.getInstance();