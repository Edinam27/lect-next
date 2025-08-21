import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Permission check is handled by middleware

    // Fetch all lecturers
    const lecturers = await prisma.user.findMany({
      where: {
        role: 'LECTURER',
        isActive: true
      },
      include: {
        lecturer: {
          select: {
            id: true, // Include lecturer ID
            employeeId: true,
            department: true,
            employmentType: true,
            rank: true,
            _count: {
              select: {
                courseSchedules: true
              }
            }
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    // Format the response - use lecturer.id instead of user.id for proper filtering
    const formattedLecturers = lecturers
      .filter(lecturer => lecturer.lecturer) // Only include users who have lecturer records
      .map(lecturer => ({
        id: lecturer.lecturer!.id, // Use lecturer ID, not user ID
        user: {
          firstName: lecturer.firstName,
          lastName: lecturer.lastName,
          email: lecturer.email
        },
        isActive: lecturer.isActive,
        createdAt: lecturer.createdAt,
        lecturer: {
          employeeId: lecturer.lecturer?.employeeId,
          department: lecturer.lecturer?.department,
          employmentType: lecturer.lecturer?.employmentType,
          rank: lecturer.lecturer?.rank,
          scheduleCount: lecturer.lecturer?._count.courseSchedules || 0
        }
      }));

    return NextResponse.json(formattedLecturers);
  } catch (error) {
    console.error('Error fetching lecturers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = session.user.role;

    // Only admins can create lecturers
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      employeeId,
      department,
      specialization
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !employeeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if employee ID already exists
    const existingLecturer = await prisma.lecturer.findUnique({
      where: { employeeId }
    });

    if (existingLecturer) {
      return NextResponse.json(
        { error: 'Employee ID already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create lecturer with profile
    const lecturer = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'LECTURER',
        profile: {
          create: {
            firstName,
            lastName,
            phoneNumber: phoneNumber || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
          }
        },
        lecturer: {
          create: {
            employeeId,
            department: department || null,
            specialization: specialization || null
          }
        }
      },
      include: {
        profile: true,
        lecturer: true
      }
    });

    // Format response (exclude password)
    const { password: _, ...lecturerWithoutPassword } = lecturer;
    
    return NextResponse.json({
      message: 'Lecturer created successfully',
      lecturer: lecturerWithoutPassword
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating lecturer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}