'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (session) {
      // Redirect to appropriate dashboard based on role
      switch (session.user.role) {
        case 'ADMIN':
        case 'COORDINATOR':
          router.push('/dashboard/admin')
          break
        case 'LECTURER':
          router.push('/dashboard/lecturer')
          break
        case 'CLASS_REP':
          router.push('/dashboard/class-rep')
          break
        default:
          router.push('/dashboard')
      }
    } else {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
    </div>
  )
}
