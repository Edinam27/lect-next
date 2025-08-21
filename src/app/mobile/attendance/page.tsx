import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import MobileAttendanceRecorder from '@/components/mobile/MobileAttendanceRecorder';

export const metadata: Metadata = {
  title: 'Mobile Attendance | UPSA Attendance',
  description: 'Mobile-optimized attendance recording for lecturers on-the-go',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Attendance Recorder',
  },
};

export default async function MobileAttendancePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/mobile/attendance');
  }

  // Check if user is a lecturer or admin
  if (!['LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
    redirect('/dashboard?error=unauthorized');
  }

  return (
    <div className="mobile-app-container">
      <MobileAttendanceRecorder />
    </div>
  );
}