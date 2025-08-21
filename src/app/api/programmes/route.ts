import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const programmes = await prisma.programme.findMany({
      include: {
        _count: {
          select: {
            courses: true,
            classGroups: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const formattedProgrammes = programmes.map(programme => ({
      id: programme.id,
      name: programme.name,
      level: programme.level,
      durationSemesters: programme.durationSemesters,
      description: programme.description,
      deliveryModes: programme.deliveryModes ? JSON.parse(programme.deliveryModes) : [],
      createdAt: programme.createdAt,
      _count: programme._count
    }))

    return NextResponse.json(formattedProgrammes)
  } catch (error) {
    console.error('Error fetching programmes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

    const body = await request.json()
    const { name, level, durationSemesters, description, deliveryModes } = body

    // Check if programme already exists
    const existingProgramme = await prisma.programme.findFirst({
      where: {
        name,
        level
      }
    })

    if (existingProgramme) {
      return NextResponse.json({ error: 'Programme with this name and level already exists' }, { status: 400 })
    }

    const programme = await prisma.programme.create({
      data: {
        name,
        level,
        durationSemesters,
        description,
        deliveryModes
      },
      include: {
        _count: {
          select: {
            courses: true,
            classGroups: true
          }
        }
      }
    })

    return NextResponse.json(programme, { status: 201 })
  } catch (error) {
    console.error('Error creating programme:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}