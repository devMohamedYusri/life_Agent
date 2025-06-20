'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { notificationService } from '@//lib/database/notifications'
import { Bell, Mail, Check, Loader2 } from 'lucide-react'
import PushSubscriptionManager from './PushSubscriptionManager'

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

export default function NotificationSettings({ initialNotifications, onNotificationsUpdate, onMessage }: NotificationSettingsProps) {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<NotificationSettings>(initialNotifications)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  const handleNotificationUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    onMessage('')
    
    try {
      // Save to localStorage
      localStorage.setItem('notificationSettings', JSON.stringify(notifications))
      
      // Request browser notification permission if enabled
      if (notifications.browserNotifications && 'Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setNotifications(prev => ({ ...prev, browserNotifications: false }))
          onMessage('Browser notifications permission denied', true)
          setLoading(false)
          return
        }
      }
      
      // If notificationService has updateSettings method
      if (notificationService.updateSettings) {
        await notificationService.updateSettings(user.id, notifications)
      }
      
      onMessage('Notification settings saved!')
      onNotificationsUpdate(notifications); // Notify parent
    } catch (error) {
      console.error('Error saving notifications:', error)
      onMessage(`Error saving notification settings: ${(error instanceof Error) ? error.message : 'Please try again.'}`, true);

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
      
      <div className="space-y-4">
        <PushSubscriptionManager onMessage={onMessage} />

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
  )
} 