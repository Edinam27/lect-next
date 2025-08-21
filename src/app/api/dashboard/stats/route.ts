import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const userId = session.user.id

    // Get current week date range
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    let stats: any = {}

    if (userRole === 'ADMIN') {
      // Admin sees system-wide statistics
      const [totalSessions, totalCourses, totalUsers, weeklyAttendance] = await Promise.all([
        prisma.attendanceRecord.count(),
        prisma.course.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.attendanceRecord.count({
          where: {
            timestamp: {
              gte: startOfWeek,
              lte: endOfWeek
            }
          }
        })
      ])

      // Calculate attendance rate
      const totalSchedules = await prisma.courseSchedule.count()
      const attendanceRate = totalSchedules > 0 ? Math.round((totalSessions / totalSchedules) * 100) : 0

      stats = {
        totalSessions,
        attendanceRate,
        activeCourses: totalCourses,
        thisWeek: weeklyAttendance,
        totalUsers
      }
    } else if (userRole === 'COORDINATOR') {
      // Coordinator sees programme-level statistics
      const [totalSessions, totalCourses, weeklyAttendance] = await Promise.all([
        prisma.attendanceRecord.count(),
        prisma.course.count(),
        prisma.attendanceRecord.count({
          where: {
            timestamp: {
              gte: startOfWeek,
              lte: endOfWeek
            }
          }
        })
      ])

      const totalSchedules = await prisma.courseSchedule.count()
      const attendanceRate = totalSchedules > 0 ? Math.round((totalSessions / totalSchedules) * 100) : 0

      stats = {
        totalSessions,
        attendanceRate,
        activeCourses: totalCourses,
        thisWeek: weeklyAttendance
      }
    } else if (userRole === 'LECTURER') {
      // Lecturer sees their own statistics
      const lecturer = await prisma.lecturer.findFirst({
        where: { userId }
      })

      if (!lecturer) {
        return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 })
      }

      const [mySessions, myCourses, myWeeklyAttendance] = await Promise.all([
        prisma.attendanceRecord.count({
          where: { lecturerId: lecturer.id }
        }),
        prisma.courseSchedule.count({
          where: { lecturerId: lecturer.id }
        }),
        prisma.attendanceRecord.count({
          where: {
            lecturerId: lecturer.id,
            timestamp: {
              gte: startOfWeek,
              lte: endOfWeek
            }
          }
        })
      ])

      const myTotalSchedules = await prisma.courseSchedule.count({
        where: { lecturerId: lecturer.id }
      })
      const attendanceRate = myTotalSchedules > 0 ? Math.round((mySessions / myTotalSchedules) * 100) : 0

      stats = {
        totalSessions: mySessions,
        attendanceRate,
        activeCourses: myCourses,
        thisWeek: myWeeklyAttendance
      }
    } else if (userRole === 'CLASS_REP') {
      // Class rep sees their class statistics
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { classGroupsAsRep: true }
      })

      if (!user?.classGroupsAsRep || user.classGroupsAsRep.length === 0) {
        return NextResponse.json({ error: 'Class group not found' }, { status: 404 })
      }

      const classGroupIds = user.classGroupsAsRep.map(group => group.id)

      const [classSessions, classCourses, classWeeklyAttendance] = await Promise.all([
        prisma.attendanceRecord.count({
          where: {
            courseSchedule: {
              classGroupId: { in: classGroupIds }
            }
          }
        }),
        prisma.courseSchedule.count({
          where: {
            classGroupId: { in: classGroupIds }
          }
        }),
        prisma.attendanceRecord.count({
          where: {
            courseSchedule: {
              classGroupId: { in: classGroupIds }
            },
            timestamp: {
              gte: startOfWeek,
              lte: endOfWeek
            }
          }
        })
      ])

      const classTotalSchedules = await prisma.courseSchedule.count({
        where: {
          classGroupId: { in: classGroupIds }
        }
      })
      const attendanceRate = classTotalSchedules > 0 ? Math.round((classSessions / classTotalSchedules) * 100) : 0

      stats = {
        totalSessions: classSessions,
        attendanceRate,
        activeCourses: classCourses,
        thisWeek: classWeeklyAttendance
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}