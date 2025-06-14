// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "../lib/stores/authStore";
import { userService } from "../lib/database/users";
import { taskService } from "../lib/database/tasks";
import { NotificationManager } from "../lib/database/notifications";
import {
  CheckCircle,
  Target,
  TrendingUp,
  Calendar,
  Bell,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface Task {
  task_id: string;
  id?: string;
  title: string;
  description: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
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

export default function DashboardHome() {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);

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
      const { data: userStats } = await userService.getUserStats(user!.id)
      setStats(userStats as DashboardStats)
  
      // Load today's tasks
      const { data: tasks } = await taskService.getUserTasks(user!.id)
      const today = new Date().toDateString()
      const todaysTasks = tasks?.filter((task: Task) => {
        return task.due_date && new Date(task.due_date).toDateString() === today
      }) || []

      setTodayTasks(todaysTasks)

  
      // Load upcoming deadlines
      const upcoming = tasks?.filter((task: Task) => {
        if (!task.due_date || task.completed) return false
        const dueDate = new Date(task.due_date)
        const daysUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return daysUntilDue > 0 && daysUntilDue <= 7
      }).sort((a: Task, b: Task) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ) || []
      setUpcomingDeadlines(upcoming.slice(0, 5))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const setupNotifications = async () => {
    const settings = localStorage.getItem("notificationSettings");
    if (settings) {
      const { browserNotifications } = JSON.parse(settings);
      if (browserNotifications) {
        await NotificationManager.checkAndShowNotifications(user!.id);
      }
    }
  };

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {greeting}, {user?.user_metadata?.full_name || "there"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Here's your overview for{" "}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Today's Tasks
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
    </div>
  );
}
