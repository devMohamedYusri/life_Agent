// app/dashboard/profile/page.tsx
'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { userService } from '@//lib/database/users'
import { taskService } from '@//lib/database/tasks'
import { goalService } from '@//lib/database/goals'
import { habitService } from '@//lib/database/habits'
import { journalService } from '@//lib/database/journal'
import { 
  Award, 
  TrendingUp, 
  Edit,
  Mail,
  CheckSquare,
  Target,
  RefreshCw,
  FileText,
  Activity
} from 'lucide-react'
import Link from 'next/link'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  requirement: string
  unlocked: boolean
}

interface Activity {
  id: string
  type: 'task' | 'goal' | 'habit' | 'journal'
  action: string
  title: string
  timestamp: string
  icon: React.ReactNode
  color: string
}

interface Task {
  task_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  is_completed: boolean;
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

interface Goal {
  goal_id: string;
  title: string;
  description: string;
  goal_type: string;
  progress: number;
  deadline: string | null;
  status: 'active' | 'completed' | 'cancelled';
  priority: string;
  created_at: string;
  updated_at: string;
  category?: {
    category_id: string;
    name: string;
    color: string;
    icon: string;
  };
  tasks: Task[];
}

interface Habit {
  habit_id: string;
  title: string;
  description: string;
  reminder_time: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_count: number;
  created_at: string;
  category?: {
    category_id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface JournalEntry {
  entry_id: string;
  content: string;
  mood: 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'stressed';
  tags: string[];
  entry_date: string;
  notes: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    goalsAchieved: 0,
    currentStreak: 0,
    totalPoints: 0,
    habitsTracked: 0,
    journalEntries: 0,
    productivityScore: 0,
    completionRate: 0
  })
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadProfileData()
    }
  }, [user])

  const loadProfileData = async () => {
    try {
      setLoading(true)

      // Load profile data
      const { data: profileData } = await userService.getUserProfile(user!.id)
      setProfile(profileData)

      // Load all user data for stats
      const [tasksResult, goalsResult, habitsResult, journalResult] = await Promise.all([
        taskService.getUserTasks(user!.id),
        goalService.getUserGoals(user!.id),
        habitService.getUserHabits(user!.id),
        journalService.getUserJournalEntries(user!.id)
      ])

      const tasks = tasksResult.data || []
      const goals = goalsResult.data || []
      const habits = habitsResult.data || []
      const journalEntries = journalResult.data || []

      // Calculate stats
      const completedTasks = tasks.filter((t: Task) => t.is_completed).length
      const completedGoals = goals.filter((g: Goal) => g.status === 'completed').length
      const totalTasks = tasks.length
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Calculate current streak
      const currentStreak = await calculateCurrentStreak(user!.id, habits)

      // Calculate productivity score
      const productivityScore = calculateProductivityScore(completedTasks, completedGoals, currentStreak)

      setStats({
        tasksCompleted: completedTasks,
        goalsAchieved: completedGoals,
        currentStreak,
        totalPoints: calculatePoints(tasks, goals, habits),
        habitsTracked: habits.length,
        journalEntries: journalEntries.length,
        productivityScore,
        completionRate
      })

      // Load achievements based on actual data
      setAchievements(calculateAchievements(tasks, goals, habits, journalEntries))

      // Load recent activity
      setRecentActivity(await loadRecentActivity(tasks, goals, habits, journalEntries))

    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateCurrentStreak = async (userId: string, habits: Habit[]): Promise<number> => {
    if (habits.length === 0) return 0

    // Get the best streak from all habits
    let maxStreak = 0
    for (const habit of habits) {
      const { data: streak } = await habitService.getHabitStreak(habit.habit_id, userId)
      if (streak > maxStreak) {
        maxStreak = streak
      }
    }
    return maxStreak
  }

  const calculateProductivityScore = (completedTasks: number, completedGoals: number, streak: number) => {
    // Simple productivity score calculation
    const taskScore = Math.min(completedTasks * 2, 40) // Max 40 points from tasks
    const goalScore = Math.min(completedGoals * 10, 40) // Max 40 points from goals
    const streakScore = Math.min(streak * 2, 20) // Max 20 points from streak
    return taskScore + goalScore + streakScore
  }

  const calculatePoints = (tasks: Task[], goals: Goal[], habits: Habit[]): number => {
    const taskPoints = tasks.filter(t => t.is_completed).length * 10
    const goalPoints = goals.filter(g => g.status === 'completed').length * 50
    const habitPoints = habits.length * 20
    return taskPoints + goalPoints + habitPoints
  }

  const calculateAchievements = (
    tasks: Task[], 
    goals: Goal[], 
    habits: Habit[], 
    journalEntries: JournalEntry[]
  ): Achievement[] => {
    const completedTasks = tasks.filter(t => t.is_completed).length
    const completedGoals = goals.filter(g => g.status === 'completed').length

    return [
      {
        id: '1',
        title: 'First Step',
        description: 'Complete your first task',
        icon: '🎯',
        requirement: 'Complete 1 task',
        unlocked: completedTasks >= 1
      },
      {
        id: '2',
        title: 'Goal Getter',
        description: 'Complete your first goal',
        icon: '🏆',
        requirement: 'Complete 1 goal',
        unlocked: completedGoals >= 1
      },
      {
        id: '3',
        title: 'Task Master',
        description: 'Complete 10 tasks',
        icon: '⚡',
        requirement: 'Complete 10 tasks',
        unlocked: completedTasks >= 10
      },
      {
        id: '4',
        title: 'Habit Former',
        description: 'Track 5 habits',
        icon: '💪',
        requirement: 'Track 5 habits',
        unlocked: habits.length >= 5
      },
      {
        id: '5',
        title: 'Journal Keeper',
        description: 'Write 10 journal entries',
        icon: '📝',
        requirement: 'Write 10 entries',
        unlocked: journalEntries.length >= 10
      },
      {
        id: '6',
        title: 'Productivity Pro',
        description: 'Complete 50 tasks',
        icon: '🚀',
        requirement: 'Complete 50 tasks',
        unlocked: completedTasks >= 50
      }
    ]
  }

  const loadRecentActivity = async (
    tasks: Task[], 
    goals: Goal[], 
    habits: Habit[], 
    journalEntries: JournalEntry[]
  ): Promise<Activity[]> => {
    const activities: Activity[] = []

    // Add recent tasks
    tasks.slice(0, 3).forEach(task => {
      activities.push({
        id: task.task_id,
        type: 'task',
        action: task.is_completed ? 'Completed task' : 'Created task',
        title: task.title,
        timestamp: task.updated_at || task.created_at,
        icon: <CheckSquare className="w-4 h-4" />,
        color: task.is_completed ? 'text-green-500' : 'text-blue-500'
      })
    })

    // Add recent goals
    goals.slice(0, 2).forEach(goal => {
      activities.push({
        id: goal.goal_id,
        type: 'goal',
        action: goal.status === 'completed' ? 'Achieved goal' : 'Set new goal',
        title: goal.title,
        timestamp: goal.updated_at || goal.created_at,
        icon: <Target className="w-4 h-4" />,
        color: goal.status === 'completed' ? 'text-green-500' : 'text-purple-500'
      })
    })

    // Add recent habits
    habits.slice(0, 2).forEach(habit => {
      activities.push({
        id: habit.habit_id,
        type: 'habit',
        action: 'Tracked habit',
        title: habit.title,
        timestamp: habit.created_at,
        icon: <RefreshCw className="w-4 h-4" />,
        color: 'text-orange-500'
      })
    })

    // Add recent journal entries
    journalEntries.slice(0, 2).forEach(entry => {
      activities.push({
        id: entry.entry_id,
        type: 'journal',
        action: 'Wrote journal entry',
        title: entry.content.substring(0, 30) + '...',
        timestamp: entry.created_at,
        icon: <FileText className="w-4 h-4" />,
        color: 'text-indigo-500'
      })
    })

    // Sort by timestamp and return
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diff = now.getTime() - then.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Your personal dashboard and achievements</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        
        {/* Profile Info */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-5">
            {/* Avatar */}
            <div className="-mt-12 sm:-mt-16">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile?.full_name || 'User'}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                  {getInitials(profile?.full_name || user?.email || 'User')}
                </div>
              )}
            </div>

            {/* Name and Bio */}
            <div className="mt-6 sm:mt-0 sm:flex-1 sm:min-w-0 sm:flex sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 flex items-center mt-1">
                  <Mail className="w-4 h-4 mr-1" />
                  {user?.email}
                </p>
                {profile?.bio && (
                  <p className="mt-2 text-gray-700 dark:text-gray-300">{profile.bio}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Member since {new Date(profile?.created_at || user?.created_at).toLocaleDateString()}
                </p>
              </div>
              <Link
                href="/dashboard/settings"
                className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.tasksCompleted}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Tasks Done</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.goalsAchieved}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Goals Achieved</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.currentStreak}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Day Streak</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalPoints}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Points</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.habitsTracked}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Habits Tracked</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{stats.journalEntries}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Journal Entries</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stats.productivityScore}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Productivity Score</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.completionRate}%</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
          Progress Overview
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Completion</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{stats.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Productivity Score</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{stats.productivityScore}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.productivityScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-yellow-600 dark:text-yellow-400" />
          Achievements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-3xl">{achievement.icon}</span>
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    achievement.unlocked 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {achievement.title}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    achievement.unlocked 
                      ? 'text-gray-600 dark:text-gray-300' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {achievement.description}
                  </p>
                  <p className={`text-xs mt-2 ${
                    achievement.unlocked 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {achievement.unlocked ? '✓ Unlocked' : achievement.requirement}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No recent activity. Start by creating a task or setting a goal!
          </p>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-start space-x-3">
                <div className={`mt-0.5 ${activity.color}`}>
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium">{activity.action}</span>
                    {' '}
                    <span className="text-gray-700 dark:text-gray-300">"{activity.title}"</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/dashboard/tasks"
            className="bg-white/20 backdrop-blur rounded-lg p-4 text-center hover:bg-white/30 transition-colors"
          >
            <CheckSquare className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm">New Task</span>
          </Link>
          <Link
            href="/dashboard/goals"
            className="bg-white/20 backdrop-blur rounded-lg p-4 text-center hover:bg-white/30 transition-colors"
          >
            <Target className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm">Set Goal</span>
          </Link>
          <Link
            href="/dashboard/habits"
            className="bg-white/20 backdrop-blur rounded-lg p-4 text-center hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm">Track Habit</span>
          </Link>
          <Link
            href="/dashboard/journals"
            className="bg-white/20 backdrop-blur rounded-lg p-4 text-center hover:bg-white/30 transition-colors"
          >
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <span className="text-sm">Write Entry</span>
          </Link>
        </div>
      </div>
    </div>
  )
}