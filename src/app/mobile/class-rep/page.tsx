import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { redirect } from 'next/navigation';
import ClassRepMobileDashboard from '@/components/mobile/ClassRepMobileDashboard';

export const metadata: Metadata = {
  title: 'Class Rep Mobile Dashboard | UPSA Attendance',
  description: 'Mobile-optimized dashboard for class representatives to verify attendance on-the-go',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#2563eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Class Rep Dashboard',
  },
};

export default async function ClassRepMobilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/mobile/class-rep');
  }

  // Check if user is a class representative
  if (session.user.role !== 'CLASS_REP') {
    redirect('/dashboard?error=unauthorized');
  }

  return (
    <div className="mobile-app-container">
      <ClassRepMobileDashboard />
    </div>
  );
}