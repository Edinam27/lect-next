import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!['ADMIN', 'LECTURER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const scheduleId = parseInt(params.id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }

    // For lecturers, verify they own this schedule
    if (userRole === 'LECTURER') {
      const schedule = await prisma.courseSchedule.findUnique({
        where: { id: scheduleId },
        select: { lecturerId: true }
      });

      if (!schedule || schedule.lecturerId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Fetch attendance records for this schedule
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        courseScheduleId: scheduleId
      },
      include: {
        student: {
          include: {
            profile: true
          }
        }
      },
      orderBy: [
        { attendanceDate: 'desc' },
        { student: { profile: { firstName: 'asc' } } }
      ]
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
      }
    }));

    return NextResponse.json(formattedRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only lecturers can create attendance records
    if (userRole !== 'LECTURER') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const scheduleId = parseInt(params.id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID' },
        { status: 400 }
      );
    }

    // Verify lecturer owns this schedule
    const schedule = await prisma.courseSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        classGroup: {
          include: {
            students: true
          }
        }
      }
    });

    if (!schedule || schedule.lecturerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { attendanceDate, studentAttendance } = body;

    if (!attendanceDate || !Array.isArray(studentAttendance)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate attendance date
    const date = new Date(attendanceDate);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid attendance date' },
        { status: 400 }
      );
    }

    // Check if attendance already exists for this date
    const existingAttendance = await prisma.attendanceRecord.findFirst({
      where: {
        courseScheduleId: scheduleId,
        attendanceDate: date
      }
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already recorded for this date' },
        { status: 400 }
      );
    }

    // Create attendance records
    const attendanceRecords = [];
    
    for (const attendance of studentAttendance) {
      const { studentId, status, checkInTime, checkOutTime, location, remarks } = attendance;
      
      if (!studentId || !status) {
        continue; // Skip invalid records
      }

      // Verify student is in the class group
      const studentInClass = schedule.classGroup.students.find(s => s.id === studentId);
      if (!studentInClass) {
        continue; // Skip students not in this class
      }

      const record = await prisma.attendanceRecord.create({
        data: {
          courseScheduleId: scheduleId,
          studentId,
          attendanceDate: date,
          status,
          checkInTime: checkInTime ? new Date(checkInTime) : null,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          location: location || null,
          remarks: remarks || null
        },
        include: {
          student: {
            include: {
              profile: true
            }
          }
        }
      });

      attendanceRecords.push({
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
        }
      });
    }

    return NextResponse.json({
      message: 'Attendance recorded successfully',
      records: attendanceRecords
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}