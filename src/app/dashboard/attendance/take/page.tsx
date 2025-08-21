'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Schedule {
  id: string
  sessionDate: string
  startTime: string
  endTime: string
  sessionType: string
  course: {
    id: string
    name: string
    code: string
  }
  classGroup: {
    id: string
    name: string
  }
  building: {
    name: string
  }
  classroom: {
    name: string
    virtualLink?: string | null
  }
}

export default function TakeAttendancePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [attendanceMethod, setAttendanceMethod] = useState<'onsite' | 'virtual'>('onsite')
  const [virtualSessionActive, setVirtualSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (session?.user.role !== 'LECTURER') {
      router.push('/dashboard')
      return
    }
    fetchTodaySchedules()
  }, [session, router])

  // Update attendance method when schedule is selected
  useEffect(() => {
    if (selectedSchedule) {
      const isVirtual = selectedSchedule.classroom.virtualLink && selectedSchedule.classroom.virtualLink.trim() !== ''
      setAttendanceMethod(isVirtual ? 'virtual' : 'onsite')
    }
  }, [selectedSchedule])

  // Timer for virtual sessions
  useEffect(() => {
    if (virtualSessionActive && sessionStartTime) {
      const timer = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
        const hours = Math.floor(elapsed / 3600)
        const minutes = Math.floor((elapsed % 3600) / 60)
        const seconds = elapsed % 60
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [virtualSessionActive, sessionStartTime])

  const fetchTodaySchedules = async () => {
    try {
      const response = await fetch('/api/schedules/today')
      if (response.ok) {
        const data = await response.json()
        setSchedules(data)
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = () => {
    setLocationError('')
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Please enable location services.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out.')
            break
          default:
            setLocationError('An unknown error occurred while retrieving location.')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const handleStartVirtualSession = async () => {
    if (!selectedSchedule) return

    setSubmitting(true)

    try {
      const response = await fetch('/api/attendance/take', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduleId: selectedSchedule.id,
          method: 'virtual',
          action: 'start'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setVirtualSessionActive(true)
        setSessionStartTime(new Date())
        alert('Virtual session started successfully!')
      } else {
        alert(data.error || 'Failed to start virtual session')
      }
    } catch (error) {
      console.error('Error starting virtual session:', error)
      alert('An error occurred while starting virtual session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEndVirtualSession = async () => {
    if (!selectedSchedule) return

    setSubmitting(true)

    try {
      const response = await fetch('/api/attendance/take', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduleId: selectedSchedule.id,
          method: 'virtual',
          action: 'end'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setVirtualSessionActive(false)
        setSessionStartTime(null)
        alert('Virtual session ended successfully!')
        router.push('/dashboard/attendance')
      } else {
        alert(data.error || 'Failed to end virtual session')
      }
    } catch (error) {
      console.error('Error ending virtual session:', error)
      alert('An error occurred while ending virtual session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTakeAttendance = async () => {
    if (!selectedSchedule) return

    if (attendanceMethod === 'onsite' && !location) {
      alert('Please get your current location first')
      return
    }

    setSubmitting(true)

    try {
      const requestBody: any = {
        scheduleId: selectedSchedule.id,
        method: attendanceMethod
      }

      if (attendanceMethod === 'onsite') {
        requestBody.latitude = location!.latitude
        requestBody.longitude = location!.longitude
      }

      const response = await fetch('/api/attendance/take', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        alert('Attendance recorded successfully!')
        router.push('/dashboard/attendance')
      } else {
        alert(data.error || 'Failed to record attendance')
      }
    } catch (error) {
      console.error('Error recording attendance:', error)
      alert('An error occurred while recording attendance')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Take Attendance</h1>
        <p className="mt-2 text-gray-600">
          Record your attendance for today's sessions
        </p>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-1 12a2 2 0 002 2h6a2 2 0 002-2L16 7m-6 0V3"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions today</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any scheduled sessions for today.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Schedule Selection */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Select Session
              </h3>
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSchedule?.id === schedule.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSchedule(schedule)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {schedule.course.code} - {schedule.course.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {schedule.classGroup.name} • {schedule.sessionType}
                        </p>
                        <p className="text-sm text-gray-500">
                          {schedule.classroom.virtualLink ? (
                            <span className="inline-flex items-center">
                              <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Virtual Classroom
                            </span>
                          ) : (
                            `${schedule.building.name} - ${schedule.classroom.name}`
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {schedule.startTime} - {schedule.endTime}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(schedule.sessionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attendance Verification */}
          {selectedSchedule && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {attendanceMethod === 'virtual' ? 'Virtual Session Management' : 'Location Verification'}
                </h3>
                
                {attendanceMethod === 'virtual' ? (
                  <div>
                    {/* Virtual Meeting Link */}
                    {selectedSchedule.classroom.virtualLink && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Meeting Link</h4>
                        <div className="flex items-center justify-between">
                          <a
                            href={selectedSchedule.classroom.virtualLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                          >
                            {selectedSchedule.classroom.virtualLink}
                          </a>
                          <button
                            onClick={() => navigator.clipboard.writeText(selectedSchedule.classroom.virtualLink!)}
                            className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                            title="Copy link"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Virtual Session Controls */}
                    {!virtualSessionActive ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-4">
                          Start your virtual session to begin recording attendance. Students will be able to mark their attendance once the session is active.
                        </p>
                        <button
                          onClick={handleStartVirtualSession}
                          disabled={submitting}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Starting...
                            </>
                          ) : (
                            <>
                              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Start Virtual Session
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center text-green-600 mb-4">
                          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">Virtual session active</span>
                        </div>
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            Session Duration: <span className="font-mono font-medium">{timeRemaining}</span>
                          </p>
                        </div>
                        <button
                          onClick={handleEndVirtualSession}
                          disabled={submitting}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Ending...
                            </>
                          ) : (
                            <>
                              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                              </svg>
                              End Virtual Session
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Onsite Location Verification */
                  <div>
                    {!location ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-4">
                          To record attendance, you must be physically present at UPSA campus. 
                          Click the button below to verify your location.
                        </p>
                        <button
                          onClick={getCurrentLocation}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Get Current Location
                        </button>
                        {locationError && (
                          <p className="mt-2 text-sm text-red-600">{locationError}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center text-green-600 mb-4">
                          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">Location verified</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Latitude: {location.latitude.toFixed(6)}, Longitude: {location.longitude.toFixed(6)}
                        </p>
                        <button
                          onClick={handleTakeAttendance}
                          disabled={submitting}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Recording...
                            </>
                          ) : (
                            <>
                              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Record Attendance
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}