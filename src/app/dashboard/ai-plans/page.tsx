// app/dashboard/ai-plans/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { taskService } from '@//lib/database/tasks'
import { goalService } from '@//lib/database/goals'
import { habitService } from '@//lib/database/habits'
import { journalService } from '@//lib/database/journal'
import { 
  Brain, 
  Sparkles, 
  Calendar, 
  Target, 
  CheckCircle, 
  RefreshCw,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  Download,
  Share2,
  Settings,
  ChevronRight,
  Zap
} from 'lucide-react'

interface AIPlan {
  id: string
  title: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  duration: string
  focus_areas: string[]
  tasks: {
    title: string
    description: string
    priority: string
    estimated_time: string
    best_time: string
  }[]
  goals_alignment: string[]
  habits_to_build: string[]
  tips: string[]
  created_at: string
}

interface HabitLog {
  id: string;
  habit_id: string;
  completed_date: string;
  completed: boolean;
  notes?: string;
  created_at: string;
}

interface JournalEntry {
  entry_id: string;
  content: string;
  mood: 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'stressed';
  tags: string[];
  entry_date: string;
  notes: string | null;
}

export default function AIPlanPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activePlan, setActivePlan] = useState<AIPlan | null>(null)
  const [previousPlans, setPreviousPlans] = useState<AIPlan[]>([])
  const [planType, setPlanType] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [preferences, setPreferences] = useState({
    workHours: '9-5',
    focusAreas: ['productivity', 'health', 'learning'],
    intensity: 'balanced'
  })
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    goalsActive: 0,
    currentStreak: 0,
    avgMood: 'neutral'
  })

  useEffect(() => {
    if (user) {
      loadUserData()
      loadPreviousPlans()
    }
  }, [user])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const [tasks, goals, habits, journals] = await Promise.all([
        taskService.getUserTasks(user!.id),
        goalService.getUserGoals(user!.id),
        habitService.getUserHabits(user!.id),
        journalService.getUserJournalEntries(user!.id)
      ])

      // Calculate stats
      setStats({
        tasksCompleted: tasks.data?.filter((t: { completed: boolean }) => t.completed).length || 0,
        goalsActive: goals.data?.filter((g: { status: string }) => g.status === 'active').length || 0,
        currentStreak: calculateStreak(habits.data || []),
        avgMood: calculateAverageMood(journals.data || [])
      })
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPreviousPlans = async () => {
    // Load from localStorage for now (could be from database)
    const saved = localStorage.getItem(`ai-plans-${user?.id}`)
    if (saved) {
      setPreviousPlans(JSON.parse(saved))
    }
  }

  const calculateStreak = (habits: HabitLog[]): number => {
    if (!habits.length) return 0;

    // Sort logs by date in descending order
    const sortedLogs = [...habits].sort((a, b) => 
      new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime()
    );

    // Filter only completed habits
    const completedLogs = sortedLogs.filter(log => log.completed);

    if (!completedLogs.length) return 0;

    let streak = 1;
    let currentDate = new Date(completedLogs[0].completed_date);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < completedLogs.length; i++) {
      const logDate = new Date(completedLogs[i].completed_date);
      logDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        streak++;
        currentDate = logDate;
      } else {
        break;
      }
    }

    return streak;
  };

  const calculateAverageMood = (entries: JournalEntry[]): 'happy' | 'sad' | 'angry' | 'neutral' | 'excited' | 'stressed' => {
    if (!entries.length) return 'neutral';

    const moodWeights = {
      'happy': 3,
      'excited': 2,
      'neutral': 0,
      'stressed': -1,
      'sad': -2,
      'angry': -3
    };

    const totalWeight = entries.reduce((sum, entry) => sum + (moodWeights[entry.mood] || 0), 0);
    const averageWeight = totalWeight / entries.length;

    // Map the average weight back to a mood
    if (averageWeight >= 2) return 'happy';
    if (averageWeight >= 1) return 'excited';
    if (averageWeight >= -0.5) return 'neutral';
    if (averageWeight >= -1.5) return 'stressed';
    if (averageWeight >= -2.5) return 'sad';
    return 'angry';
  };

  const generateAIPlan = async () => {
    setGenerating(true)
    
    try {
      // Simulate AI generation (replace with actual AI service call)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const newPlan: AIPlan = {
        id: Date.now().toString(),
        title: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Productivity Plan`,
        type: planType,
        duration: planType === 'daily' ? '1 day' : planType === 'weekly' ? '7 days' : '30 days',
        focus_areas: preferences.focusAreas,
        tasks: generateSampleTasks(planType),
        goals_alignment: ['Complete project milestone', 'Improve time management'],
        habits_to_build: ['Morning meditation', 'Daily exercise', 'Evening reflection'],
        tips: [
          'Start your day with the most challenging task',
          'Take regular breaks to maintain focus',
          'Review your progress each evening'
        ],
        created_at: new Date().toISOString()
      }
      
      setActivePlan(newPlan)
      
      // Save to localStorage
      const updatedPlans = [newPlan, ...previousPlans].slice(0, 10)
      setPreviousPlans(updatedPlans)
      localStorage.setItem(`ai-plans-${user?.id}`, JSON.stringify(updatedPlans))
    } catch (error) {
      console.error('Error generating plan:', error)
    } finally {
      setGenerating(false)
    }
  }

  const generateSampleTasks = (type: string) => {
    const baseTasks = [
      {
        title: 'Deep Work Session',
        description: 'Focus on your most important project without distractions',
        priority: 'high',
        estimated_time: '2 hours',
        best_time: '9:00 AM - 11:00 AM'
      },
      {
        title: 'Email and Communication Check',
        description: 'Process inbox and respond to important messages',
        priority: 'medium',
        estimated_time: '30 minutes',
        best_time: '11:30 AM - 12:00 PM'
      },
      {
        title: 'Learning Time',
        description: 'Dedicate time to skill development or course progress',
        priority: 'medium',
        estimated_time: '1 hour',
        best_time: '2:00 PM - 3:00 PM'
      },
      {
        title: 'Exercise or Walk',
        description: 'Physical activity to boost energy and clarity',
        priority: 'high',
        estimated_time: '30 minutes',
        best_time: '5:00 PM - 5:30 PM'
      },
      {
        title: 'Planning and Review',
        description: 'Review today\'s progress and plan for tomorrow',
        priority: 'medium',
        estimated_time: '15 minutes',
        best_time: '6:00 PM - 6:15 PM'
      }
    ]
    
    return type === 'daily' ? baseTasks.slice(0, 3) : baseTasks
  }

  const applyPlanToSchedule = async () => {
    if (!activePlan) return
    
    // Convert AI plan tasks to actual tasks
    for (const task of activePlan.tasks) {
      await taskService.createTask({
        user_id: user!.id,
        title: task.title,
        description: task.description,
        priority: task.priority as 'low' | 'medium' | 'high',
        due_date: new Date().toISOString(), // Set appropriate dates
        completed: false
      })
    }
    
    alert('Plan applied to your schedule!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain className="w-8 h-8 text-purple-600" />
          AI Plans
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Get personalized productivity plans powered by AI
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Done</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.tasksCompleted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Goals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.goalsActive}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Day Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.currentStreak}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Mood</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{stats.avgMood}</p>
            </div>
            <Sparkles className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Plan Generator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Generate New Plan
        </h2>
        
        <div className="space-y-4">
          {/* Plan Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plan Duration
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['daily', 'weekly', 'monthly'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setPlanType(type)}
                  className={`p-3 rounded-lg border-2 transition-colors capitalize ${
                    planType === type
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Focus Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Focus Areas
            </label>
            <div className="flex flex-wrap gap-2">
              {['productivity', 'health', 'learning', 'creativity', 'relationships'].map(area => (
                <button
                  key={area}
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      focusAreas: prev.focusAreas.includes(area)
                        ? prev.focusAreas.filter(a => a !== area)
                        : [...prev.focusAreas, area]
                    }))
                  }}
                  className={`px-3 py-1 rounded-full text-sm capitalize ${
                    preferences.focusAreas.includes(area)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateAIPlan}
            disabled={generating}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Your Personalized Plan...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Generate AI Plan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Plan */}
      {activePlan && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {activePlan.title}
            </h2>
            <div className="flex space-x-2">
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-lg">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-lg">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tasks Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
                  Recommended Tasks
                </h3>
                <div className="space-y-3">
                  {activePlan.tasks.map((task, index) => (
                    <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs">
                            <span className="flex items-center text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {task.estimated_time}
                            </span>
                            <span className="flex items-center text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              {task.best_time}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full ${
                              task.priority === 'high' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {task.priority} priority
                            </span>
                          </div>
                        </div>
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
                  Pro Tips
                </h3>
                <ul className="space-y-2">
                  {activePlan.tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-4">
              {/* Goals Alignment */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  Goals Alignment
                </h3>
                <ul className="space-y-2">
                  {activePlan.goals_alignment.map((goal, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      • {goal}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Habits to Build */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2 text-orange-600" />
                  Habits to Build
                </h3>
                <ul className="space-y-2">
                  {activePlan.habits_to_build.map((habit, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      • {habit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Apply Plan Button */}
              <button
                onClick={applyPlanToSchedule}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center space-x-2"
              >
                <Calendar className="w-5 h-5" />
                <span>Apply to Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Previous Plans */}
      {previousPlans.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Previous Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previousPlans.map(plan => (
              <div
                key={plan.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setActivePlan(plan)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{plan.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {plan.duration} • {plan.tasks.length} tasks
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {plan.focus_areas.map(area => (
                        <span
                          key={area}
                          className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full capitalize"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activePlan && previousPlans.length === 0 && !generating && (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No AI Plans Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Generate your first AI-powered productivity plan to get started
          </p>
          <button
            onClick={generateAIPlan}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            Generate Your First Plan
          </button>
        </div>
      )}

      {/* Settings Modal */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          AI Plan Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Work Hours
            </label>
            <select
              value={preferences.workHours}
              onChange={(e) => setPreferences(prev => ({ ...prev, workHours: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="9-5">9 AM - 5 PM</option>
              <option value="8-4">8 AM - 4 PM</option>
              <option value="10-6">10 AM - 6 PM</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plan Intensity
            </label>
            <select
              value={preferences.intensity}
              onChange={(e) => setPreferences(prev => ({ ...prev, intensity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="light">Light - More breaks, less tasks</option>
              <option value="balanced">Balanced - Default recommendation</option>
              <option value="intense">Intense - Maximum productivity</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}