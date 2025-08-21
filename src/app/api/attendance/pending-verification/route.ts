import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  status: z.enum(['PENDING', 'VERIFIED', 'DISPUTED', 'ABSENT']).optional(),
  urgent: z.string().optional().transform(val => val === 'true'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only class reps, admins, and academic coordinators can access this
    if (!['CLASS_REP', 'ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { limit, offset, status, urgent } = querySchema.parse(Object.fromEntries(searchParams));

    let whereClause: any = {};

    // For class reps, only show records for their class
    if (session.user.role === 'CLASS_REP') {
      // First, get the class rep's class group
      const classRep = await prisma.classGroupStudent.findFirst({
        where: {
          userId: session.user.id,
          isClassRep: true,
        },
        include: {
          classGroup: true,
        },
      });

      if (!classRep) {
        return NextResponse.json(
          { error: 'Class representative assignment not found' },
          { status: 404 }
        );
      }

      whereClause.classSchedule = {
        classGroupId: classRep.classGroupId,
      };
    }

    // Filter by status if provided
    if (status) {
      whereClause.verificationStatus = status;
    } else {
      // Default to pending if no status specified
      whereClause.verificationStatus = 'PENDING';
    }

    // Filter by urgent (deadline passed) if requested
    if (urgent) {
      whereClause.verificationDeadline = {
        lt: new Date(),
      };
    }

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        classSchedule: {
          include: {
            lecturer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            classroom: {
              include: {
                building: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            classGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        verifications: {
          include: {
            verifiedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: [
        {
          verificationDeadline: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: limit,
      skip: offset,
    });

    // Format the response
    const formattedRecords = attendanceRecords.map(record => {
      const schedule = record.classSchedule;
      const latestVerification = record.verifications[0];
      
      return {
        id: record.id,
        lecturerName: schedule.lecturer.name,
        subject: schedule.subject.name,
        subjectCode: schedule.subject.code,
        classGroup: schedule.classGroup.name,
        scheduledTime: schedule.scheduledTime.toISOString(),
        actualTime: record.actualCheckInTime?.toISOString(),
        status: record.verificationStatus,
        location: `${schedule.classroom.building.name} - ${schedule.classroom.name}`,
        building: schedule.classroom.building.name,
        classroom: schedule.classroom.name,
        notes: record.notes,
        verificationDeadline: record.verificationDeadline.toISOString(),
        isPresent: record.isPresent,
        riskScore: record.riskScore,
        studentName: record.student.name,
        studentEmail: record.student.email,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        verification: latestVerification ? {
          id: latestVerification.id,
          status: latestVerification.status,
          notes: latestVerification.notes,
          verifiedBy: latestVerification.verifiedBy.name,
          verifiedByRole: latestVerification.verifiedBy.role,
          verifiedAt: latestVerification.createdAt.toISOString(),
        } : null,
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.attendanceRecord.count({
      where: whereClause,
    });

    // Get summary statistics
    const stats = {
      total: totalCount,
      pending: await prisma.attendanceRecord.count({
        where: {
          ...whereClause,
          verificationStatus: 'PENDING',
        },
      }),
      verified: await prisma.attendanceRecord.count({
        where: {
          ...whereClause,
          verificationStatus: 'VERIFIED',
        },
      }),
      disputed: await prisma.attendanceRecord.count({
        where: {
          ...whereClause,
          verificationStatus: 'DISPUTED',
        },
      }),
      urgent: await prisma.attendanceRecord.count({
        where: {
          ...whereClause,
          verificationStatus: 'PENDING',
          verificationDeadline: {
            lt: new Date(),
          },
        },
      }),
    };

    return NextResponse.json({
      records: formattedRecords,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      stats,
    });

  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get specific attendance record for verification
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
    const { attendanceId } = z.object({
      attendanceId: z.string(),
    }).parse(body);

    const attendanceRecord = await prisma.attendanceRecord.findUnique({
      where: {
        id: attendanceId,
      },
      include: {
        classSchedule: {
          include: {
            lecturer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            classroom: {
              include: {
                building: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            classGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        verifications: {
          include: {
            verifiedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!attendanceRecord) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Check permissions for class reps
    if (session.user.role === 'CLASS_REP') {
      const classRep = await prisma.classGroupStudent.findFirst({
        where: {
          userId: session.user.id,
          isClassRep: true,
          classGroupId: attendanceRecord.classSchedule.classGroup.id,
        },
      });

      if (!classRep) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Format the response
    const schedule = attendanceRecord.classSchedule;
    const formattedRecord = {
      id: attendanceRecord.id,
      lecturerName: schedule.lecturer.name,
      subject: schedule.subject.name,
      subjectCode: schedule.subject.code,
      classGroup: schedule.classGroup.name,
      scheduledTime: schedule.scheduledTime.toISOString(),
      actualTime: attendanceRecord.actualCheckInTime?.toISOString(),
      status: attendanceRecord.verificationStatus,
      location: `${schedule.classroom.building.name} - ${schedule.classroom.name}`,
      building: schedule.classroom.building.name,
      classroom: schedule.classroom.name,
      notes: attendanceRecord.notes,
      verificationDeadline: attendanceRecord.verificationDeadline.toISOString(),
      isPresent: attendanceRecord.isPresent,
      riskScore: attendanceRecord.riskScore,
      student: {
        id: attendanceRecord.student.id,
        name: attendanceRecord.student.name,
        email: attendanceRecord.student.email,
        profileImage: attendanceRecord.student.profileImage,
      },
      createdAt: attendanceRecord.createdAt.toISOString(),
      updatedAt: attendanceRecord.updatedAt.toISOString(),
      verifications: attendanceRecord.verifications.map(verification => ({
        id: verification.id,
        status: verification.status,
        notes: verification.notes,
        verifiedBy: verification.verifiedBy.name,
        verifiedByRole: verification.verifiedBy.role,
        verifiedAt: verification.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(formattedRecord);

  } catch (error) {
    console.error('Error fetching attendance record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}