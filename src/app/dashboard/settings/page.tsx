// app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { userService } from '@//lib/database/users'
import { notificationService } from '@//lib/database/notifications'
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Download, 
  LogOut,
  Moon,
  Sun,
  Check,
  Loader2,
  Mail,
  Lock,
  Trash2,
  Globe
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string
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
    full_name: '',
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
  
  // Security settings
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return
    
    try {
      const { data } = await userService.getUserProfile(user.id)
      if (data) {
        // Ensure all values are defined to prevent controlled/uncontrolled input errors
        setProfile({
          id: data.id || '',
          email: data.email || '',
          full_name: data.full_name || '',
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
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const handleProfileUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    setMessage('')
    
    try {
      await userService.updateProfile(user.id, {
        full_name: profile.full_name,
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

  const handleNotificationUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    
    try {
      // Save to localStorage
      localStorage.setItem('notificationSettings', JSON.stringify(notifications))
      
      // Request browser notification permission if enabled
      if (notifications.browserNotifications && 'Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setNotifications(prev => ({ ...prev, browserNotifications: false }))
          setMessage('Browser notifications permission denied')
          setLoading(false)
          return
        }
      }
      
      // If notificationService has updateSettings method
      if (notificationService.updateSettings) {
        await notificationService.updateSettings(user.id, notifications)
      }
      
      setMessage('Notification settings saved!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving notifications:', error)
      setMessage('Error saving notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    
    setMessage('Theme updated!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleExportData = async () => {
    setLoading(true)
    
    try {
      // Gather all user data
      const userData = {
        profile,
        exportDate: new Date().toISOString(),
        settings: {
          theme,
          notifications
        }
      }
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `life-manager-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setMessage('Data exported successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error exporting data:', error)
      setMessage('Error exporting data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    
    if (deleteConfirmText !== 'DELETE') {
      setMessage('Please type DELETE to confirm')
      return
    }
    
    setLoading(true)
    
    try {
      // Implement account deletion
      await userService.deleteAccount(user.id)
      await signOut()
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage('Error deleting account')
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
      {/* Rest of your component remains the same, but with proper value handling */}
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
        {/* Sidebar */}
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

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value || '' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={profile.avatar_url}
                      onChange={(e) => setProfile(prev => ({ ...prev, avatar_url: e.target.value || '' }))}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value || '' }))}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Email Reminders</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Get email notifications for important tasks</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.emailReminders}
                        onChange={(e) => setNotifications(prev => ({ ...prev, emailReminders: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Browser Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Get desktop notifications in your browser</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.browserNotifications}
                        onChange={(e) => setNotifications(prev => ({ ...prev, browserNotifications: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Add more notification options */}
                  {Object.entries({
                    taskDeadlines: 'Task deadline reminders',
                    dailyDigest: 'Daily activity digest',
                    weeklyReport: 'Weekly progress report',
                    habitReminders: 'Habit tracking reminders'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[key as keyof NotificationSettings]}
                          onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleNotificationUpdate}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Preferences</span>
                </button>
              </div>
            )}

            {/* Rest of the tabs remain the same... */}
            {/* I'll include them for completeness */}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          theme === 'light' 
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <Sun className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Light</p>
                      </button>
                      
                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          theme === 'dark' 
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <Moon className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Dark</p>
                      </button>
                      
                      <button
                        onClick={() => handleThemeChange('system')}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          theme === 'system' 
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <Settings className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">System</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600">
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab remains the same */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-medium text-gray-900 dark:text-white">Change Password</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Update your password to keep your account secure
                    </p>
                    <button className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                      Change Password
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <button className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                      Enable 2FA
                    </button>
                  </div>

                  <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <h3 className="font-medium text-red-900 dark:text-red-200">Delete Account</h3>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      Permanently delete your account and all associated data
                    </p>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Delete Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">
                          Type "DELETE" to confirm account deletion:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full px-4 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Type DELETE"
                        />
                        <div className="flex space-x-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== 'DELETE' || loading}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            {loading ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false)
                              setDeleteConfirmText('')
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Data & Privacy</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                    <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-medium text-gray-900 dark:text-white">Export Your Data</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Download a copy of all your data in JSON format
                    </p>
                    <button
                      onClick={handleExportData}
                      disabled={loading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? 'Exporting...' : 'Export Data'}
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-medium text-gray-900 dark:text-white">Privacy Settings</h3>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded text-purple-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Allow analytics to improve the app
                        </span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded text-purple-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Share anonymous usage data
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
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