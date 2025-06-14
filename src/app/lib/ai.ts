// app/services/ai.ts
import OpenAI from 'openai';

interface Task {
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

interface Goal {
  goal_id: string;
  title: string;
  status: string;
}

interface JournalEntry {
  created_at: string;
  mood: string;
  content: string;
}

interface UserProfile {
  full_name: string;
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
  tasks: Task[];
  goals: Goal[];
  completionRate: number;
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export const aiService = {
  async generateTaskRecommendations(context: TaskRecommendationContext) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a productivity coach analyzing user's tasks and goals to provide actionable recommendations."
          },
          {
            role: "user",
            content: `Based on these metrics:
              - Current tasks: ${context.tasks.length}
              - Active goals: ${context.goals.length}
              - Completion rate: ${context.completionRate}%
              
              Provide 3 specific recommendations to improve productivity.`
          }
        ],
        max_tokens: 300,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI recommendation error:', error);
      return null;
    }
  },

  async analyzeMoodPatterns(entries: JournalEntry[]) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
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
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Mood analysis error:', error);
      return null;
    }
  },

  async generateDailyMotivation(userProfile: UserProfile, recentAchievements: Achievement[]) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a motivational coach providing personalized daily inspiration."
          },
          {
            role: "user",
            content: `Create a personalized motivational message for ${userProfile.full_name || 'this user'} 
              considering their recent achievements: ${recentAchievements.map(a => a.title).join(', ')}`
          }
        ],
        max_tokens: 150,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Motivation generation error:', error);
      return null;
    }
  }
};