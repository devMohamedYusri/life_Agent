// app/dashboard/ai-plans/page.tsx
'use client'

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { taskService } from '../../lib/database/tasks'
import { goalService } from '../../lib/database/goals'
import { habitService } from '../../lib/database/habits'
import { journalService } from '../../lib/database/journal'
import { aiService } from '../../lib/ai'
import { useSupabase } from '../../lib/hooks/useSupabase'
import { toast } from 'react-hot-toast'
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
  Book,
  RefreshCw,
  Bell,
  Activity,
  BarChart2,
  Link2
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { AISuggestion, Task, Goal, Habit } from '@//types/ai-agent'

interface Suggestion extends AISuggestion {
  decision?: 'accepted' | 'rejected' | null;
  content?: string;
  notes?: string;
  category?: string;
  goal?: string;
  streak?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: Suggestion[];
  isLoading?: boolean;
  animate?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const MAX_MESSAGES_PER_CHAT = 50

interface User {
  id: string
  name?: string
  email?: string
}

interface MessageDisplayProps {
  message: Message
  user: User
  onSuggestionDecision: (messageId: string, suggestionId: string, decision: 'accepted' | 'rejected') => void
}

// Add this new component for the thinking section
const ThinkingSection = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mb-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            {!isExpanded && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="font-medium text-purple-700 dark:text-purple-300">
            AI Thinking Process
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-purple-600 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-purple-100 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-400 [&::-webkit-scrollbar-thumb]:to-indigo-500 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-track]:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to parse message content
const parseMessageContent = (content: string) => {
  if (!content) return { thinkingContent: null, mainContent: null };
  
  // Check for <think> tag
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
  let thinkingContent = null;
  let mainContent = content;
  
  if (thinkMatch) {
    thinkingContent = thinkMatch[1].trim();
    // Remove the entire think tag and its content from main content
    mainContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }
  
  // If mainContent is empty after removing think tags, return early
  if (!mainContent) {
    return { thinkingContent, mainContent: null };
  }
  
  // Parse the main content
  const lines = mainContent.split('\n');
  const parsedMainContent = lines.map((line, index) => {
    // Add guard clause to handle undefined lines
    if (typeof line !== 'string') return null;
    
    // Headers
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">{line.slice(3)}</h2>
    }
    if (line.startsWith('### ')) {
      return <h3 key={index} className="text-lg font-semibold mt-3 mb-1 text-gray-900 dark:text-white">{line.slice(4)}</h3>
    }
    
    // Lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return <li key={index} className="ml-4 list-disc text-gray-800 dark:text-gray-200">{line.slice(2)}</li>
    }
    
    // Bold text
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={index} className="text-gray-800 dark:text-gray-200">
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
        <p key={index} className="text-gray-800 dark:text-gray-200">
          {parts.map((part, i) => 
            i % 2 === 1 ? <em key={i}>{part}</em> : part
          )}
        </p>
      )
    }
    
    // Regular paragraph
    return line.trim() ? <p key={index} className="mb-2 text-gray-800 dark:text-gray-200">{line}</p> : <br key={index} />
  }).filter(Boolean); // Filter out null values
  
  return { thinkingContent, mainContent: parsedMainContent.length > 0 ? parsedMainContent : null };
};

// const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
// type TaskStatusType = typeof taskStatuses[number];

// const goalTypes = ['short-term', 'long-term'] as const;
// type GoalTypeType = typeof goalTypes[number];

// const goalStatuses = ['active', 'completed', 'paused', 'cancelled'] as const;
// type GoalStatusType = typeof goalStatuses[number];

// Helper function to get priority color classes
// const getPriorityColor = (priority: string = 'medium') => {
//   switch (priority.toLowerCase()) {
//     case 'urgent':
//       return 'from-red-500 to-red-700'
//     case 'high':
//       return 'from-orange-500 to-orange-600'
//     case 'medium':
//       return 'from-yellow-500 to-yellow-600'
//     case 'low':
//       return 'from-green-500 to-green-600'
//     default:
//       return 'from-purple-500 to-pink-500'
//   }
// }

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
const MessageDisplay = memo(({ message, onSuggestionDecision }: MessageDisplayProps) => {
  // const [showThinking, setShowThinking] = useState(false);
  const { thinkingContent, mainContent } = parseMessageContent(message.content);
  const [isProcessing, setIsProcessing] = useState<{[key: string]: boolean}>({});
  const [displayedContent, setDisplayedContent] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (message.animate) {
      let currentText = '';
      const words = message.content.split(' ');
      
      const animateText = (index: number) => {
        if (index < words.length) {
          currentText += (index === 0 ? '' : ' ') + words[index];
          setDisplayedContent(currentText);
          setTimeout(() => animateText(index + 1), 50);
        }
      };
      
      animateText(0);
    } else {
      setDisplayedContent(message.content);
    }
  }, [message.content, message.animate]);

  const handleAcceptSuggestion = async (suggestionId: string) => {
    setIsProcessing(prev => ({ ...prev, [suggestionId]: true }));
    try {
      await onSuggestionDecision(message.id, suggestionId, 'accepted');
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    } finally {
      setIsProcessing(prev => ({ ...prev, [suggestionId]: false }));
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    setIsProcessing(prev => ({ ...prev, [suggestionId]: true }));
    try {
      await onSuggestionDecision(message.id, suggestionId, 'rejected');
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    } finally {
      setIsProcessing(prev => ({ ...prev, [suggestionId]: false }));
    }
  };

  const renderSuggestion = (suggestion: Suggestion) => {
    const isBeingProcessed = isProcessing[suggestion.id];
    const isDecided = suggestion.decision !== null;
    const isAccepted = suggestion.decision === 'accepted';
    const isRejected = suggestion.decision === 'rejected';

    const tagsArray = Array.isArray(suggestion.tags) ? suggestion.tags : (typeof suggestion.tags === 'string' && suggestion.tags ? suggestion.tags.split(',').map((tag: string) => tag.trim()) : []);

    return (
      <div
        key={suggestion.id}
        className={`relative p-6 mb-4 rounded-xl border transition-all duration-300 ${
          isAccepted
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/30'
            : isRejected
            ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800/30'
            : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:shadow-xl dark:from-gray-800 dark:to-gray-900 dark:border-gray-700'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${
                suggestion.type === 'task' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                suggestion.type === 'goal' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                suggestion.type === 'habit' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                'bg-gradient-to-br from-rose-500 to-pink-600'
              } shadow-lg`}>
                {getIconForSuggestionType(suggestion.type)}
              </div>
              <div>
                <span className={`text-sm font-bold tracking-wider ${
                  suggestion.type === 'task' ? 'text-blue-600 dark:text-blue-400' :
                  suggestion.type === 'goal' ? 'text-purple-600 dark:text-purple-400' :
                  suggestion.type === 'habit' ? 'text-amber-600 dark:text-amber-400' :
                  'text-rose-600 dark:text-rose-400'
                }`}>
                  {suggestion.type.toUpperCase()}
                </span>
                {suggestion.priority && (
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    suggestion.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {suggestion.priority} priority
                  </span>
                )}
              </div>
            </div>

            {/* Title and Description */}
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{suggestion.title}</h4>
            {suggestion.description && (
              <p className="text-base text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{suggestion.description}</p>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {suggestion.dueDate && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {new Date(suggestion.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {suggestion.targetDate && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span>Deadline: {new Date(suggestion.targetDate).toLocaleDateString()}</span>
                </div>
              )}
              {suggestion.frequency && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <RefreshCw className="w-4 h-4" />
                  <span>Repeat: {suggestion.frequency}</span>
                </div>
              )}
              {suggestion.targetCount && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Target className="w-4 h-4" />
                  <span>Target: {suggestion.targetCount} times</span>
                </div>
              )}
              {suggestion.reminderTime && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Bell className="w-4 h-4" />
                  <span>Reminder at: {suggestion.reminderTime}</span>
                </div>
              )}
              {suggestion.status && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Activity className="w-4 h-4" />
                  <span>Status: {suggestion.status}</span>
                </div>
              )}
              {suggestion.progress !== undefined && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <BarChart2 className="w-4 h-4" />
                  <span>Progress: {suggestion.progress}%</span>
                </div>
              )}
              {suggestion.goalType && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Flag className="w-4 h-4" />
                  <span>Type: {suggestion.goalType}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tagsArray && tagsArray.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tagsArray.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Related Goal */}
            {suggestion.relatedGoalId && (
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Linked to goal: {suggestion.relatedGoalId}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row lg:flex-col gap-3 justify-end min-w-[140px]">
            {isDecided ? (
              <div className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium ${
                isAccepted 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {isAccepted ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Accepted</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span>Rejected</span>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleAcceptSuggestion(suggestion.id)}
                  disabled={isBeingProcessed}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {isBeingProcessed ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  <span>Accept</span>
                </button>
                <button
                  onClick={() => handleRejectSuggestion(suggestion.id)}
                  disabled={isBeingProcessed}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 text-gray-700 dark:text-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 min-w-[120px]"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Reject</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex ${
        message.role === 'assistant' ? 'justify-start' : 'justify-end'
      } mb-4`}
    >
      <div
        className={`relative max-w-[80%] ${
          message.role === 'assistant'
            ? 'bg-white dark:bg-gray-800 rounded-tr-xl rounded-br-xl rounded-bl-xl text-gray-900 dark:text-white'
            : 'bg-purple-500 dark:bg-purple-700 text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl'
        }`}
      >
        {message.role === 'assistant' && thinkingContent && (
          <ThinkingSection content={thinkingContent} />
        )}
        
        <div className="p-4">
          {message.isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <>
              {message.role === 'assistant' ? (
                <div className="prose max-w-none dark:prose-invert">
                  {mainContent}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{displayedContent}</p>
              )}
            </>
          )}
        </div>

        {message.suggestions && message.suggestions.length > 0 && showSuggestions && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Suggestions</h3>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pb-4">
              {message.suggestions.map(renderSuggestion)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

MessageDisplay.displayName = 'MessageDisplay'

interface RawAISuggestion {
  Id?: string;
  Type: 'task' | 'habit' | 'goal' | 'journal';
  Title: string;
  Description?: string;
  Priority?: 'High' | 'Medium' | 'Low' | 'Urgent';
  Reason?: string;
  DueDate?: string;
  Completed?: boolean;
  Frequency?: 'daily' | 'weekly' | 'monthly';
  ReminderTime?: string;
  TargetCount?: number;
  TargetDate?: string;
  Progress?: number;
  GoalType?: string;
  Status?: string; // Can be any string from AI, will be lowercased
  EntryDate?: string;
  Mood?: string;
  Tags?: string[] | string; // Can be array or comma-separated string
  SubSuggestions?: RawAISuggestion[];
  RelatedGoalId?: string;
  RelatedHabitId?: string;
  Content?: string;
}

export default function AIPlansPage() {
  const { user } = useAuthStore()
  const { supabase } = useSupabase()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRecentChats, setShowRecentChats] = useState(false)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editedChatTitle, setEditedChatTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
                id: s.id || uuidv4(),
                title: s.title || 'Untitled suggestion',
                decision: s.decision === undefined ? null : s.decision
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

  const handleSuggestionDecision = useCallback(async (
    messageId: string, 
    suggestionId: string, 
    decision: 'accepted' | 'rejected'
  ) => {
    if (!currentChat || !user) return

    const updatedMessages = currentChat.messages.map(message => {
      if (message.id === messageId && message.suggestions) {
        const updatedSuggestions = message.suggestions.map(suggestion => {
          if (suggestion.id === suggestionId) {
            return { ...suggestion, decision: decision }
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

    // If suggestion was accepted, create the corresponding item
    if (decision === 'accepted') {
      const suggestion = currentChat.messages
        .find(m => m.id === messageId)
        ?.suggestions?.find(s => s.id === suggestionId);

      if (suggestion) {
        try {
          let response: {
            data: Task | Goal | Habit | null;
            error: import("@supabase/supabase-js").PostgrestError | null | unknown;
          } | null = null;

          switch (suggestion.type) {
            case 'task':
              let taskStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
              switch (suggestion.status) {
                case 'in-progress':
                  taskStatus = 'in_progress';
                  break;
                case 'completed':
                  taskStatus = 'completed';
                  break;
                case 'cancelled':
                case 'archived':
                case 'active':
                case 'paused':
                  taskStatus = 'pending';
                  break;
                default:
                  taskStatus = 'pending';
              }
              response = await taskService(supabase).createTask({
                user_id: user.id,
                title: suggestion.title,
                description: suggestion.description || '',
                priority: suggestion.priority || 'medium',
                due_date: suggestion.dueDate ? new Date(suggestion.dueDate).toISOString() : undefined,
                is_completed: false,
                status: taskStatus,
                goal_id: suggestion.relatedGoalId || null,
              });
              break;
              /*eslint-disable*/
            case 'habit':
              let habitStatus: 'active' | 'paused' | 'completed' = 'active';
              switch (suggestion.status) {
                case 'in-progress':
                  habitStatus = 'active';
                  break;
                case 'archived':
                  habitStatus = 'paused';
                  break;
                case 'completed':
                  habitStatus = 'completed';
                  break;
                case 'paused':
                  habitStatus = 'paused';
                  break;
                default:
                  habitStatus = 'active';
              }

              /*eslint-enable*/

              response = await habitService(supabase).createHabit({
                user_id: user.id,
                title: suggestion.title,
                description: suggestion.description || '',
                frequency: suggestion.frequency || 'daily',
                reminder_time: suggestion.reminderTime || undefined,
                target_count: suggestion.targetCount || 1,
              });
              break;
            case 'goal':
              let goalStatus: 'active' | 'completed' | 'paused' | 'cancelled' = 'active';
              switch (suggestion.status) {
                case 'active':
                case 'in-progress':
                  goalStatus = 'active';
                  break;
                case 'completed':
                  goalStatus = 'completed';
                  break;
                case 'archived':
                case 'paused':
                  goalStatus = 'paused';
                  break;
                case 'cancelled':
                  goalStatus = 'cancelled';
                  break;
                default:
                  goalStatus = 'active';
              }

              response = await goalService(supabase).createGoal({
                user_id: user.id,
                title: suggestion.title,
                description: suggestion.description || '',
                deadline: suggestion.targetDate || undefined,
                progress: suggestion.progress || 0,
                status: goalStatus,
                goal_type: suggestion.goalType === 'short-term' ? 'short-term' : 'long-term',
                priority: suggestion.priority || 'medium',
              });
              break;
            case 'journal':
              let tagsArray: string[] | undefined = undefined;
              if (typeof suggestion.tags === 'string' && suggestion.tags) {
                tagsArray = suggestion.tags.split(',').map((tag: string) => tag.trim()).filter(tag => tag !== '');
              } else if (Array.isArray(suggestion.tags)) {
                tagsArray = suggestion.tags;
              }
              response = await journalService(supabase).createJournalEntry({
                user_id: user.id,
                content: suggestion.content || 'No content provided.',
                entry_date: suggestion.entry_date || new Date().toISOString(),
                mood: suggestion.mood || undefined,
                tags: tagsArray,
                notes: suggestion.notes || undefined,
                is_ai_prompted: true,
              });
              break;
            default:
              console.warn("Unknown suggestion type:", suggestion.type);
              response = null;
              break;
          }

          if (response && response.error) {
            // Type assertion to treat error as PostgrestError | null
            const error = response.error as import("@supabase/supabase-js").PostgrestError | null;
            throw error;
          }

          toast.success(`${suggestion.type} "${suggestion.title}" ${decision === 'accepted' ? 'created' : 'rejected'} successfully!`);

          // After successful creation, mark the suggestion as decided globally
          setChats(prev => prev.map(chat => ({
            ...chat,
            messages: chat.messages.map(msg => ({
              ...msg,
              suggestions: msg.suggestions?.map(s =>
                s.id === suggestionId ? { ...s, decision: decision } : s
              )
            }))
          })))
        } catch (error) {
          console.error(`Error creating ${suggestion.type}:`, error);
          toast.error(`Failed to create ${suggestion.type}. Please try again.`);
        }
      }
    }
  }, [currentChat, user, supabase]);

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
      const [tasksResult, goalsResult, habitsResult, journalEntriesResult] = await Promise.all([
        taskService(supabase).getUserTasks(user.id),
        goalService(supabase).getUserGoals(user.id),
        habitService(supabase).getUserHabits(user.id),
        journalService(supabase).getUserJournalEntries(user.id),
      ])

      // Get AI response
      const aiResponse = await aiService.getResponse(input, {
        recentTasks: tasksResult.data?.slice(0, 5) || [],
        recentGoals: goalsResult.data?.slice(0, 5) || [],
        recentHabits: habitsResult.data?.slice(0, 5) || [],
        recentJournalEntries: journalEntriesResult.data?.slice(0, 5) || [],
        recentMessages
      })

      // CORRECTED: Map suggestions with proper PascalCase fields and ensure correct type casting
      const rawAiSuggestions: RawAISuggestion[] = (aiResponse.suggestions as unknown as RawAISuggestion[] || []);
      const suggestionsWithIds: Suggestion[] = rawAiSuggestions.map((s: RawAISuggestion) => {
        const base: Suggestion = {
          id: uuidv4(),
          title: s.Title || 'Untitled suggestion',
          description: s.Description || '',
          decisionStatus: undefined,
          type: s.Type.toLowerCase() as Suggestion['type'],
          decision: null,
        };

        if (base.type === 'task') {
          return {
            ...base,
            status: s.Status ? s.Status.toLowerCase().replace('_','-') as AISuggestion['status'] : 'pending',
            priority: s.Priority ? s.Priority.toLowerCase() as AISuggestion['priority'] : 'medium',
            dueDate: s.DueDate || undefined,
            relatedGoalId: s.RelatedGoalId || undefined,
            completed: s.Completed || false,
          } as Suggestion;
        } else if (base.type === 'goal') {
          return {
            ...base,
            status: s.Status ? s.Status.toLowerCase().replace('_','-') as AISuggestion['status'] : 'active',
            targetDate: s.TargetDate || undefined,
            progress: s.Progress || 0,
            goalType: s.GoalType || undefined,
          } as Suggestion;
        } else if (base.type === 'habit') {
          return {
            ...base,
            frequency: s.Frequency || 'daily',
            reminderTime: s.ReminderTime || undefined,
            targetCount: s.TargetCount || 1,
            status: s.Status ? s.Status.toLowerCase().replace('_','-') as AISuggestion['status'] : 'active',
            relatedHabitId: s.RelatedHabitId || undefined,
          } as Suggestion;
        } else if (base.type === 'journal') {
          let tagsArray: string[] | undefined = undefined;
          if (typeof s.Tags === 'string' && s.Tags) {
            tagsArray = s.Tags.split(',').map((tag: string) => tag.trim()).filter(tag => tag !== '');
          } else if (Array.isArray(s.Tags)) {
            tagsArray = s.Tags;
          }
          return {
            ...base,
            content: s.Content || '',
            entry_date: s.EntryDate || new Date().toISOString(),
            mood: s.Mood || undefined,
            tags: tagsArray,
          } as Suggestion;
        }
        return base;
      });

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
  }, [input, currentChat, user, isLoading, supabase])

  const selectChat = useCallback((chat: Chat) => {
    setCurrentChat(chat)
    setShowRecentChats(false)
    setEditingChatId(null)
    setEditedChatTitle('')
    setInput('')
  }, [])

  // Add this useEffect after the other useEffects
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 8 * 24) + 'px'
    }
  }, [input])

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
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div
        className={`${
          showRecentChats ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative w-80 h-full bg-white border-r border-gray-200 transition-transform duration-300 flex flex-col z-30 dark:bg-gray-900 dark:border-gray-700`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 dark:border-gray-700">
          <button
            onClick={createNewChat}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-purple-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500 [&::-webkit-scrollbar-thumb]:to-indigo-600 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-track]:bg-gray-800/50">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
              <p className="text-sm">No chats yet</p>
              <p className="text-xs mt-1">Start a new conversation</p>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors dark:border-gray-700 dark:hover:bg-gray-800/50 ${
                  currentChat?.id === chat.id ? 'bg-purple-100 dark:bg-purple-900/30' : ''
                }`}
                onClick={() => selectChat(chat)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editedChatTitle}
                        onChange={(e) => {
                          setEditedChatTitle(e.target.value)
                        }}
                        onBlur={() => handleSaveChatTitle(chat.id)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveChatTitle(chat.id)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-sm font-medium truncate text-gray-900 dark:text-white">
                        {chat.title}
                      </h3>
                    )}
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-1 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center text-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
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
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0 dark:bg-gray-800 dark:border-gray-700">
          <button
            onClick={() => setShowRecentChats(!showRecentChats)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-md dark:hover:bg-gray-700"
          >
            <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
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
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500 [&::-webkit-scrollbar-thumb]:to-indigo-600 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-track]:bg-gray-800/50">
          {currentChat ? (
            <div className="max-w-4xl mx-auto">
              {currentChat.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-full mb-6">
                    <MessageSquare className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Welcome to your new chat!
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md text-center dark:text-gray-400">
                    I can help you create tasks, set goals, track habits, and more.
                    Start by typing a message below.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                    <button
                      onClick={() => setInput('Create a task for completing the project report')}
                      className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Create task</span>
                      <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Complete project report</p>
                    </button>
                    <button
                      onClick={() => setInput('Set a goal to read 20 books this year')}
                      className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Set goal</span>
                      <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Read 20 books</p>
                    </button>
                    <button
                      onClick={() => setInput('Help me start a daily meditation habit')}
                      className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Track habit</span>
                      <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Daily meditation</p>
                    </button>
                    <button
                      onClick={() => setInput('Help me journal about my day')}
                      className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Journal</span>
                      <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Reflect on my day</p>
                    </button>
                  </div>
                </div>
              ) : (
                currentChat.messages.map(message => (
                  <MessageDisplay
                    key={message.id}
                    message={message}
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
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Welcome to AI Assistant
              </h3>
              <p className="text-gray-600 mb-6 max-w-md text-center dark:text-gray-400">
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
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0 dark:bg-gray-800 dark:border-gray-700">
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex space-x-4 max-w-4xl mx-auto items-end"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  // Auto-resize the textarea
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 8 * 24) + 'px'
                }}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none overflow-y-auto min-h-[40px] max-h-[192px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500 [&::-webkit-scrollbar-thumb]:to-indigo-600 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-track]:bg-gray-700"
                rows={1}
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
                className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
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