'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { notificationService } from '@//lib/database/notifications'
import { Bell, Mail, Check, Loader2, Clock, Calendar, Activity, Target } from 'lucide-react'
import PushSubscriptionManager from './PushSubscriptionManager'
import { useSupabase } from '@//lib/hooks/useSupabase'

interface NotificationSettings {
  emailReminders: boolean
  taskDeadlines: boolean
  dailyDigest: boolean
  weeklyReport: boolean
  habitReminders: boolean
  browserNotifications: boolean
}

interface NotificationSettingsProps {
  initialNotifications: NotificationSettings;
  onNotificationsUpdate: (updatedSettings: NotificationSettings) => void;
  onMessage: (message: string, isError?: boolean) => void;
}

// Default notification settings
const DEFAULT_SETTINGS: NotificationSettings = {
  emailReminders: true,
  taskDeadlines: true,
  dailyDigest: false,
  weeklyReport: true,
  habitReminders: true,
  browserNotifications: false
};

interface NotificationOption {
  key: keyof NotificationSettings;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function NotificationSettings({ initialNotifications, onNotificationsUpdate, onMessage }: NotificationSettingsProps) {
  const { user } = useAuthStore()
  const { supabase } = useSupabase()
  const [notifications, setNotifications] = useState<NotificationSettings>({
    ...DEFAULT_SETTINGS,
    ...initialNotifications
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Ensure we never set undefined values
    setNotifications(prev => ({
      ...DEFAULT_SETTINGS,
      ...initialNotifications
    }))
  }, [initialNotifications])

  useEffect(() => {
    // Load notification settings when component mounts
    const loadSettings = async () => {
      if (!user) return
      try {
        const { data, error } = await notificationService(supabase).getSettings(user.id)
        if (error) throw error
        if (data) {
          // Ensure we never set undefined values
          const validSettings = {
            ...DEFAULT_SETTINGS,
            ...data
          }
          setNotifications(validSettings)
          onNotificationsUpdate(validSettings)
        }
      } catch (error) {
        console.error('Error loading notification settings:', error)
        // On error, keep using default settings
        setNotifications(DEFAULT_SETTINGS)
        onNotificationsUpdate(DEFAULT_SETTINGS)
      }
    }
    loadSettings()
  }, [user, supabase, onNotificationsUpdate])

  const handleNotificationUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    onMessage('')
    
    try {
      // Request browser notification permission if enabled
      if (notifications.browserNotifications && 'Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          const updatedSettings = {
            ...notifications,
            browserNotifications: false
          }
          setNotifications(updatedSettings)
          onMessage('Browser notifications permission denied', true)
          setLoading(false)
          return
        }
      }
      
      // Save settings to database
      const { error } = await notificationService(supabase).updateSettings(user.id, notifications)
      if (error) throw error
      
      // Save to localStorage for quick access
      localStorage.setItem('notificationSettings', JSON.stringify(notifications))
      
      onMessage('Notification settings saved!')
      onNotificationsUpdate(notifications)
    } catch (error) {
      console.error('Error saving notifications:', error)
      onMessage(`Error saving notification settings: ${(error instanceof Error) ? error.message : 'Please try again.'}`, true)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key: keyof NotificationSettings) => {
    const newValue = !notifications[key]
    const updatedSettings = {
      ...notifications,
      [key]: newValue
    }
    setNotifications(updatedSettings)
  }

  const notificationOptions: NotificationOption[] = [
    {
      key: 'emailReminders',
      label: 'Email Reminders',
      description: 'Get email notifications for important tasks',
      icon: Mail
    },
    {
      key: 'taskDeadlines',
      label: 'Task deadline reminders',
      description: 'Get notified before task deadlines',
      icon: Clock
    },
    {
      key: 'dailyDigest',
      label: 'Daily activity digest',
      description: 'Receive a summary of your daily activities',
      icon: Activity
    },
    {
      key: 'weeklyReport',
      label: 'Weekly progress report',
      description: 'Get a weekly summary of your progress',
      icon: Calendar
    },
    {
      key: 'habitReminders',
      label: 'Habit tracking reminders',
      description: 'Get reminded to track your habits',
      icon: Target
    }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
      
      <div className="space-y-4">
        <PushSubscriptionManager onMessage={onMessage} />

        {notificationOptions.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications[key] ?? DEFAULT_SETTINGS[key]}
                onChange={() => handleToggle(key as keyof NotificationSettings)}
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
  )
} 