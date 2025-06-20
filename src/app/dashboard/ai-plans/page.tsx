// app/dashboard/ai-plans/page.tsx
'use client'

import { useState, useEffect, useRef, memo } from 'react'
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
  Edit
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useAIAgent } from '../../lib/hooks/useAIAgent'
import { toast } from 'react-hot-toast'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: Suggestion[]
  isLoading?: boolean
  animate?: boolean
}

interface Suggestion {
  type: 'task' | 'goal' | 'habit' | 'journal'
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  frequency?: 'daily' | 'weekly' | 'monthly'
  targetCount?: number
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
  message: Message;
  addTask: ReturnType<typeof useAIAgent>['addTask'];
  addGoal: ReturnType<typeof useAIAgent>['addGoal'];
  addHabit: ReturnType<typeof useAIAgent>['addHabit'];
  addJournalEntry: ReturnType<typeof useAIAgent>['addJournalEntry'];
  user: User;
  toast: typeof toast;
  onRejectSuggestion?: (messageId: string, suggestionIndex: number) => void;
}

// Memoized MessageDisplay component to prevent unnecessary re-renders
const MessageDisplay = memo(({ message, addJournalEntry, user, toast, onRejectSuggestion }: MessageDisplayProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatedIn, setAnimatedIn] = useState(!message.animate); 
  const [displayedContent, setDisplayedContent] = useState(''); // New state for word-by-word display

  useEffect(() => {
    if (message.animate) {
      setDisplayedContent(''); // Reset content for animation
      let i = 0;
      const words = message.content.split(' ');
      const typingInterval = setInterval(() => {
        if (i < words.length) {
          setDisplayedContent(prev => prev + words[i] + ' ');
          i++;
        } else {
          clearInterval(typingInterval);
          setAnimatedIn(true); // Mark as animated in when done typing
        }
      }, 70); // Adjust typing speed here (milliseconds per word)

      const fadeTimer = setTimeout(() => {
        setAnimatedIn(true);
      }, 50); // Initial fade-in for the container

      return () => {
        clearInterval(typingInterval);
        clearTimeout(fadeTimer);
      };
    } else {
      setDisplayedContent(message.content || ''); // Display full content instantly for non-animated messages
      setAnimatedIn(true); // Ensure non-animated messages are immediately fully visible
    }
  }, [message.animate, message.content]);

  const handleAcceptSuggestion = async (suggestion: Suggestion) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      switch (suggestion.type) {
        case 'task':
          await taskService.createTask({
            user_id: user.id,
            title: suggestion.title,
            description: suggestion.description,
            priority: suggestion.priority || 'medium',
            due_date: suggestion.dueDate ? new Date(suggestion.dueDate).toISOString() : null,
            status: 'pending'
          })
          break;
        case 'goal':
          await goalService.createGoal({
            user_id: user.id,
            title: suggestion.title,
            description: suggestion.description || '',
            priority: suggestion.priority || 'medium',
            goal_type: 'short-term',
            status: 'active'
          });
          break;
        case 'habit':
          await habitService.createHabit({
            user_id: user.id,
            title: suggestion.title,
            description: suggestion.description || '',
            frequency: suggestion.frequency || 'daily',
            target_count: suggestion.targetCount || 1
          });
          break;
        case 'journal':
          await addJournalEntry({
            content: suggestion.description || '',
            mood: 'neutral',
            tags: []
          });
          break;
      }
      toast.success(`${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} added successfully!`);
    } catch (error) {
      console.error('Error adding suggestion:', error);
      toast.error('Failed to add suggestion. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSuggestion = (suggestion: Suggestion, index: number) => {
    console.log('MessageDisplay handleRejectSuggestion called:', { suggestion, index, messageId: message.id });
    if (onRejectSuggestion) {
      onRejectSuggestion(message.id, index);
    }
    toast.success('Suggestion rejected');
  };

  return (
    <div
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          message.role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
        style={{
          opacity: animatedIn ? 1 : 0,
          transform: `translateY(${animatedIn ? '0' : '20px'})`,
          transition: message.animate ? 'opacity 0.5s ease-out, transform 0.5s ease-out' : 'none'
        }}
      >
        <div>
          {displayedContent.split('\n').map((line, i) => {
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(3)}</h2>;
            }
            if (line.startsWith('### ')) {
              return <h3 key={i} className="text-lg font-semibold mt-3 mb-1">{line.slice(4)}</h3>;
            }
            if (line.startsWith('* ') || line.startsWith('- ')) {
              return <li key={i} className="ml-4">{line.slice(2)}</li>;
            }
            if (line.match(/\*\*(.*?)\*\*/)) {
              return <strong key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</strong>;
            }
            if (line.match(/\*(.*?)\*/)) {
              return <em key={i}>{line.replace(/\*(.*?)\*/g, '$1')}</em>;
            }
            if (line.match(/$$(.*?)$$$$(.*?)$$/)) {
              return (
                <a
                  key={i}
                  href={line.match(/$$(.*?)$$$$(.*?)$$/)?.[2]}
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {line.match(/$$(.*?)$$$$(.*?)$$/)?.[1]}
                </a>
              );
            }
            return <p key={i}>{line}</p>;
          })}
        </div>

        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            {message.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-white/10 p-3 rounded-lg"
                style={{
                  opacity: 0,
                  transform: 'translateY(10px)',
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{suggestion.title}</h4>
                    {suggestion.description && (
                      <p className="text-sm opacity-80">{suggestion.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {suggestion.priority && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20">
                          {suggestion.priority}
                        </span>
                      )}
                      {suggestion.dueDate && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20">
                          {suggestion.dueDate}
                        </span>
                      )}
                      {suggestion.frequency && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20">
                          {suggestion.frequency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      disabled={isProcessing}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(suggestion, index)}
                      disabled={isProcessing}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {message.isLoading && (
          <div className="flex space-x-2 mt-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
});

// Optional: Provide a display name for debugging purposes
MessageDisplay.displayName = 'MessageDisplay';

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
  const { addTask, addGoal, addHabit, addJournalEntry } = useAIAgent()

  // Load chats from localStorage on component mount
  useEffect(() => {
    if (user?.id) {
      const savedChats = localStorage.getItem(`ai-chats-${user.id}`)
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats)
        setChats(parsedChats.map((chat: Chat) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        })))
      }
    }
  }, [user?.id])

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (user?.id && chats.length > 0) {
      localStorage.setItem(`ai-chats-${user.id}`, JSON.stringify(chats))
    }
  }, [chats, user?.id])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages])

  // Debug currentChat changes
  useEffect(() => {
    console.log('currentChat changed:', currentChat);
  }, [currentChat])

  const createNewChat = () => {
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
  }

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId))
    if (currentChat?.id === chatId) {
      setCurrentChat(null)
    }
  }

  const handleSaveChatTitle = (chatId: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, title: editedChatTitle, updatedAt: new Date() } : chat
      )
    )
    if (currentChat?.id === chatId) {
      setCurrentChat(prev => (prev ? { ...prev, title: editedChatTitle, updatedAt: new Date() } : null))
    }
    setEditingChatId(null)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !currentChat || !user) return

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    // Add user message to chat
    let newMessages = [...currentChat.messages, userMessage];

    // Enforce MAX_MESSAGES_PER_CHAT limit
    if (newMessages.length > MAX_MESSAGES_PER_CHAT) {
      newMessages = newMessages.slice(1); // Remove the oldest message
    }

    const updatedChat = {
      ...currentChat,
      messages: newMessages,
      updatedAt: new Date()
    }

    // If this is the first message in a new chat, set the title
    if (currentChat.messages.length === 0) {
      updatedChat.title = input.substring(0, 30) + (input.length > 30 ? '...' : '');
    }

    setChats(prev => prev.map(chat => 
      chat.id === currentChat.id ? updatedChat : chat
    ))
    setCurrentChat(updatedChat)
    setInput('')
    setIsLoading(true)

    try {
      // Get the last 5 messages for context
      const recentMessages = currentChat.messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Get recent items for context
      const [tasksResult, goalsResult, habitsResult] = await Promise.all([
        taskService.getUserTasks(user.id),
        goalService.getUserGoals(user.id),
        habitService.getUserHabits(user.id)
      ])

      // Get AI response with context
      const aiResponse = await aiService.getResponse(input, {
        recentTasks: tasksResult.data?.slice(0, 5),
        recentGoals: goalsResult.data?.slice(0, 5),
        recentHabits: habitsResult.data?.slice(0, 5),
        recentMessages
      })
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions,
        animate: true
      }

      // Add AI response to chat
      let finalMessages = [...updatedChat.messages, assistantMessage];

      // Enforce MAX_MESSAGES_PER_CHAT limit for AI response
      if (finalMessages.length > MAX_MESSAGES_PER_CHAT) {
        finalMessages = finalMessages.slice(1); // Remove the oldest message
      }

      const finalChat = {
        ...updatedChat,
        messages: finalMessages,
        updatedAt: new Date()
      }
      setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? finalChat : chat
      ))
      setCurrentChat(finalChat)
    } catch (error) {
      console.error('Error getting AI response:', error)
      // Add error message with more details
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I apologize, but I'm having trouble processing your request right now. ${error instanceof Error ? error.message : 'Please try again later.'}`,
        timestamp: new Date()
      }
      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, errorMessage],
        updatedAt: new Date()
      }
      setChats(prev => prev.map(chat => 
        chat.id === currentChat.id ? finalChat : chat
      ))
      setCurrentChat(finalChat)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectSuggestion = (chatId: string, messageId: string, suggestionIndex: number) => {
    console.log('Main handleRejectSuggestion called:', { chatId, messageId, suggestionIndex });
    console.log('Current chat ID:', currentChat?.id);
    console.log('Current chat messages before update:', currentChat?.messages);
    
    // Update chats state
    setChats(prev => {
      console.log('Previous chats state:', prev);
      const updatedChats = prev.map(chat => {
        if (chat.id === chatId) {
          console.log('Found matching chat:', chat.id);
          const updatedMessages = chat.messages.map(message => {
            if (message.id === messageId && message.suggestions) {
              console.log('Found matching message:', message.id, 'with suggestions:', message.suggestions);
              const updatedSuggestions = message.suggestions.filter((_, index) => index !== suggestionIndex);
              console.log('Updated suggestions for message:', messageId, updatedSuggestions);
              return {
                ...message,
                suggestions: updatedSuggestions
              };
            }
            return message;
          });
          return {
            ...chat,
            messages: updatedMessages
          };
        }
        return chat;
      });
      console.log('Updated chats state:', updatedChats);
      return updatedChats;
    });

    // Update currentChat state if it's the same chat
    if (currentChat?.id === chatId) {
      console.log('Updating currentChat state');
      setCurrentChat(prev => {
        if (!prev) return null;
        const updatedMessages = prev.messages.map(message => {
          if (message.id === messageId && message.suggestions) {
            const updatedSuggestions = message.suggestions.filter((_, index) => index !== suggestionIndex);
            console.log('Updated current chat suggestions for message:', messageId, updatedSuggestions);
            return {
              ...message,
              suggestions: updatedSuggestions
            };
          }
          return message;
        });
        const updatedChat = {
          ...prev,
          messages: updatedMessages
        };
        console.log('Updated currentChat:', updatedChat);
        return updatedChat;
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Please log in to use AI Plans</p>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Recent Chats Sidebar */}
      <div
        className={`w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 transition-transform duration-300 flex flex-col h-full ${showRecentChats ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Header section with fixed height */}
        <div className="p-4 border-b dark:border-gray-700 flex-shrink-0">
          <button
            onClick={createNewChat}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>
        {/* Chat list with scrolling enabled, constrained by flex-1 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                currentChat?.id === chat.id ? 'bg-purple-50 dark:bg-purple-900' : ''
              }`}
              onClick={() => {
                setCurrentChat(chat)
                setShowRecentChats(false)
                setEditingChatId(null)
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {editingChatId === chat.id ? (
                    <input
                      type="text"
                      value={editedChatTitle}
                      onChange={(e) => setEditedChatTitle(e.target.value)}
                      onBlur={() => handleSaveChatTitle(chat.id)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveChatTitle(chat.id)
                          e.currentTarget.blur()
                        }
                      }}
                      className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm truncate"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium truncate">
                      {chat.title}
                    </span>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-1">
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center"
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
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md flex items-center mt-1"
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
              <div className="mt-1 text-xs text-gray-500">
                {new Date(chat.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-0">
        {/* Chat Header */}
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setShowRecentChats(!showRecentChats)}
            className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {currentChat?.title || 'AI Plans'}
          </h1>
          {!currentChat && (
            <button
              onClick={createNewChat}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {currentChat ? (
            currentChat.messages.map(message => (
              <MessageDisplay 
                key={message.id} 
                message={message} 
                addTask={addTask} 
                addGoal={addGoal} 
                addHabit={addHabit} 
                addJournalEntry={addJournalEntry} 
                user={user} 
                toast={toast} 
                onRejectSuggestion={(messageId, suggestionIndex) => {
                  handleRejectSuggestion(currentChat.id, messageId, suggestionIndex)
                }}
              />
            ))
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Start a new chat
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Begin a conversation with AI to manage your tasks, goals, and habits
                </p>
                <button
                  onClick={createNewChat}
                  className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Chat</span>
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {currentChat && (
          <div className="p-4 border-t dark:border-gray-700 flex-shrink-0">
            <div className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}