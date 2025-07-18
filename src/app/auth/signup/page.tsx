// app/auth/signup/page.tsx
"use client"
import { useState, useEffect } from "react"
import Link from 'next/link'
import { useAuthStore } from "../../lib/stores/authStore"
import { FormEvent } from 'react';
import { useRouter } from "next/navigation";
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const { user, initialized, signInWithGoogle } = useAuthStore()
    const router = useRouter();
    
    useEffect(() => {
        if (initialized && user) {
            router.push('/dashboard')
        }
    }, [initialized, user, router])
    
    // Get signup function from Zustand store
    const signUp = useAuthStore((state) => state.signUp)

    const handleSubmit = async (e: FormEvent) => {
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

    const handleGoogleSignUp = async () => {
        setGoogleLoading(true)
        setError('')

        const { error } = await signInWithGoogle()

        if (error) {
            setError(error.message)
            setGoogleLoading(false)
        }
        // Redirect is handled by OAuth flow
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
            
            {/* Google Sign Up Button */}
            <button
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className="w-full flex justify-center items-center gap-3 bg-white text-gray-700 border border-gray-300 py-2.5 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors mb-6"
            >
                {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Sign up with Google
                    </>
                )}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                </div>
            </div>

            {/* Email/Password Form */}
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
                    <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>
            </form>

            {/* Terms and Privacy Notice */}
            <div className="mt-4 text-center text-xs text-gray-600">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-purple-600 hover:text-purple-700">
                    Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                    Privacy Policy
                </Link>
            </div>

            {/* Sign In Link */}
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