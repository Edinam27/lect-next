import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import { z } from 'zod'

const createVerificationRequestSchema = z.object({
  attendanceRecordId: z.string(),
  evidenceUrls: z.array(z.string()).optional(),
  verificationNotes: z.string().optional(),
  studentAttendanceData: z.object({
    totalStudentsPresent: z.number(),
    studentsAbsent: z.array(z.string()).optional(),
    sessionQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
    technicalIssues: z.array(z.string()).optional(),
    additionalNotes: z.string().optional()
  }).optional()
})

const updateVerificationRequestSchema = z.object({
  verificationRequestId: z.string(),
  status: z.enum(['approved', 'rejected', 'disputed']),
  reviewNotes: z.string().optional(),
  escalate: z.boolean().optional()
})

// POST - Create verification request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'CLASS_REP') {
      return NextResponse.json({ error: 'Unauthorized - Only class representatives can create verification requests' }, { status: 401 })
    }

    const body = await request.json()
    const { attendanceRecordId, evidenceUrls, verificationNotes, studentAttendanceData } = createVerificationRequestSchema.parse(body)

    // Get class rep's class groups
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { classGroupsAsRep: true }
    })
    
    if (!user?.classGroupsAsRep || user.classGroupsAsRep.length === 0) {
      return NextResponse.json({ error: 'Class group not found' }, { status: 404 })
    }

    // Get the attendance record and verify it belongs to class rep's class
    const attendanceRecord = await prisma.attendanceRecord.findFirst({
      where: {
        id: attendanceRecordId,
        courseSchedule: {
          classGroupId: {
            in: user.classGroupsAsRep.map(group => group.id)
          }
        }
      },
      include: {
        courseSchedule: {
          include: {
            course: true,
            classGroup: true,
            lecturer: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!attendanceRecord) {
      return NextResponse.json({ error: 'Attendance record not found or unauthorized' }, { status: 404 })
    }

    // Check if verification request already exists
    const existingRequest = await prisma.verificationRequest.findFirst({
      where: {
        attendanceRecordId: attendanceRecordId
      }
    })

    if (existingRequest) {
      return NextResponse.json({ error: 'Verification request already exists for this attendance record' }, { status: 400 })
    }

    // Create verification request
    const verificationRequest = await prisma.verificationRequest.create({
      data: {
        attendanceRecordId,
        classRepId: session.user.id,
        status: 'pending',
        evidenceUrls: evidenceUrls ? JSON.stringify(evidenceUrls) : null,
        verificationNotes,
        studentAttendanceData: studentAttendanceData ? JSON.stringify(studentAttendanceData) : null,
        submittedAt: new Date()
      }
    })

    // Create notification for lecturer
    await prisma.notification.create({
      data: {
        userId: attendanceRecord.courseSchedule.lecturer.userId,
        type: 'verification_request',
        title: 'Attendance Verification Request',
        message: `Class representative has submitted a verification request for your ${attendanceRecord.courseSchedule.course.title} session`,
        data: JSON.stringify({
          verificationRequestId: verificationRequest.id,
          attendanceRecordId,
          course: attendanceRecord.courseSchedule.course.title,
          classGroup: attendanceRecord.courseSchedule.classGroup.name,
          timestamp: attendanceRecord.timestamp
        }),
        channel: 'web'
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VERIFICATION_REQUEST_CREATED',
        targetType: 'VerificationRequest',
        targetId: verificationRequest.id,
        metadata: JSON.stringify({
          attendanceRecordId,
          lecturerName: `${attendanceRecord.courseSchedule.lecturer.user.firstName} ${attendanceRecord.courseSchedule.lecturer.user.lastName}`,
          course: attendanceRecord.courseSchedule.course.title,
          classGroup: attendanceRecord.courseSchedule.classGroup.name,
          evidenceCount: evidenceUrls?.length || 0,
          hasStudentData: !!studentAttendanceData
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Verification request created successfully',
      verificationRequest: {
        id: verificationRequest.id,
        status: verificationRequest.status,
        submittedAt: verificationRequest.submittedAt
      }
    })
  } catch (error) {
    console.error('Error creating verification request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Fetch verification requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = session.user.role

    let verificationRequests

    if (role === 'CLASS_REP') {
      // Get verification requests created by this class rep
      verificationRequests = await prisma.verificationRequest.findMany({
        where: {
          classRepId: session.user.id,
          ...(status && { status: status as any })
        },
        include: {
          attendanceRecord: {
            include: {
              courseSchedule: {
                include: {
                  course: true,
                  classGroup: true,
                  lecturer: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          },
          classRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          submittedAt: 'desc'
        }
      })
    } else if (role === 'LECTURER') {
      // Get verification requests for this lecturer's attendance records
      const lecturer = await prisma.lecturer.findUnique({
        where: { userId: session.user.id }
      })

      if (!lecturer) {
        return NextResponse.json({ error: 'Lecturer profile not found' }, { status: 404 })
      }

      verificationRequests = await prisma.verificationRequest.findMany({
        where: {
          attendanceRecord: {
            lecturerId: lecturer.id
          },
          ...(status && { status: status as any })
        },
        include: {
          attendanceRecord: {
            include: {
              courseSchedule: {
                include: {
                  course: true,
                  classGroup: true
                }
              }
            }
          },
          classRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          submittedAt: 'desc'
        }
      })
    } else {
      // Admin or coordinator can see all verification requests
      verificationRequests = await prisma.verificationRequest.findMany({
        where: {
          ...(status && { status: status as any })
        },
        include: {
          attendanceRecord: {
            include: {
              courseSchedule: {
                include: {
                  course: true,
                  classGroup: true,
                  lecturer: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          },
          classRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          submittedAt: 'desc'
        }
      })
    }

    const formattedRequests = verificationRequests.map(request => ({
      id: request.id,
      status: request.status,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      escalatedAt: request.escalatedAt,
      verificationNotes: request.verificationNotes,
      reviewNotes: request.reviewNotes,
      evidenceUrls: request.evidenceUrls ? JSON.parse(request.evidenceUrls) : [],
      studentAttendanceData: request.studentAttendanceData ? JSON.parse(request.studentAttendanceData) : null,
      attendanceRecord: {
        id: request.attendanceRecord.id,
        timestamp: request.attendanceRecord.timestamp,
        method: request.attendanceRecord.method,
        locationVerified: request.attendanceRecord.locationVerified,
        course: {
          title: request.attendanceRecord.courseSchedule.course.title,
          courseCode: request.attendanceRecord.courseSchedule.course.courseCode
        },
        classGroup: {
          name: request.attendanceRecord.courseSchedule.classGroup.name
        },
        lecturer: {
          name: `${request.attendanceRecord.courseSchedule.lecturer.user.firstName} ${request.attendanceRecord.courseSchedule.lecturer.user.lastName}`,
          employeeId: request.attendanceRecord.courseSchedule.lecturer.employeeId
        }
      },
      classRep: {
        name: `${request.classRep.firstName} ${request.classRep.lastName}`,
        email: request.classRep.email
      }
    }))

    return NextResponse.json(formattedRequests)
  } catch (error) {
    console.error('Error fetching verification requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update verification request status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { verificationRequestId, status, reviewNotes, escalate } = updateVerificationRequestSchema.parse(body)

    // Get the verification request
    const verificationRequest = await prisma.verificationRequest.findUnique({
      where: { id: verificationRequestId },
      include: {
        attendanceRecord: {
          include: {
            courseSchedule: {
              include: {
                course: true,
                classGroup: true,
                lecturer: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        },
        classRep: true
      }
    })

    if (!verificationRequest) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 })
    }

    // Check authorization
    const userRole = session.user.role
    const isLecturer = userRole === 'LECTURER' && verificationRequest.attendanceRecord.courseSchedule.lecturer.userId === session.user.id
    const isClassRep = userRole === 'CLASS_REP' && verificationRequest.classRepId === session.user.id
    const isAdminOrCoordinator = ['ADMIN', 'ACADEMIC_COORDINATOR'].includes(userRole)

    if (!isLecturer && !isClassRep && !isAdminOrCoordinator) {
      return NextResponse.json({ error: 'Unauthorized to update this verification request' }, { status: 403 })
    }

    // Update verification request
    const updatedRequest = await prisma.verificationRequest.update({
      where: { id: verificationRequestId },
      data: {
        status,
        reviewNotes,
        reviewedAt: new Date(),
        ...(escalate && { escalatedAt: new Date() })
      }
    })

    // Update attendance record if approved
    if (status === 'approved') {
      await prisma.attendanceRecord.update({
        where: { id: verificationRequest.attendanceRecordId },
        data: {
          classRepVerified: true,
          classRepComment: reviewNotes || 'Verified through detailed verification request'
        }
      })
    } else if (status === 'rejected') {
      await prisma.attendanceRecord.update({
        where: { id: verificationRequest.attendanceRecordId },
        data: {
          classRepVerified: false,
          classRepComment: reviewNotes || 'Rejected through verification request'
        }
      })
    }

    // Create notifications
    const notificationTargets = []
    
    if (isLecturer) {
      // Notify class rep
      notificationTargets.push({
        userId: verificationRequest.classRepId,
        title: `Verification Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your verification request for ${verificationRequest.attendanceRecord.courseSchedule.course.title} has been ${status}`
      })
    } else if (isClassRep || isAdminOrCoordinator) {
      // Notify lecturer
      notificationTargets.push({
        userId: verificationRequest.attendanceRecord.courseSchedule.lecturer.userId,
        title: `Verification Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Verification request for your ${verificationRequest.attendanceRecord.courseSchedule.course.title} session has been ${status}`
      })
    }

    // Create notifications
    for (const target of notificationTargets) {
      await prisma.notification.create({
        data: {
          userId: target.userId,
          type: 'verification_update',
          title: target.title,
          message: target.message,
          data: JSON.stringify({
            verificationRequestId,
            status,
            course: verificationRequest.attendanceRecord.courseSchedule.course.title,
            classGroup: verificationRequest.attendanceRecord.courseSchedule.classGroup.name
          }),
          channel: 'web'
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VERIFICATION_REQUEST_UPDATED',
        targetType: 'VerificationRequest',
        targetId: verificationRequestId,
        metadata: JSON.stringify({
          status,
          reviewNotes,
          escalated: !!escalate,
          reviewerRole: userRole,
          course: verificationRequest.attendanceRecord.courseSchedule.course.title,
          classGroup: verificationRequest.attendanceRecord.courseSchedule.classGroup.name
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: `Verification request ${status} successfully`,
      verificationRequest: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        reviewedAt: updatedRequest.reviewedAt,
        escalatedAt: updatedRequest.escalatedAt
      }
    })
  } catch (error) {
    console.error('Error updating verification request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}