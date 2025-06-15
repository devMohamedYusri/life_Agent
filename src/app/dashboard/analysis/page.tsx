"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../lib/stores/authStore";
import { journalService } from "../../lib/database/journal";
import { taskService } from "../../lib/database/tasks";
import { goalService } from "../../lib/database/goals";
import { habitService } from "../../lib/database/habits";

interface Stats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalHabits: number;
}

interface MoodData {
  [mood: string]: number;
}

interface WeeklyTaskData {
  day: string;
  is_completed: number;
  total: number;
}

interface TaskCategory {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

interface HabitStreak {
  date: string;
  count: number;
}

export default function AnalysisPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [moodData, setMoodData] = useState<MoodData>({});
  const [weeklyTaskData, setWeeklyTaskData] = useState<WeeklyTaskData[]>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("week");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadAnalytics = async () => {
      try {
        setLoading(true);

        const startDate = new Date();
        if (dateRange === "week") {
          startDate.setDate(startDate.getDate() - 7);
        } else if (dateRange === "month") {
          startDate.setMonth(startDate.getMonth() - 1);
        } else {
          startDate.setFullYear(startDate.getFullYear() - 1);
        }

        // Load all data concurrently
        const [{ data: allTasks }, { data: goals }, { data: habits }] = await Promise.all([
          taskService.getUserTasks(user.id),
          goalService.getUserGoals(user.id),
          habitService.getUserHabits(user.id),
        ]);

        if (!goals || !mounted) {
          return;
        }

        // Calculate stats directly from tasks and goals
        if (allTasks && goals && habits && mounted) {
          const totalTasks = allTasks.length;
          const completedTasks = allTasks.filter(task => task.is_completed).length;
          const pendingTasks = totalTasks - completedTasks;

          const totalGoals = goals.length;
          const completedGoals = goals.filter(goal => goal.status === "completed").length;
          const activeGoals = totalGoals - completedGoals;

          setStats({
            totalGoals,
            activeGoals,
            completedGoals,
            totalTasks,
            completedTasks,
            pendingTasks,
            totalHabits: habits?.length || 0,
          });
        }

        // Load mood statistics
        const { data: moodStats } = await journalService.getMoodStats(
          user.id,
          startDate.toISOString().split("T")[0],
          new Date().toISOString().split("T")[0]
        );
        if (moodStats && mounted) {
          setMoodData(moodStats as MoodData);
        }

        // Calculate weekly task data
        if (allTasks && mounted) {
          const weekData: WeeklyTaskData[] = [];
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            const dayName = days[date.getDay()];

            const dayTasks = allTasks.filter(
              (task: { due_date: string; completed: boolean }) => task.due_date && task.due_date.startsWith(dateStr)
            );
            const completedDayTasks = dayTasks.filter((task: { is_completed: boolean }) => task.is_completed);
            weekData.push({
              day: dayName,
              is_completed: completedDayTasks.length,
              total: dayTasks.length,
            });
          }
          setWeeklyTaskData(weekData);

          // Calculate task categories
          const categoryMap: { [key: string]: number } = {};
          const categoryColors: { [key: string]: string } = {
            work: "#3b82f6",
            personal: "#10b981",
            health: "#f59e0b",
            learning: "#8b5cf6",
            other: "#6b7280",
          };

          allTasks.forEach((task: { category?: string }) => {
            const category = task.category || "other";
            categoryMap[category] = (categoryMap[category] || 0) + 1;
          });

          const total = allTasks.length;
          const categories: TaskCategory[] = Object.entries(categoryMap).map(
            ([category, count]) => ({
              category: category.charAt(0).toUpperCase() + category.slice(1),
              count,
              percentage: total > 0 ? Math.round((count / total) * 100) : 0,
              color: categoryColors[category] || "#6b7280",
            })
          );

          setTaskCategories(categories.sort((a, b) => b.percentage - a.percentage));
        }

        // Load habit streaks
        if (habits && mounted) {
          const streakData: HabitStreak[] = [];
          
          // Create date range for last 35 days
          const dates: string[] = [];
          for (let i = 34; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split("T")[0]);
          }
          
          if (habits.length > 0) {
            // Get all completions in one batch call
            const startDate = dates[0];
            const endDate = dates[dates.length - 1];
            
            const { data: allCompletions } = 
              await habitService.getBatchHabitCompletions(user.id, startDate, endDate);
            
            if (allCompletions && mounted) {
              // Create a map for quick lookup
              const completionMap = new Map<string, Set<string>>();
              
              allCompletions.forEach((completion: { completion_date: string; habit_id: string }) => {
                const date = completion.completion_date;
                if (!completionMap.has(date)) {
                  completionMap.set(date, new Set());
                }
                completionMap.get(date)?.add(completion.habit_id);
              });
              
              // Count completions for each date
              dates.forEach(dateStr => {
                const habitIdsCompleted = completionMap.get(dateStr);
                streakData.push({
                  date: dateStr,
                  count: habitIdsCompleted?.size || 0
                });
              });
              
              setHabitStreaks(streakData);
            }
          }
        }
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [user, dateRange]);

  const calculateCompletionRate = () => {
    if (!stats || stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  };

  const calculateGoalSuccessRate = () => {
    if (!stats || stats.totalGoals === 0) return 0;
    return Math.round((stats.completedGoals / stats.totalGoals) * 100);
  };

  const getTrackedTimePercentage = () => {
    if (!stats) return 0;
    const estimatedHours = stats.completedTasks * 2;
    const weeklyHours = 168;
    return Math.min(Math.round((estimatedHours / weeklyHours) * 100), 100);
  };

  const getHabitIntensity = (count: number) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Please log in to view analytics</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track your progress and insights
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-4">
          {["week", "month", "year"].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                dateRange === range
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Past {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Task Completion Rate
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {calculateCompletionRate()}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {stats?.completedTasks || 0} of {stats?.totalTasks || 0} tasks
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Goal Success Rate
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {calculateGoalSuccessRate()}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {stats?.completedGoals || 0} of {stats?.totalGoals || 0} goals
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Active Habits
          </h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats?.totalHabits || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Daily habits tracked
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Pending Tasks
          </h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {stats?.pendingTasks || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Tasks to complete
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Mood Distribution
          </h2>
          <div className="space-y-3">
            {Object.entries(moodData).length > 0 ? (
              Object.entries(moodData).map(([mood, count]) => {
                const total = Object.values(moodData).reduce(
                  (a, b) => a + b,
                  0
                );
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={mood} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="capitalize dark:text-gray-300">
                        {mood}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No mood data available
              </p>
            )}
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Weekly Task Progress
          </h2>
          <div className="space-y-3">
            {weeklyTaskData.map((day) => (
              <div key={day.day} className="flex items-center justify-between">
                <span className="text-sm font-medium w-12 dark:text-gray-300">
                  {day.day}
                </span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-green-500 dark:bg-green-400 h-4 rounded-full"
                      style={{
                        width: `${day.total > 0 ? (day.is_completed / day.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {day.is_completed}/{day.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Goal Progress Timeline */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Goal Progress
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            {stats && stats.totalGoals > 0 ? (
              <div className="space-y-4">
                <div className="relative flex items-center">
                  <div className="absolute left-4 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full -translate-x-1/2"></div>
                  <div className="ml-10">
                    <p className="font-medium dark:text-white">Active Goals</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.activeGoals} in progress
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full -translate-x-1/2"></div>
                  <div className="ml-10">
                    <p className="font-medium dark:text-white">
                      Completed Goals
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.completedGoals} achieved
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 ml-10">
                No goals tracked yet
              </p>
            )}
          </div>
        </div>

        {/* Habit Streak Calendar */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">
            Habit Consistency
          </h2>
          <div className="grid grid-cols-7 gap-1">
            {/* Calendar header */}
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div
                key={index}
                className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium py-1"
              >
                {day}
              </div>
            ))}
            {/* Calendar days */}
            {habitStreaks.map((streak, i) => {
              const intensity = getHabitIntensity(streak.count);
              const colorClasses = [
                "bg-gray-100 dark:bg-gray-700",
                "bg-green-200 dark:bg-green-900",
                "bg-green-300 dark:bg-green-800",
                "bg-green-400 dark:bg-green-700",
                "bg-green-500 dark:bg-green-600",
              ];
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${colorClasses[intensity]}`}
                  title={`${streak.count} habits completed on ${streak.date}`}
                />
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Less</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700" />
              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
              <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-800" />
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
              <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">AI-Powered Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              📈 Productivity Trends
            </h3>
            <p className="text-purple-100">
              {stats && stats.completedTasks > 0
                ? `You've completed ${stats.completedTasks} tasks. Your completion rate is ${calculateCompletionRate()}%.`
                : "Start tracking tasks to see your productivity trends."}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              🎯 Goal Recommendations
            </h3>
            <p className="text-purple-100">
              {stats && stats.activeGoals > 3
                ? "You have multiple active goals. Consider focusing on 2-3 key goals for better results."
                : "Set specific, measurable goals to track your progress effectively."}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              🧘 Well-being Analysis
            </h3>
            <p className="text-purple-100">
              {Object.keys(moodData).length > 0
                ? `You've tracked your mood ${Object.values(moodData).reduce((a, b) => a + b, 0)} times. Keep up the self-awareness!`
                : "Start journaling to track your emotional well-being over time."}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">💡 Next Steps</h3>
            <p className="text-purple-100">
              {stats?.pendingTasks && stats.pendingTasks > 0
                ? `Focus on completing your ${stats.pendingTasks} pending tasks. Break them down if needed.`
                : "Great job! All tasks completed. Time to set new challenges."}
            </p>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">
              Export Your Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Download your analytics data for the selected period
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                console.log("Exporting CSV...");
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
            >
              Export as CSV
            </button>
            <button
              onClick={() => {
                console.log("Generating PDF...");
              }}
              className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 font-medium transition-colors"
            >
              Generate PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Categories */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">
            Task Categories
          </h3>
          <div className="space-y-3">
            {taskCategories.length > 0 ? (
              taskCategories.map((category) => (
                <div
                  key={category.category}
                  className="flex justify-between items-center"
                >
                  <span className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-2`}
                      style={{ backgroundColor: `var(--color-${category.color}-500)` }}
                    ></div>
                    <span className="dark:text-gray-300">
                      {category.category}
                    </span>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {category.percentage}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No task categories yet
              </p>
            )}
          </div>
        </div>

        {/* Time Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">
            Time Distribution
          </h3>
          <div className="relative h-48">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  168
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  hours/week
                </p>
              </div>
            </div>
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
                strokeWidth="16"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                className="text-purple-600 dark:text-purple-400"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 80 * (getTrackedTimePercentage() / 100)} ${2 * Math.PI * 80}`}
              />
            </svg>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {getTrackedTimePercentage()}% of time on tracked activities
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">
            Recent Achievements
          </h3>
          <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🏆</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Week Warrior
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Goal Getter
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🔥</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                7-Day Streak
              </p>
            </div>
            <div className="text-center opacity-50">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🌟</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Locked</p>
            </div>
            <div className="text-center opacity-50">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">💎</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Locked</p>
            </div>
            <div className="text-center opacity-50">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🚀</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Locked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 dark:text-white">
          Summary for {dateRange}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {weeklyTaskData.reduce((sum, day) => sum + day.is_completed, 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Tasks Completed
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {habitStreaks.filter((s) => s.count > 0).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Days with Habits
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {Object.values(moodData).reduce((sum, count) => sum + count, 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Journal Entries
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}