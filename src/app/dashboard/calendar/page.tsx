// app/dashboard/calendar/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { taskService } from '../../lib/database/tasks'
import { goalService } from '../../lib/database/goals'
import { habitService } from '../../lib/database/habits'
import { journalService } from '../../lib/database/journal'
import { useSupabase } from '../../lib/hooks/useSupabase'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Filter,
  CheckSquare,
  Target,
  RefreshCw,
  FileText,
  Clock,
  X
} from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  type: 'task' | 'goal' | 'habit' | 'journal'
  date: Date
  completed?: boolean
  priority?: string
  mood?: string
  color: string
}

interface Goal {
  id: string
  title: string
  deadline?: string | null
  status: string
}

interface Habit {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  due_date?: string | null
  completed: boolean
  priority: string
}

interface JournalEntry {
  id: string
  created_at: string
  mood?: string
}

interface DayEvents {
  [key: string]: CalendarEvent[]
}

interface DayData {
  date: Date
  isCurrentMonth: boolean
  events: CalendarEvent[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CalendarPage() {
  const { user } = useAuthStore()
  const { supabase } = useSupabase()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<DayEvents>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [filters, setFilters] = useState({
    tasks: true,
    goals: true,
    habits: true,
    journal: true
  })
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const loadCalendarEvents = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      const eventsByDay: DayEvents = {}
      const promises = []

      if (filters.tasks) {
        promises.push(taskService(supabase).getUserTasks(user.id))
      }
      if (filters.goals) {
        promises.push(goalService(supabase).getUserGoals(user.id))
      }
      if (filters.habits) {
        promises.push(habitService(supabase).getUserHabits(user.id))
      }
      if (filters.journal) {
        promises.push(journalService(supabase).getUserJournalEntries(user.id))
      }

      const results = await Promise.all(promises)
      let resultIndex = 0

      // Process tasks
      if (filters.tasks && results[resultIndex]) {
        const { data: tasks } = results[resultIndex++] as { data: Task[] | null }
        tasks?.forEach((task: Task) => {
          if (task.due_date) {
            const dateKey = new Date(task.due_date).toDateString()
            if (!eventsByDay[dateKey]) eventsByDay[dateKey] = []
            eventsByDay[dateKey].push({
              id: task.id,
              title: task.title,
              type: 'task',
              date: new Date(task.due_date),
              completed: task.completed,
              priority: task.priority,
              color: task.completed ? '#10b981' : 
                     task.priority === 'high' ? '#ef4444' : 
                     task.priority === 'medium' ? '#f59e0b' : '#3b82f6'
            })
          }
        })
      }

      // Process goals
      if (filters.goals && results[resultIndex]) {
        const { data: goals } = results[resultIndex++] as { data: Goal[] | null }
        goals?.forEach((goal: Goal) => {
          if (goal.deadline) {
            const dateKey = new Date(goal.deadline).toDateString()
            if (!eventsByDay[dateKey]) eventsByDay[dateKey] = []
            eventsByDay[dateKey].push({
              id: goal.id,
              title: goal.title,
              type: 'goal',
              date: new Date(goal.deadline),
              completed: goal.status === 'completed',
              color: '#8b5cf6'
            })
          }
        })
      }

      // Process habits
      if (filters.habits && results[resultIndex]) {
        const { data: habits } = results[resultIndex++] as { data: Habit[] | null }
        const todayKey = new Date().toDateString()
        habits?.forEach((habit: Habit) => {
          if (!eventsByDay[todayKey]) eventsByDay[todayKey] = []
          eventsByDay[todayKey].push({
            id: habit.id,
            title: habit.name,
            type: 'habit',
            date: new Date(),
            color: '#ec4899'
          })
        })
      }

      // Process journal entries
      if (filters.journal && results[resultIndex]) {
        const { data: entries } = results[resultIndex++] as { data: JournalEntry[] | null }
        entries?.forEach((entry: JournalEntry) => {
          const dateKey = new Date(entry.created_at).toDateString()
          if (!eventsByDay[dateKey]) eventsByDay[dateKey] = []
          eventsByDay[dateKey].push({
            id: entry.id,
            title: 'Journal Entry',
            type: 'journal',
            date: new Date(entry.created_at),
            mood: entry.mood,
            color: '#6366f1'
          })
        })
      }

      setEvents(eventsByDay)
    } catch (error) {
      console.error('Error loading calendar events:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, filters, supabase])

  useEffect(() => {
    loadCalendarEvents()
  }, [loadCalendarEvents])

  const getDaysInMonth = (date: Date): DayData[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: DayData[] = []
    
    // Add previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        events: events[prevDate.toDateString()] || []
      })
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDateInMonth = new Date(year, month, i)
      days.push({
        date: currentDateInMonth,
        isCurrentMonth: true,
        events: events[currentDateInMonth.toDateString()] || []
      })
    }

    // Add next month's leading days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        events: events[nextDate.toDateString()] || []
      })
    }

    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    if (view === 'month') {
      setView('day')
    }
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate)

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Weekday headers */}
          {WEEKDAYS.map(day => (
            <div 
              key={day} 
              className="p-2 sm:p-4 text-center text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.substring(0, 1)}</span>
            </div>
          ))}

          {/* Calendar days */}
          {days.map(({ date, isCurrentMonth, events: dayEvents }, index) => (
            <div
              key={index}
              onClick={() => handleDayClick(date)}
              className={`
                min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r dark:border-gray-700 cursor-pointer transition-colors
                ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}
                ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                ${selectedDate?.toDateString() === date.toDateString() ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}
                ${index % 7 === 6 ? 'border-r-0' : ''}
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs sm:text-sm font-medium ${isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'dark:text-gray-200'}`}>
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1 sm:px-1.5 py-0.5 rounded-full">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event dots - hide on mobile, show limited on tablet/desktop */}
              <div className="hidden sm:block space-y-1">
                {dayEvents.slice(0, 3).map((event, i) => (
                  <div
                    key={i}
                    onClick={(e) => handleEventClick(event, e)}
                    className="flex items-center space-x-1 text-xs truncate hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-1 py-0.5"
                  >
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: event.color }}
                    />
                    <span className="truncate dark:text-gray-300">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>

              {/* Mobile event indicator */}
              <div className="sm:hidden flex space-x-1 mt-1">
                {dayEvents.slice(0, 3).map((event, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekDays.push({
        date,
        events: events[date.toDateString()] || []
      })
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <div className="grid grid-cols-8 gap-px bg-gray-200 dark:bg-gray-700 min-w-[640px]">
          {/* Time column */}
          <div className="bg-white dark:bg-gray-800 p-4">
            <div className="h-12"></div>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="h-16 text-xs text-gray-500 dark:text-gray-400 pr-2 text-right">
                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(({ date, events: dayEvents }, index) => (
            <div key={index} className="bg-white dark:bg-gray-800">
              <div className="p-4 border-b dark:border-gray-700 text-center">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {WEEKDAYS[date.getDay()]}
                </div>
                <div className={`text-lg font-semibold ${isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
                  {date.getDate()}
                </div>
              </div>
              <div className="relative h-[1536px]">
                {dayEvents.map((event, i) => (
                  <div
                    key={i}
                    className="absolute left-1 right-1 p-1 text-xs rounded cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: event.color,
                      color: 'white',
                      top: `${8 * 64}px`,
                      height: '60px'
                    }}
                    onClick={(e) => handleEventClick(event, e)}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayDate = selectedDate || currentDate
    const dayEvents = events[dayDate.toDateString()] || []

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold dark:text-white">
            {dayDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
        </div>

        {dayEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>No events scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start space-x-4 p-4 rounded-lg border dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-700/50 transition-shadow cursor-pointer"
                onClick={(e) => handleEventClick(event, e)}
              >
                <div 
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0" 
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                    <div className="flex items-center space-x-2">
                      {event.type === 'task' && event.priority && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          event.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {event.priority}
                        </span>
                      )}
                      {event.completed && (
                        <span className="text-green-600 dark:text-green-400">
                          <CheckSquare className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center space-x-1">
                      {event.type === 'task' && <CheckSquare className="w-3 h-3" />}
                      {event.type === 'goal' && <Target className="w-3 h-3" />}
                      {event.type === 'habit' && <RefreshCw className="w-3 h-3" />}
                      {event.type === 'journal' && <FileText className="w-3 h-3" />}
                      <span className="capitalize">{event.type}</span>
                    </span>
                    {event.mood && (
                      <span>Mood: {event.mood}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setView('month')}
            className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
          >
            Back to Month View
          </button>
        </div>
      </div>
    )
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage all your events in one place</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 dark:text-gray-300" />
            </button>
            
            <h2 className="text-lg sm:text-xl font-semibold min-w-[150px] sm:min-w-[200px] text-center dark:text-white">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5 dark:text-gray-300" />
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
            >
              Today
            </button>
          </div>

          {/* View Selector */}
          <div className="flex items-center space-x-2">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md capitalize transition-colors ${
                  view === v
                    ? 'bg-purple-600 dark:bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div className="flex space-x-2">
              {(Object.entries(filters) as [keyof typeof filters, boolean][]).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`px-3 py-1 text-sm rounded-full capitalize whitespace-nowrap transition-colors ${
                    value
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold dark:text-white">{selectedEvent.title}</h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedEvent.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{selectedEvent.type}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  {selectedEvent.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              {selectedEvent.priority && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Priority:</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    selectedEvent.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    selectedEvent.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  }`}>
                    {selectedEvent.priority}
                  </span>
                </div>
              )}

              {selectedEvent.completed !== undefined && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`text-sm ${selectedEvent.completed ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {selectedEvent.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              )}

              {selectedEvent.mood && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mood:</span>
                  <span className="text-sm capitalize dark:text-gray-300">{selectedEvent.mood}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  window.location.href = `/dashboard/${selectedEvent.type}s`
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Button */}
      <button
        onClick={() => {
          alert('Quick add feature coming soon!')
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 dark:bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center justify-center transition-colors"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Legend */}
      <div className="mt-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Tasks (Low Priority)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Tasks (Medium Priority)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Tasks (High Priority)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Completed Tasks</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Goals</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Habits</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Journal Entries</span>
          </div>
        </div>
      </div>
    </div>
  )
}