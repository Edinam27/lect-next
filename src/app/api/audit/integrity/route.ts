import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

const integrityCheckSchema = z.object({
  logId: z.string()
})

const cleanupSchema = z.object({
  retentionDays: z.number().min(30).max(2555).default(365) // 30 days to 7 years
})

// Verify audit log integrity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can verify audit log integrity
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const { logId } = integrityCheckSchema.parse(Object.fromEntries(searchParams.entries()))

    const isValid = await AuditService.verifyAuditLogIntegrity(logId)

    // Log the integrity check
    await AuditService.createAuditLog({
      userId: session.user.id,
      action: 'AUDIT_INTEGRITY_CHECKED',
      targetType: 'AuditLog',
      targetId: logId,
      metadata: {
        result: isValid ? 'valid' : 'invalid',
        checkedBy: session.user.email
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        logId,
        isValid,
        message: isValid ? 'Audit log integrity verified' : 'Audit log integrity compromised'
      }
    })
  } catch (error) {
    console.error('Error verifying audit log integrity:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Cleanup old audit logs
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can cleanup audit logs
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { retentionDays } = cleanupSchema.parse(body)

    const deletedCount = await AuditService.cleanupOldLogs(retentionDays)

    // Log the cleanup action
    await AuditService.createAuditLog({
      userId: session.user.id,
      action: 'AUDIT_LOGS_CLEANED',
      targetType: 'AuditLog',
      targetId: 'bulk',
      metadata: {
        retentionDays,
        deletedCount,
        cleanedBy: session.user.email
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        retentionDays,
        message: `Successfully deleted ${deletedCount} old audit logs`
      }
    })
  } catch (error) {
    console.error('Error cleaning up audit logs:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}