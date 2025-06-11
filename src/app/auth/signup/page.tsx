"use client"
import { useState } from "react"
import Link from 'next/link'
import { useAuthStore } from "../../lib/stores/authStore"
import { FormEvent } from 'react';

export default function SignupPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    // Get signup function from Zustand store
    const signUp = useAuthStore((state)=>state.signUp)

    const handleSubmit = async (e:FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long')
            setLoading(false)
            return
        }

        if (!name.trim()) {
            setError('Name is required')
            setLoading(false)
            return
        }

        // Use Zustand store's signUp function with fullName parameter
        const { error } = await signUp(email, password, name)

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
            // Don't redirect immediately - user needs to verify email first
        }
    }

    // Show success message after signup
    if (success) {
        return (
            <div className="text-center">
                <div className="text-6xl mb-4">📧</div>
                <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                    We&apos;ve sent you a confirmation link at <strong>{email}</strong>. 
                    Please click the link to verify your account before signing in.
                </p>
                <Link 
                    href="/auth/signin"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                >
                    Back to Sign In
                </Link>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-center mb-6">Welcome to Life Agent</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                    </label>
                    <input 
                        type="text"
                        placeholder="e.g. Ali Khaled" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <input 
                        type="email"
                        placeholder="name@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input 
                        type="password"
                        placeholder="At least 6 characters" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                        minLength={6}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>
            </form>

            <div className='mt-6 text-center'>
                <p className="text-gray-600">
                    Already have an account?{' '}
                    <Link href="/auth/signin" className="text-purple-600 hover:text-purple-700 font-medium">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    )
}