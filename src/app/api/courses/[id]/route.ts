import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR' && session.user.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const resolvedParams = await params

    const course = await prisma.course.findUnique({
      where: {
        id: resolvedParams.id
      },
      include: {
        programme: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        _count: {
          select: {
            courseSchedules: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR') {
      return NextResponse.json({ error: 'Access denied. Only admins and coordinators can update courses.' }, { status: 403 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const { courseCode, title, description, creditHours, semester, isElective, programmeId } = body

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if course code is already taken by another course
    if (courseCode !== existingCourse.courseCode) {
      const duplicateCourse = await prisma.course.findFirst({
        where: {
          courseCode,
          programmeId,
          id: { not: resolvedParams.id }
        }
      })

      if (duplicateCourse) {
        return NextResponse.json({ error: 'A course with this code already exists in the selected programme' }, { status: 400 })
      }
    }

    const updatedCourse = await prisma.course.update({
      where: {
        id: resolvedParams.id
      },
      data: {
        courseCode,
        title,
        description,
        creditHours: parseInt(creditHours),
        semester: parseInt(semester),
        isElective: Boolean(isElective),
        programmeId
      },
      include: {
        programme: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        _count: {
          select: {
            courseSchedules: true
          }
        }
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR') {
      return NextResponse.json({ error: 'Access denied. Only admins and coordinators can delete courses.' }, { status: 403 })
    }

    const resolvedParams = await params

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            courseSchedules: true,
            attendanceRecords: true
          }
        }
      }
    })

    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if course has associated data
    if (existingCourse._count.courseSchedules > 0 || existingCourse._count.attendanceRecords > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete course with existing schedules or attendance records. Please remove associated data first.' 
      }, { status: 400 })
    }

    await prisma.course.delete({
      where: {
        id: resolvedParams.id
      }
    })

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}