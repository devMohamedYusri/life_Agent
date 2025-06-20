// app/components/GlobalSearch.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, CheckSquare, Target, RefreshCw, FileText, Clock, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@//lib/stores/authStore'
import { taskService } from '@//lib/database/tasks'
import { goalService } from '@//lib/database/goals'
import { habitService } from '@//lib/database/habits'
import { journalService } from '@//lib/database/journal'
import { useRouter } from 'next/navigation'
import { debounce } from 'lodash'

interface Task {
  task_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  priority: string;
  due_date: string;
}

interface Goal {
  goal_id: string;
  title: string;
  description: string;
  status: string;
  deadline: string;
}

interface Habit {
  habit_id: string;
  title?: string;
  name?: string;
  description: string;
}

interface JournalEntry {
  entry_id: string;
  content: string;
  mood: string;
  created_at?: string;
  entry_date?: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'task' | 'goal' | 'habit' | 'journal';
  description: string;
  status?: string;
  priority?: string;
  date?: string;
  mood?: string;
}

export function GlobalSearch() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleResultClick = useCallback((result: SearchResult) => {
    router.push(`/dashboard/${result.type}s`)
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [router]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
        setResults([])
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
        setResults([])
      }

      // Arrow navigation
      if (isOpen && results.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedIndex(prev => (prev + 1) % results.length)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
        } else if (event.key === 'Enter') {
          event.preventDefault()
          handleResultClick(results[selectedIndex])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, handleResultClick])

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!user || searchQuery.trim().length < 2) {
        setResults([])
        return
      }
  
      setLoading(true)
      try {
        const searchResults: SearchResult[] = []
        const lowerQuery = searchQuery.toLowerCase()
  
        // Search tasks
        const { data: tasks } = await taskService.getUserTasks(user.id)
        tasks?.forEach((task: Task) => {
          const title = task.title || ''
          const description = task.description || ''
          
          if (
            title.toLowerCase().includes(lowerQuery) ||
            description.toLowerCase().includes(lowerQuery)
          ) {
            searchResults.push({
              id: task.task_id,
              title: title,
              type: 'task',
              description: description,
              status: task.is_completed ? 'completed' : 'pending',
              priority: task.priority,
              date: task.due_date
            })
          }
        })
  
        // Search goals
        const { data: goals } = await goalService.getUserGoals(user.id)
        goals?.forEach((goal: Goal) => {
          const title = goal.title || ''
          const description = goal.description || ''
          
          if (
            title.toLowerCase().includes(lowerQuery) ||
            description.toLowerCase().includes(lowerQuery)
          ) {
            searchResults.push({
              id: goal.goal_id,
              title: title,
              type: 'goal',
              description: description,
              status: goal.status,
              date: goal.deadline
            })
          }
        })
  
        // Search habits
        const { data: habits } = await habitService.getUserHabits(user.id)
        habits?.forEach((habit: Habit) => {
          const title = habit.title || habit.name || ''
          const description = habit.description || ''
          
          if (
            title.toLowerCase().includes(lowerQuery) ||
            description.toLowerCase().includes(lowerQuery)
          ) {
            searchResults.push({
              id: habit.habit_id,
              title: title,
              type: 'habit',
              description: description
            })
          }
        })
  
        // Search journal entries
        const { data: entries } = await journalService.getUserJournalEntries(user.id)
        entries?.forEach((entry: JournalEntry) => {
          const content = entry.content || ''
          
          if (content.toLowerCase().includes(lowerQuery)) {
            searchResults.push({
              id: entry.entry_id,
              title: `Journal Entry - ${new Date(entry.created_at || entry.entry_date || Date.now()).toLocaleDateString()}`,
              type: 'journal',
              description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
              mood: entry.mood,
              date: entry.created_at || entry.entry_date
            })
          }
        })
  
        setResults(searchResults.slice(0, 10)) // Limit to 10 results
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300),
    [user]
  )

  useEffect(() => {
    if (query.length >= 2) {
      performSearch(query)
    } else {
      setResults([])
    }
  }, [query, performSearch])

  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="w-4 h-4" />
      case 'goal':
        return <Target className="w-4 h-4" />
      case 'habit':
        return <RefreshCw className="w-4 h-4" />
      case 'journal':
        return <FileText className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStatusColor = (result: SearchResult) => {
    switch (result.status) {
      case 'completed':
        return 'text-green-500'
      case 'pending':
        return 'text-yellow-500'
      case 'active':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-yellow-500'
      case 'low':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'happy':
        return 'text-yellow-500'
      case 'sad':
        return 'text-blue-500'
      case 'angry':
        return 'text-red-500'
      case 'neutral':
        return 'text-gray-500'
      case 'excited':
        return 'text-orange-500'
      case 'stressed':
        return 'text-purple-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className="flex items-center space-x-2 px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Quick Search...</span>
        <span className="ml-auto text-xs opacity-75">⌘K</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop - separate from the search modal */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => {
              setIsOpen(false)
              setQuery('')
              setResults([])
            }}
          />
          
          {/* Search Modal */}
          <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-4 sm:p-6 md:p-20">
            <div
              ref={searchRef}
              className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-lg shadow-xl transform transition-all duration-200 ease-out"
              style={{
                animation: 'slideDown 0.2s ease-out'
              }}
            >
              <div className="flex items-center border-b dark:border-gray-700 p-4">
                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search tasks, goals, habits, journal entries..."
                  className="flex-1 bg-transparent outline-none text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {loading && <Clock className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400 ml-3" />}
                <button 
                  onClick={() => {
                    setIsOpen(false)
                    setQuery('')
                    setResults([])
                  }} 
                  className="ml-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {query.length > 0 && results.length === 0 && !loading && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No results found for &quot;{query}&quot;
                  </p>
                )}

                {query.length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    <p className="mb-4">Quick search across your workspace</p>
                    <div className="flex flex-wrap gap-2 justify-center text-xs">
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Tasks</span>
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Goals</span>
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Habits</span>
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Journal</span>
                    </div>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="p-2">
                    {results.map((result, index) => (
                      <div
                        key={result.id}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedIndex === index 
                            ? 'bg-gray-100 dark:bg-gray-800' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="flex-shrink-0 mr-3 text-gray-500 dark:text-gray-400">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                            {result.title}
                          </p>
                          {result.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {result.description}
                            </p>
                          )}
                          <div className="text-xs mt-1 flex items-center space-x-2">
                            {result.status && (
                              <span className={`font-medium ${getStatusColor(result)}`}>
                                {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                              </span>
                            )}
                            {result.priority && (
                              <span className={`font-medium ${getPriorityColor(result.priority)}`}>
                                {result.priority.charAt(0).toUpperCase() + result.priority.slice(1)} Priority
                              </span>
                            )}
                            {result.mood && (
                              <span className={`font-medium ${getMoodColor(result.mood)}`}>
                                Mood: {result.mood.charAt(0).toUpperCase() + result.mood.slice(1)}
                              </span>
                            )}
                            {result.date && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {new Date(result.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

<style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}