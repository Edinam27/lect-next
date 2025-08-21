import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'month'
    const lecturerId = searchParams.get('lecturerId')

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate = new Date()

    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'semester':
        // Assuming semester starts in September or January
        const currentMonth = now.getMonth()
        if (currentMonth >= 8) { // September onwards
          startDate = new Date(now.getFullYear(), 8, 1) // September 1st
        } else {
          startDate = new Date(now.getFullYear(), 0, 1) // January 1st
        }
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Build where clause for lecturer filtering
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }
    
    if (lecturerId) {
      whereClause.lecturerId = lecturerId
    }

    // Get attendance statistics
    const totalAttendanceRecords = await prisma.attendanceRecord.count({
      where: whereClause
    })

    const verifiedRecords = await prisma.attendanceRecord.count({
      where: {
        ...whereClause,
        classRepVerified: true
      }
    })

    const disputedRecords = await prisma.attendanceRecord.count({
      where: {
        ...whereClause,
        classRepVerified: false
      }
    })

    const pendingRecords = await prisma.attendanceRecord.count({
      where: {
        ...whereClause,
        classRepVerified: null
      }
    })

    // Get lecturer statistics
    const activeLecturersWhere: any = {
      user: {
        isActive: true
      }
    }
    
    if (lecturerId) {
      activeLecturersWhere.id = lecturerId
    }
    
    const activeLecturers = await prisma.lecturer.count({
      where: activeLecturersWhere
    })

    const lecturersWithAttendance = await prisma.attendanceRecord.groupBy({
      by: ['lecturerId'],
      where: whereClause,
      _count: {
        lecturerId: true
      }
    })

    // Get course statistics
    const totalCourses = await prisma.course.count()
    const coursesWithAttendance = await prisma.attendanceRecord.groupBy({
      by: ['courseScheduleId'],
      where: whereClause,
      _count: {
        courseScheduleId: true
      }
    })

    // Get daily attendance trends
    const dailyAttendance = await prisma.attendanceRecord.groupBy({
      by: ['timestamp'],
      where: whereClause,
      _count: {
        id: true
      },
      orderBy: {
        timestamp: 'asc'
      }
    })

    // Process daily data
    const dailyData = dailyAttendance.reduce((acc: any, record) => {
      const date = record.timestamp.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + record._count.id
      return acc
    }, {})

    // Get top performing lecturers or specific lecturer data
    const topLecturers = await prisma.attendanceRecord.groupBy({
      by: ['lecturerId'],
      where: whereClause,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: lecturerId ? 1 : 10 // If filtering by lecturer, take only 1, otherwise top 10
    })

    // Get lecturer details for top performers
    const lecturerIds = topLecturers.map(l => l.lecturerId)
    const lecturerDetails = await prisma.lecturer.findMany({
      where: {
        id: {
          in: lecturerIds
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    const topLecturersWithDetails = topLecturers.map(tl => {
      const lecturer = lecturerDetails.find(ld => ld.id === tl.lecturerId)
      return {
        id: tl.lecturerId,
        name: lecturer ? `${lecturer.user.firstName} ${lecturer.user.lastName}` : 'Unknown',
        attendanceCount: tl._count.id,
        department: lecturer?.department || 'Unknown'
      }
    })

    // Calculate verification rate
    const verificationRate = totalAttendanceRecords > 0 
      ? ((verifiedRecords / totalAttendanceRecords) * 100).toFixed(1)
      : '0'

    const reportData = {
      overview: {
        totalAttendance: totalAttendanceRecords,
        verifiedAttendance: verifiedRecords,
        disputedAttendance: disputedRecords,
        pendingVerification: pendingRecords,
        verificationRate: parseFloat(verificationRate),
        activeLecturers,
        lecturersWithAttendance: lecturersWithAttendance.length,
        totalCourses,
        coursesWithAttendance: coursesWithAttendance.length
      },
      trends: {
        daily: Object.entries(dailyData).map(([date, count]) => ({
          date,
          count
        }))
      },
      topLecturers: topLecturersWithDetails,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range
      }
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error fetching report data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}