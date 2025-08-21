import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Permission check is handled by middleware

    const { searchParams } = new URL(request.url)
    const userId = session.user.id
    const userRole = session.user.role

    let whereClause: any = {}

    // Filter based on user role
    if (userRole === 'LECTURER') {
      // Get lecturer's attendance records
      const lecturer = await prisma.lecturer.findFirst({
        where: { userId }
      })
      
      if (!lecturer) {
        return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 })
      }

      whereClause = {
        courseSchedule: {
          lecturerId: lecturer.id
        }
      }
    } else if (userRole === 'CLASS_REP') {
      // Get class representative's class attendance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { classGroupsAsRep: true }
      })
      
      if (!user?.classGroupsAsRep || user.classGroupsAsRep.length === 0) {
        return NextResponse.json({ error: 'Class group not found' }, { status: 404 })
      }

      whereClause = {
        courseSchedule: {
          classGroupId: {
            in: user.classGroupsAsRep.map(group => group.id)
          }
        }
      }
    }
    // ADMIN and COORDINATOR can see all records (no additional filter)

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        lecturer: {
          include: {
            user: true
          }
        },
        courseSchedule: {
          include: {
            course: true,
            classGroup: true,
            classroom: {
              include: {
                building: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50 // Limit to recent 50 records
    })

    const formattedRecords = attendanceRecords.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      sessionType: record.courseSchedule.sessionType,
      course: {
        title: record.courseSchedule.course.title,
        courseCode: record.courseSchedule.course.courseCode
      },
      classGroup: {
        name: record.courseSchedule.classGroup.name
      },
      building: {
        name: record.courseSchedule.classroom?.building?.name || 'Virtual'
      },
      classroom: {
        name: record.courseSchedule.classroom?.name || 'Virtual'
      },
      lecturer: {
        name: `${record.lecturer.user.firstName} ${record.lecturer.user.lastName}`
      },
      locationVerified: record.locationVerified,
      method: record.method,
      classRepVerified: record.classRepVerified,
      classRepComment: record.classRepComment,
      gpsLatitude: record.gpsLatitude,
      gpsLongitude: record.gpsLongitude
    }))

    return NextResponse.json(formattedRecords)
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}