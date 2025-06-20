'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { userService } from '@//lib/database/users'
import { Check, Loader2 } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  user_name: string
  avatar_url?: string
  bio?: string
  created_at: string
}

interface ProfileSettingsProps {
  initialProfile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  onMessage: (message: string, isError?: boolean) => void;
}

export default function ProfileSettings({ initialProfile, onProfileUpdate, onMessage }: ProfileSettingsProps) {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile>(initialProfile)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setProfile(initialProfile)
  }, [initialProfile])

  const handleProfileUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    onMessage('')
    
    try {
      await userService.updateProfile(user.id, {
        user_name: profile.user_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      })
      
      onMessage('Profile updated successfully!')
      onProfileUpdate(profile); // Notify parent of updated profile
    } catch (error: any) {
      console.error('Error updating profile:', error)
      onMessage(`Error updating profile: ${error.message || 'Please try again.'}`, true)
    } finally {
      setLoading(false)
    }
  }

  return (
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
            User Name
          </label>
          <input
            type="text"
            value={profile.user_name}
            onChange={(e) => setProfile(prev => ({ ...prev, user_name: e.target.value || '' }))}
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
  )
} 