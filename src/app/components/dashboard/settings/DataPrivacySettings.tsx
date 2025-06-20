'use client'

import { useState } from 'react'
// import { useAuthStore } from '@//lib/stores/authStore'
import { Download, Globe } from 'lucide-react'

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

interface DataPrivacySettingsProps {
  userProfile: UserProfile;
  notificationSettings: NotificationSettings;
  theme: 'light' | 'dark' | 'system';
  onMessage: (message: string, isError?: boolean) => void;
}

export default function DataPrivacySettings({ userProfile, notificationSettings, theme, onMessage }: DataPrivacySettingsProps) {
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    setLoading(true)
    onMessage('')
    
    try {
      // Gather all user data
      const userData = {
        profile: userProfile,
        exportDate: new Date().toISOString(),
        settings: {
          theme,
          notifications: notificationSettings
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
      
      onMessage('Data exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      onMessage(`Error exporting data: ${(error instanceof Error) ? error.message : 'Please try again.'}`, true);
    } finally {
      setLoading(false)
    }
  }

  return (
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
  )
} 