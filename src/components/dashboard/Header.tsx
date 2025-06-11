'use client'

import { useAuthStore } from "@//lib/stores/authStore"
import { useRouter } from "next/navigation"
import { useState, Dispatch, SetStateAction } from "react"

interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
    const { user, signOut } = useAuthStore()
    const [showDropdown, setShowDropdown] = useState(false)
    const router = useRouter()

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth/signin')
    }

    return (
        <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-6">
            <div className="lg:hidden">
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100"
                >
                    <span className="sr-only">Open sidebar</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                    Welcome back, {user?.email?.split('@')[0] || 'User'}!
                </span>
                
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                    >
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                            <button
                                onClick={handleSignOut}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}