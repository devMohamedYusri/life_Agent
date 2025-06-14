// app/components/Sidebar.tsx
'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dispatch, SetStateAction } from 'react'
import { 
  LayoutDashboard, 
  BarChart, 
  CheckSquare, 
  Target, 
  RefreshCw, 
  FileText, 
  Calendar, 
  Brain,
  User,
  Settings,
} from 'lucide-react'

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, emoji: '📊' },
    { name: 'Analysis', href: '/dashboard/analysis', icon: <BarChart className="w-5 h-5" />, emoji: '📈' },
    { name: 'Tasks', href: '/dashboard/tasks', icon: <CheckSquare className="w-5 h-5" />, emoji: '✅' },
    { name: 'Goals', href: '/dashboard/goals', icon: <Target className="w-5 h-5" />, emoji: '🎯' },
    { name: 'Habits', href: '/dashboard/habits', icon: <RefreshCw className="w-5 h-5" />, emoji: '🔄' },
    { name: 'Journal', href: '/dashboard/journals', icon: <FileText className="w-5 h-5" />, emoji: '📝' },
    { name: 'Calendar', href: '/dashboard/calendar', icon: <Calendar className="w-5 h-5" />, emoji: '📅' },
    { name: 'AI Plans', href: '/dashboard/ai-plans', icon: <Brain className="w-5 h-5" />, emoji: '🤖' },
]

const bottomNavigation = [
    { name: 'Profile', href: '/dashboard/profile', icon: <User className="w-5 h-5" />, emoji: '👤' },
    { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" />, emoji: '⚙️' },
]

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const pathname = usePathname()
    
    return (
        <>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex h-16 items-center justify-between px-6 border-b dark:border-gray-700">
                    <h1 className="text-xl font-bold text-purple-600">SelfPilot</h1>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex flex-col h-full">
                    <nav className="flex-1 mt-6">
                        <ul className="space-y-1 px-3">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            pathname === item.href
                                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className="mr-3 text-gray-600 dark:text-gray-400">{item.icon || item.emoji}</span>
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    
                    {/* Bottom section */}
                    <div className="border-t dark:border-gray-700 p-3 mb-6">
                        <ul className="space-y-1">
                            {bottomNavigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            pathname === item.href
                                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className="mr-3 text-gray-600 dark:text-gray-400">{item.icon || item.emoji}</span>
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg lg:block hidden">
                <div className="flex h-16 items-center px-6 border-b dark:border-gray-700">
                    <h1 className="text-xl font-bold text-purple-600">SelfPilot</h1>
                </div>
                
                <div className="flex flex-col h-full">
                    <nav className="flex-1 mt-6">
                        <ul className="space-y-1 px-3">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            pathname === item.href
                                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className="mr-3 text-gray-600 dark:text-gray-400">{item.icon || item.emoji}</span>
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    
                    {/* Bottom section */}
                    <div className="border-t dark:border-gray-700 p-3 mb-6">
                        <ul className="space-y-1">
                            {bottomNavigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            pathname === item.href
                                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className="mr-3 text-gray-600 dark:text-gray-400">{item.icon || item.emoji}</span>
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    )
}