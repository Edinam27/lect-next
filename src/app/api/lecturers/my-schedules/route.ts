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

    // Only lecturers can access their own schedules
    if (userRole !== 'LECTURER') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch schedules for the current lecturer
    const schedules = await prisma.courseSchedule.findMany({
      where: {
        lecturerId: userId,
        isActive: true
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            programme: {
              select: {
                name: true,
                level: true
              }
            }
          }
        },
        classGroup: {
          select: {
            id: true,
            name: true,
            admissionYear: true,
            programme: {
              select: {
                name: true,
                level: true
              }
            },
            students: {
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
              },
              orderBy: {
                profile: {
                  firstName: 'asc'
                }
              }
            }
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
            id: true,
            name: true,
            capacity: true,
            building: {
              select: {
                name: true,
                address: true
              }
            }
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
    });

    // Format the response
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      sessionType: schedule.sessionType,
      venue: `${schedule.classroom.building.name} - ${schedule.classroom.name}`,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      course: {
        id: schedule.course.id,
        code: schedule.course.code,
        name: schedule.course.title,
        programme: {
          name: schedule.course.programme.name,
          level: schedule.course.programme.level
        }
      },
      classGroup: {
        id: schedule.classGroup.id,
        name: schedule.classGroup.name,
        academicYear: schedule.classGroup.admissionYear.toString(),
        programme: {
          name: schedule.classGroup.programme.name,
          level: schedule.classGroup.programme.level
        },
        students: schedule.classGroup.students
      },
      lecturer: {
        id: schedule.lecturer.id,
        email: schedule.lecturer.email,
        name: `${schedule.lecturer.profile?.firstName || ''} ${schedule.lecturer.profile?.lastName || ''}`.trim(),
        profile: schedule.lecturer.profile
      },
      classroom: {
        id: schedule.classroom.id,
        name: schedule.classroom.name,
        capacity: schedule.classroom.capacity,
        building: schedule.classroom.building
      },
      attendanceCount: schedule._count.attendanceRecords
    }));

    return NextResponse.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching lecturer schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}