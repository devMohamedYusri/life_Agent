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
import { useUserTimeZone } from '../../lib/hooks/useUserTimeZone'

interface Task {
  task_id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  is_completed: boolean
  category?: { name: string; color: string; icon: string }
  goal?: { title: string }
}

type TaskStatus = "completed" | "pending" | "in_progress" | "cancelled"
type TaskPriority = "medium" | "low" | "high" | "urgent"

export default function TasksPage() {
  const { user } = useAuthStore()
  const { formatDateTime, formatDate } = useUserTimeZone();
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
    priority: 'medium' as TaskPriority,
    category_id: '',
    goal_id: '',
    status: 'pending' as TaskStatus
  })

  // Load data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      
      const [tasksResult, categoriesResult, goalsResult] = await Promise.all([
        taskService.getUserTasks(user.id),
        categoryService.getUserCategories(user.id),
        goalService.getUserGoals(user.id)
      ])
      
      if (tasksResult.error) {
        throw new Error(tasksResult.error.message)
      }
      
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
      
      if (error) {
        throw new Error(error.message)
      }
      
      await loadData()
      setShowCreateModal(false)
      resetForm()
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
      
      if (error) {
        throw new Error(error.message)
      }
      
      await loadData()
      setShowEditModal(false)
      setEditingTask(null)
      resetForm()
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
      due_date: task.due_date ? formatDateTime(task.due_date, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).replace(/\//g, '-').replace(', ', 'T').slice(0,16) : '',
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
      priority: 'medium' as TaskPriority,
      category_id: '',
      goal_id: '',
      status: 'pending' as TaskStatus
    })
  }

  // Toggle task complete
  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    try {
      const updates = {
        is_completed: !isCompleted,
        status: (!isCompleted ? "completed" : "pending") as TaskStatus
      }
      const { error } = await taskService.updateTask(taskId, updates)
      
      if (error) {
        throw new Error(error.message)
      }
      
      await loadData()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Quick status update
  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const updates = {
        status,
        is_completed: status === 'completed'
      }
      const { error } = await taskService.updateTask(taskId, updates)
      
      if (error) {
        throw new Error(error.message)
      }
      
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
        status: "pending" as TaskStatus,
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getStatusInfo = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return { icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'text-green-500', label: 'Completed' }
      case 'pending': return { icon: <Clock className="w-4 h-4 text-orange-500" />, color: 'text-orange-500', label: 'Pending' }
      case 'in_progress': return { icon: <PlayCircle className="w-4 h-4 text-blue-500" />, color: 'text-blue-500', label: 'In Progress' }
      case 'cancelled': return { icon: <XCircle className="w-4 h-4 text-red-500" />, color: 'text-red-500', label: 'Cancelled' }
      default: return { icon: <AlertCircle className="w-4 h-4 text-gray-500" />, color: 'text-gray-500', label: 'Unknown' }
    }
  }

  const isOverdue = (dueDate: string, status: TaskStatus) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < now;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (sortBy === 'priority') {
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return 0;
  });

  const filteredTasks = sortedTasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'pending') return task.status === 'pending';
    if (filter === 'in_progress') return task.status === 'in_progress';
    if (filter === 'overdue') return isOverdue(task.due_date, task.status) && task.status !== 'completed';
    if (filter === 'today') {
      const today = formatDate(new Date(), { year: 'numeric', month: 'short', day: 'numeric' });
      const taskDate = formatDate(task.due_date, { year: 'numeric', month: 'short', day: 'numeric' });
      return taskDate === today && task.status !== 'completed';
    }
    if (filter === 'week') {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const taskDate = new Date(task.due_date);
      return taskDate >= today && taskDate <= nextWeek && task.status !== 'completed';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your daily tasks and to-dos</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Task</span>
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 flex flex-wrap gap-2">
            {['all', 'today', 'week', 'pending', 'in_progress', 'completed', 'overdue'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                  filter === filterOption
                    ? 'bg-purple-600 dark:bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filterOption.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex-shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="due_date">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <p className="text-gray-500 dark:text-gray-400">No tasks found. Time to create one!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.task_id} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-visible border border-gray-100 dark:border-gray-700"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => toggleTaskComplete(task.task_id, task.is_completed)}
                      className="form-checkbox h-5 w-5 text-purple-600 transition duration-150 ease-in-out rounded focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="ml-3">
                      <h3 className={`text-xl font-semibold ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>{task.title}</h3>
                      {task.description && (
                        <p className={`text-sm mt-1 ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{task.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Options Menu */}
                  <div className="relative flex-shrink-0 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTaskMenu(showTaskMenu === task.task_id ? null : task.task_id);
                      }}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Task options"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>

                    {showTaskMenu === task.task_id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-30">
                        <button
                          onClick={() => startEdit(task)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Edit2 className="mr-3 h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            duplicateTask(task);
                            setShowTaskMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Copy className="mr-3 h-4 w-4" /> Duplicate
                        </button>
                        <button
                          onClick={() => {
                            updateTaskStatus(task.task_id, task.status === 'completed' ? 'pending' : 'completed');
                            setShowTaskMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          {task.status === 'completed' ? ( <XCircle className="mr-3 h-4 w-4" />) : (<CheckCircle className="mr-3 h-4 w-4" />)}
                          {task.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                        </button>
                        <button
                          onClick={() => {
                            deleteTask(task.task_id);
                            setShowTaskMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                        >
                          <Trash2 className="mr-3 h-4 w-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    <Flag className="inline-block w-3 h-3 mr-1" /> {task.priority}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusInfo(task.status).color.replace('text', 'bg').replace('-500', '-100').replace('-400', '-100')} ${getStatusInfo(task.status).color}`}>
                    {getStatusInfo(task.status).icon} {getStatusInfo(task.status).label}
                  </span>
                  {task.category && (
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: task.category.color + '20', color: task.category.color }}
                    >
                      {task.category.icon} {task.category.name}
                    </span>
                  )}
                  {task.goal && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      <Target className="inline-block w-3 h-3 mr-1" /> {task.goal.title}
                    </span>
                  )}
                  {task.due_date && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${isOverdue(task.due_date, task.status) ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                      <Calendar className="inline-block w-3 h-3 mr-1" /> 
                      {formatDateTime(task.due_date, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                ></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date (Optional)</label>
                  <input
                    type="datetime-local"
                    id="due_date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category (Optional)</label>
                  <select
                    id="category_id"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.category_id} value={category.category_id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="goal_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal (Optional)</label>
                  <select
                    id="goal_id"
                    value={formData.goal_id}
                    onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Goal</option>
                    {goals.map(goal => (
                      <option key={goal.goal_id} value={goal.goal_id}>{goal.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Edit Task</h2>
            <form onSubmit={handleEditTask} className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                ></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date (Optional)</label>
                  <input
                    type="datetime-local"
                    id="edit-due_date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    id="edit-priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category (Optional)</label>
                  <select
                    id="edit-category_id"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.category_id} value={category.category_id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-goal_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal (Optional)</label>
                  <select
                    id="edit-goal_id"
                    value={formData.goal_id}
                    onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Goal</option>
                    {goals.map(goal => (
                      <option key={goal.goal_id} value={goal.goal_id}>{goal.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  id="edit-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTask(null);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}