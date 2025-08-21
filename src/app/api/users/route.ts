import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Permission check is handled by middleware

    const users = await prisma.user.findMany({
      include: {
        lecturer: true,
        classGroupsAsRep: {
          include: {
            programme: true
          }
        },
        _count: {
          select: {
            classGroupsAsRep: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lecturer: user.lecturer ? {
        id: user.lecturer.id,
        employeeId: user.lecturer.employeeId,
        department: user.lecturer.department,
        title: user.lecturer.title
      } : null,
      classGroupsAsRep: user.classGroupsAsRep.map(group => ({
        id: group.id,
        name: group.name,
        programme: {
          name: group.programme.name,
          level: group.programme.level
        }
      })),
      _count: user._count
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Permission check is handled by middleware

    const body = await request.json()
    const { firstName, lastName, email, role, password, lecturerData, classGroupIds } = body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Hash password (you'll need to implement this)
    const passwordHash = password // This should be hashed

    // Create user with related data
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        role,
        passwordHash,
        isActive: true,
        ...(role === 'LECTURER' && lecturerData && {
          lecturer: {
            create: {
              employeeId: lecturerData.employeeId,
              department: lecturerData.department,
              title: lecturerData.title
            }
          }
        }),
        ...(role === 'CLASS_REP' && classGroupIds && {
          classGroupsAsRep: {
            connect: classGroupIds.map((id: string) => ({ id }))
          }
        })
      },
      include: {
        lecturer: true,
        classGroupsAsRep: true
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}