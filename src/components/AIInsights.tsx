// app/components/AIInsights.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle} from './ui/card'
import { Brain, Sparkles, Heart } from 'lucide-react';
import { aiService } from '@//lib/ai';
import { taskService } from '@//lib/database/tasks';
import { goalService } from '@//lib/database/goals';
import { journalService } from '@//lib/database/journal';
import { useAuthStore } from '@//lib/stores/authStore';

interface InsightsState {
  recommendations: string;
  moodAnalysis: string;
  motivation: string;
  loading: boolean;
}

export function AIInsights() {
  const { user } = useAuthStore();
  const [insights, setInsights] = useState<InsightsState>({
    recommendations: '',
    moodAnalysis: '',
    motivation: '',
    loading: true
  });

  const loadInsights = useCallback(async () => {
    if (!user) return;

    try {
      const [tasks, goals, entries] = await Promise.all([
        taskService.getUserTasks(user.id),
        goalService.getUserGoals(user.id),
        journalService.getUserJournalEntries(user.id)
      ]);

      const completedTasks = tasks.data?.filter((t: { completed: boolean }) => t.completed).length ?? 0;
      const completionRate = tasks.data?.length ? (completedTasks / tasks.data.length) * 100 : 0;

      const [recommendations, moodAnalysis, motivation] = await Promise.all([
        aiService.generateTaskRecommendations({ tasks: tasks.data ?? [], goals: goals.data ?? [], completionRate }),
        aiService.analyzeMoodPatterns(entries.data?.slice(0, 7) ?? []), // Last 7 entries
        aiService.generateDailyMotivation(user, tasks.data?.filter((t: { completed: boolean }) => t.completed).slice(0, 3) ?? [])
      ]);

      setInsights({
        recommendations: recommendations || 'Unable to generate recommendations',
        moodAnalysis: moodAnalysis || 'Unable to analyze mood patterns',
        motivation: motivation || 'Stay focused and keep moving forward!',
        loading: false
      });
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsights(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user, loadInsights]);

  if (insights.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-gray-200 dark:bg-gray-700" />
            <CardContent className="h-32 bg-gray-100 dark:bg-gray-800" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Productivity Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {insights.recommendations}
          </p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-purple-600" />
            Mood Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {insights.moodAnalysis}
          </p>
        </CardContent>
      </Card>

      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            Daily Motivation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {insights.motivation}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}