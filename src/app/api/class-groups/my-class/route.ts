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

    if (session.user.role !== 'CLASS_REP') {
      return NextResponse.json({ error: 'Access denied. Only class representatives can access this resource.' }, { status: 403 })
    }

    // Find the class group where the current user is the class representative
    const classGroup = await prisma.classGroup.findFirst({
      where: {
        classRepId: session.user.id
      },
      include: {
        programme: true,
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

    if (!classGroup) {
      return NextResponse.json({ error: 'No class group found for this user' }, { status: 404 })
    }

    return NextResponse.json(classGroup)
  } catch (error) {
    console.error('Error fetching class group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}