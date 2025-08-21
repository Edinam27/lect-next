// Chart Components Export
export { default as BaseChart } from './BaseChart';
export type { ChartData, ChartOptions } from './BaseChart';

export { default as AttendanceTrendsChart } from './AttendanceTrendsChart';
export { default as VerificationStatusChart } from './VerificationStatusChart';
export { default as LecturerPerformanceChart } from './LecturerPerformanceChart';
export { default as CourseAttendanceChart } from './CourseAttendanceChart';
export { default as AttendanceHeatmapChart } from './AttendanceHeatmapChart';
export { default as AnalyticsDashboard } from './AnalyticsDashboard';

// Re-export for convenience
export {
  AttendanceTrendsChart,
  VerificationStatusChart,
  LecturerPerformanceChart,
  CourseAttendanceChart,
  AttendanceHeatmapChart,
  AnalyticsDashboard,
};