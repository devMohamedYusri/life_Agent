// app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@lib/stores/authStore'
import { userService } from '@lib/database/users'
// import { notificationService } from '@lib/database/notifications'
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

interface UserProfile {
  id: string
  email: string
  user_name: string
  avatar_url?: string
  bio?: string
  created_at: string
}

interface NotificationSettings {
  emailReminders: boolean
  taskDeadlines: boolean
  dailyDigest: boolean
  weeklyReport: boolean
  habitReminders: boolean
  browserNotifications: boolean
}

export default function SettingsPage() {
  const { user, signOut } = useAuthStore()
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
    created_at: ''
  })
  
  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
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
  

  const loadUserData = useCallback(async () => {
    if (!user) return
    
    try {
      const { data } = await userService.getUserProfile(user.id)
      if (data) {
        // Ensure all values are defined to prevent controlled/uncontrolled input errors
        setProfile({
          id: data.id || '',
          email: data.email || '',
          user_name: data.user_name || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          created_at: data.created_at || ''
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
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user, loadUserData])

  const handleMessage = useCallback((msg: string, isError: boolean = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const handleProfileUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    setMessage('')
    
    try {
      await userService.updateProfile(user.id, {
        user_name: profile.user_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      })
      
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('Error updating profile. Please try again.')
    } finally {
      setLoading(false)
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account and preferences</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('Error') || message.includes('denied')
            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' 
            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
        }`}>
          {message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {activeTab === 'profile' && (
              <ProfileSettings 
                initialProfile={profile}
                onProfileUpdate={setProfile}
                onMessage={handleMessage}
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

      <div className="mt-8 flex justify-end">
        <button
          onClick={signOut}
          className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}