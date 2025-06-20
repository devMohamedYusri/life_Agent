// app/components/Header.tsx
'use client'

import { useAuthStore } from "@//lib/stores/authStore"
import { useRouter } from "next/navigation"
import { useState, useEffect, Dispatch, SetStateAction, useRef } from "react"
import { GlobalSearch } from "../GloabalSearch"
import { Notification } from "@//lib/database/notifications"
import Link from "next/link"
import Image from "next/image"
import { Bell, User, Settings, LogOut, Menu, Moon, Sun } from 'lucide-react'
import Ably from 'ably';

interface HeaderProps {
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
    const ablyClient = useRef<Ably.Realtime | null>(null);
    const { user, signOut } = useAuthStore()
    const [showDropdown, setShowDropdown] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const router = useRouter()

    // Initialize theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light'
        setTheme(savedTheme)
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark')
        }
    }, [])

    // Handle Ably connection
    useEffect(() => {
        if (!user) {
            // Clean up existing connection when user logs out
            if (ablyClient.current) {
                ablyClient.current.close();
                ablyClient.current = null;
            }
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const initializeAbly = async () => {
            try {
                // Load initial notifications
                const res = await fetch('/api/notifications', { 
                    headers: { 'x-user-id': user.id } 
                });
                
                if (res.ok) {
                    const json = await res.json();
                    const initialNotifications = json.notifications || [];
                    setNotifications(initialNotifications);
                    setUnreadCount(initialNotifications.length);
                }

                // Initialize Ably only if not already connected
                if (!ablyClient.current) {
                    ablyClient.current = new Ably.Realtime({
                        authUrl: '/api/ably-auth',
                        authHeaders: { 'x-user-id': user.id },
                        // Fixed options - removed invalid 'recover: null'
                        closeOnUnload: true,
                        autoConnect: true,
                        echoMessages: false,
                        disconnectedRetryTimeout: 15000, // 15 seconds
                        suspendedRetryTimeout: 30000, // 30 seconds
                    });

                    // Handle connection state changes
                    ablyClient.current.connection.on('connected', () => {
                        console.log('Ably connected');
                    });

                    ablyClient.current.connection.on('disconnected', () => {
                        console.log('Ably disconnected');
                    });

                    ablyClient.current.connection.on('failed', (error) => {
                        console.error('Ably connection failed:', error);
                        // Clean up on failure
                        if (ablyClient.current) {
                            ablyClient.current.close();
                            ablyClient.current = null;
                        }
                    });
                }

                // Subscribe to notifications channel
                const channel = ablyClient.current.channels.get(`notifications:${user.id}`);
                
                const handleNewNotification = (message: Ably.Message) => {
                    const newNotification = message.data as Notification;
                    setNotifications(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                };

                channel.subscribe('new-notification', handleNewNotification);

                // Cleanup function
                return () => {
                    channel.unsubscribe('new-notification', handleNewNotification);
                };
            } catch (error) {
                console.error('Error initializing Ably:', error);
            }
        };

        initializeAbly();
    }, [user]);

    // Clean up Ably connection on component unmount
    useEffect(() => {
        return () => {
            if (ablyClient.current) {
                ablyClient.current.close();
                ablyClient.current = null;
            }
        };
    }, []);

    const handleSignOut = async () => {
        // Close Ably connection before signing out
        if (ablyClient.current) {
            ablyClient.current.close();
            ablyClient.current = null;
        }
        await signOut()
        router.push('/auth/signin')
    }

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)
        document.documentElement.classList.toggle('dark')
    }

    const markNotificationAsRead = async (notificationId: string) => {
        try {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: { 'x-user-id': user!.id }
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    const markAllAsRead = async () => {
        try {
            setNotifications([]);
            setUnreadCount(0);
            await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: { 'x-user-id': user!.id }
            });
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 h-16 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center flex-1">
                {/* Mobile menu button */}
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 mr-3"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {/* Search */}
                <div className="flex-1 max-w-xl">
                    <GlobalSearch />
                </div>
            </div>

            <div className="flex items-center space-x-3">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
                            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 underline"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="p-4 text-center text-gray-500 dark:text-gray-400">No new notifications</p>
                                ) : (
                                    <div className="divide-y dark:divide-gray-700">
                                        {notifications.map(notification => (
                                            <div
                                                key={notification.id}
                                                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                                onClick={() => markNotificationAsRead(notification.id)}
                                            >
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {notification.scheduled_for 
                                                        ? new Date(notification.scheduled_for).toLocaleString() 
                                                        : new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 border-t dark:border-gray-700">
                                <Link
                                    href="/dashboard/settings"
                                    className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
                                    onClick={() => setShowNotifications(false)}
                                >
                                    Manage notification settings
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* User menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center space-x-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Image
                              className="h-8 w-8 rounded-full"
                              src={user?.avatar_url || '/default-avatar.png'}
                              alt="User avatar"
                              width={32}
                              height={32}
                            />
                          </div>
                          <div className="ml-3 hidden sm:block">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {user?.full_name || user?.email?.split('@')[0]}
                            </p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                        <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
                            <div className="px-4 py-3 border-b dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user?.user_metadata?.full_name || user?.full_name || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user?.email}
                                </p>
                            </div>
                            
                            <Link
                                href="/dashboard/profile"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setShowDropdown(false)}
                            >
                                <User className="w-4 h-4 mr-3" />
                                Your Profile
                            </Link>
                            
                            <Link
                                href="/dashboard/settings"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setShowDropdown(false)}
                            >
                                <Settings className="w-4 h-4 mr-3" />
                                Settings
                            </Link>
                            
                            <div className="border-t dark:border-gray-700 my-1"></div>
                            
                            <button
                                onClick={handleSignOut}
                                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <LogOut className="w-4 h-4 mr-3" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}