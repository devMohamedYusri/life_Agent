'use client'

import { useState } from 'react'
import { useAuthStore } from '@//lib/stores/authStore'
import { userService } from '@//lib/database/users'
import { Lock, Shield, Trash2, Loader2 } from 'lucide-react'

interface SecuritySettingsProps {
  onMessage: (message: string, isError?: boolean) => void;
}

export default function SecuritySettings({ onMessage }: SecuritySettingsProps) {
  const { user, signOut } = useAuthStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDeleteAccount = async () => {
    if (!user) return
    
    if (deleteConfirmText !== 'DELETE') {
      onMessage('Please type DELETE to confirm', true)
      return
    }
    
    setLoading(true)
    onMessage('')
    
    try {
      // Implement account deletion
      await userService.deleteAccount(user.id)
      onMessage('Account deleted successfully. Signing out...')
      await signOut()
    } catch (error) {
      console.error('Error deleting account:', error)
      onMessage(`Error deleting account: ${(error instanceof Error) ? error.message : 'Please try again.'}`, true);
    } finally {
      setLoading(false)
    }
  }

  return (
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
                Type &quot;DELETE&quot; to confirm account deletion:
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
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirm Delete'
                  )}
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
  )
} 