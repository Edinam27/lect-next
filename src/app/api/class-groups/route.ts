import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only coordinators, admins, and lecturers can access all class groups
    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN' && session.user.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Access denied. Only coordinators, admins, and lecturers can access this resource.' }, { status: 403 })
    }

    const classGroups = await prisma.classGroup.findMany({
      include: {
        programme: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        classRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            courseSchedules: true
          }
        }
      },
      orderBy: [
        { admissionYear: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(classGroups)
  } catch (error) {
    console.error('Error fetching class groups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only coordinators, admins, and lecturers can create class groups
    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN' && session.user.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Access denied. Only coordinators, admins, and lecturers can create class groups.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, programmeId, admissionYear, currentSemester, maxStudents, deliveryMode, classRepId } = body

    // Validate required fields
    if (!name || !programmeId || !admissionYear) {
      return NextResponse.json({ error: 'Missing required fields: name, programmeId, admissionYear' }, { status: 400 })
    }

    // Check if class group name already exists
    const existingGroup = await prisma.classGroup.findFirst({
      where: { name }
    })

    if (existingGroup) {
      return NextResponse.json({ error: 'Class group with this name already exists' }, { status: 409 })
    }

    // Verify programme exists
    const programme = await prisma.programme.findUnique({
      where: { id: programmeId }
    })

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 })
    }

    // If classRepId is provided, verify the user exists and has CLASS_REP role
    if (classRepId) {
      const classRep = await prisma.user.findUnique({
        where: { id: classRepId }
      })

      if (!classRep || classRep.role !== 'CLASS_REP') {
        return NextResponse.json({ error: 'Invalid class representative' }, { status: 400 })
      }
    }

    const classGroup = await prisma.classGroup.create({
      data: {
        name,
        programmeId,
        admissionYear: parseInt(admissionYear),
        currentSemester: currentSemester ? parseInt(currentSemester) : 1,
        maxStudents: maxStudents ? parseInt(maxStudents) : 50,
        deliveryMode: deliveryMode || 'FACE_TO_FACE',
        classRepId: classRepId || null
      },
      include: {
        programme: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        classRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            students: true,
            courseSchedules: true
          }
        }
      }
    })

    return NextResponse.json(classGroup, { status: 201 })
  } catch (error) {
    console.error('Error creating class group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}