'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface PendingAttendanceRecord {
  id: string
  timestamp: string
  sessionType: string
  course: {
    title: string
    courseCode: string
  }
  classGroup: {
    name: string
  }
  lecturer: {
    name: string
    employeeId: string
  }
  location: {
    building: string
    classroom: string
  }
  locationVerified: boolean
  method: string
  gpsLatitude?: number
  gpsLongitude?: number
}

export default function VerifyAttendancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pendingRecords, setPendingRecords] = useState<PendingAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user.role !== 'CLASS_REP') {
      router.push('/dashboard')
      return
    }

    fetchPendingRecords()
  }, [session, status, router])

  const fetchPendingRecords = async () => {
    try {
      const response = await fetch('/api/attendance/verify')
      if (response.ok) {
        const data = await response.json()
        setPendingRecords(data)
      } else {
        console.error('Failed to fetch pending records')
      }
    } catch (error) {
      console.error('Error fetching pending records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (recordId: string, verified: boolean) => {
    setVerifying(recordId)
    
    try {
      const response = await fetch('/api/attendance/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendanceRecordId: recordId,
          verified,
          comment: comment.trim() || undefined
        })
      })

      if (response.ok) {
        // Remove the verified record from the list
        setPendingRecords(prev => prev.filter(record => record.id !== recordId))
        setComment('')
        setSelectedRecord(null)
        
        // Show success message
        alert(`Attendance ${verified ? 'verified' : 'disputed'} successfully!`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error verifying attendance:', error)
      alert('An error occurred while verifying attendance')
    } finally {
      setVerifying(null)
    }
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getLocationString = (record: PendingAttendanceRecord) => {
    if (record.method === 'virtual') {
      return 'Virtual Session'
    }
    return `${record.location.building} - ${record.location.classroom}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Verify Lecturer Attendance</h1>
        <p className="mt-2 text-gray-600">
          Review and verify lecturer attendance records for your class
        </p>
      </div>

      {pendingRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
            <p>No pending lecturer attendance records to verify.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Pending Verifications ({pendingRecords.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {pendingRecords.map((record) => (
              <div key={record.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {record.course.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {record.course.courseCode} • {record.classGroup.name}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.sessionType === 'LECTURE' ? 'bg-blue-100 text-blue-800' :
                        record.sessionType === 'SEMINAR' ? 'bg-green-100 text-green-800' :
                        record.sessionType === 'LAB' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.sessionType}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Lecturer</p>
                        <p className="text-sm text-gray-900">{record.lecturer.name}</p>
                        <p className="text-xs text-gray-500">ID: {record.lecturer.employeeId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Date & Time</p>
                        <p className="text-sm text-gray-900">{formatDateTime(record.timestamp)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Location</p>
                        <p className="text-sm text-gray-900">{getLocationString(record)}</p>
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                            record.locationVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {record.locationVerified ? '✓ Location Verified' : '✗ Location Not Verified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {record.method === 'onsite' && record.gpsLatitude && record.gpsLongitude && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">GPS Coordinates</p>
                        <p className="text-xs text-gray-600">
                          Lat: {record.gpsLatitude.toFixed(6)}, Lng: {record.gpsLongitude.toFixed(6)}
                        </p>
                      </div>
                    )}

                    {selectedRecord === record.id && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comment (Optional)
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          rows={3}
                          placeholder="Add any comments about this attendance record..."
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 mt-4">
                  {selectedRecord !== record.id ? (
                    <button
                      onClick={() => setSelectedRecord(record.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Review
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleVerification(record.id, true)}
                        disabled={verifying === record.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {verifying === record.id ? (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Verify Present
                      </button>
                      <button
                        onClick={() => handleVerification(record.id, false)}
                        disabled={verifying === record.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {verifying === record.id ? (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        Dispute
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRecord(null)
                          setComment('')
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}