"use client"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { useAuthStore } from "../../lib/stores/authStore"

export default function SigninPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { user, initialized } = useAuthStore()
    // Get signIn function from Zustand store
    const signIn = useAuthStore((state)=>state.signIn)

    // Immediate redirect if user is logged in and auth is initialized
    if (initialized && user) {
        router.replace('/dashboard')
        return null; // Return null to prevent rendering the sign-in page content
    }

    const handleSubmit = async (e:FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await signIn(email, password)

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/dashboard')
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        placeholder="Enter your password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
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
                    {loading ? "Signing In..." : "Sign In"}
                </button>
            </form>

            <div className='mt-6 text-center space-y-2'>
                <Link 
                    href="/auth/reset-password" 
                    className="text-sm text-purple-600 hover:text-purple-700"
                >
                    Forgot your password?
                </Link>
                
                <div className="text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="text-purple-600 hover:text-purple-700 font-medium">
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    )
}