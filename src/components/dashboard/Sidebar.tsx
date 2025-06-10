'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"
const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Tasks', href: '/dashboard/tasks', icon: '✅' },
    { name: 'Goals', href: '/dashboard/goals', icon: '🎯' },
    { name: 'Habits', href: '/dashboard/habits', icon: '🔄' },
    { name: 'Journal', href: '/dashboard/journal', icon: '📝' },
    { name: 'Calendar', href: '/dashboard/calendar', icon: '📅' },
    { name: 'AI Plans', href: '/dashboard/ai-plans', icon: '🤖' },
  ]

export default function Sidebar(){
    const pathname=usePathname()
    return(
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:block hidden">
        <div className="flex h-16 items-center px-6 border-b">
          <h1 className="text-xl font-bold text-purple-600">SelfPilot</h1>
        </div>
        
        <nav className="mt-6">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === item.href
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    )
}