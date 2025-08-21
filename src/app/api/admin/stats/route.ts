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

    // Only admin and coordinator can access admin stats
    if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get comprehensive system statistics
    const [userStats, programmeStats, courseStats, attendanceStats, buildingStats] = await Promise.all([
      // User statistics
      prisma.user.groupBy({
        by: ['role'],
        where: { isActive: true },
        _count: { id: true }
      }),
      
      // Programme statistics
      prisma.programme.groupBy({
        by: ['level'],
        _count: { id: true }
      }),
      
      // Course statistics
      Promise.all([
        prisma.course.count(),
        prisma.courseSchedule.count(),
        prisma.classGroup.count()
      ]),
      
      // Attendance statistics
      Promise.all([
        prisma.attendanceRecord.count(),
        prisma.attendanceRecord.count({ where: { classRepVerified: true } }),
        prisma.attendanceRecord.count({ where: { classRepVerified: false } })
      ]),
      
      // Building and classroom statistics
      Promise.all([
        prisma.building.count(),
        prisma.classroom.count(),
        prisma.classroom.count({ where: { virtualLink: { not: null } } }),
        prisma.classroom.count({ where: { virtualLink: null } })
      ])
    ])

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentActivity = await prisma.attendanceRecord.count({
      where: {
        timestamp: {
          gte: sevenDaysAgo
        }
      }
    })

    // Get attendance trends for the last 4 weeks
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    
    const weeklyTrends = await prisma.attendanceRecord.groupBy({
      by: ['timestamp'],
      where: {
        timestamp: {
          gte: fourWeeksAgo
        }
      },
      _count: { id: true }
    })

    // Process weekly trends into weekly buckets
    const weeklyData = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      
      const weekCount = await prisma.attendanceRecord.count({
        where: {
          timestamp: {
            gte: weekStart,
            lte: weekEnd
          }
        }
      })
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        count: weekCount
      })
    }

    // Calculate overall attendance rate
    const totalSchedules = courseStats[1] // courseSchedule count
    const totalAttendance = attendanceStats[0] // total attendance records
    const classRepVerifiedAttendance = attendanceStats[1] // class rep verified attendance
    const classRepUnverifiedAttendance = attendanceStats[2] // class rep unverified attendance
    const overallAttendanceRate = totalSchedules > 0 ? Math.round((totalAttendance / totalSchedules) * 100) : 0

    // Format user statistics
    const usersByRole = userStats.reduce((acc, stat) => {
      acc[stat.role.toLowerCase()] = stat._count.id
      return acc
    }, {} as Record<string, number>)

    // Format programme statistics
    const programmesByLevel = programmeStats.reduce((acc, stat) => {
      acc[stat.level.toLowerCase()] = stat._count.id
      return acc
    }, {} as Record<string, number>)

    const systemOverview = {
      users: {
        total: Object.values(usersByRole).reduce((sum, count) => sum + count, 0),
        byRole: usersByRole,
        admins: usersByRole.admin || 0,
        coordinators: usersByRole.coordinator || 0,
        lecturers: usersByRole.lecturer || 0,
        classReps: usersByRole.class_rep || 0
      },
      programmes: {
        total: Object.values(programmesByLevel).reduce((sum, count) => sum + count, 0),
        byLevel: programmesByLevel
      },
      courses: {
        total: courseStats[0],
        schedules: courseStats[1],
        classGroups: courseStats[2]
      },
      attendance: {
        total: totalAttendance,
        verified: classRepVerifiedAttendance,
        unverified: classRepUnverifiedAttendance,
        rate: overallAttendanceRate,
        recentActivity
      },
      infrastructure: {
        buildings: buildingStats[0],
        classrooms: {
          total: buildingStats[1],
          virtual: buildingStats[2],
          physical: buildingStats[3]
        }
      },
      trends: {
        weekly: weeklyData
      }
    }

    return NextResponse.json(systemOverview)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}