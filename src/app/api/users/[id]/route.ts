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

    // Only ADMIN can view user details
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        lecturer: {
          include: {
            _count: {
              select: {
                courseSchedules: true
              }
            }
          }
        },
        classGroupsAsRep: {
          include: {
            programme: {
              select: {
                name: true,
                level: true
              }
            }
          }
        },
        _count: {
          select: {
            importJobs: true,
            auditLogs: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove sensitive information
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error fetching user:', error)
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

    // Only ADMIN can update users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, email, role, isActive, lecturer } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for duplicate email (excluding current user)
    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: params.id }
        }
      })

      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive

    // Handle lecturer update
    if (lecturer && role === 'LECTURER') {
      updateData.lecturer = {
        upsert: {
          create: lecturer,
          update: lecturer
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        lecturer: {
          include: {
            _count: {
              select: {
                courseSchedules: true
              }
            }
          }
        },
        classGroupsAsRep: {
          include: {
            programme: {
              select: {
                name: true,
                level: true
              }
            }
          }
        },
        _count: {
          select: {
            importJobs: true,
            auditLogs: true
          }
        }
      }
    })

    // Remove sensitive information
    const { passwordHash, ...userWithoutPassword } = updatedUser

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error updating user:', error)
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

    // Only ADMIN can delete users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        lecturer: {
          include: {
            _count: {
              select: {
                courseSchedules: true
              }
            }
          }
        },
        student: {
          include: {
            _count: {
              select: {
                attendanceRecords: true
              }
            }
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deletion of users with associated data
    if (existingUser.lecturer && existingUser.lecturer._count.courseSchedules > 0) {
      return NextResponse.json(
        { error: 'Cannot delete lecturer with associated course schedules' },
        { status: 400 }
      )
    }

    if (existingUser.student && existingUser.student._count.attendanceRecords > 0) {
      return NextResponse.json(
        { error: 'Cannot delete student with attendance records' },
        { status: 400 }
      )
    }

    // Delete user and related data
    await prisma.$transaction(async (tx) => {
      // Delete profile if exists
      if (existingUser.profile) {
        await tx.profile.delete({
          where: { userId: params.id }
        })
      }

      // Delete lecturer if exists
      if (existingUser.lecturer) {
        await tx.lecturer.delete({
          where: { userId: params.id }
        })
      }

      // Delete student if exists
      if (existingUser.student) {
        await tx.student.delete({
          where: { userId: params.id }
        })
      }

      // Delete user
      await tx.user.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}