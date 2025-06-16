'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { goalService } from '../../lib/database/goals'
import { categoryService } from '../../lib/database/categories'

interface Task {
  id: string
  title: string
  completed: boolean
  due_date?: string | null
}

interface Category {
  name: string
  color: string
  icon: string
}

type GoalType = "short-term" | "long-term"
type GoalStatus = "active" | "completed" | "cancelled" | "paused"
type GoalPriority = "low" | "medium" | "high" | "urgent"

interface Goal {
  goal_id: string
  title: string
  description: string
  goal_type: GoalType
  progress: number
  deadline: string | null
  status: GoalStatus
  priority: GoalPriority
  category?: Category | null
  tasks: Task[]
}

interface CategoryData {
  category_id: string
  name: string
  icon: string
  color: string
}

interface GoalFormData {
  title: string
  description: string
  goal_type: GoalType
  priority: GoalPriority
  deadline: string
  category_id: string
  progress: number
}

export default function GoalsPage() {
  const { user } = useAuthStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')
  
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    goal_type: 'short-term',
    priority: 'medium',
    deadline: '',
    category_id: '',
    progress: 0
  })

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true)
      const { data: goalsData } = await goalService.getUserGoals(user.id)
      setGoals(goalsData || [])
      
      const { data: categoriesData } = await categoryService.getUserCategories(user.id)
      setCategories(categoriesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    try {
      const goalData = {
        ...formData,
        user_id: user.id,
        deadline: formData.deadline || null,
        category_id: formData.category_id || null,
        status: 'active' as GoalStatus,
        progress: formData.progress
      }
      
      const { error } = await goalService.createGoal(goalData)
      
      if (!error) {
        await loadData()
        setShowCreateModal(false)
        setFormData({
          title: '',
          description: '',
          goal_type: 'short-term',
          priority: 'medium',
          deadline: '',
          category_id: '',
          progress: 0
        })
      }
    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }

  const updateGoalStatus = async (goalId: string, status: GoalStatus) => {
    try {
      await goalService.updateGoal(goalId, { status })
      await loadData()
    } catch (error) {
      console.error('Error updating goal:', error)
    }
  }

  const deleteGoal = async (goalId: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return
    
    try {
      await goalService.deleteGoal(goalId)
      await loadData()
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true
    if (filter === 'active') return goal.status === 'active'
    if (filter === 'completed') return goal.status === 'completed'
    if (filter === 'short-term') return goal.goal_type === 'short-term'
    if (filter === 'long-term') return goal.goal_type === 'long-term'
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'completed': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'paused': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'cancelled': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
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
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Goals</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track your short-term and long-term goals</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Goal</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'completed', 'short-term', 'long-term'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                filter === filterOption
                  ? 'bg-purple-600 dark:bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {filterOption.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredGoals.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <p className="text-gray-500 dark:text-gray-400">No goals found. Create your first goal!</p>
          </div>
        ) : (
          filteredGoals.map((goal) => (
            <div key={goal.goal_id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-2">{goal.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStatusColor(goal.status)}`}>
                    {goal.status}
                  </span>
                </div>
                
                {goal.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{goal.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  {goal.category && (
                    <div className="flex items-center space-x-2">
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: goal.category.color + '20', 
                          color: goal.category.color 
                        }}
                      >
                        {goal.category.icon} {goal.category.name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="font-medium dark:text-gray-200">{goal.goal_type.replace('-', ' ')}</span>
                  </div>
                  
                  {goal.deadline && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Deadline:</span>
                      <span className="font-medium dark:text-gray-200">
                        {new Date(goal.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Tasks:</span>
                    <span className="font-medium dark:text-gray-200">{goal.tasks?.length || 0}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="font-medium dark:text-gray-200">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <select
                    value={goal.status}
                    onChange={(e) => updateGoalStatus(goal.goal_id, e.target.value as GoalStatus)}
                    className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  
                  <button
                    onClick={() => deleteGoal(goal.goal_id)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Create New Goal</h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Type</label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value as GoalType })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="short-term">Short Term</option>
                    <option value="long-term">Long Term</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as GoalPriority })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}