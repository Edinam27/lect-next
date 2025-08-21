import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    // Check authorization
    if (!['ADMIN', 'COORDINATOR', 'LECTURER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Build where clause based on user role
    let whereClause: any = {};
    
    if (userRole === 'LECTURER') {
      // Lecturers can only see attendance for their own schedules
      whereClause = {
        courseSchedule: {
          lecturerId: userId
        }
      };
    }
    // ADMIN and COORDINATOR can see all attendance records

    // Fetch recent attendance records (last 50 records)
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            studentId: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        },
        courseSchedule: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            sessionType: true,
            course: {
              select: {
                code: true,
                title: true,
                programme: {
                  select: {
                    name: true
                  }
                }
              }
            },
            classGroup: {
              select: {
                name: true,
                admissionYear: true
              }
            },
            lecturer: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            classroom: {
              select: {
                name: true,
                building: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Format the response
    const formattedRecords = attendanceRecords.map(record => ({
      id: record.id,
      attendanceDate: record.attendanceDate,
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      location: record.location,
      remarks: record.remarks,
      createdAt: record.createdAt,
      student: {
        id: record.student.id,
        email: record.student.email,
        studentId: record.student.studentId,
        profile: {
          firstName: record.student.profile?.firstName,
          lastName: record.student.profile?.lastName,
          phoneNumber: record.student.profile?.phoneNumber
        }
      },
      courseSchedule: {
        id: record.courseSchedule.id,
        dayOfWeek: record.courseSchedule.dayOfWeek,
        startTime: record.courseSchedule.startTime,
        endTime: record.courseSchedule.endTime,
        sessionType: record.courseSchedule.sessionType,
        venue: `${record.courseSchedule.classroom.building.name} - ${record.courseSchedule.classroom.name}`,
        course: {
          code: record.courseSchedule.course.code,
          name: record.courseSchedule.course.title,
          programme: {
            name: record.courseSchedule.course.programme.name
          }
        },
        classGroup: {
          name: record.courseSchedule.classGroup.name,
          academicYear: record.courseSchedule.classGroup.admissionYear.toString()
        },
        lecturer: {
          id: record.courseSchedule.lecturer.id,
          email: record.courseSchedule.lecturer.email,
          name: `${record.courseSchedule.lecturer.profile?.firstName || ''} ${record.courseSchedule.lecturer.profile?.lastName || ''}`.trim()
        }
      }
    }));

    return NextResponse.json(formattedRecords);
  } catch (error) {
    console.error('Error fetching recent attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}