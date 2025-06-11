'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { taskService } from '../../lib/database/tasks'
import { categoryService } from '../../lib/database/categories'
import { goalService } from '../../lib/database/goals'

interface Task {
  task_id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
  is_completed: boolean
  category?: { name: string; color: string; icon: string }
  goal?: { title: string }
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    category_id: '',
    goal_id: '',
    status: 'pending'
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load tasks
      const { data: tasksData, error: tasksError } = await taskService.getUserTasks(user!.id)
      if (tasksError) throw tasksError
      setTasks(tasksData || [])
      
      // Load categories
      const { data: categoriesData } = await categoryService.getUserCategories(user!.id)
      setCategories(categoriesData || [])
      
      // Load goals
      const { data: goalsData } = await goalService.getUserGoals(user!.id)
      setGoals(goalsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const taskData = {
        ...formData,
        user_id: user!.id,
        due_date: formData.due_date || null,
        category_id: formData.category_id || null,
        goal_id: formData.goal_id || null
      }
      
      const { error } = await taskService.createTask(taskData)
      
      if (!error) {
        await loadData()
        setShowCreateModal(false)
        setFormData({
          title: '',
          description: '',
          due_date: '',
          priority: 'medium',
          category_id: '',
          goal_id: '',
          status: 'pending'
        })
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await taskService.uncompleteTask(taskId)
      } else {
        await taskService.completeTask(taskId)
      }
      await loadData()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    
    try {
      await taskService.deleteTask(taskId)
      await loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    if (filter === 'pending') return task.status === 'pending'
    if (filter === 'completed') return task.status === 'completed'
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      return task.due_date && task.due_date.startsWith(today)
    }
    return true
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-2">Manage your daily tasks and to-dos</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-4">
          {['all', 'pending', 'completed', 'today'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-md font-medium capitalize ${
                filter === filterOption
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">No tasks found. Create your first task!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.task_id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={() => toggleTaskComplete(task.task_id, task.is_completed)}
                    className="mt-1 h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      {task.category && (
                        <span 
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: task.category.color + '20', color: task.category.color }}
                        >
                          {task.category.icon} {task.category.name}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-gray-500">
                          📅 {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.goal && (
                        <span className="text-xs text-purple-600">
                          🎯 {task.goal.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.task_id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Related Goal</label>
                <select
                  value={formData.goal_id}
                  onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No Goal</option>
                  {goals.map((goal) => (
                    <option key={goal.goal_id} value={goal.goal_id}>
                      {goal.title}
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}