import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN, COORDINATOR, and LECTURER can view programme courses
    if (!['ADMIN', 'COORDINATOR', 'LECTURER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if programme exists
    const programme = await prisma.programme.findUnique({
      where: { id: params.id }
    })

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 })
    }

    const courses = await prisma.course.findMany({
      where: { programmeId: params.id },
      orderBy: [
        { semester: 'asc' },
        { courseCode: 'asc' }
      ],
      select: {
        id: true,
        courseCode: true,
        title: true,
        creditHours: true,
        semester: true,
        isElective: true
      }
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Error fetching programme courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}