import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { redirect } from 'next/navigation'
import AuditTrailDashboard from '@/components/audit/AuditTrailDashboard'

export const metadata: Metadata = {
  title: 'Audit Trail - UPSA Attendance System',
  description: 'View and manage system audit logs and security events',
}

export default async function AuditPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Only allow ADMIN and ACADEMIC_COORDINATOR to access audit logs
  if (!['ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-6">
      <AuditTrailDashboard />
    </div>
  )
}