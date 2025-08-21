import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Permission check is handled by middleware

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 3m, 6m, 1y
    const type = searchParams.get('type') || 'overview'; // overview, attendance, verification, courses

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (period) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '6m':
        startDate = subMonths(now, 6);
        break;
      case '1y':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 30);
    }

    // Base filters based on user role
    let attendanceFilter: any = {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    };

    if (user.role === 'LECTURER') {
      attendanceFilter.lecturerId = user.id;
    } else if (user.role === 'CLASS_REP') {
      // Get class rep's class group
      const classGroup = await prisma.classGroup.findFirst({
        where: { classRepId: user.id }
      });
      if (classGroup) {
      attendanceFilter.courseSchedule = {
        classGroupId: classGroup.id
      };
      }
    }

    switch (type) {
      case 'overview':
        return await getOverviewAnalytics(attendanceFilter, user.role);
      case 'attendance':
        return await getAttendanceAnalytics(attendanceFilter, startDate, endDate);
      case 'verification':
        return await getVerificationAnalytics(attendanceFilter, startDate, endDate);
      case 'courses':
        return await getCourseAnalytics(attendanceFilter, user.role, user.id);
      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

async function getOverviewAnalytics(filter: any, userRole: string) {
  const [totalRecords, verifiedRecords, pendingRecords, disputedRecords] = await Promise.all([
    prisma.attendanceRecord.count({ where: filter }),
    prisma.attendanceRecord.count({ 
      where: { ...filter, classRepVerified: true } 
    }),
    prisma.attendanceRecord.count({ 
      where: { ...filter, classRepVerified: null } 
    }),
    prisma.attendanceRecord.count({ 
      where: { ...filter, classRepVerified: false } 
    })
  ]);

  const verificationRate = totalRecords > 0 ? (verifiedRecords / totalRecords) * 100 : 0;
  const pendingRate = totalRecords > 0 ? (pendingRecords / totalRecords) * 100 : 0;

  // Get recent activity
  const recentActivity = await prisma.attendanceRecord.findMany({
    where: filter,
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: {
      lecturer: { 
        select: { 
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      courseSchedule: { 
        select: { 
          course: { select: { title: true, courseCode: true } },
          classGroup: { select: { name: true } }
        }
      }
    }
  });

  return NextResponse.json({
    overview: {
      totalRecords,
      verifiedRecords,
      pendingRecords,
      disputedRecords,
      verificationRate: Math.round(verificationRate * 100) / 100,
      pendingRate: Math.round(pendingRate * 100) / 100
    },
    recentActivity: recentActivity.map(record => ({
      id: record.id,
      course: `${record.courseSchedule.course.courseCode} - ${record.courseSchedule.course.title}`,
      lecturer: `${record.lecturer.user.firstName} ${record.lecturer.user.lastName}`,
      classGroup: record.courseSchedule.classGroup.name,
      date: record.timestamp,
      status: record.classRepVerified === null ? 'pending' : 
              record.classRepVerified ? 'verified' : 'disputed',
      sessionType: record.method
    }))
  });
}

async function getAttendanceAnalytics(filter: any, startDate: Date, endDate: Date) {
  // Daily attendance trends
  const dailyTrends = await prisma.$queryRawUnsafe(`
    SELECT 
      DATE(ar.timestamp) as day,
      COUNT(*) as total,
      SUM(CASE WHEN ar.class_rep_verified = 1 THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN ar.class_rep_verified = 0 THEN 1 ELSE 0 END) as disputed,
      SUM(CASE WHEN ar.class_rep_verified IS NULL THEN 1 ELSE 0 END) as pending
    FROM attendance_records ar
    ${filter.courseSchedule?.classGroupId ? 'JOIN course_schedules cs ON ar.course_schedule_id = cs.id' : ''}
    WHERE ar.timestamp >= '${startDate.toISOString()}' AND ar.timestamp <= '${endDate.toISOString()}'
    ${filter.lecturerId ? `AND ar.lecturer_id = '${filter.lecturerId}'` : ''}
    ${filter.courseSchedule?.classGroupId ? `AND cs.class_group_id = '${filter.courseSchedule.classGroupId}'` : ''}
    GROUP BY DATE(ar.timestamp)
    ORDER BY day
  `);

  // Session type distribution
  const sessionTypes = await prisma.attendanceRecord.groupBy({
    by: ['sessionType'],
    where: filter,
    _count: { sessionType: true }
  });

  // Location accuracy analysis
  const locationAccuracy = await prisma.attendanceRecord.groupBy({
    by: ['locationAccuracy'],
    where: { ...filter, locationAccuracy: { not: null } },
    _count: { locationAccuracy: true },
    _avg: { locationAccuracy: true }
  });

  return NextResponse.json({
    dailyTrends,
    sessionTypes: sessionTypes.map(st => ({
      type: st.sessionType,
      count: st._count.sessionType
    })),
    locationAccuracy: {
      distribution: locationAccuracy,
      averageAccuracy: locationAccuracy.reduce((acc, curr) => 
        acc + (curr._avg.locationAccuracy || 0), 0) / locationAccuracy.length || 0
    }
  });
}

async function getVerificationAnalytics(filter: any, startDate: Date, endDate: Date) {
  // Verification trends over time
  const verificationTrends = await prisma.$queryRawUnsafe(`
    SELECT 
      DATE(ar.updated_at) as day,
      COUNT(*) as total,
      SUM(CASE WHEN ar.class_rep_verified = 1 THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN ar.class_rep_verified = 0 THEN 1 ELSE 0 END) as disputed
    FROM attendance_records ar
    ${filter.courseSchedule?.classGroupId ? 'JOIN course_schedules cs ON ar.course_schedule_id = cs.id' : ''}
    WHERE ar.updated_at >= '${startDate.toISOString()}' AND ar.updated_at <= '${endDate.toISOString()}'
    AND ar.class_rep_verified IS NOT NULL
    ${filter.lecturerId ? `AND ar.lecturer_id = '${filter.lecturerId}'` : ''}
    ${filter.courseSchedule?.classGroupId ? `AND cs.class_group_id = '${filter.courseSchedule.classGroupId}'` : ''}
    GROUP BY DATE(ar.updated_at)
    ORDER BY day
  `);

  // Verification requests by status
  const verificationRequests = await prisma.verificationRequest.groupBy({
    by: ['status'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: { status: true }
  });

  // Average verification time
  const avgVerificationTime = await prisma.$queryRaw`
    SELECT AVG(
      CASE 
        WHEN reviewedAt IS NOT NULL 
        THEN (julianday(reviewedAt) - julianday(createdAt)) * 24 * 60
        ELSE NULL 
      END
    ) as avgMinutes
    FROM verification_requests 
    WHERE createdAt >= ${startDate.toISOString()} AND createdAt <= ${endDate.toISOString()}
    AND reviewedAt IS NOT NULL
    ${filter.lecturerId ? `AND lecturerId = '${filter.lecturerId}'` : ''}
    ${filter.courseScheduleId ? `AND courseScheduleId = '${filter.courseScheduleId}'` : ''}
  `;

  return NextResponse.json({
    verificationTrends,
    verificationRequests: verificationRequests.map(vr => ({
      status: vr.status,
      count: vr._count.status
    })),
    averageVerificationTime: (avgVerificationTime as any)[0]?.avgMinutes || 0
  });
}

async function getCourseAnalytics(filter: any, userRole: string, userId: string) {
  let courseFilter: any = {};
  
  if (userRole === 'LECTURER') {
    courseFilter.lecturerId = userId;
  }

  // Course attendance statistics
  const courseStats = await prisma.course.findMany({
    where: courseFilter,
    include: {
      attendanceRecords: {
        where: filter,
        select: {
          id: true,
          classRepVerified: true,
          sessionType: true
        }
      },
      _count: {
        select: {
          attendanceRecords: {
            where: filter
          }
        }
      }
    }
  });

  const courseAnalytics = courseStats.map(course => {
    const records = course.attendanceRecords;
    const total = records.length;
    const verified = records.filter(r => r.classRepVerified === true).length;
    const disputed = records.filter(r => r.classRepVerified === false).length;
    const pending = records.filter(r => r.classRepVerified === null).length;
    const virtualSessions = records.filter(r => r.sessionType === 'VIRTUAL').length;
    const physicalSessions = records.filter(r => r.sessionType === 'PHYSICAL').length;

    return {
      id: course.id,
      name: course.name,
      code: course.code,
      totalRecords: total,
      verifiedRecords: verified,
      disputedRecords: disputed,
      pendingRecords: pending,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
      virtualSessions,
      physicalSessions
    };
  });

  return NextResponse.json({
    courses: courseAnalytics
  });
}