'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { userService } from '../../lib/database/users'
import { journalService } from '../../lib/database/journal'

interface Stats {
  totalGoals: number
  activeGoals: number
  completedGoals: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  totalHabits: number
}

export default function AnalysisPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [moodData, setMoodData] = useState<any>({})
  const [weeklyTaskData, setWeeklyTaskData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week')

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Load general stats
      const { data: userStats } = await userService.getUserStats(user!.id)
      setStats(userStats)

      // Load mood statistics
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1)
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1)
      }

      const { data: moodStats } = await journalService.getMoodStats(
        user!.id,
        startDate.toISOString().split('T')[0],
        endDate
      )
      setMoodData(moodStats || {})

      // Load weekly task completion data (simplified)
      const weekData = []
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const today = new Date()
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        const dayName = days[date.getDay()]
        
        // This would need actual task completion data for each day
        weekData.push({
          day: dayName,
          completed: Math.floor(Math.random() * 10), // Placeholder data
          total: Math.floor(Math.random() * 5) + 10  // Placeholder data
        })
      }
      setWeeklyTaskData(weekData)

    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateCompletionRate = () => {
    if (!stats || stats.totalTasks === 0) return 0
    return Math.round((stats.completedTasks / stats.totalTasks) * 100)
  }

  const calculateGoalSuccessRate = () => {
    if (!stats || stats.totalGoals === 0) return 0
    return Math.round((stats.completedGoals / stats.totalGoals) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analysis</h1>
        <p className="text-gray-600 mt-2">Track your progress and insights</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-4">
          {['week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-md font-medium capitalize ${
                dateRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Past {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Task Completion Rate</h3>
          <p className="text-3xl font-bold text-green-600">{calculateCompletionRate()}%</p>
          <p className="text-sm text-gray-600 mt-1">
            {stats?.completedTasks} of {stats?.totalTasks} tasks
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Goal Success Rate</h3>
          <p className="text-3xl font-bold text-blue-600">{calculateGoalSuccessRate()}%</p>
          <p className="text-sm text-gray-600 mt-1">
            {stats?.completedGoals} of {stats?.totalGoals} goals
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Habits</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.totalHabits || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Daily habits tracked</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Tasks</h3>
          <p className="text-3xl font-bold text-orange-600">{stats?.pendingTasks || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Tasks to complete</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Mood Distribution</h2>
          <div className="space-y-3">
            {Object.entries(moodData).map(([mood, count]) => (
              <div key={mood} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="capitalize">{mood}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ 
                        width: `${Object.values(moodData).length > 0 
                          ? ((count as number) / Object.values(moodData).reduce((a: number, b: any) => a + b, 0)) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Weekly Task Progress</h2>
          <div className="space-y-3">
            {weeklyTaskData.map((day) => (
              <div key={day.day} className="flex items-center justify-between">
                <span className="text-sm font-medium w-12">{day.day}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full"
                      style={{ 
                        width: `${day.total > 0 ? (day.completed / day.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-600">
                  {day.completed}/{day.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Goal Progress Timeline */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Goal Progress</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            {stats && stats.activeGoals > 0 ? (
              <div className="space-y-4">
                {/* Placeholder for actual goals - would fetch from goalService */}
                <div className="relative flex items-center">
                  <div className="absolute left-4 w-2 h-2 bg-blue-600 rounded-full -translate-x-1/2"></div>
                  <div className="ml-10">
                    <p className="font-medium">Active Goals</p>
                    <p className="text-sm text-gray-600">{stats.activeGoals} in progress</p>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 w-2 h-2 bg-green-600 rounded-full -translate-x-1/2"></div>
                  <div className="ml-10">
                    <p className="font-medium">Completed Goals</p>
                    <p className="text-sm text-gray-600">{stats.completedGoals} achieved</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 ml-10">No goals tracked yet</p>
            )}
          </div>
        </div>

        {/* Habit Streak Calendar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Habit Consistency</h2>
          <div className="grid grid-cols-7 gap-1">
            {/* Calendar header */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="text-center text-xs text-gray-500 font-medium py-1">
                {day}
              </div>
            ))}
            {/* Calendar days - placeholder data */}
            {Array.from({ length: 35 }, (_, i) => {
              const hasHabit = Math.random() > 0.3
              const intensity = hasHabit ? Math.floor(Math.random() * 4) + 1 : 0
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${
                    intensity === 0 ? 'bg-gray-100' :
                    intensity === 1 ? 'bg-green-200' :
                    intensity === 2 ? 'bg-green-300' :
                    intensity === 3 ? 'bg-green-400' :
                    'bg-green-500'
                  }`}
                  title={`${intensity} habits completed`}
                />
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
            <span>Less</span>
            <div className="flex space-x-1">
              {[100, 200, 300, 400, 500].map((shade) => (
                <div key={shade} className={`w-3 h-3 rounded-sm bg-green-${shade}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">AI-Powered Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">📈 Productivity Trends</h3>
            <p className="text-purple-100">
              Your task completion rate has improved by 15% this week. 
              You're most productive on Wednesdays and Thursdays.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">🎯 Goal Recommendations</h3>
            <p className="text-purple-100">
              Based on your progress, consider breaking down larger goals into 
              smaller milestones for better tracking.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">🧘 Well-being Analysis</h3>
            <p className="text-purple-100">
              Your mood has been consistently positive. Keep maintaining 
              your current routine and habit consistency.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">💡 Next Steps</h3>
            <p className="text-purple-100">
              Focus on completing your {stats?.pendingTasks || 0} pending tasks. 
              Consider setting up reminders for better task management.
            </p>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Export Your Data</h2>
            <p className="text-gray-600 text-sm mt-1">
              Download your analytics data for the selected period
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium">
              Export as CSV
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium">
              Generate PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Task Categories</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                Work
              </span>
              <span className="text-gray-600">45%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                Personal
              </span>
              <span className="text-gray-600">30%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                Health
              </span>
              <span className="text-gray-600">15%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                Learning
              </span>
              <span className="text-gray-600">10%</span>
            </div>
          </div>
        </div>

        {/* Time Management */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Time Distribution</h3>
          <div className="relative h-48">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">168</p>
                <p className="text-sm text-gray-600">hours/week</p>
              </div>
            </div>
            {/* Placeholder for circular progress */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="#e5e7eb"
                strokeWidth="16"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="#8b5cf6"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 80 * 0.3} ${2 * Math.PI * 80}`}
              />
            </svg>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            30% of time on tracked activities
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🏆</span>
              </div>
              <p className="text-xs text-gray-600">Week Warrior</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-xs text-gray-600">Goal Getter</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🔥</span>
              </div>
              <p className="text-xs text-gray-600">7-Day Streak</p>
            </div>
            <div className="text-center opacity-50">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🌟</span>
              </div>
              <p className="text-xs text-gray-600">Locked</p>
            </div>
            <div className="text-center opacity-50">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">💎</span>
              </div>
              <p className="text-xs text-gray-600">Locked</p>
            </div>
            <div className="text-center opacity-50">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-2xl">🚀</span>
              </div>
              <p className="text-xs text-gray-600">Locked</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}