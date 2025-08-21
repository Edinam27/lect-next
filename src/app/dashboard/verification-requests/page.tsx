'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface VerificationRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'disputed'
  submittedAt: string
  reviewedAt?: string
  escalatedAt?: string
  verificationNotes?: string
  reviewNotes?: string
  evidenceUrls: string[]
  studentAttendanceData?: {
    totalStudentsPresent: number
    studentsAbsent?: string[]
    sessionQuality: 'excellent' | 'good' | 'fair' | 'poor'
    technicalIssues?: string[]
    additionalNotes?: string
  }
  attendanceRecord: {
    id: string
    timestamp: string
    method: string
    locationVerified: boolean
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
  }
  classRep: {
    name: string
    email: string
  }
}

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

export default function VerificationRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([])
  const [pendingRecords, setPendingRecords] = useState<PendingAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'requests'>('pending')
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  
  // Form states
  const [verificationNotes, setVerificationNotes] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [studentData, setStudentData] = useState({
    totalStudentsPresent: 0,
    studentsAbsent: '',
    sessionQuality: 'good' as const,
    technicalIssues: '',
    additionalNotes: ''
  })
  const [reviewNotes, setReviewNotes] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || !['CLASS_REP', 'LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
      router.push('/dashboard')
      return
    }

    fetchData()
  }, [session, status, router, activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'pending' && session?.user.role === 'CLASS_REP') {
        // Fetch pending attendance records for verification
        const response = await fetch('/api/attendance/verify')
        if (response.ok) {
          const data = await response.json()
          setPendingRecords(data)
        }
      } else {
        // Fetch verification requests
        const response = await fetch('/api/verification-requests')
        if (response.ok) {
          const data = await response.json()
          setVerificationRequests(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadEvidence = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = []
    
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'verification-evidence')
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const data = await response.json()
          uploadedUrls.push(data.url)
        }
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }
    
    return uploadedUrls
  }

  const createVerificationRequest = async (attendanceRecordId: string) => {
    setCreating(true)
    
    try {
      // Upload evidence files
      const evidenceUrls = evidenceFiles.length > 0 ? await uploadEvidence(evidenceFiles) : []
      
      const response = await fetch('/api/verification-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendanceRecordId,
          evidenceUrls,
          verificationNotes: verificationNotes.trim() || undefined,
          studentAttendanceData: {
            totalStudentsPresent: studentData.totalStudentsPresent,
            studentsAbsent: studentData.studentsAbsent ? studentData.studentsAbsent.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            sessionQuality: studentData.sessionQuality,
            technicalIssues: studentData.technicalIssues ? studentData.technicalIssues.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            additionalNotes: studentData.additionalNotes.trim() || undefined
          }
        })
      })

      if (response.ok) {
        alert('Verification request created successfully!')
        setSelectedRecord(null)
        resetForm()
        fetchData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating verification request:', error)
      alert('An error occurred while creating verification request')
    } finally {
      setCreating(false)
    }
  }

  const updateVerificationRequest = async (requestId: string, status: 'approved' | 'rejected' | 'disputed', escalate = false) => {
    setUpdating(requestId)
    
    try {
      const response = await fetch('/api/verification-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verificationRequestId: requestId,
          status,
          reviewNotes: reviewNotes.trim() || undefined,
          escalate
        })
      })

      if (response.ok) {
        alert(`Verification request ${status} successfully!`)
        setSelectedRequest(null)
        setReviewNotes('')
        fetchData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating verification request:', error)
      alert('An error occurred while updating verification request')
    } finally {
      setUpdating(null)
    }
  }

  const resetForm = () => {
    setVerificationNotes('')
    setEvidenceFiles([])
    setStudentData({
      totalStudentsPresent: 0,
      studentsAbsent: '',
      sessionQuality: 'good',
      technicalIssues: '',
      additionalNotes: ''
    })
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      disputed: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getQualityBadge = (quality: string) => {
    const qualityStyles = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${qualityStyles[quality as keyof typeof qualityStyles]}`}>
        {quality.charAt(0).toUpperCase() + quality.slice(1)}
      </span>
    )
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
        <h1 className="text-3xl font-bold text-gray-900">Verification Management</h1>
        <p className="mt-2 text-gray-600">
          Manage lecturer attendance verification requests with detailed evidence and workflow
        </p>
      </div>

      {/* Tab Navigation */}
      {session?.user.role === 'CLASS_REP' && (
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Verification ({pendingRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Requests ({verificationRequests.length})
            </button>
          </nav>
        </div>
      )}

      {/* Pending Records Tab */}
      {activeTab === 'pending' && session?.user.role === 'CLASS_REP' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Pending Attendance Records ({pendingRecords.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Create detailed verification requests with evidence and student data
            </p>
          </div>
          
          {pendingRecords.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                <p>No pending lecturer attendance records to verify.</p>
              </div>
            </div>
          ) : (
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
                          <p className="text-sm text-gray-900">
                            {record.method === 'virtual' ? 'Virtual Session' : `${record.location.building} - ${record.location.classroom}`}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                              record.locationVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {record.locationVerified ? '✓ Location Verified' : '✗ Location Not Verified'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Verification Form */}
                      {selectedRecord === record.id && (
                        <div className="bg-gray-50 rounded-lg p-6 mt-4">
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Create Detailed Verification Request</h4>
                          
                          {/* Verification Notes */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Verification Notes
                            </label>
                            <textarea
                              value={verificationNotes}
                              onChange={(e) => setVerificationNotes(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              rows={3}
                              placeholder="Describe the attendance situation, any issues observed, or additional context..."
                            />
                          </div>

                          {/* Student Attendance Data */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Total Students Present
                              </label>
                              <input
                                type="number"
                                value={studentData.totalStudentsPresent}
                                onChange={(e) => setStudentData({...studentData, totalStudentsPresent: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Session Quality
                              </label>
                              <select
                                value={studentData.sessionQuality}
                                onChange={(e) => setStudentData({...studentData, sessionQuality: e.target.value as any})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="fair">Fair</option>
                                <option value="poor">Poor</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Students Absent (comma-separated names)
                              </label>
                              <input
                                type="text"
                                value={studentData.studentsAbsent}
                                onChange={(e) => setStudentData({...studentData, studentsAbsent: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="John Doe, Jane Smith, ..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Technical Issues (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={studentData.technicalIssues}
                                onChange={(e) => setStudentData({...studentData, technicalIssues: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Audio issues, Connection problems, ..."
                              />
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Additional Notes
                            </label>
                            <textarea
                              value={studentData.additionalNotes}
                              onChange={(e) => setStudentData({...studentData, additionalNotes: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              rows={2}
                              placeholder="Any additional observations or comments..."
                            />
                          </div>

                          {/* Evidence Upload */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Evidence Files (Photos, Videos, Documents)
                            </label>
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*,.pdf,.doc,.docx"
                              onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {evidenceFiles.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">Selected files:</p>
                                <ul className="text-sm text-gray-800">
                                  {evidenceFiles.map((file, index) => (
                                    <li key={index}>• {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => createVerificationRequest(record.id)}
                              disabled={creating}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                              {creating ? (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              )}
                              Create Verification Request
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRecord(null)
                                resetForm()
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedRecord !== record.id && (
                    <div className="flex items-center space-x-3 mt-4">
                      <button
                        onClick={() => setSelectedRecord(record.id)}
                        className="inline-flex items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 0l3 3m-3-3l3-3" />
                        </svg>
                        Create Detailed Request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verification Requests Tab */}
      {(activeTab === 'requests' || session?.user.role !== 'CLASS_REP') && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Verification Requests ({verificationRequests.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and manage verification requests with detailed evidence
            </p>
          </div>
          
          {verificationRequests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Verification Requests</h3>
                <p>No verification requests found.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {verificationRequests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.attendanceRecord.course.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {request.attendanceRecord.course.courseCode} • {request.attendanceRecord.classGroup.name}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Lecturer</p>
                          <p className="text-sm text-gray-900">{request.attendanceRecord.lecturer.name}</p>
                          <p className="text-xs text-gray-500">ID: {request.attendanceRecord.lecturer.employeeId}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Class Rep</p>
                          <p className="text-sm text-gray-900">{request.classRep.name}</p>
                          <p className="text-xs text-gray-500">{request.classRep.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Submitted</p>
                          <p className="text-sm text-gray-900">{formatDateTime(request.submittedAt)}</p>
                          {request.reviewedAt && (
                            <p className="text-xs text-gray-500">Reviewed: {formatDateTime(request.reviewedAt)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Evidence</p>
                          <p className="text-sm text-gray-900">{request.evidenceUrls.length} files</p>
                          {request.escalatedAt && (
                            <p className="text-xs text-red-500">Escalated: {formatDateTime(request.escalatedAt)}</p>
                          )}
                        </div>
                      </div>

                      {/* Student Attendance Data */}
                      {request.studentAttendanceData && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Student Attendance Data</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Students Present:</span>
                              <span className="ml-2 text-gray-900">{request.studentAttendanceData.totalStudentsPresent}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Session Quality:</span>
                              <span className="ml-2">{getQualityBadge(request.studentAttendanceData.sessionQuality)}</span>
                            </div>
                            {request.studentAttendanceData.studentsAbsent && request.studentAttendanceData.studentsAbsent.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700">Absent Students:</span>
                                <span className="ml-2 text-gray-900">{request.studentAttendanceData.studentsAbsent.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          {request.studentAttendanceData.technicalIssues && request.studentAttendanceData.technicalIssues.length > 0 && (
                            <div className="mt-2">
                              <span className="font-medium text-gray-700 text-sm">Technical Issues:</span>
                              <span className="ml-2 text-gray-900 text-sm">{request.studentAttendanceData.technicalIssues.join(', ')}</span>
                            </div>
                          )}
                          {request.studentAttendanceData.additionalNotes && (
                            <div className="mt-2">
                              <span className="font-medium text-gray-700 text-sm">Additional Notes:</span>
                              <p className="text-gray-900 text-sm mt-1">{request.studentAttendanceData.additionalNotes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verification Notes */}
                      {request.verificationNotes && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Verification Notes</p>
                          <p className="text-sm text-gray-900 bg-gray-50 rounded p-3">{request.verificationNotes}</p>
                        </div>
                      )}

                      {/* Review Notes */}
                      {request.reviewNotes && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Review Notes</p>
                          <p className="text-sm text-gray-900 bg-blue-50 rounded p-3">{request.reviewNotes}</p>
                        </div>
                      )}

                      {/* Evidence Files */}
                      {request.evidenceUrls.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Evidence Files</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {request.evidenceUrls.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 border border-gray-200 rounded hover:bg-gray-50"
                              >
                                <div className="text-xs text-gray-600 truncate">
                                  Evidence {index + 1}
                                </div>
                                {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                  <div className="mt-1 h-16 bg-gray-100 rounded flex items-center justify-center">
                                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="mt-1 h-16 bg-gray-100 rounded flex items-center justify-center">
                                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 0l3 3m-3-3l3-3M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Review Actions */}
                      {request.status === 'pending' && ['LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'].includes(session?.user.role || '') && (
                        <div className="mt-4">
                          {selectedRequest === request.id ? (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Review Notes
                                </label>
                                <textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  rows={3}
                                  placeholder="Add your review comments..."
                                />
                              </div>
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => updateVerificationRequest(request.id, 'approved')}
                                  disabled={updating === request.id}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateVerificationRequest(request.id, 'rejected')}
                                  disabled={updating === request.id}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => updateVerificationRequest(request.id, 'disputed', true)}
                                  disabled={updating === request.id}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                                >
                                  Dispute & Escalate
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(null)
                                    setReviewNotes('')
                                  }}
                                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedRequest(request.id)}
                              className="inline-flex items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Review Request
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}