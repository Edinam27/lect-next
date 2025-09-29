'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { useState } from 'react'

interface NavigationItem {
  name: string
  href: string
  roles: UserRole[]
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    roles: ['ADMIN', 'COORDINATOR', 'LECTURER', 'CLASS_REP']
  },
  {
    name: 'Admin',
    href: '/dashboard/admin',
    roles: ['ADMIN']
  },
  {
    name: 'Coordinator',
    href: '/dashboard/coordinator',
    roles: ['COORDINATOR']
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    roles: ['ADMIN']
  },
  {
    name: 'Programmes',
    href: '/dashboard/programmes',
    roles: ['ADMIN']
  },
  {
    name: 'Courses',
    href: '/dashboard/courses',
    roles: ['ADMIN', 'COORDINATOR']
  },
  {
    name: 'Schedules',
    href: '/dashboard/schedules',
    roles: ['ADMIN', 'LECTURER']
  },
  {
    name: 'Lecturers',
    href: '/dashboard/lecturers',
    roles: ['COORDINATOR']
  },
  {
    name: 'Attendance',
    href: '/dashboard/attendance',
    roles: ['ADMIN', 'COORDINATOR', 'LECTURER', 'CLASS_REP']
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    roles: ['ADMIN', 'COORDINATOR']
  },
  {
    name: 'Import Data',
    href: '/dashboard/import',
    roles: ['ADMIN']
  }
]

export function Navigation() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!session?.user) {
    return null
  }

  const handleSignOut = async () => {
    if (isSigningOut) return // Prevent multiple clicks
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      setIsSigningOut(false) // Reset on error
    }
  }

  const userRole = session.user.role
  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-enhanced truncate">
                UPSA Attendance
              </h1>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-4 lg:space-x-6 xl:space-x-8">
              {filteredItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                      isActive
                        ? 'border-indigo-500 text-enhanced'
                        : 'border-transparent text-muted hover:border-gray-300 hover:text-enhanced'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* Desktop User Info & Actions */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <div className="flex-shrink-0 hidden lg:block">
              <span className="text-sm text-enhanced truncate max-w-xs">
                {session.user.name} ({session.user.role})
              </span>
            </div>
            <div className="flex-shrink-0 lg:hidden">
              <span className="text-sm text-enhanced">
                {session.user.name?.split(' ')[0]}
              </span>
            </div>
            <Link
              href="/dashboard/profile"
              className="btn-secondary py-2 px-3 lg:px-4 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap hover:bg-gray-50"
            >
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="btn-secondary py-2 px-3 lg:px-4 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="pt-2 pb-3 space-y-1">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
          
          {/* Mobile user info and sign out */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {session.user.name}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {session.user.role}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                href="/dashboard/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMobileMenuOpen(false)
                }}
                disabled={isSigningOut}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}