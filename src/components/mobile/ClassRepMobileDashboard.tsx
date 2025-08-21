'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BellIcon,
  MapPinIcon,
  WifiIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolidIcon,
  XCircleIcon as XCircleSolidIcon,
} from '@heroicons/react/24/solid';
import { usePWA } from '@/components/providers/PWAProvider';
import { pwaService } from '@/lib/pwa';
import { MobilePageWrapper, MobileCard, MobileButton, MobileListItem } from './MobileLayout';

interface AttendanceRecord {
  id: string;
  lecturerName: string;
  subject: string;
  scheduledTime: string;
  actualTime?: string;
  status: 'PENDING' | 'VERIFIED' | 'DISPUTED' | 'ABSENT';
  location: string;
  notes?: string;
  verificationDeadline: string;
}

interface ClassInfo {
  id: string;
  name: string;
  totalStudents: number;
  activeStudents: number;
}

export default function ClassRepMobileDashboard() {
  const { data: session } = useSession();
  const { isOnline, pendingSyncCount } = usePWA();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to load from cache first if offline
      if (!isOnline) {
        const cachedRecords = await pwaService.getCachedData('attendance-records');
        const cachedClassInfo = await pwaService.getCachedData('class-info');
        
        if (cachedRecords) setAttendanceRecords(cachedRecords);
        if (cachedClassInfo) setClassInfo(cachedClassInfo);
        
        setLoading(false);
        return;
      }

      // Load fresh data from API
      const [recordsResponse, classResponse] = await Promise.all([
        fetch('/api/attendance/pending-verification'),
        fetch('/api/class-groups/my-class')
      ]);

      if (recordsResponse.ok) {
        const records = await recordsResponse.json();
        setAttendanceRecords(records);
        // Cache for offline access
        await pwaService.cacheData('attendance-records', records, 300000); // 5 minutes
      }

      if (classResponse.ok) {
        const classData = await classResponse.json();
        setClassInfo(classData);
        // Cache for offline access
        await pwaService.cacheData('class-info', classData, 3600000); // 1 hour
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleVerification = async (recordId: string, status: 'VERIFIED' | 'DISPUTED') => {
    try {
      setSubmitting(true);
      
      const verificationData = {
        attendanceId: recordId,
        status,
        notes: verificationNotes,
        timestamp: new Date().toISOString()
      };

      if (isOnline) {
        const response = await fetch('/api/attendance/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verificationData),
        });

        if (response.ok) {
          // Update local state
          setAttendanceRecords(prev => 
            prev.map(record => 
              record.id === recordId 
                ? { ...record, status, notes: verificationNotes }
                : record
            )
          );
        } else {
          throw new Error('Verification failed');
        }
      } else {
        // Store for offline sync
        await pwaService.storeOfflineVerification(verificationData);
        
        // Update local state optimistically
        setAttendanceRecords(prev => 
          prev.map(record => 
            record.id === recordId 
              ? { ...record, status, notes: verificationNotes }
              : record
          )
        );
      }

      setSelectedRecord(null);
      setVerificationNotes('');
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircleSolidIcon className="w-6 h-6 text-green-500" />;
      case 'DISPUTED':
        return <XCircleSolidIcon className="w-6 h-6 text-red-500" />;
      case 'ABSENT':
        return <XCircleIcon className="w-6 h-6 text-gray-400" />;
      default:
        return <ClockIcon className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-50 border-green-200';
      case 'DISPUTED':
        return 'bg-red-50 border-red-200';
      case 'ABSENT':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const pendingRecords = attendanceRecords.filter(record => record.status === 'PENDING');
  const urgentRecords = pendingRecords.filter(record => isDeadlinePassed(record.verificationDeadline));

  if (loading) {
    return (
      <MobilePageWrapper title="Class Rep Dashboard">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper title="Class Rep Dashboard">
      {/* Status Bar */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-blue-800">
            {session?.user?.name || 'Class Representative'}
          </p>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1 bg-orange-500 px-2 py-1 rounded-full">
                <WifiIcon className="w-4 h-4 text-white" />
                <span className="text-xs text-white">Offline</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
            <div className="text-xl font-bold text-blue-600">{pendingRecords.length}</div>
            <div className="text-xs text-blue-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-orange-200">
            <div className="text-xl font-bold text-orange-600">{urgentRecords.length}</div>
            <div className="text-xs text-orange-600">Urgent</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
            <div className="text-xl font-bold text-gray-600">{classInfo?.totalStudents || 0}</div>
            <div className="text-xs text-gray-600">Students</div>
          </div>
        </div>
      </div>

      {/* Pending Sync Indicator */}
      {(pendingSyncCount.attendance > 0 || pendingSyncCount.verifications > 0) && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-3 mx-4 mt-4 rounded">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mr-2" />
            <div className="text-sm">
              <p className="font-medium text-orange-800">Pending Sync</p>
              <p className="text-orange-700">
                {pendingSyncCount.verifications} verification{pendingSyncCount.verifications !== 1 ? 's' : ''} waiting to sync
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Class Info Card */}
      {classInfo && (
        <div className="mx-4 mt-4">
          <MobileCard>
            <div className="flex items-center gap-3">
              <UserGroupIcon className="w-8 h-8 text-blue-500" />
              <div>
                <h2 className="font-semibold text-gray-900">{classInfo.name}</h2>
                <p className="text-sm text-gray-600">
                  {classInfo.activeStudents} of {classInfo.totalStudents} active students
                </p>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {/* Urgent Verifications */}
      {urgentRecords.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-red-900">Urgent Verifications</h2>
          </div>
          <div className="space-y-2">
            {urgentRecords.map((record) => (
              <AttendanceCard
                key={record.id}
                record={record}
                isUrgent={true}
                onSelect={setSelectedRecord}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Verifications */}
      <div className="mx-4 mt-4 pb-20">
        <h2 className="font-semibold text-gray-900 mb-3">Pending Verifications</h2>
        {pendingRecords.length === 0 ? (
          <MobileCard>
            <div className="p-4 text-center">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">All caught up!</h3>
              <p className="text-gray-600 text-sm">No pending verifications at the moment.</p>
            </div>
          </MobileCard>
        ) : (
          <div className="space-y-3">
            {pendingRecords.map((record) => (
              <AttendanceCard
                key={record.id}
                record={record}
                isUrgent={false}
                onSelect={setSelectedRecord}
              />
            ))}
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {selectedRecord && (
        <VerificationModal
          record={selectedRecord}
          notes={verificationNotes}
          onNotesChange={setVerificationNotes}
          onVerify={(status) => handleVerification(selectedRecord.id, status)}
          onClose={() => {
            setSelectedRecord(null);
            setVerificationNotes('');
          }}
          submitting={submitting}
          isOffline={!isOnline}
        />
      )}
    </MobilePageWrapper>
  );
}

// Attendance Card Component
interface AttendanceCardProps {
  record: AttendanceRecord;
  isUrgent: boolean;
  onSelect: (record: AttendanceRecord) => void;
}

function AttendanceCard({ record, isUrgent, onSelect }: AttendanceCardProps) {
  const timeUntilDeadline = new Date(record.verificationDeadline).getTime() - new Date().getTime();
  const hoursUntilDeadline = Math.max(0, Math.floor(timeUntilDeadline / (1000 * 60 * 60)));

  return (
    <MobileCard
      onClick={() => onSelect(record)}
      className={`cursor-pointer ${
        isUrgent ? 'border-red-200 bg-red-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{record.lecturerName}</h3>
          <p className="text-gray-600 text-sm">{record.subject}</p>
        </div>
        {getStatusIcon(record.status)}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarDaysIcon className="w-4 h-4" />
          <span>{new Date(record.scheduledTime).toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPinIcon className="w-4 h-4" />
          <span>{record.location}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <ClockIcon className="w-4 h-4" />
          <span className={isUrgent ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {isUrgent ? 'Deadline passed' : `${hoursUntilDeadline}h remaining`}
          </span>
        </div>
      </div>

      {record.notes && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
          <strong>Notes:</strong> {record.notes}
        </div>
      )}
    </MobileCard>
  );
}

// Verification Modal Component
interface VerificationModalProps {
  record: AttendanceRecord;
  notes: string;
  onNotesChange: (notes: string) => void;
  onVerify: (status: 'VERIFIED' | 'DISPUTED') => void;
  onClose: () => void;
  submitting: boolean;
  isOffline: boolean;
}

function VerificationModal({
  record,
  notes,
  onNotesChange,
  onVerify,
  onClose,
  submitting,
  isOffline
}: VerificationModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Verify Attendance</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <XCircleIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Record Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{record.lecturerName}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Subject:</strong> {record.subject}</p>
              <p><strong>Scheduled:</strong> {new Date(record.scheduledTime).toLocaleString()}</p>
              <p><strong>Location:</strong> {record.location}</p>
              {record.actualTime && (
                <p><strong>Actual Time:</strong> {new Date(record.actualTime).toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Offline Warning */}
          {isOffline && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <WifiIcon className="w-5 h-5 text-orange-500" />
                <p className="text-sm text-orange-800">
                  You're offline. Verification will sync when connection is restored.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any additional notes about this verification..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <MobileButton
              onClick={() => onVerify('VERIFIED')}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              {submitting ? 'Verifying...' : 'Verify'}
            </MobileButton>
            <MobileButton
              onClick={() => onVerify('DISPUTED')}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              <XCircleIcon className="w-5 h-5 mr-2" />
              {submitting ? 'Disputing...' : 'Dispute'}
            </MobileButton>
          </div>
        </div>
      </div>
    </div>
  );
}