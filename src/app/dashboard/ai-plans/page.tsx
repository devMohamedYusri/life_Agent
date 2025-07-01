// app/dashboard/ai-plans/page.tsx
'use client'

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { taskService } from '../../lib/database/tasks'
import { goalService } from '../../lib/database/goals'
import { habitService } from '../../lib/database/habits'
import { aiService } from '../../lib/ai'
import { 
  Send, 
  Plus, 
  Trash2, 
  MessageSquare,
  Loader2,
  MoreVertical,
  Edit,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Target,
  Tag,
  Clipboard,
  Flag,
  TrendingUp,
  Book
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useAIAgent } from '../../lib/hooks/useAIAgent'
import { toast } from 'react-hot-toast'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Database } from '../../types/supabase'

interface Suggestion {
  Id: string
  Type: 'task' | 'goal' | 'habit' | 'journal'
  Title: string
  Description?: string
  Priority?: 'low' | 'medium' | 'high' | 'urgent'
  DueDate?: string
  Frequency?: 'daily' | 'weekly' | 'monthly'
  TargetCount?: number
  Status?: string
  Progress?: number
  Deadline?: string
  ReminderTime?: string
  Streak?: number
  EntryDate?: string
  Mood?: string
  Tags?: string[]
  Category?: string
  Goal?: string
  GoalType?: string
  Decision?: 'accepted' | 'rejected' | null
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: Suggestion[]
  isLoading?: boolean
  animate?: boolean
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const MAX_MESSAGES_PER_CHAT = 50

interface User {
  id: string
  name?: string
  email?: string
}

interface MessageDisplayProps {
  message: Message
  addTask: ReturnType<typeof useAIAgent>['addTask']
  addGoal: ReturnType<typeof useAIAgent>['addGoal']
  addHabit: ReturnType<typeof useAIAgent>['addHabit']
  addJournalEntry: ReturnType<typeof useAIAgent>['addJournalEntry']
  user: User
  onSuggestionDecision: (messageId: string, suggestionId: string, decision: 'accepted' | 'rejected') => void
}

// Helper function to parse message content
const parseMessageContent = (content: string) => {
  if (!content) return null;
  
  const lines = content.split('\n')
  return lines.map((line, index) => {
    // Add guard clause to handle undefined lines
    if (typeof line !== 'string') return null;
    
    // Headers
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-xl font-bold mt-4 mb-2">{line.slice(3)}</h2>
    }
    if (line.startsWith('### ')) {
      return <h3 key={index} className="text-lg font-semibold mt-3 mb-1">{line.slice(4)}</h3>
    }
    
    // Lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return <li key={index} className="ml-4 list-disc">{line.slice(2)}</li>
    }
    
    // Bold text
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={index}>
          {parts.map((part, i) => 
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </p>
      )
    }
    
    // Italic text
    if (line.includes('*') && !line.includes('**')) {
      const parts = line.split(/\*(.*?)\*/g)
      return (
        <p key={index}>
          {parts.map((part, i) => 
            i % 2 === 1 ? <em key={i}>{part}</em> : part
          )}
        </p>
      )
    }
    
    // Regular paragraph
    return line.trim() ? <p key={index} className="mb-2">{line}</p> : <br key={index} />
  })
}

const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
type TaskStatusType = typeof taskStatuses[number];

const goalTypes = ['short-term', 'long-term'] as const;
type GoalTypeType = typeof goalTypes[number];

const goalStatuses = ['active', 'completed', 'paused', 'cancelled'] as const;
type GoalStatusType = typeof goalStatuses[number];

// Helper function to get priority color classes
const getPriorityColor = (priority: string = 'medium') => {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'from-red-500 to-red-700'
    case 'high':
      return 'from-orange-500 to-orange-600'
    case 'medium':
      return 'from-yellow-500 to-yellow-600'
    case 'low':
      return 'from-green-500 to-green-600'
    default:
      return 'from-purple-500 to-pink-500'
  }
}

// Helper function to get icon for suggestion type
const getIconForSuggestionType = (type: string) => {
  switch (type) {
    case 'task':
      return <Clipboard className="w-6 h-6 text-purple-400" />
    case 'goal':
      return <Flag className="w-6 h-6 text-pink-400" />
    case 'habit':
      return <TrendingUp className="w-6 h-6 text-cyan-400" />
    case 'journal':
      return <Book className="w-6 h-6 text-yellow-400" />
    default:
      return <Clipboard className="w-6 h-6 text-purple-400" />
  }
}

// Memoized MessageDisplay component
const MessageDisplay = memo(({ 
  message, 
  addTask, 
  addGoal, 
  addHabit, 
  addJournalEntry, 
  user, 
  onSuggestionDecision
}: MessageDisplayProps) => {
  const [isProcessing, setIsProcessing] = useState<{[key: string]: boolean}>({})
  const [displayedContent, setDisplayedContent] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!message.content) {
      setDisplayedContent('')
      return
    }

    // For user messages or non-animated messages, show immediately
    if (message.role === 'user' || !message.animate) {
      setDisplayedContent(message.content)
      return
    }

    // For animated assistant messages
    if (message.animate && message.role === 'assistant') {
      setIsAnimating(true)
      setDisplayedContent('')
      
      const words = message.content.split(' ')
      let currentIndex = 0
      
      const interval = setInterval(() => {
        if (currentIndex < words.length) {
          setDisplayedContent(prev => {
            const newWord = words[currentIndex]
            return prev ? `${prev} ${newWord}` : newWord
          })
          currentIndex++
        } else {
          clearInterval(interval)
          setIsAnimating(false)
        }
      }, 50)

      return () => {
        clearInterval(interval)
      }
    }
  }, [message.content, message.animate, message.role])

  const handleAcceptSuggestion = useCallback(async (suggestion: Suggestion) => {
    if (!user || isProcessing[suggestion.Id]) return
    
    setIsProcessing(prev => ({ ...prev, [suggestion.Id]: true }))
    
    try {
      switch (suggestion.Type) {
        case 'task':
          await taskService.createTask({
            user_id: user.id,
            title: suggestion.Title,
            description: suggestion.Description,
            priority: suggestion.Priority || 'medium',
            due_date: suggestion.DueDate ? new Date(suggestion.DueDate).toISOString() : null,
            status: (taskStatuses.includes(suggestion.Status as TaskStatusType) 
                      ? suggestion.Status : 'pending') as TaskStatusType
          })
          break
        case 'goal':
          const goalType = (goalTypes.includes(suggestion.GoalType as GoalTypeType) 
                            ? suggestion.GoalType : 'short-term') as GoalTypeType;
          const goalStatus = (goalStatuses.includes(suggestion.Status as GoalStatusType) 
                              ? suggestion.Status : 'active') as GoalStatusType;

          await goalService.createGoal({
            user_id: user.id,
            title: suggestion.Title,
            description: suggestion.Description || '',
            priority: suggestion.Priority || 'medium',
            goal_type: goalType,
            status: goalStatus,
            deadline: suggestion.Deadline ? new Date(suggestion.Deadline).toISOString() : null,
            progress: suggestion.Progress || 0
          })
          break
        case 'habit':
          await habitService.createHabit({
            user_id: user.id,
            title: suggestion.Title,
            description: suggestion.Description || '',
            frequency: suggestion.Frequency || 'daily',
            target_count: suggestion.TargetCount || 1,
            reminder_time: suggestion.ReminderTime || null
          })
          break
        case 'journal':
          const journalEntryToInsert: Database['public']['Tables']['journal_entries']['Insert'] = {
            user_id: user.id,
            content: suggestion.Description || '',
            mood: (['neutral', 'positive', 'negative'].includes(suggestion.Mood as string) ? suggestion.Mood : null) as string | null,
            tags: suggestion.Tags || null,
            entry_date: suggestion.EntryDate ? new Date(suggestion.EntryDate).toISOString() : new Date().toISOString()
          };
          await addJournalEntry(journalEntryToInsert);
          break
      }
      
      toast.success(`${(suggestion.Type || 'item').charAt(0).toUpperCase() + (suggestion.Type || 'item').slice(1)} added successfully!`)
      onSuggestionDecision(message.id, suggestion.Id, 'accepted')
    } catch (error) {
      console.error('Error adding suggestion:', error)
      toast.error('Failed to add suggestion. Please try again.')
    } finally {
      setIsProcessing(prev => ({ ...prev, [suggestion.Id]: false }))
    }
  }, [user, isProcessing, addJournalEntry, onSuggestionDecision, message.id])

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    onSuggestionDecision(message.id, suggestionId, 'rejected')
    toast.success('Suggestion rejected')
  }, [message.id, onSuggestionDecision])

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          message.role === 'user'
            ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white'
            : 'bg-gradient-to-r from-gray-800 to-gray-900 text-gray-100 border border-gray-700'
        }`}
      >
        {/* Loading state */}
        {message.isLoading && !displayedContent ? (
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <>
            {/* Message content */}
            {(displayedContent || message.content) && (
              <div className="prose prose-sm max-w-none mb-4 text-gray-100">
                {parseMessageContent(displayedContent || message.content)}
                {isAnimating && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />}
              </div>
            )}

            {/* Suggestions */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-6 space-y-6">
                <p className="text-sm font-semibold text-purple-300 mb-2">Suggestions:</p>
                {message.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.Id}
                    className="group relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-[1.02] hover:bg-white/15"
                  >
                    {/* Gradient Border Animation */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Priority Strip */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getPriorityColor(suggestion.Priority)}`} />
                    
                    <div className="relative p-6">
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl backdrop-blur-sm">
                            {getIconForSuggestionType(suggestion.Type)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                              {suggestion.Title || 'Untitled suggestion'}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-purple-300 font-medium">
                                { (suggestion.Type || '').charAt(0).toUpperCase() + (suggestion.Type || '').slice(1) }
                              </span>
                              {suggestion.Priority && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getPriorityColor(suggestion.Priority)}`}>
                                  {suggestion.Priority.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center space-x-2">
                          {suggestion.Decision === 'accepted' && (
                            <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30 backdrop-blur-sm">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-300 text-sm font-medium">Accepted</span>
                            </div>
                          )}
                          {suggestion.Decision === 'rejected' && (
                            <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full border border-red-500/30 backdrop-blur-sm">
                              <XCircle className="w-4 h-4 text-red-400" />
                              <span className="text-red-300 text-sm font-medium">Rejected</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {suggestion.Description && (
                        <p className="text-purple-100 text-base leading-relaxed mb-6 bg-white/5 p-4 rounded-xl backdrop-blur-sm">
                          {suggestion.Description}
                        </p>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {suggestion.DueDate && (
                          <div className="flex items-center space-x-2 text-purple-200">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">Due: {new Date(suggestion.DueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {suggestion.Frequency && (
                          <div className="flex items-center space-x-2 text-purple-200">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">Frequency: {suggestion.Frequency}</span>
                          </div>
                        )}
                        {suggestion.Progress !== undefined && (
                          <div className="flex items-center space-x-2 text-purple-200">
                            <Target className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">Progress: {suggestion.Progress}%</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {suggestion.Progress !== undefined && (
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-purple-300">Progress</span>
                            <span className="text-sm text-purple-300 font-bold">{suggestion.Progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2 backdrop-blur-sm">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000 ease-out shadow-lg"
                              style={{ width: `${suggestion.Progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {suggestion.Tags && suggestion.Tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {suggestion.Tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-xs text-purple-200 border border-purple-500/30 backdrop-blur-sm hover:bg-purple-500/30 transition-colors"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {suggestion.Decision === null && (
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleRejectSuggestion(suggestion.Id)}
                            disabled={isProcessing[suggestion.Id]}
                            className="px-6 py-3 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-300 rounded-2xl font-medium hover:from-red-500/30 hover:to-pink-500/30 hover:border-red-500/50 transition-all duration-300 backdrop-blur-sm hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing[suggestion.Id] ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <XCircle className="w-4 h-4" />
                                <span>Decline</span>
                              </div>
                            )}
                          </button>
                          <button
                            onClick={() => handleAcceptSuggestion(suggestion)}
                            disabled={isProcessing[suggestion.Id]}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing[suggestion.Id] ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Plus className="w-4 h-4" />
                                <span>Accept</span>
                              </div>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Floating Particles Effect */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500/30 rounded-full animate-pulse" />
                      <div className="absolute top-1/2 -left-1 w-2 h-2 bg-pink-500/40 rounded-full animate-ping" />
                      <div className="absolute -bottom-1 left-1/3 w-3 h-3 bg-cyan-500/30 rounded-full animate-bounce" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})

MessageDisplay.displayName = 'MessageDisplay'

export default function AIPlansPage() {
  const { user } = useAuthStore()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRecentChats, setShowRecentChats] = useState(false)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editedChatTitle, setEditedChatTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addTask, addGoal, addHabit, addJournalEntry } = useAIAgent()

  // Load chats from localStorage
  useEffect(() => {
    if (user?.id) {
      const savedChats = localStorage.getItem(`ai-chats-${user.id}`)
      if (savedChats) {
        try {
          const parsedChats = JSON.parse(savedChats)
          setChats(parsedChats.map((chat: Chat) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages.map((msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              suggestions: msg.suggestions?.map(s => ({
                ...s,
                Id: s.Id || uuidv4(),
                Title: s.Title || 'Untitled suggestion'
              }))
            }))
          })))
        } catch (error) {
          console.error('Error loading chats:', error)
        }
      }
    }
  }, [user?.id])

  // Save chats to localStorage
  useEffect(() => {
    if (user?.id && chats.length > 0) {
      try {
        localStorage.setItem(`ai-chats-${user.id}`, JSON.stringify(chats))
      } catch (error) {
        console.error('Error saving chats:', error)
      }
    }
  }, [chats, user?.id])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages])

  // Focus input when chat changes
  useEffect(() => {
    if (currentChat && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentChat])

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChat(newChat)
    setShowRecentChats(false)
    setEditingChatId(null)
    setInput('')
  }, [])

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId))
    if (currentChat?.id === chatId) {
      setCurrentChat(null)
    }
  }, [currentChat?.id])

  const handleSaveChatTitle = useCallback((chatId: string) => {
    if (!editedChatTitle.trim()) return
    
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId 
          ? { ...chat, title: editedChatTitle.trim(), updatedAt: new Date() } 
          : chat
      )
    )
    
    if (currentChat?.id === chatId) {
      setCurrentChat(prev => 
        prev ? { ...prev, title: editedChatTitle.trim(), updatedAt: new Date() } : null
      )
    }
    
    setEditingChatId(null)
    setEditedChatTitle('')
  }, [editedChatTitle, currentChat?.id])

  const handleSuggestionDecision = useCallback((
    messageId: string, 
    suggestionId: string, 
    decision: 'accepted' | 'rejected'
  ) => {
    if (!currentChat) return

    const updatedMessages = currentChat.messages.map(message => {
      if (message.id === messageId && message.suggestions) {
        const updatedSuggestions = message.suggestions.map(suggestion => {
          if (suggestion.Id === suggestionId) {
            return { ...suggestion, Decision: decision }
          }
          return suggestion
        })
        return { ...message, suggestions: updatedSuggestions }
      }
      return message
    })

    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
      updatedAt: new Date()
    }

    setChats(prev => prev.map(chat => 
      chat.id === currentChat.id ? updatedChat : chat
    ))
    setCurrentChat(updatedChat)
  }, [currentChat])

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !currentChat || !user || isLoading) return

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      animate: false
    }

    // Add user message
    let newMessages = [...currentChat.messages, userMessage]

    // Enforce message limit
    if (newMessages.length > MAX_MESSAGES_PER_CHAT) {
      newMessages = newMessages.slice(-MAX_MESSAGES_PER_CHAT)
    }

    // Create temporary assistant message for loading
    const tempAssistantId = uuidv4()
    const tempAssistantMessage: Message = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      animate: false
    }
    newMessages.push(tempAssistantMessage)

    // Update chat with new messages
    const updatedChat = {
      ...currentChat,
      messages: newMessages,
      updatedAt: new Date(),
      title: currentChat.messages.length === 0 
        ? input.substring(0, 30) + (input.length > 30 ? '...' : '')
        : currentChat.title
    }

    setChats(prev => prev.map(chat => 
      chat.id === currentChat.id ? updatedChat : chat
    ))
    setCurrentChat(updatedChat)
    setInput('')
    setIsLoading(true)

    try {
      // Get context for AI
      const recentMessages = updatedChat.messages
        .filter(msg => msg.id !== tempAssistantId)
        .slice(-5)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      // Fetch user context
      const [tasksResult, goalsResult, habitsResult] = await Promise.all([
        taskService.getUserTasks(user.id),
        goalService.getUserGoals(user.id),
        habitService.getUserHabits(user.id)
      ])

      // Get AI response
      const aiResponse = await aiService.getResponse(input, {
        recentTasks: tasksResult.data?.slice(0, 5) || [],
        recentGoals: goalsResult.data?.slice(0, 5) || [],
        recentHabits: habitsResult.data?.slice(0, 5) || [],
        recentMessages
      })

      // Add IDs and ensure titles exist for suggestions
      const suggestionsWithIds = (aiResponse.suggestions || []).map(s => ({
        ...s,
        Id: uuidv4(),
        Title: s.title || 'Untitled suggestion',
        Description: s.description || '',
        Decision: null,
        Type: s.type,
      }))

      // Update temp message with actual response
      const finalMessages = newMessages.map(msg =>
        msg.id === tempAssistantId
          ? {
              ...msg,
              content: aiResponse.content || 'I apologize, but I couldn\'t generate a response.',
              suggestions: suggestionsWithIds,
              isLoading: false,
              animate: true
            }
          : msg
      )

      const finalChat = {
        ...updatedChat,
        messages: finalMessages
      }

      // FIX: Update state with the final chat
      setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? finalChat : chat
      ))
      setCurrentChat(finalChat)

    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Update temp message with error
      const errorMessages = newMessages.map(msg =>
        msg.id === tempAssistantId
          ? {
              ...msg,
              content: `I apologize, but I encountered an error: ${
                error instanceof Error ? error.message : 'Please try again later.'
              }`,
              isLoading: false,
              animate: false
            }
          : msg
      )

      const errorChat = {
        ...updatedChat,
        messages: errorMessages
      }

      setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? errorChat : chat
      ))
      setCurrentChat(errorChat)
    } finally {
      setIsLoading(false)
    }
  }, [input, currentChat, user, isLoading])

  const selectChat = useCallback((chat: Chat) => {
    setCurrentChat(chat)
    setShowRecentChats(false)
    setEditingChatId(null)
    setEditedChatTitle('')
    setInput('')
  }, [])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Please log in to use AI Plans</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-900 to-gray-950">
      {/* Sidebar */}
      <div
        className={`${
          showRecentChats ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative w-80 h-full bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 transition-transform duration-300 flex flex-col z-30`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <button
            onClick={createNewChat}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-purple-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <p className="text-sm">No chats yet</p>
              <p className="text-xs mt-1">Start a new conversation</p>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                  currentChat?.id === chat.id ? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/30' : ''
                }`}
                onClick={() => selectChat(chat)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editedChatTitle}
                        onChange={(e) => setEditedChatTitle(e.target.value)}
                        onBlur={() => handleSaveChatTitle(chat.id)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveChatTitle(chat.id)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-sm font-medium truncate text-white">
                        {chat.title}
                      </h3>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-1 bg-gray-800 border border-gray-700">
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded flex items-center text-gray-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingChatId(chat.id)
                          setEditedChatTitle(chat.title)
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded flex items-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(chat.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setShowRecentChats(!showRecentChats)}
            className="md:hidden p-2 hover:bg-gray-700 rounded-md"
          >
            <MessageSquare className="w-5 h-5 text-gray-300" />
          </button>
          
          <h1 className="text-xl font-semibold text-white">
            {currentChat?.title || 'AI Assistant'}
          </h1>
          
          {!currentChat && (
            <button
              onClick={createNewChat}
              className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:from-purple-700 hover:to-indigo-800 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden md:inline">New Chat</span>
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-900 to-gray-950">
          {currentChat ? (
            <div className="max-w-4xl mx-auto">
              {currentChat.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-full mb-6">
                    <MessageSquare className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-3">
                    Welcome to your new chat!
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-md text-center">
                    I can help you create tasks, set goals, track habits, and more.
                    Start by typing a message below.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                    <button
                      onClick={() => setInput('Create a task for completing the project report')}
                      className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-left hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="font-medium text-white">Create task</span>
                      <p className="text-sm text-gray-400 mt-1">Complete project report</p>
                    </button>
                    <button
                      onClick={() => setInput('Set a goal to read 20 books this year')}
                      className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-left hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="font-medium text-white">Set goal</span>
                      <p className="text-sm text-gray-400 mt-1">Read 20 books</p>
                    </button>
                    <button
                      onClick={() => setInput('Help me start a daily meditation habit')}
                      className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-left hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="font-medium text-white">Track habit</span>
                      <p className="text-sm text-gray-400 mt-1">Daily meditation</p>
                    </button>
                    <button
                      onClick={() => setInput('Help me journal about my day')}
                      className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-left hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="font-medium text-white">Journal</span>
                      <p className="text-sm text-gray-400 mt-1">Reflect on my day</p>
                    </button>
                  </div>
                </div>
              ) : (
                currentChat.messages.map(message => (
                  <MessageDisplay
                    key={message.id}
                    message={message}
                    addTask={addTask}
                    addGoal={addGoal}
                    addHabit={addHabit}
                    addJournalEntry={addJournalEntry}
                    user={user}
                    onSuggestionDecision={handleSuggestionDecision}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-full mb-6">
                <MessageSquare className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-medium text-white mb-3">
                Welcome to AI Assistant
              </h3>
              <p className="text-gray-400 mb-6 max-w-md text-center">
                I can help you manage your tasks, set goals, track habits, and more. 
                Start a new chat to begin!
              </p>
              <button
                onClick={createNewChat}
                className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:from-purple-700 hover:to-indigo-800 transition-colors inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Start New Chat</span>
              </button>
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentChat && (
          <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-t border-gray-700 flex-shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex space-x-4 max-w-4xl mx-auto"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-12"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
            <p className="text-xs text-gray-500 text-center mt-2">
              AI Assistant can help with tasks, goals, habits, and more
            </p>
          </div>
        )}
      </div>

      {/* Mobile overlay when sidebar is open */}
      {showRecentChats && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-20 md:hidden"
          onClick={() => setShowRecentChats(false)}
        />
      )}
    </div>
  )
}