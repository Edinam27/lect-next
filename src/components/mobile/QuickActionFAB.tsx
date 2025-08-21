'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  QrCodeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  roles: string[];
}

const QuickActionFAB: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'record-attendance',
      label: 'Record Attendance',
      icon: ClipboardDocumentListIcon,
      href: '/mobile/attendance',
      roles: ['LECTURER', 'ADMIN', 'ACADEMIC_COORDINATOR'],
    },
    {
      id: 'verify-attendance',
      label: 'Verify Attendance',
      icon: QrCodeIcon,
      href: '/mobile/class-rep',
      roles: ['CLASS_REP'],
    },
    {
      id: 'view-classes',
      label: 'My Classes',
      icon: UserGroupIcon,
      href: '/dashboard/class-info',
      roles: ['LECTURER', 'CLASS_REP', 'ADMIN', 'ACADEMIC_COORDINATOR'],
    },
  ];

  const userRole = session?.user?.role;
  const availableActions = quickActions.filter(action => 
    userRole && action.roles.includes(userRole)
  );

  const handleActionClick = (action: QuickAction) => {
    setIsOpen(false);
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  if (!session || availableActions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-20 right-4 z-50">
        {/* Action Buttons */}
        {isOpen && (
          <div className="mb-4 space-y-3">
            {availableActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className="flex items-center justify-end"
                  style={{
                    animation: `slideInUp 0.3s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className="bg-white px-3 py-2 rounded-lg shadow-lg mr-3 border border-gray-200">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      {action.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleActionClick(action)}
                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isOpen ? 'rotate-45' : 'rotate-0'
          }`}
        >
          {isOpen ? (
            <XMarkIcon className="w-7 h-7" />
          ) : (
            <PlusIcon className="w-7 h-7" />
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default QuickActionFAB;