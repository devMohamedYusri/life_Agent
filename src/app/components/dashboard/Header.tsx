'use client'

import { useAuthStore } from "@//lib/stores/authStore"
import { useRouter } from "next/navigation"
import { useState, useEffect, Dispatch, SetStateAction, useRef } from "react"
import { GlobalSearch } from "../GloabalSearch"
import Link from "next/link"
import Image from "next/image"
import { Bell, User, Settings, LogOut, Menu, Moon, Sun, X, Search, BarChart } from 'lucide-react'
import { notificationService, Notification } from "@//lib/database/notifications"
import { useThemeStore } from '../../lib/stores/themeStore'
import { useSupabase } from '../../lib/hooks/useSupabase'
import { BrowserNotificationService } from '../../lib/database/notifications'
import * as Ably from 'ably'

interface HeaderProps {
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
    const router = useRouter()
    const { user, signOut } = useAuthStore()
    const { theme, setTheme } = useThemeStore()
    const { supabase } = useSupabase()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const ablyClient = useRef<Ably.Realtime | null>(null)
    const channelRef = useRef<Ably.RealtimeChannel | null>(null)
    const notifications_service = notificationService(supabase)
    const [showDropdown, setShowDropdown] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const notificationRef = useRef<HTMLDivElement>(null)
    const lastFetchRef = useRef<number>(0)
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [currentTime, setCurrentTime] = useState<number>(() => Date.now())
    const [showMobileSearch, setShowMobileSearch] = useState(false)

    // Format relative time helper
    const formatRelativeTime = (date: Date): string => {
        const diffInSeconds = Math.floor((currentTime - date.getTime()) / 1000)
        
        if (diffInSeconds < 60) {
            return 'just now'
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60)
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600)
            return `${hours} hour${hours > 1 ? 's' : ''} ago`
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400)
            return `${days} day${days > 1 ? 's' : ''} ago`
        } else {
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).format(date)
        }
    }

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Initialize theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light'
        setTheme(savedTheme)
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark')
        }
    }, [])

    // Request browser notification permission
    useEffect(() => {
        if (user) {
            BrowserNotificationService.requestPermission()
        }
    }, [user])

    // Update current time periodically
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    // Fetch notifications with retry
    const fetchNotificationsWithRetry = async (retries = 3, delay = 1000) => {
        // Use ref for timestamp comparison to avoid render issues
        const now = performance.now()
        if (now - lastFetchRef.current < 2000) return
        lastFetchRef.current = now

        if (isLoadingNotifications) return // Prevent concurrent fetches
        
        setIsLoadingNotifications(true)
        
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const { data, error } = await notifications_service.getUnread(user.id)
                
                if (!error && data) {
                    // Only update if there are changes
                    const hasChanges = data.length !== notifications.length || 
                        data.some((newNotif, idx) => notifications[idx]?.id !== newNotif.id)
                    
                    if (hasChanges) {
                        setNotifications(data)
                        setUnreadCount(data.length)
                    }
                    return // Success, exit retry loop
                }
                
                if (error) {
                    throw error
                }
            } catch (err) {
                const error = err as Error;
                if (attempt === retries - 1) {
                    // Only log on final attempt
                    console.error('Error fetching notifications:', {
                        message: error.message,
                        details: error.stack,
                        hint: 'Connection might be unstable',
                        code: error instanceof Error ? error.name : 'UNKNOWN'
                    })
                    // Keep existing notifications on error
                    return
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
            }
        }
        setIsLoadingNotifications(false)
    }

    // Fetch notifications
    useEffect(() => {
        if (!user) return

        // Initial fetch
        fetchNotificationsWithRetry()

        // Set up periodic refresh with debounce
        const refreshInterval = setInterval(() => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
            }
            fetchTimeoutRef.current = setTimeout(() => fetchNotificationsWithRetry(), 500)
        }, 30000) // Refresh every 30 seconds

        return () => {
            clearInterval(refreshInterval)
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
            }
        }
    }, [user, notifications_service])

    // Handle Ably connection - FIXED CONNECTION ISSUES
    useEffect(() => {
        if (!user || isConnecting) return
        
        // Make sure user has an ID
        if (!user.id) {
            console.error('User ID is missing, cannot connect to Ably');
            return;
        }

        let isMounted = true
        let connectionTimeout: NodeJS.Timeout | null = null

        const connectAbly = async () => {
            setIsConnecting(true)
            
            try {
                // Clean up any existing connection
                if (channelRef.current) {
                    channelRef.current.unsubscribe()
                    channelRef.current = null
                }
                
                if (ablyClient.current) {
                    ablyClient.current.close()
                    ablyClient.current = null
                }

                if (!isMounted) return

                // Create new Ably client with proper configuration
                ablyClient.current = new Ably.Realtime({
                    authUrl: '/api/ably-auth',
                    authMethod: 'POST',
                    autoConnect: true,
                    closeOnUnload: true,
                    echoMessages: false,
                    disconnectedRetryTimeout: 15000,
                    suspendedRetryTimeout: 30000,
                    transportParams: {
                        heartbeats: true
                    }
                })

                // Set up connection timeout
                connectionTimeout = setTimeout(() => {
                    console.error('Ably connection timeout')
                    if (ablyClient.current) {
                        ablyClient.current.close()
                        ablyClient.current = null
                    }
                    setIsConnecting(false)
                }, 15000)

                // Wait for connection
                if (!ablyClient.current) return;
                await ablyClient.current.connection.once('connected')
                
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout)
                    connectionTimeout = null
                }
                
                if (!isMounted || !ablyClient.current) return

                // Subscribe to user's notification channel
                const channelName = `notifications:${user.id}`
                channelRef.current = ablyClient.current.channels.get(channelName)
                
                await channelRef.current.subscribe('new-notification', (message: Ably.Message) => {
                    if (isMounted && message.data) {
                        const newNotification = message.data as Notification
                        setNotifications(prev => [newNotification, ...prev])
                        setUnreadCount(prev => prev + 1)
                        
                        // Show browser notification
                        BrowserNotificationService.showFromDatabaseNotification(newNotification)
                    }
                })

                // Handle connection state changes
                ablyClient.current.connection.on('suspended', () => {
                    console.warn('Ably connection suspended')
                })

                ablyClient.current.connection.on('disconnected', () => {
                    console.warn('Ably connection disconnected')
                })

                console.log('Ably connected successfully')
            } catch (error) {
                console.error('Error connecting to Ably:', error)
                if (ablyClient.current) {
                    ablyClient.current.close()
                    ablyClient.current = null
                }
            } finally {
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout)
                }
                if (isMounted) {
                    setIsConnecting(false)
                }
            }
        }

        connectAbly()

        // Cleanup function
        return () => {
            isMounted = false
            
            if (connectionTimeout) {
                clearTimeout(connectionTimeout)
            }
            
            const cleanup = async () => {
                if (channelRef.current) {
                    try {
                        channelRef.current.unsubscribe()
                    } catch (error) {
                        console.error('Error unsubscribing from channel:', error)
                    }
                    channelRef.current = null
                }
                
                if (ablyClient.current) {
                    ablyClient.current.close()
                    ablyClient.current = null
                }
            }
            
            cleanup()
        }
    }, [user,isConnecting])

    const handleSignOut = async () => {
        try {
            // Clean up Ably connection before signing out
            if (channelRef.current) {
                try {
                    channelRef.current.unsubscribe()
                } catch (error) {
                    console.error('Error unsubscribing from channel:', error)
                }
                channelRef.current = null
            }
            
            if (ablyClient.current) {
                ablyClient.current.close()
                ablyClient.current = null
            }
            
            await signOut()
            router.push('/auth/signin')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)
        document.documentElement.classList.toggle('dark')
    }

    const markNotificationAsRead = async (notificationId: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        
        try {
            // Optimistically update UI
            setNotifications(prev => {
                const updatedNotifications = prev.filter(n => n.id !== notificationId)
                // If this would empty the list, keep the old list until the server confirms
                return updatedNotifications.length > 0 ? updatedNotifications : prev
            })
            setUnreadCount(prev => Math.max(0, prev - 1))

            const { error } = await notifications_service.markAsRead(notificationId)

            if (error) {
                console.error('Error marking notification as read:', error)
                // Only fetch on error
                const { data } = await notifications_service.getUnread(user?.id || '')
                if (data) {
                    setNotifications(data)
                    setUnreadCount(data.length)
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            // Store old notifications in case of error
            const oldNotifications = [...notifications]
            
            // Optimistically update UI
            setNotifications([])
            setUnreadCount(0)

            const { error } = await notifications_service.markAllAsRead(user?.id || '')

            if (error) {
                console.error('Error marking all notifications as read:', error)
                // Revert optimistic update on error
                setNotifications(oldNotifications)
                setUnreadCount(oldNotifications.length)
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error)
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        markNotificationAsRead(notification.id)
        
        // Navigate based on notification type and entity
        if (notification.entity_type && notification.entity_id) {
            let path = '/dashboard'
            switch (notification.entity_type) {
                case 'task':
                    path = `/dashboard/tasks/${notification.entity_id}`
                    break
                case 'goal':
                    path = `/dashboard/goals/${notification.entity_id}`
                    break
                case 'habit':
                    path = `/dashboard/habits/${notification.entity_id}`
                    break
            }
            router.push(path)
            setShowNotifications(false)
        }
    }

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'task_reminder':
                return '📋'
            case 'habit_reminder':
                return '🔄'
            case 'goal_deadline':
                return '🎯'
            case 'achievement':
                return '🏆'
            default:
                return '🔔'
        }
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 h-16 flex items-center justify-between px-4 lg:px-6 relative z-40">
                <div className="flex items-center flex-1">
                    {/* Mobile menu button */}
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 mr-3 transition-colors"
                        aria-label="Open sidebar"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Search */}
                    <div className="relative flex-1 max-w-xl hidden md:block">
                        <GlobalSearch />
                    </div>

                    {/* Mobile Search Button */}
                    <button
                        onClick={() => setShowMobileSearch(!showMobileSearch)}
                        className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Toggle search"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                {/* Mobile Search Overlay */}
                {showMobileSearch && (
                    <div className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 md:hidden z-50 border-b dark:border-gray-700 shadow-lg">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowMobileSearch(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                aria-label="Close search"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <GlobalSearch />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center space-x-3">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>

                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            aria-label="View notifications"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50 max-h-[32rem] flex flex-col">
                                <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                    {notifications.length > 0 && unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                
                                <div className="flex-1 overflow-y-auto">
                                    {isLoadingNotifications && notifications.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading notifications...</p>
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">We&apos;ll notify you when something important happens</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y dark:divide-gray-700">
                                            {notifications.map((notification: Notification) => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer relative group transition-colors ${
                                                        notification.status !== 'read' ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''
                                                    }`}
                                                    onClick={() => handleNotificationClick(notification)}
                                                >
                                                    <div className="pr-8">
                                                        <div className="flex items-start">
                                                            <span className="text-lg mr-3 flex-shrink-0">
                                                                {getNotificationIcon(notification.type)}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {notification.title}
                                                                </p>
                                                                {notification.message && (
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                                        {notification.message}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                                                        {notification.scheduled_for 
                                                                            ? formatRelativeTime(new Date(notification.scheduled_for))
                                                                            : formatRelativeTime(new Date(notification.created_at))}
                                                                    </p>
                                                                    {notification.metadata && (
                                                                        <span className="text-xs text-purple-600 dark:text-purple-400">
                                                                            {notification.type.replace('_', ' ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => markNotificationAsRead(notification.id, e)}
                                                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                                        aria-label="Mark as read"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-3 border-t dark:border-gray-700 flex-shrink-0">
                                    <Link
                                        href="/dashboard/settings/notifications"
                                        className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors"
                                        onClick={() => setShowNotifications(false)}
                                    >
                                        Manage notification settings
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User menu */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center space-x-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            aria-label="User menu"
                        >
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    {user?.avatar_url || user?.user_metadata?.avatar_url ? (
                                        <Image
                                            className="h-8 w-8 rounded-full object-cover"
                                            src={user?.avatar_url || user?.user_metadata?.avatar_url}
                                            alt={user?.user_metadata?.full_name || user?.email || 'User avatar'}
                                            width={32}
                                            height={32}
                                            priority
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                            <span className="text-white font-medium text-sm">
                                                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="ml-3 hidden sm:block text-left">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[150px]">
                                        {user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 py-1 z-50">
                                <div className="px-4 py-3 border-b dark:border-gray-700">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {user?.user_metadata?.full_name || user?.full_name || user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {user?.email}
                                    </p>
                                </div>
                                
                                <Link
                                    href="/dashboard/profile"
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <User className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Your Profile
                                </Link>
                                
                                <Link
                                    href="/dashboard/analysis"
                                    onClick={() => setShowDropdown(false)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <BarChart className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Analysis
                                </Link>
                                
                                <Link
                                    href="/dashboard/settings"
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Settings
                                </Link>
                                
                                <div className="border-t dark:border-gray-700 my-1"></div>
                                
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}