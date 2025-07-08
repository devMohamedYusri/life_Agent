// app/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthStore } from "../lib/stores/authStore";
import { userService } from "../lib/database/users";
import { taskService } from "../lib/database/tasks";
import type { Task } from '../lib/database/tasks';
import { habitService } from "../lib/database/habits";
import { goalService } from "../lib/database/goals";
import type { Goal } from '../lib/database/goals';
import type { Habit } from '../lib/database/habits';
import { journalService } from "../lib/database/journal";
import type { JournalEntry } from '../types/dashboard-types';
import { BrowserNotificationService, notificationService } from "../lib/database/notifications";
import { useSupabase } from "../lib/hooks/useSupabase";
import {
  CheckCircle,
  Target,
  TrendingUp,
  Calendar,
  Zap,
  RefreshCw,
  Book,
  Heart,
  Sparkles,
  Clock,
  XCircle,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { AISuggestion } from "../types/ai-agent";
import { v4 as generateUUID } from "uuid";
import { UserStorage } from "../lib/utils/userStorage";

// ============= Type Definitions =============
interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalHabits: number;
}

interface StoredSuggestions {
  suggestions: AISuggestion[];
  timestamp: number;
}

interface StoredMotivation {
  content: string;
  timestamp: number;
}

// ============= Constants =============
const SUGGESTIONS_REFRESH_LIMIT = 3;
const UPCOMING_DEADLINES_DAYS = 7;
const UPCOMING_DEADLINES_LIMIT = 5;
const HABITS_DISPLAY_LIMIT = 5;

const PRIORITY_COLORS = {
  high: "text-red-600",
  medium: "text-yellow-600",
  low: "text-green-600",
} as const;

const STAT_CARDS_CONFIG = [
  {
    title: "Tasks Today",
    href: "/dashboard/tasks",
    icon: CheckCircle,
    iconColor: "text-blue-500",
    getValue: (todayTasks: Task[]) => todayTasks.length,
  },
  {
    title: "Active Goals",
    href: "/dashboard/goals",
    icon: Target,
    iconColor: "text-purple-500",
    getValue: (_todayTasks: Task[], stats: DashboardStats | null) => stats?.activeGoals || 0,
  },
  {
    title: "Habits Tracked",
    href: "/dashboard/habits",
    icon: Zap,
    iconColor: "text-yellow-500",
    getValue: (_todayTasks: Task[], stats: DashboardStats | null) => stats?.totalHabits || 0,
  },
  {
    title: "Completion Rate",
    href: "/dashboard/analysis",
    icon: TrendingUp,
    iconColor: "text-green-500",
    getValue: (_todayTasks: Task[], stats: DashboardStats | null) => {
      if (stats?.totalTasks && stats?.completedTasks) {
        return Math.round((stats.completedTasks / stats.totalTasks) * 100) + "%";
      }
      return "0%";
    },
  },
];

// ============= Utility Functions =============
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const isDateToday = (timestamp: number): boolean => {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

function getStoredData<T>(key: string): T | null {
  return UserStorage.getItem<T>(key);
}

function setStoredData<T>(key: string, data: T): void {
  UserStorage.setItem(key, data);
}

const calculateDaysUntilDue = (dueDate: string): number => {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

// Helper function to remove <think> tags and their content
const cleanAIResponse = (text: string): string => {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*/gi, '')
    .replace(/^[\s\S]*<\/think>/gi, '') // Corrected regex for unopened closing tags
    .trim();
};

// ============= Component Functions =============
const renderEmptyState = (message: string) => (
  <p className="text-gray-500 text-center py-8">{message}</p>
);

const renderLoadingSpinner = (size: "small" | "large" = "large") => (
  <div className="flex items-center justify-center py-8">
    <div className={`animate-spin rounded-full ${
      size === "large" ? "h-8 w-8" : "h-6 w-6"
    } border-b-2 border-purple-600`}></div>
  </div>
);

// ============= Main Component =============
export default function DashboardHome() {
  const { user } = useAuthStore();
  const { supabase } = useSupabase();
  
  // ============= State Management =============
  const [greeting, setGreeting] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [dailySuggestions, setDailySuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [processedSuggestions, setProcessedSuggestions] = useState<Set<string>>(new Set());
  const [dailyMotivation, setDailyMotivation] = useState<string>("");
  const [isLoadingMotivation, setIsLoadingMotivation] = useState(false);
  const [moodInsight, setMoodInsight] = useState<string>("");
  const [isLoadingMoodInsight, setIsLoadingMoodInsight] = useState(false);

  // ============= Memoized Values =============
  const unprocessedSuggestions = useMemo(
    () => dailySuggestions.filter(s => !processedSuggestions.has(s.id)),
    [dailySuggestions, processedSuggestions]
  );

  const completionRate = useMemo(
    () => stats?.totalTasks && stats?.completedTasks
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0,
    [stats]
  );

  // ============= Effect Hooks =============
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      setupNotifications();
      loadDailyMotivation();
      loadMoodInsights();
      loadDailySuggestions();
    }
  }, [user]);

  useEffect(() => {
    const refreshData = getRefreshData();
    const today = new Date().toDateString();
    setRefreshCount(refreshData.date === today ? refreshData.count : 0);
  }, []);

  // ============= Data Loading Functions =============
  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      // Parallel data fetching
      const [tasksResult, habitsResult, goalsResult, journalsResult] = await Promise.all([
        taskService(supabase).getUserTasks(user.id),
        habitService(supabase).getUserHabits(user.id),
        goalService(supabase).getUserGoals(user.id),
        journalService(supabase).getUserJournalEntries(user.id)
      ]);

      // Update stats
      const tasks = tasksResult.data || [];
      const stats: DashboardStats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.is_completed).length,
        pendingTasks: tasks.filter(t => !t.is_completed).length,
        totalGoals: goalsResult.data?.length || 0,
        activeGoals: goalsResult.data?.filter(g => g.status === 'active').length || 0,
        completedGoals: goalsResult.data?.filter(g => g.status === 'completed').length || 0,
        totalHabits: habitsResult.data?.length || 0
      };
      setStats(stats);

      // Process tasks
      const today = new Date().toDateString();
      
      // Today's tasks
      const todaysTasks = tasks.filter((task: Task) => 
        task.due_date && new Date(task.due_date).toDateString() === today
      );
      setTodayTasks(todaysTasks);

      // Upcoming deadlines
      const upcoming = tasks
        .filter((task: Task) => {
          if (!task.due_date || task.is_completed) return false;
          const daysUntilDue = calculateDaysUntilDue(task.due_date);
          return daysUntilDue > 0 && daysUntilDue <= UPCOMING_DEADLINES_DAYS;
        })
        .sort((a: Task, b: Task) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        })
        .slice(0, UPCOMING_DEADLINES_LIMIT);
      setUpcomingDeadlines(upcoming);

      // Update other data
      const habitsData = habitsResult.data || [];
      const habitsWithStreaks = await Promise.all(habitsData.map(async (habit) => {
        const { data: streak } = await habitService(supabase).gethabitstreak(habit.habit_id, user.id);
        return { ...habit, streak: streak || 0 };
      }));
      setHabits(habitsWithStreaks);
      setGoals(goalsResult.data || []);
      setJournals(journalsResult.data || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }, [user, supabase]);

  const setupNotifications = useCallback(async () => {
    const settings = getStoredData<{ browserNotifications: boolean }>("notificationSettings");
    if (settings?.browserNotifications && user) {
      const notifications = notificationService(supabase);
      const { data } = await notifications.getUpcoming(user.id);
      if (data) {
        for (const notification of data) {
          await BrowserNotificationService.showFromDatabaseNotification(notification);
        }
      }
    }
  }, [user, supabase]);

  const getRefreshData = (): { count: number; date: string } => {
    const defaultData = { count: 0, date: new Date().toDateString() };
    const stored = UserStorage.getItem<{ count: number; date: string }>(`refreshData_${user?.id}`);
    return stored || defaultData;
  };

  const updateRefreshCount = (): boolean => {
    const today = new Date().toDateString();
    const refreshData = getRefreshData();
    
    if (refreshData.date !== today) {
      const newData = { count: 1, date: today };
      UserStorage.setItem(`refreshData_${user?.id}`, newData);
      setRefreshCount(1);
      return true;
    } else if (refreshData.count < SUGGESTIONS_REFRESH_LIMIT) {
      const newData = { count: refreshData.count + 1, date: today };
      UserStorage.setItem(`refreshData_${user?.id}`, newData);
      setRefreshCount(refreshData.count + 1);
      return true;
    }
    return false;
  };

  // ============= Suggestion Handling =============
  const loadDailySuggestions = useCallback(async () => {
    if (!user) return;

    // Check cache
    const stored = UserStorage.getItem<StoredSuggestions>(`dailySuggestions_${user?.id}`);
    if (stored && isDateToday(stored.timestamp)) {
      setDailySuggestions(stored.suggestions);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const [tasks, goals, habits, journals] = await Promise.all([
        taskService(supabase).getUserTasks(user.id),
        goalService(supabase).getUserGoals(user.id),
        habitService(supabase).getUserHabits(user.id),
        journalService(supabase).getUserJournalEntries(user.id),
      ]);

      const response = await fetch('/api/ai-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'recommendations',
          context: {
            tasks: tasks.data || [],
            goals: goals.data || [],
            habits: habits.data || [],
            journals: journals.data || [],
            completionRate: calculateCompletionRate(tasks.data || []),
          },
        }),
      });

      const data = await response.json();

      if (data?.suggestions) {
        const mappedSuggestions: AISuggestion[] = data.suggestions.map((suggestion: AISuggestion) => ({
          id: generateUUID(),
          type: suggestion.type,
          title: suggestion.title,
          description: suggestion.description || "No description provided",
          priority: suggestion.priority || "medium",
          reason: "AI generated suggestion based on your current activities",
          dueDate: suggestion.dueDate,
          completed: false,
          frequency: suggestion.frequency,
          reminderTime: suggestion.reminderTime,
          targetCount: suggestion.targetCount,
          targetDate: suggestion.targetDate,
          progress: suggestion.progress || 0,
          goalType: suggestion.goalType,
          status: suggestion.status || "pending",
          subSuggestions: [],
          relatedGoalId: suggestion.relatedGoalId,
          relatedHabitId: suggestion.relatedHabitId,
        }));
        
        setDailySuggestions(mappedSuggestions);
        UserStorage.setItem(`dailySuggestions_${user?.id}`, {
          suggestions: mappedSuggestions,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error loading daily suggestions:", error);
      setDailySuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [user, supabase]);

  const handleSuggestionsAccepted = useCallback(async (suggestions: AISuggestion[]) => {
    if (!user?.id) {
      alert("Please log in to accept suggestions.");
      return;
    }

    for (const suggestion of suggestions) {
      try {
        switch (suggestion.type) {
          case "task":
            let taskStatus: "pending" | "in_progress" | "completed" | "cancelled" = "pending";
            switch (suggestion.status) {
              case "in-progress":
                taskStatus = "in_progress";
                break;
              case "completed":
                taskStatus = "completed";
                break;
              case "cancelled":
                taskStatus = "cancelled";
                break;
              case "archived":
              case "active":
              case "paused":
              default:
                taskStatus = "pending";
            }
            await taskService(supabase).createTask({
              user_id: user.id,
              title: suggestion.title,
              description: suggestion.description,
              priority: suggestion.priority,
              due_date: suggestion.dueDate || undefined,
              is_completed: false,
              status: taskStatus,
              goal_id: suggestion.relatedGoalId || null
            });
            break;
            
          case "habit":
            await habitService(supabase).createHabit({
              user_id: user.id,
              title: suggestion.title,
              description: suggestion.description || '',
              frequency: suggestion.frequency || "daily",
              reminder_time: suggestion.reminderTime || undefined,
              target_count: suggestion.targetCount || 1,
              is_ai_suggested: true,
            });
            break;
            
          case "goal":
            const goalStatus = 
              suggestion.status === "completed" ? "completed" :
              suggestion.status === "archived" ? "paused" :
              suggestion.status === "cancelled" ? "cancelled" :
              "active";
              
            const goalType = suggestion.goalType === "short-term" ? "short-term" : "long-term";

            await goalService(supabase).createGoal({
              user_id: user.id,
              title: suggestion.title,
              description: suggestion.description || '',
              deadline: suggestion.targetDate || undefined,
              progress: suggestion.progress || 0,
              status: goalStatus,
              goal_type: goalType,
              priority: suggestion.priority || "medium",
            });
            break;
            
          default:
            console.warn("Unknown suggestion type:", suggestion.type);
        }

        // Handle sub-suggestions recursively
        if (suggestion.subSuggestions && suggestion.subSuggestions.length > 0) {
          await handleSuggestionsAccepted(suggestion.subSuggestions);
        }
      } catch (error) {
        console.error(`Error accepting ${suggestion.type} '${suggestion.title}':`, error);
        alert(`Failed to accept ${suggestion.type}: ${suggestion.title}. Please try again.`);
      }
    }

    // Update decision status
    setDailySuggestions(prev => prev.map(s =>
      suggestions.some(acceptedS => acceptedS.id === s.id)
        ? { ...s, decisionStatus: 'accepted' }
        : s
    ));
    
    // Save updated suggestions
    const updatedSuggestions = dailySuggestions.map(s =>
      suggestions.some(acceptedS => acceptedS.id === s.id)
        ? { ...s, decisionStatus: 'accepted' }
        : s
    );
    UserStorage.setItem(`dailySuggestions_${user?.id}`, {
      suggestions: updatedSuggestions,
      timestamp: Date.now(),
    });

    loadDashboardData();
  }, [user, supabase, dailySuggestions, loadDashboardData]);

  const handleSuggestionRejected = useCallback((suggestionId: string) => {
    // Update decision status
    setDailySuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, decisionStatus: 'rejected' } : s
    ));
    
    // Save updated suggestions
    const updatedSuggestions = dailySuggestions.map(s =>
      s.id === suggestionId ? { ...s, decisionStatus: 'rejected' } : s
    );
    UserStorage.setItem(`dailySuggestions_${user?.id}`, {
      suggestions: updatedSuggestions,
      timestamp: Date.now(),
    });

    // Mark as processed
    setProcessedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.add(suggestionId);
      return newSet;
    });
  }, [dailySuggestions]);

  // ============= AI Content Loading =============
  const loadDailyMotivation = useCallback(async () => {
    if (!user) return;

    // Check cache
    const stored = UserStorage.getItem<StoredMotivation>(`dailyMotivation_${user?.id}`);
    if (stored && isDateToday(stored.timestamp)) {
      setDailyMotivation(stored.content);
      return;
    }

    setIsLoadingMotivation(true);
    try {
      const [tasksResult, goalsResult] = await Promise.all([
        taskService(supabase).getUserTasks(user.id),
        goalService(supabase).getUserGoals(user.id),
      ]);

      const recentAchievements = tasksResult.data
        ?.filter((task: Task) => task.is_completed && task.completed_at)
        .sort((a: Task, b: Task) => 
          new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
        )
        .slice(0, 5);

      const response = await fetch('/api/ai-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'daily-motivation',
          userProfile: { user_name: user.user_metadata?.full_name || user.email },
          recentAchievements: recentAchievements?.map((task: Task) => ({
            id: task.task_id,
            title: task.title,
            type: 'task',
            completed_at: task.completed_at,
          })) || [],
          recentGoals: goalsResult.data?.slice(0, 5) || [],
          recentTasks: tasksResult.data?.slice(0, 10) || [],
        }),
      });

      const data = await response.json();
      
      if (data?.content) {
        setDailyMotivation(data.content);
        UserStorage.setItem(`dailyMotivation_${user?.id}`, {
          content: data.content,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error loading daily motivation:", error);
      setDailyMotivation("Keep pushing forward! Every step counts towards your goals. 💪");
    } finally {
      setIsLoadingMotivation(false);
    }
  }, [user, supabase]);

  const loadMoodInsights = useCallback(async () => {
    if (!user) return;

    // Check cache
    const stored = UserStorage.getItem<StoredMotivation>(`moodInsights_${user?.id}`);
    if (stored && isDateToday(stored.timestamp)) {
      setMoodInsight(stored.content);
      return;
    }

    setIsLoadingMoodInsight(true);
    try {
      const { data: journalEntries } = await journalService(supabase).getUserJournalEntries(user.id);
      
      if (journalEntries && journalEntries.length > 0) {
        const response = await fetch('/api/ai-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceType: 'mood-analysis',
            entries: journalEntries.slice(0, 10).map((entry: JournalEntry) => ({
              created_at: entry.created_at,
              mood: entry.mood,
              content: entry.content,
            })),
          }),
        });

        const data = await response.json();
        
        if (data?.content) {
          setMoodInsight(data.content);
          UserStorage.setItem(`moodInsights_${user?.id}`, {
            content: data.content,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error("Error loading mood insights:", error);
    } finally {
      setIsLoadingMoodInsight(false);
    }
  }, [user, supabase]);

  const calculateCompletionRate = (tasks: Task[]) => {
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter((task) => task.is_completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const handleRefreshSuggestions = useCallback(async () => {
    if (!updateRefreshCount()) {
      alert("You can only refresh suggestions 3 times a day.");
      return;
    }
    UserStorage.removeItem(`dailySuggestions_${user?.id}`);
    setProcessedSuggestions(new Set());
    await loadDailySuggestions();
  }, [loadDailySuggestions]);

  const handleTaskToggle = useCallback(async (taskId: string) => {
    if (!user) return;
    try {
      const task = todayTasks.find(t => t.task_id === taskId);
      if (task) {
        await taskService(supabase).updateTask(taskId, { is_completed: !task.is_completed });
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  }, [user, supabase, todayTasks, loadDashboardData]);

  // ============= Render Functions =============
  const renderStatCard = (config: typeof STAT_CARDS_CONFIG[0], index: number) => (
    <Link
      key={index}
      href={config.href}
      className="group bg-white dark:bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700/50"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{config.title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1 group-hover:scale-105 transition-transform duration-300">
            {config.getValue(todayTasks, stats)}
          </p>
        </div>
        <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
          <config.icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>
      </div>
              </Link>
  );

  const renderTaskItem = (task: Task, showDueDate: boolean = false) => (
    <div
      key={task.task_id}
      className={`flex items-center justify-between p-4 ${
        task.is_completed 
          ? 'bg-gray-100 dark:bg-gray-700/50' 
          : 'bg-white dark:bg-gray-800/50'
      } rounded-lg shadow-sm mb-2`}
    >
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={() => handleTaskToggle(task.task_id)}
          className="form-checkbox h-5 w-5 text-purple-600 dark:text-purple-400 focus:ring-purple-500"
        />
        <div>
          <h4
            className={`font-medium ${
              task.is_completed 
                ? 'line-through text-gray-500 dark:text-gray-400' 
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.title}
          </h4>
          {showDueDate && task.due_date && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      <span
        className={`text-sm font-medium ${
          PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium
        }`}
      >
        {task.priority}
      </span>
    </div>
  );

  const renderSuggestionItem = (suggestion: AISuggestion) => {
    const suggestionTypeConfig: Record<AISuggestion['type'], { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
      task: { icon: CheckCircle, color: "text-blue-600 dark:text-blue-400", bgColor: "from-blue-500 to-cyan-500", label: "TASK" },
      habit: { icon: Zap, color: "text-amber-600 dark:text-amber-400", bgColor: "from-amber-500 to-orange-500", label: "HABIT" },
      goal: { icon: Target, color: "text-purple-600 dark:text-purple-400", bgColor: "from-purple-500 to-pink-500", label: "GOAL" },
      journal: { icon: Book, color: "text-rose-600 dark:text-rose-400", bgColor: "from-rose-500 to-pink-500", label: "JOURNAL" },
    };

    const config = suggestionTypeConfig[suggestion.type];
    const Icon = config.icon;

    const tagsArray: string[] = Array.isArray(suggestion.tags) ? suggestion.tags : (typeof suggestion.tags === 'string' && suggestion.tags ? suggestion.tags.split(',').map((tag: string) => tag.trim()) : []);

    return (
      <div key={suggestion.id} className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/50 rounded-xl p-5 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-600/50">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex-1">
            {/* Header Section */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 bg-gradient-to-br ${config.bgColor} rounded-lg shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-sm font-bold ${config.color} uppercase tracking-wider`}>
                {config.label}
              </span>
              {suggestion.priority && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  suggestion.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {suggestion.priority} priority
                </span>
              )}
            </div>
            
            {/* Title and Description */}
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{suggestion.title}</h3>
            {suggestion.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{suggestion.description}</p>
            )}
            
            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {suggestion.dueDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {new Date(suggestion.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {suggestion.frequency && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <RefreshCw className="w-4 h-4" />
                  <span>Repeat: {suggestion.frequency}</span>
                </div>
              )}
              {suggestion.targetCount && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Target className="w-4 h-4" />
                  <span>Target: {suggestion.targetCount} times</span>
                </div>
              )}
              {suggestion.reminderTime && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Reminder: {suggestion.reminderTime}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {suggestion.type === 'journal' && tagsArray && tagsArray.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tagsArray.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Related Items */}
            {suggestion.relatedGoalId && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Linked to goal: {suggestion.relatedGoalId}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row lg:flex-col gap-2 justify-end min-w-[120px]">
            {suggestion.decisionStatus === 'accepted' ? (
              <span className="px-4 py-2 text-sm bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 font-bold rounded-lg flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Accepted
              </span>
            ) : suggestion.decisionStatus === 'rejected' ? (
              <span className="px-4 py-2 text-sm bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-red-700 dark:text-red-400 font-bold rounded-lg flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
              </span>
            ) : (
              <>
                <button
                  onClick={() => handleSuggestionsAccepted([suggestion])}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => handleSuggestionRejected(suggestion.id)}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGoalItem = (goal: Goal) => (
    <div
      key={goal.goal_id}
      className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
    >
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">
          {goal.title}
        </p>
        <span className={`text-sm font-medium ${goal.status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {goal.status}
        </span>
      </div>
      <div className="p-2.5 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
        <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      </div>
    </div>
  );

  // ============= Main Render =============
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {greeting}, {user?.user_metadata?.full_name || "there"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Here&apos;s your overview for{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        {/* Daily Motivation - Improved UX */}
      {dailyMotivation && (
        <div className="mt-6 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl border border-purple-200/30 dark:border-purple-800/30 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Daily Motivation
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Personalized for you</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {isLoadingMotivation ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                <span className="text-gray-600 dark:text-gray-400">Generating your motivation...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main message with better typography */}
                <div className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">
                  {cleanAIResponse(dailyMotivation)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {STAT_CARDS_CONFIG.map(renderStatCard)}
      </div>
      {/* Mood Insights Section */}
      {journals.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-800 dark:to-gray-700/50 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-pink-200/30 dark:border-purple-700/30">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg shadow-md">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Mood Insights
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Based on your recent journals</p>
                </div>
              </div>
              <Link
                href="/dashboard/journals"
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-semibold transition-colors duration-200"
              >
                View journal →
              </Link>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {isLoadingMoodInsight ? (
              renderLoadingSpinner("small")
            ) : moodInsight ? (
              <div className="space-y-6">
                {/* Mood Distribution - Visual representation */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-3xl mb-2">😊</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">29%</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Positive</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">😐</div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">71%</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Neutral</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">📈</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">+12%</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Trend</p>
                  </div>
                </div>
                
                {/* Key Insights - Bullet points */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <span className="text-lg">✨</span> Key Patterns
                  </h4>
                  
                  <div className="grid gap-3">
                    {/* Positive triggers */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 flex items-start gap-3">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Achievement Boosts</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Completing goals increases positive emotions</p>
                      </div>
                    </div>
                    
                    {/* Social connections */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-start gap-3">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">👥</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Social Energy</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Reconnecting with friends brings joy</p>
                      </div>
                    </div>
                    
                    {/* Areas to improve */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex items-start gap-3">
                      <span className="text-amber-600 dark:text-amber-400 mt-0.5">💡</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Awareness Opportunity</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Try recognizing emotions in positive moments</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actionable suggestions */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <span>🎯</span> Quick Actions
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400">•</span>
                      <span>Check in with emotions 3x daily</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400">•</span>
                      <span>Journal after positive experiences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400">•</span>
                      <span>Use emotion words in your entries</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Keep journaling to receive insights</p>
                <Link href="/dashboard/journal" className="mt-3 inline-block text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 font-medium">
                  Write an entry →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Today's Tasks */}
               <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-blue-200/30 dark:border-indigo-700/30">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-md">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Today&apos;s Tasks
              </h2>
            </div>
          <Link
              href="/dashboard/tasks"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold transition-colors duration-200"
          >
              View all →
            </Link>
              </div>

          {todayTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No tasks scheduled for today</p>
              <Link href="/dashboard/tasks" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                Add a task →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map(task => renderTaskItem(task))}
            </div>
          )}
        </div>
        {/* Upcoming Deadlines */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-orange-200/30 dark:border-amber-700/30">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg shadow-md">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Upcoming Deadlines
              </h2>
            </div>
          <Link
              href="/dashboard/calendar"
              className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 text-sm font-semibold transition-colors duration-200"
          >
              View calendar →
            </Link>
              </div>
          
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No upcoming deadlines</p>
              <Link href="/dashboard/calendar" className="mt-3 inline-block text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium">
                Plan ahead →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map(task => renderTaskItem(task, true))}
            </div>
          )}
        </div>
        {/* Habit Streaks */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-emerald-200/30 dark:border-teal-700/30">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Active Habits
              </h2>
            </div>
          <Link
              href="/dashboard/habits"
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-semibold transition-colors duration-200"
          >
              View all →
            </Link>
              </div>
          
          {habits.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No active habits</p>
              <Link href="/dashboard/habits" className="mt-3 inline-block text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium">
                Create a habit →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {habits.slice(0, HABITS_DISPLAY_LIMIT).map((habit, index) => (
                <div
                  key={habit.habit_id || index}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
                >
            <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {habit.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {habit.frequency}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="text-lg">🔥</span> {habit.streak || 0} day streak
                      </span>
            </div>
                  </div>
                  <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-lg">
                    <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Active Goals */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-purple-200/30 dark:border-pink-700/30">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Active Goals
              </h2>
            </div>
            <Link
              href="/dashboard/goals"
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-semibold transition-colors duration-200"
            >
              View all →
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No active goals</p>
              <Link href="/dashboard/goals" className="mt-3 inline-block text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium">
                Set a goal →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.filter(goal => goal.status === 'active').slice(0, HABITS_DISPLAY_LIMIT).map((goal, index) => (
                renderGoalItem(goal)
              ))}
            </div>
          )}
        </div>
        {/* Personalized AI Suggestions */}
        <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-800 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-purple-200/30 dark:border-purple-700/30">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-lg shadow-md animate-pulse">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent">
                Personalized AI Suggestions
              </h2>
            </div>
            <button
              onClick={handleRefreshSuggestions}
              disabled={isLoadingSuggestions || refreshCount >= SUGGESTIONS_REFRESH_LIMIT}
              className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 
               dark:from-purple-900/50 dark:to-pink-900/50 dark:hover:from-purple-800/50 dark:hover:to-pink-800/50 
               text-purple-700 dark:text-purple-300 text-sm font-semibold flex items-center gap-2 
               rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed 
               hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingSuggestions ? "animate-spin" : ""}`}
              />
              {isLoadingSuggestions ? "Refreshing..." : "Refresh"}
              {refreshCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-purple-200 dark:bg-purple-800/50 rounded-full text-xs">
                  {refreshCount}/{SUGGESTIONS_REFRESH_LIMIT}
                </span>
              )}
            </button>
          </div>

          {isLoadingSuggestions ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 dark:border-purple-800 dark:border-t-purple-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Generating personalized suggestions...</p>
            </div>
          ) : unprocessedSuggestions.length > 0 ? (
            <div className="space-y-4">
              {unprocessedSuggestions.map(renderSuggestionItem)}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-purple-500 dark:text-purple-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">
                {dailySuggestions.length > 0 && dailySuggestions.every(s => processedSuggestions.has(s.id))
                  ? "You've reviewed all suggestions for today!"
                  : "No suggestions available"}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                {dailySuggestions.length > 0 && dailySuggestions.every(s => processedSuggestions.has(s.id))
                  ? "Come back tomorrow for new personalized insights."
                  : "Try refreshing or check back tomorrow."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-blue-600/20 animate-pulse"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: "/dashboard/tasks", icon: CheckCircle, label: "New Task", gradient: "from-blue-500 to-cyan-500" },
              { href: "/dashboard/goals", icon: Target, label: "Set Goal", gradient: "from-purple-500 to-pink-500" },
              { href: "/dashboard/journal", icon: Book, label: "Journal Entry", gradient: "from-rose-500 to-pink-500" },
              { href: "/dashboard/analysis", icon: TrendingUp, label: "View Stats", gradient: "from-emerald-500 to-teal-500" },
            ].map(({ href, icon: Icon, label, gradient }) => (
              <Link
                key={href}
                href={href}
                className="group bg-white/10 backdrop-blur-md rounded-xl p-5 text-center hover:bg-white/20 
                         transition-all duration-300 border border-white/20 hover:border-white/40 
                         hover:scale-105 hover:shadow-xl"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl mx-auto mb-3 
                               flex items-center justify-center shadow-lg group-hover:scale-110 
                               transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-white/90 group-hover:text-white">
                  {label}
                </span>
          </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}