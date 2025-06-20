'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Settings as SettingsIcon, Check, Loader2, Globe } from 'lucide-react'

interface AppearanceSettingsProps {
  initialTheme: 'light' | 'dark' | 'system';
  initialTimeZone: string;
  onThemeChange: (newTheme: 'light' | 'dark' | 'system') => void;
  onTimeZoneChange: (newTimeZone: string) => void;
  onMessage: (message: string, isError?: boolean) => void;
}

export default function AppearanceSettings({ initialTheme, initialTimeZone, onThemeChange, onTimeZoneChange, onMessage }: AppearanceSettingsProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialTheme)
  const [timeZone, setTimeZone] = useState<string>(initialTimeZone);
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTheme(initialTheme)
    setTimeZone(initialTimeZone);
  }, [initialTheme, initialTimeZone])

  const handleAppearanceUpdate = () => {
    setLoading(true);
    onMessage('');

    try {
      localStorage.setItem('theme', theme);
      localStorage.setItem('timeZone', timeZone);
      onThemeChange(theme);
      onTimeZoneChange(timeZone);
      onMessage('Appearance settings updated!');
    } catch (error) {
      console.error('Error updating appearance settings:', error instanceof Error ? error : 'An unknown error occurred');
      onMessage(`Error updating settings: ${(error instanceof Error) ? error.message : 'Please try again.'}`, true);
    } finally {
      setLoading(false);
    }
  };

  // List of common time zones, including Cairo
  const timeZones = [
    { value: 'auto', label: 'Automatic (System Default)' },
    { value: 'Africa/Cairo', label: 'Cairo (GMT+2)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT+0)' },
    { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
    { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
    { value: 'Australia/Sydney', label: 'Sydney (GMT+10)' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-lg border-2 transition-colors ${theme === 'light' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            >
              <Sun className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Light</p>
            </button>
            
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-lg border-2 transition-colors ${theme === 'dark' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            >
              <Moon className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Dark</p>
            </button>
            
            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-lg border-2 transition-colors ${theme === 'system' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            >
              <SettingsIcon className="w-6 h-6 mx-auto mb-2" />
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

        <div>
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Zone
          </label>
          <div className="relative">
            <select
              id="timeZone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 appearance-none"
              disabled={loading}
            >
              {timeZones.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="h-5 w-5 text-gray-400" />
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleAppearanceUpdate}
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
  )
} 