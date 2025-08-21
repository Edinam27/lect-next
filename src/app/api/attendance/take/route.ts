import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import { verifyLocationForAttendance } from '@/lib/geolocation'
import { verifyVirtualClassroom, generateDeviceFingerprint, getClientIpAddress } from '@/lib/virtual-verification'
import { z } from 'zod'

const takeAttendanceSchema = z.object({
  scheduleId: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  method: z.enum(['onsite', 'virtual']),
  action: z.enum(['start', 'end']).optional() // For virtual sessions
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scheduleId, latitude, longitude, method, action } = takeAttendanceSchema.parse(body)
    
    // Validate required fields based on method
    if (method === 'onsite' && (!latitude || !longitude)) {
      return NextResponse.json({ error: 'GPS coordinates are required for onsite attendance' }, { status: 400 })
    }

    // Get lecturer info
    const lecturer = await prisma.lecturer.findFirst({
      where: { userId: session.user.id }
    })
    
    if (!lecturer) {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 })
    }

    // Verify the schedule belongs to this lecturer
    const schedule = await prisma.courseSchedule.findFirst({
      where: {
        id: scheduleId,
        lecturerId: lecturer.id
      },
      include: {
        course: true,
        classGroup: true,
        classroom: {
          include: {
            building: true
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found or unauthorized' }, { status: 404 })
    }

    // Get client information for virtual sessions
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipAddress = getClientIpAddress(request.headers)
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress)

    // Check if attendance already recorded today
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        lecturerId: lecturer.id,
        courseScheduleId: scheduleId,
        timestamp: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    })

    // Handle virtual session actions (start/end)
    if (method === 'virtual' && action) {
      if (action === 'start') {
        if (existingRecord) {
          return NextResponse.json({ error: 'Virtual session already started for this class today' }, { status: 400 })
        }
        
        // Verify virtual classroom requirements
        const virtualVerification = await verifyVirtualClassroom({
          meetingLink: schedule.classroom?.virtualLink || '',
          scheduledStartTime: schedule.startTime,
          scheduledEndTime: schedule.endTime,
          userAgent,
          ipAddress
        })
        
        if (!virtualVerification.verified) {
          return NextResponse.json({ 
            error: 'Virtual session verification failed',
            details: virtualVerification.errors
          }, { status: 400 })
        }
        
        // Create attendance record for virtual session start
        const attendanceRecord = await prisma.attendanceRecord.create({
          data: {
            lecturerId: lecturer.id,
            courseScheduleId: scheduleId,
            timestamp: new Date(),
            gpsLatitude: null,
            gpsLongitude: null,
            locationVerified: false, // Not applicable for virtual
            method: method,
            classRepVerified: null,
            classRepComment: null,
            sessionStartTime: new Date(),
            timeWindowVerified: virtualVerification.timeWindowVerified,
            meetingLinkVerified: virtualVerification.meetingLinkVerified,
            sessionDurationMet: false, // Will be updated when session ends
            deviceFingerprint,
            ipAddress
          }
        })
        
        return NextResponse.json({
          success: true,
          message: 'Virtual session started successfully',
          record: {
            id: attendanceRecord.id,
            course: schedule.course.title,
            classGroup: schedule.classGroup.name,
            timestamp: attendanceRecord.timestamp,
            method: attendanceRecord.method,
            sessionStarted: true
          }
        })
      } else if (action === 'end') {
        if (!existingRecord) {
          return NextResponse.json({ error: 'No active virtual session found to end' }, { status: 400 })
        }
        
        if (existingRecord.sessionEndTime) {
          return NextResponse.json({ error: 'Virtual session already ended' }, { status: 400 })
        }
        
        // Update the existing record with end time
        const sessionEndTime = new Date()
        
        // Verify session duration if we have start time
        let sessionDurationMet = true
        if (existingRecord.sessionStartTime) {
          const { verifySessionDuration } = await import('@/lib/virtual-verification')
          const durationCheck = verifySessionDuration(
            existingRecord.sessionStartTime,
            sessionEndTime,
            schedule.startTime,
            schedule.endTime
          )
          sessionDurationMet = durationCheck.verified
        }
        
        const updatedRecord = await prisma.attendanceRecord.update({
          where: { id: existingRecord.id },
          data: {
            sessionEndTime,
            sessionDurationMet
          }
        })
        
        return NextResponse.json({
          success: true,
          message: 'Virtual session ended successfully',
          record: {
            id: updatedRecord.id,
            course: schedule.course.title,
            classGroup: schedule.classGroup.name,
            sessionDuration: sessionDurationMet,
            method: updatedRecord.method
          }
        })
      }
    }

    // Handle onsite attendance or virtual without action
    if (existingRecord) {
      return NextResponse.json({ error: 'Attendance already recorded for this session today' }, { status: 400 })
    }

    let locationVerified = false
    let timeWindowVerified = false
    let meetingLinkVerified = false
    let verificationErrors: string[] = []
    let locationVerification: any = null

    if (method === 'onsite') {
      // Verify GPS location for onsite attendance
      locationVerification = verifyLocationForAttendance({ latitude: latitude!, longitude: longitude! })
      
      if (!locationVerification.verified) {
        return NextResponse.json({ 
          error: `Location verification failed: You are ${locationVerification.distance}m away from campus (max allowed: 300m)` 
        }, { status: 400 })
      }
      
      locationVerified = locationVerification.verified
    } else if (method === 'virtual') {
      // Verify virtual classroom requirements
      const virtualVerification = await verifyVirtualClassroom({
        meetingLink: schedule.classroom?.virtualLink || '',
        scheduledStartTime: schedule.startTime,
        scheduledEndTime: schedule.endTime,
        userAgent,
        ipAddress
      })
      
      if (!virtualVerification.verified) {
        return NextResponse.json({ 
          error: 'Virtual classroom verification failed',
          details: virtualVerification.errors
        }, { status: 400 })
      }
      
      timeWindowVerified = virtualVerification.timeWindowVerified
      meetingLinkVerified = virtualVerification.meetingLinkVerified
    }

    // Record attendance
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        lecturerId: lecturer.id,
        courseScheduleId: scheduleId,
        timestamp: new Date(),
        gpsLatitude: latitude || null,
        gpsLongitude: longitude || null,
        locationVerified,
        method: method,
        classRepVerified: null, // Will be verified later by class rep
        classRepComment: null,
        sessionStartTime: method === 'virtual' ? new Date() : null,
        timeWindowVerified,
        meetingLinkVerified,
        sessionDurationMet: method === 'onsite', // Onsite doesn't need duration check
        deviceFingerprint: method === 'virtual' ? deviceFingerprint : null,
        ipAddress: method === 'virtual' ? ipAddress : null
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ATTENDANCE_RECORDED',
        entityType: 'AttendanceRecord',
        entityId: attendanceRecord.id,
        details: {
          scheduleId,
          course: schedule.course.name,
          classGroup: schedule.classGroup.name,
          location: { latitude, longitude },
          distance: locationVerification?.distance || null
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Attendance recorded successfully',
      record: {
        id: attendanceRecord.id,
        course: schedule.course.title,
        classGroup: schedule.classGroup.name,
        timestamp: attendanceRecord.timestamp,
        locationVerified: attendanceRecord.locationVerified,
        method: attendanceRecord.method
      }
    })
  } catch (error) {
    console.error('Error recording attendance:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}