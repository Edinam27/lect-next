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

    // Check authorization
    if (!['ADMIN', 'COORDINATOR', 'LECTURER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch all classrooms
    const classrooms = await prisma.classroom.findMany({
      include: {
        building: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            address: true,
            gpsLatitude: true,
            gpsLongitude: true
          }
        },
        _count: {
          select: {
            courseSchedules: true
          }
        }
      },
      orderBy: [
        { building: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Format the response
    const formattedClassrooms = classrooms.map(classroom => ({
      id: classroom.id,
      name: classroom.name,
      capacity: classroom.capacity,
      type: classroom.type,
      equipment: classroom.equipment,
      isActive: classroom.isActive,
      createdAt: classroom.createdAt,
      building: {
        id: classroom.building.id,
        name: classroom.building.name,
        address: classroom.building.address,
        latitude: classroom.building.latitude,
        longitude: classroom.building.longitude
      },
      scheduleCount: classroom._count.courseSchedules
    }));

    return NextResponse.json(formattedClassrooms);
  } catch (error) {
    console.error('Error fetching classrooms:', error);
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

    // Only admins can create classrooms
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      capacity,
      type,
      equipment,
      buildingId,
      isActive = true
    } = body;

    // Validate required fields
    if (!name || !capacity || !buildingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate capacity is a positive number
    if (capacity <= 0) {
      return NextResponse.json(
        { error: 'Capacity must be a positive number' },
        { status: 400 }
      );
    }

    // Check if building exists
    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    });

    if (!building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      );
    }

    // Check if classroom name already exists in the same building
    const existingClassroom = await prisma.classroom.findFirst({
      where: {
        name,
        buildingId
      }
    });

    if (existingClassroom) {
      return NextResponse.json(
        { error: 'Classroom name already exists in this building' },
        { status: 400 }
      );
    }

    // Create classroom
    const classroom = await prisma.classroom.create({
      data: {
        name,
        capacity,
        type: type || null,
        equipment: equipment || null,
        buildingId,
        isActive
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Classroom created successfully',
      classroom: {
        id: classroom.id,
        name: classroom.name,
        capacity: classroom.capacity,
        type: classroom.type,
        equipment: classroom.equipment,
        isActive: classroom.isActive,
        createdAt: classroom.createdAt,
        building: classroom.building
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}