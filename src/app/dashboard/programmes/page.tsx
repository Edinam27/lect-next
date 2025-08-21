'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Programme {
  id: string
  name: string
  level: string
  durationSemesters: number
  description: string
  deliveryModes: string[]
  createdAt: string
  _count?: {
    courses: number
    classGroups: number
  }
}

export default function ProgrammesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchProgrammes()
  }, [session, status, router])

  const fetchProgrammes = async () => {
    try {
      const response = await fetch('/api/programmes')
      if (response.ok) {
        const data = await response.json()
        setProgrammes(data)
      }
    } catch (error) {
      console.error('Error fetching programmes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const filteredProgrammes = programmes.filter(programme => {
    if (filter === 'all') return true
    return programme.level === filter
  })

  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'undergraduate': return 'bg-blue-100 text-blue-800'
      case 'postgraduate': return 'bg-green-100 text-green-800'
      case 'doctoral': return 'bg-purple-100 text-purple-800'
      case 'certificate': return 'bg-yellow-100 text-yellow-800'
      case 'diploma': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Programme Management</h1>
        <p className="mt-2 text-gray-600">
          Manage academic programmes and degree offerings
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Programmes</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="postgraduate">Postgraduate</option>
            <option value="doctoral">Doctoral</option>
            <option value="certificate">Certificate</option>
            <option value="diploma">Diploma</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <Link
            href="/dashboard/programmes/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Programme
          </Link>
          <Link
            href="/dashboard/import"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Bulk Import
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProgrammes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No programmes found matching the current filter.</p>
            <Link
              href="/dashboard/programmes/create"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create First Programme
            </Link>
          </div>
        ) : (
          filteredProgrammes.map((programme) => (
            <div key={programme.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(programme.level)}`}>
                    {programme.level}
                  </span>
                  <span className="text-sm text-gray-500">
                    {programme.durationSemesters} semesters
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {programme.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {programme.description}
                </p>
                
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-1">Delivery Modes:</p>
                  <div className="flex flex-wrap gap-1">
                    {programme.deliveryModes.map((mode, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>
                
                {programme._count && (
                  <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{programme._count.courses}</p>
                      <p className="text-xs text-gray-500">Courses</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{programme._count.classGroups}</p>
                      <p className="text-xs text-gray-500">Classes</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-400">
                    Created: {new Date(programme.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/programmes/${programme.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/programmes/${programme.id}/edit`}
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Programme Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{programmes.length}</p>
            <p className="text-sm text-gray-500">Total Programmes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {programmes.filter(p => p.level.toLowerCase() === 'undergraduate').length}
            </p>
            <p className="text-sm text-gray-500">Undergraduate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {programmes.filter(p => p.level.toLowerCase() === 'postgraduate').length}
            </p>
            <p className="text-sm text-gray-500">Postgraduate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {programmes.filter(p => p.level.toLowerCase() === 'doctoral').length}
            </p>
            <p className="text-sm text-gray-500">Doctoral</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {programmes.filter(p => ['certificate', 'diploma'].includes(p.level.toLowerCase())).length}
            </p>
            <p className="text-sm text-gray-500">Cert/Diploma</p>
          </div>
        </div>
      </div>
    </div>
  )
}