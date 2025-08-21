'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Course {
  id: number;
  code: string;
  title: string;
  programme: {
    name: string;
  };
}

interface ClassGroup {
  id: number;
  name: string;
  programme: {
    name: string;
  };
}

interface Lecturer {
  id: number;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

interface Classroom {
  id: number;
  name: string;
  building: {
    name: string;
  };
}

interface Schedule {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  isActive: boolean;
  course: {
    id: number;
    code: string;
    title: string;
    programme: {
      name: string;
    };
  };
  classGroup: {
    id: number;
    name: string;
    programme: {
      name: string;
    };
  };
  lecturer: {
    id: number;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  classroom: {
    id: number;
    name: string;
    building: {
      name: string;
    };
  };
}

export default function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const resolvedParams = use(params);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    courseId: '',
    classGroupId: '',
    lecturerId: '',
    classroomId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    sessionType: 'LECTURE',
    isActive: true
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [session, status, router, resolvedParams.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch schedule details
      const scheduleRes = await fetch(`/api/schedules/${resolvedParams.id}`);
      if (!scheduleRes.ok) {
        throw new Error('Failed to fetch schedule');
      }
      const scheduleData = await scheduleRes.json();
      setSchedule(scheduleData);
      
      // Set form data
      setFormData({
        courseId: scheduleData.course.id.toString(),
        classGroupId: scheduleData.classGroup.id.toString(),
        lecturerId: scheduleData.lecturer.id.toString(),
        classroomId: scheduleData.classroom.id.toString(),
        dayOfWeek: scheduleData.dayOfWeek,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        sessionType: scheduleData.sessionType,
        isActive: scheduleData.isActive
      });

      // Fetch all required data
      const [coursesRes, classGroupsRes, lecturersRes, classroomsRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/class-groups'),
        fetch('/api/lecturers'),
        fetch('/api/classrooms')
      ]);

      if (!coursesRes.ok || !classGroupsRes.ok || !lecturersRes.ok || !classroomsRes.ok) {
        throw new Error('Failed to fetch required data');
      }

      const [coursesData, classGroupsData, lecturersData, classroomsData] = await Promise.all([
        coursesRes.json(),
        classGroupsRes.json(),
        lecturersRes.json(),
        classroomsRes.json()
      ]);

      setCourses(coursesData);
      setClassGroups(classGroupsData);
      setLecturers(lecturersData);
      setClassrooms(classroomsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/schedules/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: parseInt(formData.courseId),
          classGroupId: parseInt(formData.classGroupId),
          lecturerId: parseInt(formData.lecturerId),
          classroomId: parseInt(formData.classroomId),
          dayOfWeek: formData.dayOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
          sessionType: formData.sessionType,
          isActive: formData.isActive
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update schedule');
      }

      router.push('/dashboard/schedules');
    } catch (error) {
      console.error('Error updating schedule:', error);
      setError(error instanceof Error ? error.message : 'Failed to update schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">Access denied. Admin or Coordinator role required.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Schedule</h1>
            <p className="text-gray-600 mt-2">Update schedule details</p>
          </div>
          <Link
            href={`/dashboard/schedules/${resolvedParams.id}`}
            className="w-full sm:w-auto bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-center"
          >
            Cancel
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {schedule && (
          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-2">
                    Course *
                  </label>
                  <select
                    id="courseId"
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title} ({course.programme.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="classGroupId" className="block text-sm font-medium text-gray-700 mb-2">
                    Class Group *
                  </label>
                  <select
                    id="classGroupId"
                    name="classGroupId"
                    value={formData.classGroupId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a class group</option>
                    {classGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.programme.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="lecturerId" className="block text-sm font-medium text-gray-700 mb-2">
                    Lecturer *
                  </label>
                  <select
                    id="lecturerId"
                    name="lecturerId"
                    value={formData.lecturerId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a lecturer</option>
                    {lecturers.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.profile.firstName} {lecturer.profile.lastName} ({lecturer.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="classroomId" className="block text-sm font-medium text-gray-700 mb-2">
                    Classroom *
                  </label>
                  <select
                    id="classroomId"
                    name="classroomId"
                    value={formData.classroomId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a classroom</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.building.name} - {classroom.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Week *
                  </label>
                  <select
                    id="dayOfWeek"
                    name="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select day</option>
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday</option>
                    <option value="SATURDAY">Saturday</option>
                    <option value="SUNDAY">Sunday</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sessionType" className="block text-sm font-medium text-gray-700 mb-2">
                    Session Type *
                  </label>
                  <select
                    id="sessionType"
                    name="sessionType"
                    value={formData.sessionType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LECTURE">Lecture</option>
                    <option value="TUTORIAL">Tutorial</option>
                    <option value="PRACTICAL">Practical</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="WORKSHOP">Workshop</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active Schedule
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                <Link
                  href={`/dashboard/schedules/${resolvedParams.id}`}
                  className="w-full sm:w-auto bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-center order-2 sm:order-1"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 order-1 sm:order-2"
                >
                  {submitting ? 'Updating...' : 'Update Schedule'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}