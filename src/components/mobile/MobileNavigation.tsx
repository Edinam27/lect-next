'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  WifiIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolidIcon,
  ClipboardDocumentCheckIcon as ClipboardSolidIcon,
  UserGroupIcon as UserGroupSolidIcon,
  ChartBarIcon as ChartBarSolidIcon,
} from '@heroicons/react/24/solid';
import { signOut } from 'next-auth/react';
import { usePWA } from '@/components/providers/PWAProvider';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  solidIcon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    solidIcon: HomeSolidIcon,
    roles: ['LECTURER', 'CLASS_REP', 'ADMIN', 'ACADEMIC_COORDINATOR'],
  },
  {
    name: 'Take Attendance',
    href: '/mobile/attendance',
    icon: ClipboardDocumentCheckIcon,
    solidIcon: ClipboardSolidIcon,
    roles: ['LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'],
  },
  {
    name: 'Verify Attendance',
    href: '/mobile/class-rep',
    icon: CheckCircleIcon,
    solidIcon: CheckCircleIcon,
    roles: ['CLASS_REP', 'ADMIN', 'ACADEMIC_COORDINATOR'],
  },
  {
    name: 'My Class',
    href: '/dashboard/class-info',
    icon: UserGroupIcon,
    solidIcon: UserGroupSolidIcon,
    roles: ['CLASS_REP', 'LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'],
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    solidIcon: ChartBarSolidIcon,
    roles: ['LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'],
  },
];

export default function MobileNavigation() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline, pendingSyncCount, hasUpdate } = usePWA();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userRole = session?.user?.role;
  const filteredItems = navigationItems.filter(item => 
    userRole && item.roles.includes(userRole)
  );

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const totalPendingSync = pendingSyncCount.attendance + pendingSyncCount.verifications;

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-40 md:hidden">
        <div className="grid grid-cols-4 h-16">
          {filteredItems.slice(0, 3).map((item) => {
            const Icon = isActive(item.href) ? item.solidIcon : item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center space-y-1 relative ${
                  isActive(item.href)
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.name.split(' ')[0]}</span>
                {item.badge && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </button>
            );
          })}
          
          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center space-y-1 text-gray-500 hover:text-gray-700 relative"
          >
            <Bars3Icon className="w-6 h-6" />
            <span className="text-xs font-medium">More</span>
            {(totalPendingSync > 0 || hasUpdate) && (
              <div className="absolute -top-1 -right-1 bg-orange-500 w-3 h-3 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Slide-out Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-blue-600 text-white p-4 safe-area-top">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Menu</h2>
                    <p className="text-blue-100 text-sm">
                      {session?.user?.name || 'User'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-full hover:bg-blue-700"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Status Indicators */}
                <div className="space-y-2">
                  {/* Online/Offline Status */}
                  <div className="flex items-center gap-2 text-sm">
                    <WifiIcon className="w-4 h-4" />
                    <span className={isOnline ? 'text-green-200' : 'text-orange-200'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  
                  {/* Pending Sync */}
                  {totalPendingSync > 0 && (
                    <div className="flex items-center gap-2 text-sm text-orange-200">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                      <span>{totalPendingSync} item{totalPendingSync !== 1 ? 's' : ''} pending sync</span>
                    </div>
                  )}
                  
                  {/* Update Available */}
                  {hasUpdate && (
                    <div className="flex items-center gap-2 text-sm text-green-200">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span>Update available</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {filteredItems.map((item) => {
                    const Icon = isActive(item.href) ? item.solidIcon : item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          router.push(item.href);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          isActive(item.href)
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                        {item.badge && (
                          <div className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {item.badge > 99 ? '99+' : item.badge}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Additional Menu Items */}
                <div className="border-t border-gray-200 p-4 space-y-2">
                  <button
                    onClick={() => {
                      router.push('/dashboard/notifications');
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <BellIcon className="w-5 h-5" />
                    <span className="font-medium">Notifications</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      router.push('/dashboard/settings');
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                    <span className="font-medium">Settings</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-4 safe-area-bottom">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
                
                {/* App Version */}
                <div className="mt-3 text-center text-xs text-gray-500">
                  UPSA Attendance v1.0.0
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Quick Action Floating Button
export function QuickActionFAB() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  // Don't show FAB on mobile pages or if already on relevant page
  if (pathname.startsWith('/mobile/') || pathname === '/dashboard') {
    return null;
  }

  const userRole = session?.user?.role;
  
  const getQuickAction = () => {
    switch (userRole) {
      case 'LECTURER':
        return {
          label: 'Take Attendance',
          href: '/mobile/attendance',
          icon: ClipboardDocumentCheckIcon,
        };
      case 'CLASS_REP':
        return {
          label: 'Verify Attendance',
          href: '/mobile/class-rep',
          icon: CheckCircleIcon,
        };
      default:
        return {
          label: 'Dashboard',
          href: '/dashboard',
          icon: HomeIcon,
        };
    }
  };

  const action = getQuickAction();
  const Icon = action.icon;

  return (
    <button
      onClick={() => router.push(action.href)}
      className="fab group"
      title={action.label}
    >
      <Icon className="w-6 h-6" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {action.label}
      </div>
    </button>
  );
}