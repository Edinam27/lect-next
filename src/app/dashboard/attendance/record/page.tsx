'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Schedule {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
  sessionType: string;
  course: {
    id: number;
    code: string;
    title: string;
  };
  classGroup: {
    id: number;
    name: string;
    academicYear: string;
    students: Student[];
  };
}

interface Student {
  id: number;
  email: string;
  studentId: string;
  profile: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
}

interface AttendanceData {
  studentId: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  checkInTime?: string;
  checkOutTime?: string;
  location?: string;
  remarks?: string;
}

export default function RecordAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedScheduleId = searchParams.get('scheduleId');
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'LECTURER') {
      router.push('/dashboard');
      return;
    }

    fetchSchedules();
  }, [session, status, router]);

  useEffect(() => {
    if (preSelectedScheduleId && schedules.length > 0) {
      const schedule = schedules.find(s => s.id === parseInt(preSelectedScheduleId));
      if (schedule) {
        handleScheduleSelect(schedule);
      }
    }
  }, [preSelectedScheduleId, schedules]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lecturers/my-schedules');
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSelect = async (schedule: Schedule) => {
    try {
      setSelectedSchedule(schedule);
      
      // Fetch detailed schedule with students
      const response = await fetch(`/api/schedules/${schedule.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schedule details');
      }
      
      const detailedSchedule = await response.json();
      setSelectedSchedule(detailedSchedule);
      
      // Initialize attendance data for all students
      const initialAttendance = detailedSchedule.classGroup.students.map((student: Student) => ({
        studentId: student.id,
        status: 'PRESENT' as const,
        checkInTime: '',
        checkOutTime: '',
        location: '',
        remarks: ''
      }));
      
      setAttendanceData(initialAttendance);
    } catch (error) {
      console.error('Error fetching schedule details:', error);
      setError('Failed to load schedule details');
    }
  };

  const updateAttendanceData = (studentId: number, field: keyof AttendanceData, value: any) => {
    setAttendanceData(prev => 
      prev.map(item => 
        item.studentId === studentId 
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSchedule) {
      setError('Please select a schedule');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/schedules/${selectedSchedule.id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceDate,
          studentAttendance: attendanceData.map(data => ({
            studentId: data.studentId,
            status: data.status,
            checkInTime: data.checkInTime || null,
            checkOutTime: data.checkOutTime || null,
            location: data.location || null,
            remarks: data.remarks || null
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record attendance');
      }

      setSuccess('Attendance recorded successfully!');
      
      // Reset form after successful submission
      setTimeout(() => {
        router.push('/dashboard/attendance');
      }, 2000);
    } catch (error) {
      console.error('Error recording attendance:', error);
      setError(error instanceof Error ? error.message : 'Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EXCUSED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'LECTURER') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">Access denied. Lecturer role required.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Record Attendance</h1>
            <p className="text-gray-600 mt-2">Mark attendance for your scheduled classes</p>
          </div>
          <Link
            href="/dashboard/attendance"
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Attendance
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Schedule Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Schedule *
                </label>
                <select
                  id="schedule"
                  value={selectedSchedule?.id || ''}
                  onChange={(e) => {
                    const schedule = schedules.find(s => s.id === parseInt(e.target.value));
                    if (schedule) handleScheduleSelect(schedule);
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a schedule</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.course.code} - {schedule.course.title} ({schedule.classGroup.name}) - {schedule.dayOfWeek} {formatTime(schedule.startTime)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="attendanceDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance Date *
                </label>
                <input
                  type="date"
                  id="attendanceDate"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Schedule Details */}
            {selectedSchedule && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Course:</span> {selectedSchedule.course.code} - {selectedSchedule.course.title}
                  </div>
                  <div>
                    <span className="font-medium">Class:</span> {selectedSchedule.classGroup.name} ({selectedSchedule.classGroup.academicYear})
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {selectedSchedule.dayOfWeek} {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                  </div>
                  <div>
                    <span className="font-medium">Venue:</span> {selectedSchedule.venue}
                  </div>
                  <div>
                    <span className="font-medium">Session:</span> {selectedSchedule.sessionType}
                  </div>
                  <div>
                    <span className="font-medium">Students:</span> {selectedSchedule.classGroup.students?.length || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Student Attendance */}
            {selectedSchedule && selectedSchedule.classGroup.students && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Attendance</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSchedule.classGroup.students.map((student, index) => {
                        const attendance = attendanceData.find(a => a.studentId === student.id);
                        return (
                          <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {student.profile.firstName} {student.profile.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {student.studentId} • {student.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={attendance?.status || 'PRESENT'}
                                onChange={(e) => updateAttendanceData(student.id, 'status', e.target.value)}
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(attendance?.status || 'PRESENT')}`}
                              >
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="LATE">Late</option>
                                <option value="EXCUSED">Excused</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="time"
                                value={attendance?.checkInTime || ''}
                                onChange={(e) => updateAttendanceData(student.id, 'checkInTime', e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="time"
                                value={attendance?.checkOutTime || ''}
                                onChange={(e) => updateAttendanceData(student.id, 'checkOutTime', e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={attendance?.remarks || ''}
                                onChange={(e) => updateAttendanceData(student.id, 'remarks', e.target.value)}
                                placeholder="Optional remarks"
                                className="text-sm border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedSchedule && (
              <div className="flex justify-end space-x-4">
                <Link
                  href="/dashboard/attendance"
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Attendance'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}