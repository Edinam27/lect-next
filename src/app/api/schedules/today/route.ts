import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get lecturer info
    const lecturer = await prisma.lecturer.findFirst({
      where: { userId: session.user.id }
    })
    
    if (!lecturer) {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 })
    }

    // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date()
    const todayDayOfWeek = today.getDay()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Fetch today's schedules for this lecturer
    const schedules = await prisma.courseSchedule.findMany({
      where: {
        lecturerId: lecturer.id,
        dayOfWeek: todayDayOfWeek
      },
      include: {
        course: true,
        classGroup: true,
        classroom: {
          include: {
            building: true
          }
        },
        attendanceRecords: {
          where: {
            timestamp: {
              gte: startOfDay,
              lt: endOfDay
            }
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // Filter out schedules that already have attendance recorded
    const availableSchedules = schedules.filter(schedule => 
      schedule.attendanceRecords.length === 0
    )

    const formattedSchedules = availableSchedules.map(schedule => ({
      id: schedule.id,
      sessionDate: today.toISOString().split('T')[0], // Add today's date for frontend
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      sessionType: schedule.sessionType,
      course: {
        id: schedule.course.id,
        title: schedule.course.title,
        courseCode: schedule.course.courseCode
      },
      classGroup: {
        id: schedule.classGroup.id,
        name: schedule.classGroup.name
      },
      building: {
        name: schedule.classroom?.building?.name || 'N/A'
      },
      classroom: {
        name: schedule.classroom?.name || 'N/A',
        virtualLink: schedule.classroom?.virtualLink || null
      }
    }))

    return NextResponse.json(formattedSchedules)
  } catch (error) {
    console.error('Error fetching today\'s schedules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}