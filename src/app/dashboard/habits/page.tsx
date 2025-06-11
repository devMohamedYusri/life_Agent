'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { habitService } from '../../lib/database/habits'
import { categoryService } from '../../lib/database/categories'

interface Habit {
  habit_id: string
  title: string
  description: string
  reminder_time: string
  frequency: string
  target_count: number
  category?: { name: string; color: string; icon: string }
}

interface HabitCompletion {
  completion_date: string
  is_completed: boolean
}

export default function HabitsPage() {
  const { user } = useAuthStore()
  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [completions, setCompletions] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_time: '',
    frequency: 'daily',
    target_count: 1,
    category_id: ''
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: habitsData } = await habitService.getUserHabits(user!.id)
      setHabits(habitsData || [])
      
      const { data: categoriesData } = await categoryService.getUserCategories(user!.id)
      setCategories(categoriesData || [])
      
      // Check today's completions
      const today = new Date().toISOString().split('T')[0]
      const todayCompletions: { [key: string]: boolean } = {}
      
      for (const habit of habitsData || []) {
        const { data } = await habitService.getHabitCompletionToday(habit.habit_id, user!.id)
        todayCompletions[habit.habit_id] = !!data
      }
      
      setCompletions(todayCompletions)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const habitData = {
        ...formData,
        user_id: user!.id,
        reminder_time: formData.reminder_time || null,
        category_id: formData.category_id || null
      }
      
      const { error } = await habitService.createHabit(habitData)
      
      if (!error) {
        await loadData()
        setShowCreateModal(false)
        setFormData({
          title: '',
          description: '',
          reminder_time: '',
          frequency: 'daily',
          target_count: 1,
          category_id: ''
        })
      }
    } catch (error) {
      console.error('Error creating habit:', error)
    }
  }

  const toggleHabitCompletion = async (habitId: string) => {
    try {
      if (completions[habitId]) {
        await habitService.uncompleteHabitToday(habitId, user!.id)
      } else {
        await habitService.completeHabitToday(habitId, user!.id)
      }
      await loadData()
    } catch (error) {
      console.error('Error toggling habit completion:', error)
    }
  }

  const deleteHabit = async (habitId: string) => {
    if (!window.confirm('Are you sure you want to delete this habit?')) return
    
    try {
      await habitService.deleteHabit(habitId)
      await loadData()
    } catch (error) {
      console.error('Error deleting habit:', error)
    }
  }

  const getStreakDisplay = (habitId: string) => {
    // This would need to be implemented with actual streak calculation
    return '0 days'
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Habits</h1>
          <p className="text-gray-600 mt-2">Build and track your daily habits</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Habit</span>
        </button>
      </div>

      {/* Today's Progress */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Today's Progress</h2>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold text-purple-600">
            {Object.values(completions).filter(Boolean).length} / {habits.length}
          </div>
          <div className="text-gray-600">habits completed today</div>
        </div>
        <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-purple-600 h-4 rounded-full transition-all duration-300"
            style={{ 
              width: `${habits.length > 0 ? (Object.values(completions).filter(Boolean).length / habits.length) * 100 : 0}%` 
            }}
          />
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {habits.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">No habits found. Create your first habit!</p>
          </div>
        ) : (
          habits.map((habit) => (
            <div key={habit.habit_id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{habit.title}</h3>
                    {habit.description && (
                      <p className="text-gray-600 text-sm mt-1">{habit.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleHabitCompletion(habit.habit_id)}
                    className={`ml-4 p-2 rounded-full ${
                      completions[habit.habit_id]
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {habit.category && (
                    <div className="flex items-center space-x-2">
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ backgroundColor: habit.category.color + '20', color: habit.category.color }}
                      >
                        {habit.category.icon} {habit.category.name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Frequency:</span>
                    <span className="font-medium capitalize">{habit.frequency}</span>
                  </div>
                  
                  {habit.reminder_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Reminder:</span>
                      <span className="font-medium">{habit.reminder_time}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Streak:</span>
                    <span className="font-medium text-purple-600">{getStreakDisplay(habit.habit_id)}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => deleteHabit(habit.habit_id)}
                    className="text-red-500 hover:text-red-700"
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

      {/* Create Habit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-xl font-bold mb-4">Create New Habit</h2>
          <form onSubmit={handleCreateHabit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Count</label>
                <input
                  type="number"
                  min="1"
                  value={formData.target_count}
                  onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Time</label>
              <input
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Create Habit
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
)
}