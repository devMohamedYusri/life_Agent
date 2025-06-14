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
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  priority: string;
  due_date: string;
}

interface Goal {
  goal_id: string;
  id?: string;
  title: string;
  description: string;
  status: string;
  deadline: string;
}

interface Habit {
  habit_id: string;
  id?: string;
  title?: string;
  name?: string;
  description: string;
}

interface JournalEntry {
  entry_id: string;
  id?: string;
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

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }

      // Escape to close
      if (event.key === 'Escape') {
        setIsOpen(false)
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
  }, [isOpen, results, selectedIndex])

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
              id: task.task_id || task.id || '',
              title: title,
              type: 'task',
              description: description,
              status: task.completed ? 'completed' : 'pending',
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
              id: goal.goal_id || goal.id || '',
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
              id: habit.habit_id || habit.id || '',
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
              id: entry.entry_id || entry.id || '',
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
    performSearch(query)
  }, [query, performSearch])

  const handleResultClick = (result: SearchResult) => {
    router.push(`/dashboard/${result.type}s`)
    setIsOpen(false)
    setQuery('')
  }

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
    if (result.type === 'task' && result.priority === 'high') return 'text-red-600'
    if (result.type === 'task' && result.priority === 'medium') return 'text-yellow-600'
    if (result.status === 'completed') return 'text-green-600'
    return 'text-gray-600'
  }

  return (
    <div ref={searchRef} className="relative">
      {/* Search Button */}
      <button
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 rounded">
          ⌘K
        </kbd>
      </button>

          {/* Search Modal */}
          {isOpen && (
        <div className="absolute top-12 left-0 right-0 sm:left-auto sm:right-0 w-full sm:w-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400 ml-4" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, goals, habits, and journal entries..."
              className="flex-1 px-4 py-4 text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-400"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="mr-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Search Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-start space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className={`mt-0.5 ${getStatusColor(result)}`}>
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {result.title}
                        </p>
                        <span className="text-xs text-gray-500 capitalize">
                          {result.type}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                          {result.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 mt-1">
                        {result.date && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(result.date).toLocaleDateString()}
                          </span>
                        )}
                        {result.priority && (
                          <span className={`text-xs capitalize ${
                            result.priority === 'high' ? 'text-red-600' :
                            result.priority === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {result.priority} priority
                          </span>
                        )}
                        {result.status && (
                          <span className={`text-xs capitalize ${
                            result.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {result.status}
                          </span>
                        )}
                        {result.mood && (
                          <span className="text-xs text-gray-500">
                            Mood: {result.mood}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5" />
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No results found for "{query}"</p>
                <p className="text-sm text-gray-400 mt-1">Try searching with different keywords</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">Start typing to search</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['task', 'goal', 'habit', 'journal'].map(type => (
                    <button
                      key={type}
                      onClick={() => setQuery(type)}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Search {type}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                <span className="ml-1">Open</span>
              </span>
              <span className="flex items-center">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">esc</kbd>
                <span className="ml-1">Close</span>
              </span>
            </div>
            <span>{results.length} results</span>
          </div>
        </div>
      )}
    </div>
  )
}