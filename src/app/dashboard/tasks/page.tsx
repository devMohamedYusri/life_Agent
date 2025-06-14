'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { taskService } from '../../lib/database/tasks'
import { categoryService } from '../../lib/database/categories'
import { goalService } from '../../lib/database/goals'
import { 
  Edit2, 
  Trash2, 
  Calendar, 
  Flag, 
  Target, 
  MoreVertical,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react'

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
  const [categories, setCategories] = useState<{ category_id: string; name: string; icon: string; color: string }[]>([])
  const [goals, setGoals] = useState<{ goal_id: string; title: string; description: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('due_date')
  const [showTaskMenu, setShowTaskMenu] = useState<string | null>(null)
  
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

  // Load data
  const loadData = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      const [tasksResult, categoriesResult, goalsResult] = await Promise.all([
        taskService.getUserTasks(user.id),
        categoryService.getUserCategories(user.id),
        goalService.getUserGoals(user.id)
      ])
      
      if (tasksResult.error) throw tasksResult.error
      
      setTasks(tasksResult.data || [])
      setCategories(categoriesResult.data || [])
      setGoals(goalsResult.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle create task
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
        resetForm()
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // Handle edit task
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return
    
    try {
      const updates = {
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date || null,
        priority: formData.priority,
        status: formData.status,
        category_id: formData.category_id || null,
        goal_id: formData.goal_id || null,
        is_completed: formData.status === 'completed'
      }
      
      const { error } = await taskService.updateTask(editingTask.task_id, updates)
      
      if (!error) {
        await loadData()
        setShowEditModal(false)
        setEditingTask(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Start editing
  const startEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
      priority: task.priority,
      category_id: '',
      goal_id: '',
      status: task.status
    })
    setShowEditModal(true)
    setShowTaskMenu(null)
  }

  // Reset form
  const resetForm = () => {
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

  // Toggle task complete
  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    try {
      const updates = {
        is_completed: !isCompleted,
        status: !isCompleted ? 'completed' : 'pending'
      }
      await taskService.updateTask(taskId, updates)
      await loadData()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Quick status update
  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updates = {
        status,
        is_completed: status === 'completed'
      }
      await taskService.updateTask(taskId, updates)
      await loadData()
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  // Delete task
  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    
    try {
      await taskService.deleteTask(taskId)
      await loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Duplicate task
  const duplicateTask = async (task: Task) => {
    try {
      const taskData = {
        user_id: user!.id,
        title: `${task.title} (Copy)`,
        description: task.description,
        priority: task.priority,
        status: 'pending',
        due_date: task.due_date,
        category_id: null,
        goal_id: null
      }
      
      await taskService.createTask(taskData)
      await loadData()
      setShowTaskMenu(null)
    } catch (error) {
      console.error('Error duplicating task:', error)
    }
  }

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter(task => {
      if (filter === 'all') return true
      if (filter === 'pending') return task.status === 'pending'
      if (filter === 'in-progress') return task.status === 'in-progress'
      if (filter === 'completed') return task.status === 'completed'
      if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        return task.due_date && task.due_date.startsWith(today)
      }
      if (filter === 'overdue') {
        return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'due_date') {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
      }
      if (sortBy === 'status') {
        const statusOrder = { pending: 0, 'in-progress': 1, completed: 2 }
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
      }
      return 0
    })

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-200'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: <Clock className="w-4 h-4" />, color: 'text-gray-500' }
      case 'in-progress':
        return { icon: <PlayCircle className="w-4 h-4" />, color: 'text-blue-500' }
      case 'completed':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-500' }
      case 'cancelled':
        return { icon: <XCircle className="w-4 h-4" />, color: 'text-red-500' }
      default:
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-gray-500' }
    }
  }

  // Check if task is overdue
  const isOverdue = (dueDate: string) => {
    return dueDate && new Date(dueDate) < new Date() && !['completed', 'cancelled'].includes(status)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your daily tasks and to-dos</p>
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

      {/* Filters and Sort */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'in-progress', 'completed', 'today', 'overdue'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-md font-medium capitalize text-sm ${
                  filter === filterOption
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filterOption}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
            >
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
      {filteredAndSortedTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <p className="text-gray-500 dark:text-gray-400">No tasks found. Create your first task!</p>
          </div>
        ) : (
          filteredAndSortedTasks.map((task) => {
            const statusInfo = getStatusInfo(task.status)
            const overdue = isOverdue(task.due_date)
            
            return (
              <div key={task.task_id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => toggleTaskComplete(task.task_id, task.is_completed)}
                      className="mt-1 h-5 w-5 text-purple-600 rounded border-gray-300 dark:border-gray-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <h3 className={`font-medium ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{task.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        {/* Status */}
                        <div className={`flex items-center space-x-1 ${statusInfo.color}`}>
                          {statusInfo.icon}
                          <span className="text-xs capitalize">{task.status}</span>
                        </div>
                        
                        {/* Priority */}
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                          <Flag className="w-3 h-3 inline mr-1" />
                          {task.priority}
                        </span>
                        
                        {/* Due Date */}
                        {task.due_date && (
                          <span className={`text-xs flex items-center ${overdue ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(task.due_date).toLocaleDateString()}
                            {overdue && ' (Overdue)'}
                          </span>
                        )}
                        
                        {/* Category */}
                        {task.category && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ backgroundColor: task.category.color + '20', color: task.category.color }}
                          >
                            {task.category.icon} {task.category.name}
                          </span>
                        )}
                        
                        {/* Goal */}
                        {task.goal && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center">
                            <Target className="w-3 h-3 mr-1" />
                            {task.goal.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Task Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTaskMenu(showTaskMenu === task.task_id ? null : task.task_id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    
                    {showTaskMenu === task.task_id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10">
                        <button
                          onClick={() => startEdit(task)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Task
                        </button>
                        
                        <button
                          onClick={() => duplicateTask(task)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </button>
                        
                        <hr className="my-1 dark:border-gray-700" />
                        
                        {/* Quick status updates */}
                        {task.status !== 'in-progress' && (
                          <button
                            onClick={() => updateTaskStatus(task.task_id, 'in-progress')}
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Start Task
                          </button>
                        )}
                        
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => updateTaskStatus(task.task_id, 'completed')}
                            className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Complete
                          </button>
                        )}
                        
                        {task.status !== 'cancelled' && (
                          <button
                            onClick={() => updateTaskStatus(task.task_id, 'cancelled')}
                            className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Task
                          </button>
                        )}
                        
                        <hr className="my-1 dark:border-gray-700" />
                        
                        <button
                          onClick={() => deleteTask(task.task_id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create/Edit Task Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {showEditModal ? 'Edit Task' : 'Create New Task'}
            </h2>
            <form onSubmit={showEditModal ? handleEditTask : handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Goal</label>
                <select
                  value={formData.goal_id}
                  onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">No Goal</option>
                  {goals.map((goal) => (
                    <option key={goal.goal_id} value={goal.goal_id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    setEditingTask(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  {showEditModal ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}