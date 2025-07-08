// app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { userService, UserProfile } from '@//lib/database/users'
import { useSupabase } from '@//lib/hooks/useSupabase'
import { Database } from '@//types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Download, 
  LogOut,
} from 'lucide-react'

// Import new sub-components
import ProfileSettings from '@components/dashboard/settings/ProfileSettings'
import NotificationSettings from '@components/dashboard/settings/NotificationSettings'
import AppearanceSettings from '@components/dashboard/settings/AppearanceSettings'
import SecuritySettings from '@components/dashboard/settings/SecuritySettings'
import DataPrivacySettings from '@components/dashboard/settings/DataPrivacySettings'

interface NotificationSettingsType {
  emailReminders: boolean
  taskDeadlines: boolean
  dailyDigest: boolean
  weeklyReport: boolean
  habitReminders: boolean
  browserNotifications: boolean
}

export default function SettingsPage() {
  const { user, signOut } = useAuthStore()
  const { supabase } = useSupabase()
  const usersService = useMemo(() => userService(supabase as SupabaseClient<Database>), [supabase])
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  // Profile state - Initialize with proper default values
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    user_name: '',
    avatar_url: '',
    bio: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  
  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettingsType>({
    emailReminders: true,
    taskDeadlines: true,
    dailyDigest: false,
    weeklyReport: true,
    habitReminders: true,
    browserNotifications: false
  })
  
  // Theme settings
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [timeZone, setTimeZone] = useState<string>('auto')

  // Handle message display
  const handleMessage = useCallback((msg: string, isError: boolean = false) => {
    console.log("Message:", msg, "Is error:", isError)
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }, [])

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!user) return
    
    try {
      const { data } = await usersService.getUserProfile(user.id)
      if (data) {
        // Ensure all values are defined to prevent controlled/uncontrolled input errors
        setProfile({
          id: data.id || '',
          email: data.email || '',
          user_name: data.user_name || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        })
      }
      
      // Load saved preferences from localStorage
      const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'light'
      setTheme(savedTheme)
      
      const savedNotifications = localStorage.getItem('notificationSettings')
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications))
      }

      const savedTimeZone = localStorage.getItem('timeZone') || 'auto'
      setTimeZone(savedTimeZone)

    } catch (error) {
      console.error('Error loading user data:', error)
      handleMessage('Error loading user data. Please try again.', true)
    }
  }, [user, handleMessage, usersService])

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user, loadUserData])

  // Handle profile update
  const handleProfileUpdate = async (updatedProfile: UserProfile) => {
    if (!user) return
    
    setLoading(true)
    setMessage('')
    
    try {
      const { data, error } = await usersService.updateUserProfile(user.id, {
        user_name: updatedProfile.user_name,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar_url
      })

      if (error) throw error
      
      setProfile(data)
      handleMessage('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      handleMessage('Error updating profile. Please try again.', true)
    } finally {
      setLoading(false)
    }
  }

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      handleMessage('Error signing out. Please try again.', true)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Privacy', icon: Download }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account and preferences</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg transition-all duration-300 ${
          message.includes('Error') || message.includes('error') || message.includes('denied')
            ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800' 
            : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
        }`}>
          {message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Sign Out Button */}
          <div className="mt-8 pt-8 border-t dark:border-gray-700">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
            {activeTab === 'profile' && (
              <ProfileSettings 
                initialProfile={profile}
                onProfileUpdate={handleProfileUpdate}
                onMessage={handleMessage}
                loading={loading}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettings 
                initialNotifications={notifications}
                onNotificationsUpdate={setNotifications}
                onMessage={handleMessage}
              />
            )}
            {activeTab === 'appearance' && (
              <AppearanceSettings 
                initialTheme={theme}
                onThemeChange={setTheme}
                initialTimeZone={timeZone}
                onTimeZoneChange={setTimeZone}
                onMessage={handleMessage}
              />
            )}
            {activeTab === 'security' && (
              <SecuritySettings 
                onMessage={handleMessage}
              />
            )}
            {activeTab === 'data' && (
              <DataPrivacySettings 
                userProfile={profile}
                notificationSettings={notifications}
                theme={theme}
                onMessage={handleMessage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}