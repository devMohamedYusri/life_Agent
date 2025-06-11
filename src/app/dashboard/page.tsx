'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../lib/stores/authStore'
import { userService } from '../lib/database/users'

interface UserStats {
  totalHabits: number;
  totalGoals: number;
  activeGoals: number;
  pendingTasks: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        console.log('No user found, skipping data load')
        setLoading(false)
        setStats(null)
        return
      }

      try {
        console.log('Loading dashboard data for user:', user.id)
        const { data: userStats, error: statsError } = await userService.getUserStats(user.id)
        
        if (statsError) {
          console.error('Error fetching stats:', statsError)
          setError('Failed to load dashboard data. Please try again.')
          setStats(null)
        } else {
          console.log('Successfully loaded stats:', userStats)
          setStats(userStats)
          setError(null)
        }
      } catch (error) {
        console.error('Unexpected error loading dashboard data:', error)
        setError('An unexpected error occurred. Please refresh the page.')
        setStats(null)
      } finally {
        setLoading(false)
        console.log('Loading completed, state set to false')
      }
    }

    loadDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 bg-red-50 p-4 rounded-lg shadow">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your AI-powered life management system</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Goals</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.totalGoals || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Active Goals</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.activeGoals || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Pending Tasks</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.pendingTasks || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Habits</h3>
          <p className="text-3xl font-bold text-orange-600">{stats?.totalHabits || 0}</p>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Get Started with SelfPilot</h2>
        <p className="mb-4">Start by creating your first goal or task to begin your AI-powered productivity journey.</p>
        <div className="flex space-x-4">
          <button className="bg-white text-purple-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100">
            Create Goal
          </button>
          <button className="border border-white text-white px-4 py-2 rounded-md font-medium hover:bg-white hover:text-purple-600">
            Add Task
          </button>
        </div>
      </div>
    </div>
  )
}