'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  QrCodeIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  CameraIcon,
  WifiIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { usePWA } from '@/components/providers/PWAProvider';
import { pwaService } from '@/lib/pwa';
import { MobilePageWrapper, MobileCard, MobileButton, MobileInput } from './MobileLayout';
import { CloudArrowUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ClassSession {
  id: string;
  subject: string;
  classGroup: string;
  scheduledTime: string;
  duration: number;
  location: string;
  building: string;
  classroom: string;
  expectedStudents: number;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
  profileImage?: string;
  isPresent?: boolean;
}

export default function MobileAttendanceRecorder() {
  const { data: session } = useSession();
  const { isOnline, pendingSyncCount } = usePWA();
  const [currentSession, setCurrentSession] = useState<ClassSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadCurrentSession();
    getCurrentLocation();
  }, []);

  const loadCurrentSession = async () => {
    try {
      setLoading(true);
      
      // Try to load from cache first if offline
      if (!isOnline) {
        const cachedSession = await pwaService.getCachedData('current-session');
        const cachedStudents = await pwaService.getCachedData('session-students');
        
        if (cachedSession) setCurrentSession(cachedSession);
        if (cachedStudents) setStudents(cachedStudents);
        
        setLoading(false);
        return;
      }

      // Load current session from API
      const response = await fetch('/api/attendance/current-session');
      if (response.ok) {
        const sessionData = await response.json();
        setCurrentSession(sessionData.session);
        setStudents(sessionData.students || []);
        
        // Cache for offline access
        await pwaService.cacheData('current-session', sessionData.session, 300000); // 5 minutes
        await pwaService.cacheData('session-students', sessionData.students, 300000);
      } else if (response.status === 404) {
        // No current session
        setCurrentSession(null);
        setStudents([]);
      }
    } catch (error) {
      console.error('Failed to load current session:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError('Location access denied. Please enable location services.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  };

  const toggleStudentAttendance = (studentId: string) => {
    setStudents(prev => 
      prev.map(student => 
        student.id === studentId 
          ? { ...student, isPresent: !student.isPresent }
          : student
      )
    );
    setHasChanges(true);
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(student => ({ ...student, isPresent: true })));
    setHasChanges(true);
  };

  const markAllAbsent = () => {
    setStudents(prev => prev.map(student => ({ ...student, isPresent: false })));
    setHasChanges(true);
  };

  const submitAttendance = async () => {
    if (!currentSession) return;
    
    try {
      setIsSubmitting(true);
      
      const attendanceData = {
        sessionId: currentSession.id,
        attendanceRecords: students.map(student => ({
          studentId: student.id,
          isPresent: student.isPresent || false,
        })),
        notes: attendanceNotes,
        location: location,
        timestamp: new Date().toISOString(),
      };

      if (isOnline) {
        const response = await fetch('/api/attendance/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attendanceData),
        });

        if (response.ok) {
          alert('Attendance recorded successfully!');
          // Reset form
        setStudents(prev => prev.map(student => ({ ...student, isPresent: false })));
        setAttendanceNotes('');
        setHasChanges(false);
      } else {
        throw new Error('Failed to record attendance');
      }
    } else {
      // Store for offline sync
      await pwaService.storeOfflineAttendance(attendanceData);
      alert('Attendance saved offline. Will sync when connection is restored.');
      
      // Reset form
      setStudents(prev => prev.map(student => ({ ...student, isPresent: false })));
      setAttendanceNotes('');
      setHasChanges(false);
    }
  } catch (error) {
    console.error('Failed to submit attendance:', error);
    alert('Failed to record attendance. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = students.filter(student => student.isPresent).length;
  const absentCount = students.filter(student => student.isPresent === false).length;
  const totalCount = students.length;
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Session</h2>
          <p className="text-gray-600 mb-4">
            There's no scheduled class session at this time. Please check your schedule or contact your administrator.
          </p>
          <button
            onClick={loadCurrentSession}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 active:scale-95 transition-transform"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <MobilePageWrapper title="Record Attendance">
      {/* Session Info */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-blue-800">
            {currentSession ? `${currentSession.subject} - ${currentSession.classroom}` : 'Loading session...'}
          </p>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1 bg-orange-500 px-2 py-1 rounded-full">
                <WifiIcon className="w-4 h-4 text-white" />
                <span className="text-xs text-white">Offline</span>
              </div>
            )}
            <button
              onClick={loadCurrentSession}
              className="p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {currentSession && (
          <div className="text-xs text-blue-600">
            {presentCount}/{totalCount} present ({attendancePercentage}%)
          </div>
        )}
      </div>

      {/* Pending Sync Indicator */}
      {pendingSyncCount.attendance > 0 && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-3 mx-4 mt-4 rounded">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mr-2" />
            <div className="text-sm">
              <p className="font-medium text-orange-800">Pending Sync</p>
              <p className="text-orange-700">
                {pendingSyncCount.attendance} attendance record{pendingSyncCount.attendance !== 1 ? 's' : ''} waiting to sync
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location Warning */}
      {locationError && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mx-4 mt-4 rounded">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Location Warning</p>
              <p className="text-yellow-700">{locationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <MobileCard>
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <MobileButton
              variant="outline"
              onClick={() => setShowQRScanner(true)}
              className="flex-col h-16 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <QrCodeIcon className="w-6 h-6 mb-1" />
              <span className="text-sm">Scan QR</span>
            </MobileButton>
            
            <MobileButton
              variant="outline"
              onClick={markAllPresent}
              disabled={!students.length}
              className="flex-col h-16 border-green-200 text-green-600 hover:bg-green-50"
            >
              <CheckCircleIcon className="w-6 h-6 mb-1" />
              <span className="text-sm">All Present</span>
            </MobileButton>
            
            <MobileButton
              variant="outline"
              onClick={markAllAbsent}
              disabled={!students.length}
              className="flex-col h-16 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircleIcon className="w-6 h-6 mb-1" />
              <span className="text-sm">All Absent</span>
            </MobileButton>
            
            <MobileButton
              variant="primary"
              onClick={submitAttendance}
              disabled={!hasChanges || isSubmitting}
              loading={isSubmitting}
              className="flex-col h-16"
            >
              <CloudArrowUpIcon className="w-6 h-6 mb-1" />
              <span className="text-sm">
                {isSubmitting ? 'Saving...' : 'Submit'}
              </span>
            </MobileButton>
          </div>
        </MobileCard>

        {/* Search */}
        <MobileInput
          placeholder="Search students..."
          value={searchTerm}
          onChange={setSearchTerm}
          type="search"
          leftIcon={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
        />

        {/* Students List */}
        <MobileCard padding="none">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Students ({filteredStudents.length})</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Present: {presentCount}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Absent: {absentCount}
                </span>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => toggleStudentAttendance(student.id)}
                className={`p-4 active:bg-gray-50 transition-colors cursor-pointer ${
                  student.isPresent ? 'bg-green-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {student.profileImage ? (
                        <img
                          src={student.profileImage}
                          alt={student.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.studentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {student.isPresent ? (
                      <CheckCircleIcon className="w-8 h-8 text-green-500" />
                    ) : (
                      <div className="w-8 h-8 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      </div>

      {/* Notes Input */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <textarea
          value={attendanceNotes}
          onChange={(e) => setAttendanceNotes(e.target.value)}
          placeholder="Add notes about this session (optional)..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-3"
          rows={2}
        />
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={submitAttendance}
          disabled={submitting || totalCount === 0}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          {submitting ? 'Recording...' : `Record Attendance (${presentCount}/${totalCount})`}
        </button>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onScan={(studentId) => {
            toggleStudentAttendance(studentId);
            setShowQRScanner(false);
          }}
        />
      )}
    </MobilePageWrapper>
  );
}

// QR Scanner Modal Component
interface QRScannerModalProps {
  onClose: () => void;
  onScan: (studentId: string) => void;
}

function QRScannerModal({ onClose, onScan }: QRScannerModalProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const startScanning = async () => {
    try {
      setScanning(true);
      setError('');
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // In a real implementation, you would integrate with a QR code scanning library
      // For now, we'll simulate the scanning process
      setTimeout(() => {
        // Simulate successful scan
        const mockStudentId = 'student-' + Math.random().toString(36).substr(2, 9);
        onScan(mockStudentId);
        
        // Stop camera
        stream.getTracks().forEach(track => track.stop());
      }, 3000);
      
    } catch (error) {
      setError('Camera access denied. Please enable camera permissions.');
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">QR Code Scanner</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <XCircleIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {error ? (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={startScanning}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : scanning ? (
            <div className="text-center py-8">
              <div className="w-32 h-32 border-4 border-blue-500 border-dashed rounded-lg mx-auto mb-4 flex items-center justify-center">
                <CameraIcon className="w-12 h-12 text-blue-500 animate-pulse" />
              </div>
              <p className="text-gray-600 mb-2">Scanning for QR codes...</p>
              <p className="text-sm text-gray-500">Point your camera at a student's QR code</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Scan student QR codes to quickly mark attendance
              </p>
              <button
                onClick={startScanning}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 active:scale-95 transition-transform"
              >
                Start Scanning
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}