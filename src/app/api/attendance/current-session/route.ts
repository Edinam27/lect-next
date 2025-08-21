import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only lecturers, admins, and academic coordinators can access this
    if (!['LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const now = new Date();
    const currentTime = now.getTime();
    
    // Find current or upcoming session within the next 30 minutes
    const thirtyMinutesFromNow = new Date(currentTime + 30 * 60 * 1000);
    const thirtyMinutesAgo = new Date(currentTime - 30 * 60 * 1000);

    let currentSession;
    
    if (session.user.role === 'LECTURER') {
      // For lecturers, find their current session
      currentSession = await prisma.classSchedule.findFirst({
        where: {
          lecturerId: session.user.id,
          scheduledTime: {
            gte: thirtyMinutesAgo,
            lte: thirtyMinutesFromNow,
          },
        },
        include: {
          classGroup: {
            include: {
              students: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      profileImage: true,
                    },
                  },
                },
              },
            },
          },
          classroom: {
            include: {
              building: true,
            },
          },
          subject: true,
        },
        orderBy: {
          scheduledTime: 'asc',
        },
      });
    } else {
      // For admins and academic coordinators, find any current session
      currentSession = await prisma.classSchedule.findFirst({
        where: {
          scheduledTime: {
            gte: thirtyMinutesAgo,
            lte: thirtyMinutesFromNow,
          },
        },
        include: {
          lecturer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          classGroup: {
            include: {
              students: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      profileImage: true,
                    },
                  },
                },
              },
            },
          },
          classroom: {
            include: {
              building: true,
            },
          },
          subject: true,
        },
        orderBy: {
          scheduledTime: 'asc',
        },
      });
    }

    if (!currentSession) {
      return NextResponse.json(
        { message: 'No current session found' },
        { status: 404 }
      );
    }

    // Format the response
    const sessionData = {
      id: currentSession.id,
      subject: currentSession.subject.name,
      classGroup: currentSession.classGroup.name,
      scheduledTime: currentSession.scheduledTime.toISOString(),
      duration: currentSession.duration,
      location: `${currentSession.classroom.building.name} - ${currentSession.classroom.name}`,
      building: currentSession.classroom.building.name,
      classroom: currentSession.classroom.name,
      expectedStudents: currentSession.classGroup.students.length,
    };

    const students = currentSession.classGroup.students.map(student => ({
      id: student.user.id,
      name: student.user.name,
      studentId: student.studentId,
      profileImage: student.user.profileImage,
      isPresent: false, // Default to false, will be updated when attendance is taken
    }));

    return NextResponse.json({
      session: sessionData,
      students: students,
    });

  } catch (error) {
    console.error('Error fetching current session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get session by ID for mobile apps
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId } = z.object({
      sessionId: z.string(),
    }).parse(body);

    const classSession = await prisma.classSchedule.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        lecturer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        classGroup: {
          include: {
            students: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profileImage: true,
                  },
                },
              },
            },
          },
        },
        classroom: {
          include: {
            building: true,
          },
        },
        subject: true,
        attendanceRecords: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!classSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role === 'LECTURER' && classSession.lecturerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Format the response
    const sessionData = {
      id: classSession.id,
      subject: classSession.subject.name,
      classGroup: classSession.classGroup.name,
      scheduledTime: classSession.scheduledTime.toISOString(),
      duration: classSession.duration,
      location: `${classSession.classroom.building.name} - ${classSession.classroom.name}`,
      building: classSession.classroom.building.name,
      classroom: classSession.classroom.name,
      expectedStudents: classSession.classGroup.students.length,
      lecturer: classSession.lecturer.name,
    };

    // Get existing attendance records
    const attendanceMap = new Map(
      classSession.attendanceRecords.map(record => [record.studentId, record])
    );

    const students = classSession.classGroup.students.map(student => {
      const attendanceRecord = attendanceMap.get(student.user.id);
      return {
        id: student.user.id,
        name: student.user.name,
        studentId: student.studentId,
        profileImage: student.user.profileImage,
        isPresent: attendanceRecord?.isPresent || false,
        attendanceId: attendanceRecord?.id,
      };
    });

    return NextResponse.json({
      session: sessionData,
      students: students,
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}