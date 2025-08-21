import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { verifyLocationForAttendance } from '@/lib/geolocation'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/db')
jest.mock('@/lib/geolocation')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockVerifyLocationForAttendance = verifyLocationForAttendance as jest.MockedFunction<typeof verifyLocationForAttendance>

describe('/api/attendance/take', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully record attendance with valid location', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'lecturer@upsa.edu.gh',
        role: 'LECTURER',
        lecturerId: 'lecturer-123'
      }
    } as any)

    // Mock location verification - within UPSA radius
    mockVerifyLocationForAttendance.mockReturnValue({
      verified: true,
      distance: 150,
      withinRadius: true
    })

    // Mock database operations
    mockPrisma.lecturer.findUnique.mockResolvedValue({
      id: 'lecturer-123',
      userId: 'user-123',
      employeeId: 'EMP001'
    } as any)

    mockPrisma.schedule.findFirst.mockResolvedValue({
      id: 'schedule-123',
      lecturerId: 'lecturer-123',
      courseId: 'course-123',
      classroomId: 'classroom-123'
    } as any)

    mockPrisma.attendanceRecord.create.mockResolvedValue({
      id: 'attendance-123',
      lecturerId: 'lecturer-123',
      scheduleId: 'schedule-123',
      gpsLatitude: 5.6037,
      gpsLongitude: -0.1870,
      locationVerified: true,
      createdAt: new Date()
    } as any)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/attendance/take', {
      method: 'POST',
      body: JSON.stringify({
        gpsLatitude: 5.6037,
        gpsLongitude: -0.1870
      })
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Attendance recorded successfully')
    expect(mockVerifyLocationForAttendance).toHaveBeenCalledWith({
      latitude: 5.6037,
      longitude: -0.1870
    })
    expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledWith({
      data: {
        lecturerId: 'lecturer-123',
        scheduleId: 'schedule-123',
        gpsLatitude: 5.6037,
        gpsLongitude: -0.1870,
        locationVerified: true
      }
    })
  })

  it('should reject attendance with invalid location', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'lecturer@upsa.edu.gh',
        role: 'LECTURER',
        lecturerId: 'lecturer-123'
      }
    } as any)

    // Mock location verification - outside UPSA radius
    mockVerifyLocationForAttendance.mockReturnValue({
      verified: false,
      distance: 500,
      withinRadius: false
    })

    // Create request with coordinates outside UPSA
    const request = new NextRequest('http://localhost:3000/api/attendance/take', {
      method: 'POST',
      body: JSON.stringify({
        gpsLatitude: 5.6100,
        gpsLongitude: -0.1900
      })
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(400)
    expect(data.error).toBe('Location verification failed. You must be within UPSA campus to mark attendance.')
    expect(mockVerifyLocationForAttendance).toHaveBeenCalledWith({
      latitude: 5.6100,
      longitude: -0.1900
    })
    expect(mockPrisma.attendanceRecord.create).not.toHaveBeenCalled()
  })

  it('should reject attendance without authentication', async () => {
    // Mock no session
    mockGetServerSession.mockResolvedValue(null)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/attendance/take', {
      method: 'POST',
      body: JSON.stringify({
        gpsLatitude: 5.6037,
        gpsLongitude: -0.1870
      })
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(mockVerifyLocationForAttendance).not.toHaveBeenCalled()
    expect(mockPrisma.attendanceRecord.create).not.toHaveBeenCalled()
  })

  it('should reject attendance with invalid coordinates format', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'lecturer@upsa.edu.gh',
        role: 'LECTURER',
        lecturerId: 'lecturer-123'
      }
    } as any)

    // Create request with invalid coordinates
    const request = new NextRequest('http://localhost:3000/api/attendance/take', {
      method: 'POST',
      body: JSON.stringify({
        gpsLatitude: 'invalid',
        gpsLongitude: -0.1870
      })
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(400)
    expect(data.error).toContain('Validation error')
    expect(mockVerifyLocationForAttendance).not.toHaveBeenCalled()
    expect(mockPrisma.attendanceRecord.create).not.toHaveBeenCalled()
  })

  it('should handle lecturer not found error', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'lecturer@upsa.edu.gh',
        role: 'LECTURER',
        lecturerId: 'lecturer-123'
      }
    } as any)

    // Mock location verification - valid location
    mockVerifyLocationForAttendance.mockReturnValue({
      verified: true,
      distance: 150,
      withinRadius: true
    })

    // Mock lecturer not found
    mockPrisma.lecturer.findUnique.mockResolvedValue(null)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/attendance/take', {
      method: 'POST',
      body: JSON.stringify({
        gpsLatitude: 5.6037,
        gpsLongitude: -0.1870
      })
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(404)
    expect(data.error).toBe('Lecturer not found')
    expect(mockVerifyLocationForAttendance).toHaveBeenCalled()
    expect(mockPrisma.attendanceRecord.create).not.toHaveBeenCalled()
  })

  it('should handle no active schedule error', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'lecturer@upsa.edu.gh',
        role: 'LECTURER',
        lecturerId: 'lecturer-123'
      }
    } as any)

    // Mock location verification - valid location
    mockVerifyLocationForAttendance.mockReturnValue({
      verified: true,
      distance: 150,
      withinRadius: true
    })

    // Mock database operations
    mockPrisma.lecturer.findUnique.mockResolvedValue({
      id: 'lecturer-123',
      userId: 'user-123',
      employeeId: 'EMP001'
    } as any)

    // Mock no active schedule
    mockPrisma.schedule.findFirst.mockResolvedValue(null)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/attendance/take', {
      method: 'POST',
      body: JSON.stringify({
        gpsLatitude: 5.6037,
        gpsLongitude: -0.1870
      })
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(404)
    expect(data.error).toBe('No active schedule found for the current time')
    expect(mockVerifyLocationForAttendance).toHaveBeenCalled()
    expect(mockPrisma.attendanceRecord.create).not.toHaveBeenCalled()
  })
})