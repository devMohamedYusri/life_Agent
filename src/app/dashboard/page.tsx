// app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "../lib/stores/authStore";
import { userService } from "../lib/database/users";
import { taskService } from "../lib/database/tasks";
import { habitService, Habit } from "../lib/database/habits";
import { goalService, Goal } from "../lib/database/goals";
import { NotificationManager } from "../lib/database/notifications";
import {
  CheckCircle,
  Target,
  TrendingUp,
  Calendar,
  Bell,
  Zap,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@appcomponents/ui/input";
import { Button } from "../components/ui/button";
import { SmartInputModal } from "../components/ai/SmartInputModal";
import { AISuggestion } from "../types/ai-agent";
import { aiService } from "../lib/ai";
import { v4 as generateUUID } from "uuid";

interface Task {
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

interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalHabits: number;
}

// Add this interface for stored suggestions
interface StoredSuggestions {
  suggestions: AISuggestion[];
  timestamp: number;
}

export default function DashboardHome() {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [userPrompt, setUserPrompt] = useState("");
  const [showAiSuggestionsModal, setShowAiSuggestionsModal] = useState(false);
  const [dailySuggestions, setDailySuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [processedSuggestions, setProcessedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadDashboardData();
      setupNotifications();
    }
  }, [user]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load stats
      const { data: userStats } = await userService.getUserStats(user!.id);
      setStats(userStats as DashboardStats);

      // Load today's tasks
      const { data: tasks } = await taskService.getUserTasks(user!.id);
      const today = new Date().toDateString();
      const todaysTasks =
        tasks?.filter((task: Task) => {
          return (
            task.due_date && new Date(task.due_date).toDateString() === today
          );
        }) || [];

      setTodayTasks(todaysTasks);

      // Load habits
      const { data: userHabits } = await habitService.getUserHabits(user!.id);
      setHabits(userHabits || []);

      // Load goals
      const { data: userGoals } = await goalService.getUserGoals(user!.id);
      setGoals(userGoals || []);

      // Load upcoming deadlines
      const upcoming =
        tasks
          ?.filter((task: Task) => {
            if (!task.due_date || task.completed) return false;
            const dueDate = new Date(task.due_date);
            const daysUntilDue =
              (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return daysUntilDue > 0 && daysUntilDue <= 7;
          })
          .sort(
            (a: Task, b: Task) =>
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          ) || [];
      setUpcomingDeadlines(upcoming.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const setupNotifications = async () => {
    const settings = localStorage.getItem("notificationSettings");
    if (settings) {
      const { browserNotifications } = JSON.parse(settings);
      if (browserNotifications) {
        await NotificationManager.checkAndShowNotifications(user!.id);
      }
    }
  };

  const aiContext = {
    recentTasks: todayTasks.map((task) => ({
      id: task.task_id || task.id || "",
      title: task.title,
      completed: task.completed,
      dueDate: task.due_date
        ? new Date(task.due_date).toDateString()
        : undefined,
    })),
    recentHabits: habits.map((habit) => ({
      id: habit.habit_id,
      name: habit.title,
      streak: 0,
      frequency: habit.frequency || "daily",
    })),
    recentGoals: goals.map((goal) => ({
      id: goal.goal_id,
      title: goal.title,
      progress: goal.progress || 0,
      targetDate: goal.deadline
        ? new Date(goal.deadline).toDateString()
        : undefined,
    })),
  };

  const handleUserPromptSubmit = () => {
    setShowAiSuggestionsModal(true);
  };

  const handleSuggestionsAccepted = async (suggestions: AISuggestion[]) => {
    if (!user || !user.id) {
      console.error("User not authenticated.");
      alert("Please log in to accept suggestions.");
      return;
    }

    // Mark suggestions as processed
    const newProcessed = new Set(processedSuggestions);
    suggestions.forEach(s => newProcessed.add(s.id));
    setProcessedSuggestions(newProcessed);

    for (const suggestion of suggestions) {
      try {
        switch (suggestion.type) {
          case "task":
            await taskService.createTask({
              user_id: user.id,
              title: suggestion.title,
              description: suggestion.description,
              priority: suggestion.priority,
              due_date: suggestion.dueDate || null, // Ensure string or null
              is_completed: suggestion.completed || false,
              status:
                suggestion.status === "in-progress"
                  ? "in_progress"
                  : suggestion.status === "archived"
                    ? "pending"
                    : suggestion.status || "pending",
            });
            console.log("Task accepted and saved:", suggestion.title);
            break;
          case "habit":
            await habitService.createHabit({
              user_id: user.id,
              title: suggestion.title,
              description: suggestion.description || null,
              frequency: suggestion.frequency || "daily",
              reminder_time: suggestion.reminderTime || null,
              target_count: suggestion.targetCount || 0,
              is_ai_suggested: true,
            });
            console.log("Habit accepted and saved:", suggestion.title);
            break;
          case "goal":
            // Map AI suggestion status to valid goal statuses
            let goalStatus: "active" | "completed" | "paused" | "cancelled" =
              "active";
            if (suggestion.status === "completed") {
              goalStatus = "completed";
            } else if (suggestion.status === "archived") {
              goalStatus = "paused";
            } else if (
              suggestion.status === "pending" ||
              suggestion.status === "in-progress"
            ) {
              goalStatus = "active";
            }

            // Map AI suggestion goal type to valid goal types
            let goalType: "long-term" | "short-term" = "long-term";
            if (suggestion.goalType === "short-term") {
              goalType = "short-term";
            } else if (suggestion.goalType === "long-term") {
              goalType = "long-term";
            }

            await goalService.createGoal({
              user_id: user.id,
              title: suggestion.title,
              description: suggestion.description || null,
              deadline: suggestion.targetDate || null,
              progress: suggestion.progress || 0,
              status: goalStatus,
              goal_type: goalType,
            });
            console.log("Goal accepted and saved:", suggestion.title);
            break;
          default:
            console.warn("Unknown suggestion type:", suggestion.type);
        }

        // If there are sub-suggestions, recursively accept them
        if (suggestion.subSuggestions && suggestion.subSuggestions.length > 0) {
          await handleSuggestionsAccepted(suggestion.subSuggestions);
        }
      } catch (error) {
        console.error(
          `Error accepting ${suggestion.type} '${suggestion.title}':`,
          error
        );
        alert(
          `Failed to accept ${suggestion.type}: ${suggestion.title}. Please try again.`
        );
      }
    }

    // Update the decisionStatus for accepted suggestions
    setDailySuggestions(prevSuggestions =>
      prevSuggestions.map(s =>
        suggestions.some(acceptedS => acceptedS.id === s.id)
          ? { ...s, decisionStatus: 'accepted' }
          : s
      )
    );
    saveSuggestions(dailySuggestions.map(s =>
      suggestions.some(acceptedS => acceptedS.id === s.id)
        ? { ...s, decisionStatus: 'accepted' }
        : s
    ));

    loadDashboardData(); // Reload data after changes
  };

  // Add a handleSuggestionRejected function
  const handleSuggestionRejected = (suggestionId: string) => {
    // Update the decisionStatus for the rejected suggestion
    setDailySuggestions(prevSuggestions =>
      prevSuggestions.map(s =>
        s.id === suggestionId ? { ...s, decisionStatus: 'rejected' } : s
      )
    );
    saveSuggestions(dailySuggestions.map(s =>
      s.id === suggestionId ? { ...s, decisionStatus: 'rejected' } : s
    ));

    const newProcessed = new Set(processedSuggestions);
    console.log("here is the suggestions ",    localStorage.getItem('dailySuggestions') )
    newProcessed.add(suggestionId);
    setProcessedSuggestions(newProcessed);
  };

  // Function to check if suggestions are from today
  const isSuggestionsFromToday = (timestamp: number): boolean => {
    const today = new Date();
    const suggestionDate = new Date(timestamp);
    return (
      suggestionDate.getDate() === today.getDate() &&
      suggestionDate.getMonth() === today.getMonth() &&
      suggestionDate.getFullYear() === today.getFullYear()
    );
  };

  // Function to load suggestions from storage
  const loadStoredSuggestions = (): StoredSuggestions | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("dailySuggestions");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing stored suggestions:", e);
      return null;
    }
  };

  // Function to save suggestions to storage
  const saveSuggestions = (suggestions: AISuggestion[]) => {
    if (typeof window === "undefined") return;
    const storedData: StoredSuggestions = {
      suggestions,
      timestamp: Date.now(),
    };
    // Add after line 304
    console.log("AI Service Response:", storedData);
    localStorage.setItem("dailySuggestions", JSON.stringify(storedData));
  };

  const loadDailySuggestions = async () => {
    if (!user) return;

    // Check if we have stored suggestions from today
    const stored = loadStoredSuggestions();
    if (stored && isSuggestionsFromToday(stored.timestamp)) {
      setDailySuggestions(stored.suggestions);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const [tasks, goals, habits] = await Promise.all([
        taskService.getUserTasks(user.id),
        goalService.getUserGoals(user.id),
        habitService.getUserHabits(user.id),
      ]);

      console.log("Fetched data:", {
        tasksCount: tasks.data?.length || 0,
        goalsCount: goals.data?.length || 0,
        habitsCount: habits.data?.length || 0,
      });

      const response = await aiService.generateTaskRecommendations({
        tasks: tasks.data || [],
        goals: goals.data || [],
        completionRate: calculateCompletionRate(tasks.data || []),
      });

      console.log("AI Service Response:", response);

      if (response && (response.suggestions || response.content)) {
        let suggestionsToProcess = response.suggestions || [];

        // If suggestions is empty but we have content, try to parse it
        if (suggestionsToProcess.length === 0 && response.content) {
          try {
            const parsed = JSON.parse(response.content);
            if (parsed.suggestions) {
              suggestionsToProcess = parsed.suggestions;
            }
          } catch (e) {
            console.log("Content is not JSON parseable",e);
          }
        }

        if (suggestionsToProcess.length > 0) {
          const mappedSuggestions: AISuggestion[] = suggestionsToProcess.map(
            (suggestion: AISuggestion) => ({
              id: generateUUID(),
              type: suggestion.type as "task" | "habit" | "goal",
              title: suggestion.title,
              description: suggestion.description || "No description provided",
              priority: (suggestion.priority || "medium") as
                | "high"
                | "medium"
                | "low",
              reason:
                "AI generated suggestion based on your current activities",
              dueDate: suggestion.dueDate,
              completed: false,
              frequency: suggestion.frequency as
                | "daily"
                | "weekly"
                | "monthly"
                | undefined,
              reminderTime: undefined,
              targetCount: suggestion.targetCount,
              targetDate: undefined,
              progress: 0,
              goalType: undefined,
              status: "pending",
              subSuggestions: [],
            })
          );
          console.log("Mapped suggestions:", mappedSuggestions);
          setDailySuggestions(mappedSuggestions);
          saveSuggestions(mappedSuggestions);
        } else {
          console.log("No suggestions in response");
          setDailySuggestions([]);
          saveSuggestions([]);
        }
      } else {
        console.log("Empty response from AI service");
        setDailySuggestions([]);
        saveSuggestions([]);
      }
    } catch (error) {
      console.error("Error loading daily suggestions:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      setDailySuggestions([]);
      saveSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const calculateCompletionRate = (tasks: Task[]) => {
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter((task) => task.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getRefreshData = (): { count: number; date: string } => {
    const stored = localStorage.getItem('refreshData');
    if (!stored) return { count: 0, date: new Date().toDateString() };
    try {
      return JSON.parse(stored);
    } catch {
      return { count: 0, date: new Date().toDateString() };
    }
  };

  const updateRefreshCount = () => {
    const today = new Date().toDateString();
    const refreshData = getRefreshData();
    
    if (refreshData.date !== today) {
      // Reset count for new day
      const newData = { count: 1, date: today };
      localStorage.setItem('refreshData', JSON.stringify(newData));
      setRefreshCount(1);
      return true;
    } else if (refreshData.count < 3) {
      // Increment count
      const newData = { count: refreshData.count + 1, date: today };
      localStorage.setItem('refreshData', JSON.stringify(newData));
      setRefreshCount(refreshData.count + 1);
      return true;
    }
    return false; // Limit reached
  };

  useEffect(() => {
    if (user) {
      loadDailySuggestions();
    }
  }, [user]);

  // Load refresh count on component mount
  useEffect(() => {
    const refreshData = getRefreshData();
    const today = new Date().toDateString();
    
    if (refreshData.date === today) {
      setRefreshCount(refreshData.count);
    } else {
      setRefreshCount(0);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Ask SelfPilot anything..."
            value={userPrompt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserPrompt(e.target.value)
            }
            className="flex-grow max-w-sm"
          />
          <Button
            onClick={handleUserPromptSubmit}
            disabled={!userPrompt.trim()}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Ask
          </Button>
        </div>
      </div>

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
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link
          href="/dashboard/tasks"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tasks Today
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayTasks.length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
        </Link>

        <Link
          href="/dashboard/goals"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Active Goals
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.activeGoals || 0}
              </p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </Link>

        <Link
          href="/dashboard/habits"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Habits Tracked
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalHabits || 0}
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </Link>

        <Link
          href="/dashboard/analysis"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completion Rate
              </p>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalTasks && stats?.completedTasks
                  ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                  : 0}
                %
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Today&apos;s Tasks
            </h2>
            <Link
              href="/dashboard/tasks"
              className="text-purple-600 hover:text-purple-700 text-sm"
            >
              View all →
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No tasks scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task, index) => (
                <div
                  key={task.task_id || task.id || index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    className="w-5 h-5 text-purple-600 rounded"
                    readOnly
                  />
                  <div className="flex-1">
                    <p
                      className={`font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-900 dark:text-white"}`}
                    >
                      {task.title}
                    </p>
                    {task.priority && (
                      <span
                        className={`text-xs ${
                          task.priority === "high"
                            ? "text-red-600"
                            : task.priority === "medium"
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {task.priority} priority
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upcoming Deadlines
            </h2>
            <Link
              href="/dashboard/calendar"
              className="text-purple-600 hover:text-purple-700 text-sm"
            >
              View calendar →
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No upcoming deadlines
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((task, index) => {
                const daysUntil = Math.ceil(
                  (new Date(task.due_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={task.task_id || task.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Due in {daysUntil} {daysUntil === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily AI Suggestions */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Daily AI Suggestions
            </h2>
            <button
              onClick={async () => {
                if (!updateRefreshCount()) {
                  alert("You can only refresh suggestions 3 times a day.");
                  return;
                }
                // Clear the cache first to force a fresh fetch
                localStorage.removeItem("dailySuggestions");
                setProcessedSuggestions(new Set()); // Clear processed suggestions on refresh
                await loadDailySuggestions();
              }}
              disabled={isLoadingSuggestions || refreshCount >= 3}
              className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-300 text-sm flex items-center gap-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingSuggestions ? "animate-spin" : ""}`}
              />
              {isLoadingSuggestions ? "Refreshing..." : "Refresh"}
              {refreshCount > 0 && ` (${refreshCount}/3)`}
            </button>
          </div>

          {isLoadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : dailySuggestions.filter(s => !processedSuggestions.has(s.id)).length > 0 ? (
            <div className="space-y-4">
              {dailySuggestions.filter(s => !processedSuggestions.has(s.id)).map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                     {/* Type indicator */}
              <div className="flex items-center gap-2 mb-2">
                {suggestion.type === 'task' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      TASK
                    </span>
                  </>
                )}
                {suggestion.type === 'habit' && (
                  <>
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                      HABIT
                    </span>
                  </>
                )}
                {suggestion.type === 'goal' && (
                  <>
                    <Target className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      GOAL
                    </span>
                  </>
                )}
              </div>
              
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {suggestion.title}
                      </h3>
                      {suggestion.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {suggestion.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {suggestion.priority && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {suggestion.priority}
                          </span>
                        )}
                        {suggestion.dueDate && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Due:{" "}
                            {new Date(suggestion.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {suggestion.frequency && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {suggestion.frequency}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {suggestion.decisionStatus === 'accepted' ? (
                        <span className="px-3 py-1 text-sm text-green-600 dark:text-green-400 font-semibold">Accepted</span>
                      ) : suggestion.decisionStatus === 'rejected' ? (
                        <span className="px-3 py-1 text-sm text-red-600 dark:text-red-400 font-semibold">Rejected</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSuggestionsAccepted([suggestion])}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleSuggestionRejected(suggestion.id)}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (dailySuggestions.length > 0 && dailySuggestions.every(s => processedSuggestions.has(s.id))) ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              You&apos;ve reviewed all suggestions for today. Come back tomorrow for new insights!
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No suggestions available. Try refreshing or check back tomorrow.
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/tasks"
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-center hover:bg-white/20 transition-colors border border-white/20"
          >
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-white" />
            <span className="text-sm font-medium text-white">New Task</span>
          </Link>
          <Link
            href="/dashboard/goals"
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-center hover:bg-white/20 transition-colors border border-white/20"
          >
            <Target className="w-8 h-8 mx-auto mb-2 text-white" />
            <span className="text-sm font-medium text-white">Set Goal</span>
          </Link>
          <Link
            href="/dashboard/journal"
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-center hover:bg-white/20 transition-colors border border-white/20"
          >
            <Bell className="w-8 h-8 mx-auto mb-2 text-white" />
            <span className="text-sm font-medium text-white">
              Journal Entry
            </span>
          </Link>
          <Link
            href="/dashboard/analysis"
            className="bg-white/10 backdrop-blur rounded-lg p-4 text-center hover:bg-white/20 transition-colors border border-white/20"
          >
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-white" />
            <span className="text-sm font-medium text-white">View Stats</span>
          </Link>
        </div>
      </div>

      <SmartInputModal
        isOpen={showAiSuggestionsModal}
        onClose={() => setShowAiSuggestionsModal(false)}
        context={aiContext}
        userPrompt={userPrompt}
        onSuggestionsAccepted={handleSuggestionsAccepted}
      />
    </div>
  );
}
