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

    // Only ADMIN and COORDINATOR can view programme details
    if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const programme = await prisma.programme.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            courses: true,
            classGroups: true
          }
        }
      }
    })

    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 })
    }

    return NextResponse.json(programme)
  } catch (error) {
    console.error('Error fetching programme:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can update programmes
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, level, duration, description } = body

    // Validate required fields
    if (!name || !code || !level || !duration) {
      return NextResponse.json(
        { error: 'Name, code, level, and duration are required' },
        { status: 400 }
      )
    }

    // Check if programme exists
    const existingProgramme = await prisma.programme.findUnique({
      where: { id: params.id }
    })

    if (!existingProgramme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 })
    }

    // Check for duplicate programme code (excluding current programme)
    const duplicateCode = await prisma.programme.findFirst({
      where: {
        code,
        id: { not: params.id }
      }
    })

    if (duplicateCode) {
      return NextResponse.json(
        { error: 'Programme code already exists' },
        { status: 400 }
      )
    }

    // Check for duplicate programme name (excluding current programme)
    const duplicateName = await prisma.programme.findFirst({
      where: {
        name,
        id: { not: params.id }
      }
    })

    if (duplicateName) {
      return NextResponse.json(
        { error: 'Programme name already exists' },
        { status: 400 }
      )
    }

    const updatedProgramme = await prisma.programme.update({
      where: { id: params.id },
      data: {
        name,
        code,
        level,
        duration: parseInt(duration),
        description: description || null
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

    return NextResponse.json(updatedProgramme)
  } catch (error) {
    console.error('Error updating programme:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can delete programmes
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if programme exists
    const existingProgramme = await prisma.programme.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            courses: true,
            classGroups: true
          }
        }
      }
    })

    if (!existingProgramme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 })
    }

    // Check if programme has associated courses or class groups
    if (existingProgramme._count.courses > 0) {
      return NextResponse.json(
        { error: 'Cannot delete programme with associated courses' },
        { status: 400 }
      )
    }

    if (existingProgramme._count.classGroups > 0) {
      return NextResponse.json(
        { error: 'Cannot delete programme with associated class groups' },
        { status: 400 }
      )
    }

    await prisma.programme.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Programme deleted successfully' })
  } catch (error) {
    console.error('Error deleting programme:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}