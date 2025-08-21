-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lecturer_id" TEXT NOT NULL,
    "course_schedule_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "gps_latitude" REAL,
    "gps_longitude" REAL,
    "location_verified" BOOLEAN NOT NULL,
    "method" TEXT NOT NULL,
    "class_rep_verified" BOOLEAN,
    "class_rep_comment" TEXT,
    "session_start_time" DATETIME,
    "session_end_time" DATETIME,
    "time_window_verified" BOOLEAN NOT NULL DEFAULT false,
    "meeting_link_verified" BOOLEAN NOT NULL DEFAULT false,
    "session_duration_met" BOOLEAN NOT NULL DEFAULT false,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    CONSTRAINT "attendance_records_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_course_schedule_id_fkey" FOREIGN KEY ("course_schedule_id") REFERENCES "course_schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_attendance_records" ("class_rep_comment", "class_rep_verified", "course_schedule_id", "gps_latitude", "gps_longitude", "id", "lecturer_id", "location_verified", "method", "timestamp") SELECT "class_rep_comment", "class_rep_verified", "course_schedule_id", "gps_latitude", "gps_longitude", "id", "lecturer_id", "location_verified", "method", "timestamp" FROM "attendance_records";
DROP TABLE "attendance_records";
ALTER TABLE "new_attendance_records" RENAME TO "attendance_records";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
