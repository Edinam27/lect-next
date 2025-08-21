import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courses = await prisma.course.findMany({
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
      },
      orderBy: {
        courseCode: 'asc'
      }
    })

    const formattedCourses = courses.map(course => ({
      id: course.id,
      courseCode: course.courseCode,
      title: course.title,
      credits: course.credits,
      semester: course.semester,
      isElective: course.isElective,
      description: course.description,
      createdAt: course.createdAt,
      programme: course.programme,
      _count: course._count
    }))

    return NextResponse.json(formattedCourses)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseCode, title, credits, semester, isElective, description, programmeId } = body

    // Check if course already exists
    const existingCourse = await prisma.course.findFirst({
      where: {
        courseCode,
        programmeId
      }
    })

    if (existingCourse) {
      return NextResponse.json({ error: 'Course with this code already exists in this programme' }, { status: 400 })
    }

    const course = await prisma.course.create({
      data: {
        courseCode,
        title,
        credits,
        semester,
        isElective,
        description,
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
            schedules: true,
            classGroups: true
          }
        }
      }
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}