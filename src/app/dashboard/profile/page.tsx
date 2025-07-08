// app/dashboard/profile/page.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { userService } from '@//lib/database/users'
import { taskService } from '@//lib/database/tasks'
import { goalService } from '@//lib/database/goals'
import { Goal } from '@//lib/database/goals'
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
  Activity,
  Loader2,
  Clipboard
} from 'lucide-react'
import Link from 'next/link'
import { useSupabase } from '@//lib/hooks/useSupabase'
import { Database } from '@//types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { UserAvatar } from '@//components/userAvatar'

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
  user_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface ServiceResult<T> {
  data: T[] | null;
  error: import("@supabase/supabase-js").PostgrestError | null | unknown;
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { supabase } = useSupabase()
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

  const goalsService = useMemo(() => goalService(supabase as SupabaseClient<Database>), [supabase])
  const tasksService = useMemo(() => taskService(supabase as SupabaseClient<Database>), [supabase])
  const habitsService = useMemo(() => habitService(supabase as SupabaseClient<Database>), [supabase])
  const journalsService = useMemo(() => journalService(supabase), [supabase])
  const usersService = useMemo(() => userService(supabase), [supabase])

  useEffect(() => {
    if (user) {
      loadProfileData()
    }
  }, [user])

  const loadProfileData = async () => {
    try {
      setLoading(true)

      // Load profile data
      const { data: profileData } = await usersService.getUserProfile(user!.id)
      setProfile(profileData)

      // Load all user data for stats
      const [tasksResult, goalsResult, habitsResult, journalResult]: [
        ServiceResult<Task>,
        ServiceResult<Goal>,
        ServiceResult<Habit>,
        ServiceResult<JournalEntry>
      ] = await Promise.all([
        tasksService.getUserTasks(user!.id),
        goalsService.getUserGoals(user!.id),
        habitsService.getUserHabits(user!.id),
        journalsService.getUserJournalEntries(user!.id)
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
      const { data: streak } = await habitsService.gethabitstreak(habit.habit_id, userId)
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
    const allActivities: Activity[] = []

    tasks.forEach(task => {
      allActivities.push({
        id: task.task_id,
        type: 'task',
        action: task.is_completed ? 'Completed task:' : 'Updated task:',
        title: task.title,
        timestamp: task.updated_at || task.created_at,
        icon: task.is_completed ? <CheckSquare className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />,
        color: task.is_completed ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
      })
    })

    goals.forEach(goal => {
      allActivities.push({
        id: goal.goal_id,
        type: 'goal',
        action: goal.status === 'completed' ? 'Achieved goal:' : 'Updated goal progress:',
        title: goal.title,
        timestamp: goal.updated_at || goal.created_at,
        icon: goal.status === 'completed' ? <Award className="w-4 h-4" /> : <Target className="w-4 h-4" />,
        color: goal.status === 'completed' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
      })
    })

    habits.forEach(habit => {
      allActivities.push({
        id: habit.habit_id,
        type: 'habit',
        action: 'Tracked habit:',
        title: habit.title,
        timestamp: habit.created_at,
        icon: <RefreshCw className="w-4 h-4" />,
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
      })
    })

    journalEntries.forEach(journal => {
      allActivities.push({
        id: journal.entry_id,
        type: 'journal',
        action: 'Journaled about:',
        title: journal.content.substring(0, 50) + (journal.content.length > 50 ? '...' : ''),
        timestamp: journal.created_at,
        icon: <FileText className="w-4 h-4" />,
        color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
      })
    })

    return allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Profile Header (Hero Section) */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 mb-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
          {/* Background Gradient Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 opacity-50"></div>
          <div className="absolute inset-0 top-1/2 left-1/2 w-48 h-48 bg-purple-200 dark:bg-purple-900 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute inset-0 bottom-0 right-0 w-48 h-48 bg-indigo-200 dark:bg-indigo-900 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center text-center md:text-left w-full">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              size={120}
              className="border-4 border-white dark:border-gray-700 shadow-md mb-4 md:mb-0 md:mr-6"
            />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                Welcome, {profile.user_name || profile.email}!
              </h1>
              {profile.bio && (
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-4 max-w-2xl mx-auto md:mx-0">
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center justify-center md:justify-start text-gray-500 dark:text-gray-400 mb-2">
                <Mail className="w-4 h-4 mr-2" />
                <span className="text-sm">{profile.email}</span>
              </div>
              <Link href="/dashboard/settings" className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Tasks Completed" 
            value={stats.tasksCompleted} 
            icon={<CheckSquare className="w-6 h-6 text-blue-500" />} 
            color="bg-blue-50 dark:bg-blue-900/20" 
          />
          <StatCard 
            title="Goals Achieved" 
            value={stats.goalsAchieved} 
            icon={<Target className="w-6 h-6 text-green-500" />} 
            color="bg-green-50 dark:bg-green-900/20" 
          />
          <StatCard 
            title="Current Streak" 
            value={stats.currentStreak} 
            icon={<TrendingUp className="w-6 h-6 text-purple-500" />} 
            color="bg-purple-50 dark:bg-purple-900/20" 
          />
          <StatCard 
            title="Productivity Score" 
            value={`${stats.productivityScore}%`} 
            icon={<Activity className="w-6 h-6 text-orange-500" />} 
            color="bg-orange-50 dark:bg-orange-900/20" 
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Achievements Section */}
          <section className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Your Achievements</h2>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No achievements unlocked yet. Keep working on your goals!</p>
            )}
          </section>

          {/* Recent Activity */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <ul className="space-y-4">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} formatTimeAgo={formatTimeAgo} />
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No recent activity.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// Helper Components (to be moved or defined within the file if small enough)

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <div className={`p-6 rounded-xl shadow-md flex items-center space-x-4 ${color}`}>
    <div className="p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
    </div>
  </div>
);

interface AchievementCardProps {
  achievement: Achievement;
}

const AchievementCard = ({ achievement }: AchievementCardProps) => (
  <div className={`p-4 rounded-lg border flex items-start space-x-4 ${
    achievement.unlocked ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30' : 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700'
  }`}>
    <div className="flex-shrink-0 text-3xl leading-none">
      {achievement.icon}
    </div>
    <div>
      <h4 className={`font-semibold ${achievement.unlocked ? 'text-green-800 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>{achievement.title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
    </div>
  </div>
);

interface ActivityItemProps {
  activity: Activity;
  formatTimeAgo: (timestamp: string) => string;
}

const ActivityItem = ({ activity, formatTimeAgo }: ActivityItemProps) => (
  <li className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
    <div className={`p-2 rounded-full ${activity.color} flex-shrink-0`}>
      {activity.icon}
    </div>
    <div>
      <p className="text-gray-800 dark:text-gray-200 text-sm">
        <span className="font-medium">{activity.action}</span> {activity.title}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
    </div>
  </li>
);