"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../lib/stores/authStore";
import { habitService } from "../../lib/database/habits";
import { categoryService } from "../../lib/database/categories";
import {
  Edit2,
  Trash2,
  Calendar,
  Target,
  TrendingUp,
  Award,
  BarChart,
  CheckCircle,
  RefreshCw,
  Bell,
  MoreVertical,
} from "lucide-react";

interface Habit {
  habit_id: string;
  title: string;
  description: string;
  reminder_time: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_count: number;
  category?: {
    category_id: string;
    name: string;
    color: string;
    icon: string;
  };
  created_at?: string;
}

interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  lastCompleted?: string;
  last7Days: {
    date: string;
    completed: boolean;
  }[];
}

interface Category {
  category_id: string;
  name: string;
  color: string;
  icon: string;
}

interface HabitLog {
  id: string;
  habit_id: string;
  completed_date: string;
  completed: boolean;
  notes?: string;
  created_at: string;
}

interface FormData {
  title: string;
  description: string;
  reminder_time: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_count: number;
  category_id: string;
}

export default function HabitsPage() {
  const { user } = useAuthStore();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [completions, setCompletions] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [habitStats, setHabitStats] = useState<{ [key: string]: HabitStats }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showHabitMenu, setShowHabitMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'daily' | 'weekly'>('all');

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    reminder_time: "",
    frequency: "daily",
    target_count: 1,
    category_id: "",
  });

  const calculateHabitStats = async (
    habitId: string,
    createdAt: string
  ): Promise<HabitStats> => {
    try {
      // Get logs for the last 90 days to calculate stats
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const { data: logs } = await habitService.getHabitLogs(
        habitId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      if (!logs || logs.length === 0) {
        // Return empty stats with last 7 days structure
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          last7Days.push({
            date: date.toISOString().split("T")[0],
            completed: false,
          });
        }

        return {
          currentStreak: 0,
          longestStreak: 0,
          totalCompletions: 0,
          completionRate: 0,
          last7Days,
        };
      }

      // Create a map of completed dates
      const completedDates = new Set(
        logs.filter((log: HabitLog) => log.completed)
           .map((log: HabitLog) => log.completed_date)
      );

      // Calculate current streak
      let currentStreak = 0;
      let checkDate = new Date();
      while (currentStreak < 90) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (completedDates.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      const sortedDates = Array.from(completedDates).sort();

      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDate = new Date(sortedDates[i - 1] as string);
          const currDate = new Date(sortedDates[i] as string);
          const dayDiff =
            (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

          if (dayDiff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      // Calculate completion rate
      const habitCreatedDate = new Date(createdAt);
      const daysSinceCreation = Math.floor(
        (endDate.getTime() - habitCreatedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const expectedCompletions = Math.min(daysSinceCreation, 90);
      const completionRate =
        expectedCompletions > 0
          ? Math.round((completedDates.size / expectedCompletions) * 100)
          : 0;

      // Get last 7 days data
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        last7Days.push({
          date: dateStr,
          completed: completedDates.has(dateStr),
        });
      }

      // Get last completed date
      const lastCompleted =
        sortedDates.length > 0
          ? sortedDates[sortedDates.length - 1]
          : undefined;

      return {
        currentStreak,
        longestStreak,
        totalCompletions: completedDates.size,
        completionRate,
        lastCompleted: lastCompleted as string | undefined,
        last7Days,
      };
    } catch (error) {
      console.error("Error calculating habit stats:", error);
      // Return default stats on error
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push({
          date: date.toISOString().split("T")[0],
          completed: false,
        });
      }

      return {
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0,
        last7Days,
      };
    }
  };

  const loadData = useCallback(async () => {
    if (!user) {
      console.error('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load habits and categories
      const [habitsResult, categoriesResult] = await Promise.all([
        habitService.getUserHabits(user.id),
        categoryService.getUserCategories(user.id),
      ]);

      if (habitsResult.error) {
        console.error('Error loading habits:', habitsResult.error);
        return;
      }

      if (categoriesResult.error) {
        console.error('Error loading categories:', categoriesResult.error);
        return;
      }

      const habitsData = habitsResult.data || [];
      setHabits(habitsData);
      setCategories(categoriesResult.data || []);

      // Check today's completions and load stats
      const todayCompletions: { [key: string]: boolean } = {};
      const stats: { [key: string]: HabitStats } = {};
      const today = new Date().toISOString().split("T")[0];

      for (const habit of habitsData) {
        try {
          // Check if completed today
          const { data: todayLogs, error: logsError } = await habitService.getHabitLogs(
            habit.habit_id,
            today,
            today
          );

          if (logsError) {
            console.error(`Error loading logs for habit ${habit.habit_id}:`, logsError);
            continue;
          }

          todayCompletions[habit.habit_id] =
            (todayLogs && todayLogs.length > 0 && todayLogs[0].completed) ||
            false;

          // Calculate real stats
          stats[habit.habit_id] = await calculateHabitStats(
            habit.habit_id,
            habit.created_at || new Date().toISOString()
          );
        } catch (error) {
          console.error(`Error processing habit ${habit.habit_id}:`, error);
        }
      }

      setCompletions(todayCompletions);
      setHabitStats(stats);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const habitData = {
        ...formData,
        user_id: user.id,
        reminder_time: formData.reminder_time || null,
        category_id: formData.category_id || null,
      };

      const { error } = await habitService.createHabit(habitData);

      if (!error) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
      } else {
        alert(`Error creating habit: ${error}`);
      }
    } catch (error) {
      console.error("Error creating habit:", error);
      alert("Failed to create habit. Please try again.");
    }
  };

  const handleEditHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;

    try {
      const updates = {
        title: formData.title,
        description: formData.description,
        reminder_time: formData.reminder_time || null,
        frequency: formData.frequency,
        target_count: formData.target_count,
        category_id: formData.category_id || null,
      };

      const { error } = await habitService.updateHabit(
        editingHabit.habit_id,
        updates
      );

      if (!error) {
        await loadData();
        setShowEditModal(false);
        setEditingHabit(null);
        resetForm();
      } else {
        alert(`Error updating habit: ${error}`);
      }
    } catch (error) {
      console.error("Error updating habit:", error);
      alert("Failed to update habit. Please try again.");
    }
  };

  const startEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      title: habit.title,
      description: habit.description || "",
      reminder_time: habit.reminder_time || "",
      frequency: habit.frequency,
      target_count: habit.target_count,
      category_id: habit.category?.category_id || "",
    });
    setShowEditModal(true);
    setShowHabitMenu(null);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      reminder_time: "",
      frequency: "daily",
      target_count: 1,
      category_id: "",
    });
  };

  const toggleHabitCompletion = async (habitId: string) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const isCompleted = completions[habitId];

      if (isCompleted) {
        // Find today's log and delete it
        const { data: todayLogs } = await habitService.getHabitLogs(
          habitId,
          today,
          today
        );
        if (todayLogs && todayLogs.length > 0) {
          // You would need to add a deleteHabitLog method to your service
          // For now, we'll update the completion status to false
          await habitService.logHabitCompletion(habitId, today, false, user.id);
        }
      } else {
        // Log completion for today
        await habitService.logHabitCompletion(habitId, today, true, user.id);
      }

      // Reload data to ensure consistency
      await loadData();
    } catch (error) {
      console.error("Error toggling habit completion:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const deleteHabit = async (habitId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this habit? This will also delete all completion history."
      )
    )
      return;

    try {
      const { error } = await habitService.deleteHabit(habitId);
      if (!error) {
        await loadData();
      } else {
        alert(`Error deleting habit: ${error}`);
      }
    } catch (error) {
      console.error("Error deleting habit:", error);
      alert("Failed to delete habit. Please try again.");
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return <Calendar className="w-4 h-4" />;
      case "weekly":
        return <RefreshCw className="w-4 h-4" />;
      case "monthly":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredHabits = habits.filter((habit) => {
    if (filter === "all") return true;
    if (filter === "completed") return completions[habit.habit_id];
    if (filter === "pending") return !completions[habit.habit_id];
    if (filter === "daily") return habit.frequency === "daily";
    if (filter === "weekly") return habit.frequency === "weekly";
    return true;
  });

  const getBestStreak = () => {
    const streaks = Object.values(habitStats).map((s) => s.longestStreak);
    return streaks.length > 0 ? Math.max(...streaks) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Habits
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Build and track your daily habits
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center space-x-2 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>New Habit</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Today's Progress
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.values(completions).filter(Boolean).length}/
                {habits.length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completion Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {habits.length > 0
                  ? Math.round(
                      (Object.values(completions).filter(Boolean).length /
                        habits.length) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
            <BarChart className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Active Habits
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {habits.length}
              </p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Best Streak
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getBestStreak()}
              </p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          {["all", "completed", "pending", "daily", "weekly"].map(
            (filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as 'all' | 'completed' | 'pending' | 'daily' | 'weekly')}
                className={`px-4 py-2 rounded-md font-medium capitalize text-sm transition-colors ${
                  filter === filterOption
                    ? "bg-purple-600 dark:bg-purple-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {filterOption}
              </button>
            )
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Today's Progress
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Object.values(completions).filter(Boolean).length} of{" "}
            {habits.length} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-300"
            style={{
              width: `${habits.length > 0 ? (Object.values(completions).filter(Boolean).length / habits.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredHabits.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {filter === "all"
                ? "No habits found. Create your first habit!"
                : `No ${filter} habits found.`}
            </p>
          </div>
        ) : (
          filteredHabits.map((habit) => {
            const stats = habitStats[habit.habit_id] || {
              currentStreak: 0,
              completionRate: 0,
              last7Days: Array(7)
                .fill(null)
                .map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  return {
                    date: date.toISOString().split("T")[0],
                    completed: false,
                  };
                }),
            };
            const isCompleted = completions[habit.habit_id];

            return (
              <div
                key={habit.habit_id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow ${
                  isCompleted ? "ring-2 ring-green-500" : ""
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {habit.title}
                      </h3>
                      {habit.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          {habit.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleHabitCompletion(habit.habit_id)}
                        className={`p-3 rounded-full transition-colors ${
                          isCompleted
                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <div className="w-6 h-6 border-2 border-current rounded-full" />
                        )}
                      </button>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowHabitMenu(
                              showHabitMenu === habit.habit_id
                                ? null
                                : habit.habit_id
                            )
                          }
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </button>

                        {showHabitMenu === habit.habit_id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10">
                            <button
                              onClick={() => startEdit(habit)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Habit
                            </button>

                            <button
                              onClick={() => {
                                alert("Statistics view coming soon!");
                                setShowHabitMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                            >
                              <BarChart className="w-4 h-4 mr-2" />
                              View Statistics
                            </button>

                            <hr className="my-1 dark:border-gray-700" />

                            <button
                              onClick={() => {
                                deleteHabit(habit.habit_id);
                                setShowHabitMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Category */}
                    {habit.category && (
                      <div className="flex items-center space-x-2">
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: habit.category.color + "20",
                            color: habit.category.color,
                          }}
                        >
                          {habit.category.icon} {habit.category.name}
                        </span>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400 flex items-center">
                          {getFrequencyIcon(habit.frequency)}
                          <span className="ml-1">Frequency:</span>
                        </span>
                        <span className="font-medium capitalize text-gray-900 dark:text-white">
                          {habit.frequency}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          Target:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {habit.target_count}x
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          Streak:
                        </span>
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          {stats.currentStreak} days
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          Success:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats.completionRate}%
                        </span>
                      </div>
                    </div>

                    {/* Reminder */}
                    {habit.reminder_time && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Bell className="w-4 h-4 mr-1" />
                        Reminder at {habit.reminder_time}
                      </div>
                    )}

                    {/* Mini Calendar - Last 7 days */}
                    <div className="flex items-center space-x-1 mt-3">
                      {stats.last7Days.map((day, i) => {
                        const date = new Date(day.date);
                        const isToday = i === 6;

                        return (
                          <div
                            key={i}
                            className={`w-8 h-8 rounded-md flex items-center justify-center text-xs ${
                              isToday
                                ? "ring-2 ring-purple-500 dark:ring-purple-400"
                                : ""
                            } ${
                              day.completed
                                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                            }`}
                            title={date.toLocaleDateString()}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Habit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {showEditModal ? "Edit Habit" : "Create New Habit"}
            </h2>
            <form
              onSubmit={showEditModal ? handleEditHabit : handleCreateHabit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({ ...formData, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.target_count}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_count: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reminder Time (Optional)
                </label>
                <input
                  type="time"
                  value={formData.reminder_time}
                  onChange={(e) =>
                    setFormData({ ...formData, reminder_time: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option
                      key={category.category_id}
                      value={category.category_id}
                    >
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setEditingHabit(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                >
                  {showEditModal ? "Update Habit" : "Create Habit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
