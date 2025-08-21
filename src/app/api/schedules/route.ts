import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

    const body = await request.json()
    const {
      courseId,
      classGroupId,
      lecturerId,
      classroomId,
      dayOfWeek,
      startTime,
      endTime,
      sessionType
    } = body

    // Validate required fields
    if (!courseId || !classGroupId || !lecturerId || !dayOfWeek || !startTime || !endTime || !sessionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for scheduling conflicts
    const conflictingSchedule = await prisma.courseSchedule.findFirst({
      where: {
        dayOfWeek,
        OR: [
          {
            lecturerId,
            OR: [
              {
                AND: [
                  { startTime: { lte: startTime } },
                  { endTime: { gt: startTime } }
                ]
              },
              {
                AND: [
                  { startTime: { lt: endTime } },
                  { endTime: { gte: endTime } }
                ]
              },
              {
                AND: [
                  { startTime: { gte: startTime } },
                  { endTime: { lte: endTime } }
                ]
              }
            ]
          },
          classroomId ? {
            classroomId,
            OR: [
              {
                AND: [
                  { startTime: { lte: startTime } },
                  { endTime: { gt: startTime } }
                ]
              },
              {
                AND: [
                  { startTime: { lt: endTime } },
                  { endTime: { gte: endTime } }
                ]
              },
              {
                AND: [
                  { startTime: { gte: startTime } },
                  { endTime: { lte: endTime } }
                ]
              }
            ]
          } : {}
        ]
      }
    })

    if (conflictingSchedule) {
      return NextResponse.json({ error: 'Schedule conflict detected' }, { status: 409 })
    }

    // Create the schedule
    const schedule = await prisma.courseSchedule.create({
      data: {
        courseId,
        classGroupId,
        lecturerId,
        classroomId: classroomId || null,
        dayOfWeek,
        startTime,
        endTime,
        sessionType
      },
      include: {
        course: {
          include: {
            programme: true
          }
        },
        classGroup: true,
        lecturer: {
          include: {
            user: true
          }
        },
        classroom: {
          include: {
            building: true
          }
        }
      }
    })

    const formattedSchedule = {
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      sessionType: schedule.sessionType,
      venue: schedule.classroom ? `${schedule.classroom.building?.name || 'Unknown Building'} - ${schedule.classroom.name}` : 'Virtual',
      isActive: true,
      createdAt: schedule.createdAt,
      course: {
        id: schedule.course.id,
        code: schedule.course.courseCode,
        name: schedule.course.title,
        credits: schedule.course.creditHours,
        programme: {
          name: schedule.course.programme.name,
          level: schedule.course.programme.level
        }
      },
      classGroup: {
        id: schedule.classGroup.id,
        name: schedule.classGroup.name,
        academicYear: schedule.classGroup.admissionYear.toString()
      },
      lecturer: {
        id: schedule.lecturer.id,
        firstName: schedule.lecturer.user.firstName,
        lastName: schedule.lecturer.user.lastName,
        email: schedule.lecturer.user.email
      }
    }

    return NextResponse.json(formattedSchedule, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'LECTURER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For lecturers, only show their own schedules
    let whereClause = {}
    if (session.user.role === 'LECTURER') {
      const lecturer = await prisma.lecturer.findUnique({
        where: { userId: session.user.id }
      })
      
      if (!lecturer) {
        return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 })
      }
      
      whereClause = { lecturerId: lecturer.id }
    }

    const schedules = await prisma.courseSchedule.findMany({
      where: whereClause,
      include: {
        course: {
          include: {
            programme: true
          }
        },
        classGroup: true,
        lecturer: {
          include: {
            user: true
          }
        },
        classroom: {
          include: {
            building: true
          }
        },
        _count: {
          select: {
            attendanceRecords: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    })

    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      sessionType: schedule.sessionType,
      venue: schedule.classroom ? `${schedule.classroom.building?.name || 'Unknown Building'} - ${schedule.classroom.name}` : 'Virtual',
      isActive: true, // Default to active, can be updated based on business logic
      createdAt: schedule.createdAt,
      course: {
        id: schedule.course.id,
        code: schedule.course.courseCode,
        name: schedule.course.title,
        credits: schedule.course.creditHours,
        programme: {
          name: schedule.course.programme.name,
          level: schedule.course.programme.level
        }
      },
      classGroup: {
        id: schedule.classGroup.id,
        name: schedule.classGroup.name,
        academicYear: schedule.classGroup.admissionYear.toString()
      },
      lecturer: {
        id: schedule.lecturer.id,
        firstName: schedule.lecturer.user.firstName,
        lastName: schedule.lecturer.user.lastName,
        email: schedule.lecturer.user.email
      },
      _count: schedule._count
    }))

    return NextResponse.json(formattedSchedules)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}