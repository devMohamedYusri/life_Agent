'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { userService, UserProfile } from '@//lib/database/users'
import { Check, Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import { useSupabase } from '@//lib/hooks/useSupabase'

interface ProfileSettingsProps {
  initialProfile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  onMessage: (message: string, isError?: boolean) => void;
  loading: boolean;
}

export default function ProfileSettings({ initialProfile, onProfileUpdate, onMessage }: ProfileSettingsProps) {
  const { user } = useAuthStore()
  const { supabase } = useSupabase()
  const [profile, setProfile] = useState<UserProfile>(initialProfile)
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>(profile.avatar_url || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setProfile(initialProfile)
    setAvatarPreview(initialProfile.avatar_url || '')
  }, [initialProfile])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      onMessage('Error uploading avatar. Please try again.', true)
      return null
    }
  }

  const handleProfileUpdate = async () => {
    if (!user) return
    
    setLoading(true)
    onMessage('')
    
    try {
      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile) || avatarUrl
      }

      const updatedProfile = {
        ...profile,
        avatar_url: avatarUrl
      }

      const { data, error } = await userService(supabase).updateUserProfile(user.id, {
        user_name: updatedProfile.user_name,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar_url
      })

      if (error) throw error
      
      onMessage('Profile updated successfully!')
      onProfileUpdate(data)
      setAvatarFile(null)
    } catch (error) {
      console.error('Error updating profile:', error)
      onMessage(`Error updating profile: ${(error instanceof Error) ? error.message : 'Please try again.'}`, true)
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
            value={user?.email || ''}
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
            Avatar
          </label>
          <div className="flex items-center space-x-4">
            <div className="relative w-20 h-20">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  width={80}
                  height={80}
                  className="rounded-full object-cover w-auto"
                  priority
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Choose File
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Recommended: Square image, at least 200x200px
              </p>
            </div>
          </div>
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