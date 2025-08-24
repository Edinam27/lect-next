-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "phone_number" TEXT,
    "profile_image" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "preferences" TEXT,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "lecturers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "rank" TEXT,
    "department" TEXT,
    "employment_type" TEXT,
    "specialization" TEXT,
    "office_location" TEXT,
    "office_hours" TEXT,
    "bio" TEXT,
    "qualifications" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_date" DATETIME,
    CONSTRAINT "lecturers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "duration_semesters" INTEGER NOT NULL,
    "description" TEXT,
    "delivery_modes" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "coordinator" TEXT,
    "requirements" TEXT,
    "accreditation" TEXT,
    "established_year" INTEGER
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "course_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credit_hours" INTEGER NOT NULL,
    "programme_id" TEXT NOT NULL,
    "semester_level" INTEGER NOT NULL,
    "is_elective" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "prerequisites" TEXT,
    "learning_outcomes" TEXT,
    "assessment_methods" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "virtual_enabled" BOOLEAN NOT NULL DEFAULT false,
    "hybrid_enabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "courses_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "class_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "programme_id" TEXT NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "delivery_mode" TEXT NOT NULL,
    "class_rep_id" TEXT,
    "student_count" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "semester" TEXT,
    "academic_year" TEXT,
    "group_type" TEXT,
    "communication_channels" TEXT,
    CONSTRAINT "class_groups_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "class_groups_class_rep_id_fkey" FOREIGN KEY ("class_rep_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "gps_latitude" REAL NOT NULL,
    "gps_longitude" REAL NOT NULL,
    "total_floors" INTEGER
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "capacity" INTEGER,
    "room_type" TEXT,
    "equipment_list" TEXT,
    "gps_latitude" REAL,
    "gps_longitude" REAL,
    "availability_status" TEXT NOT NULL DEFAULT 'available',
    "virtual_link" TEXT,
    CONSTRAINT "classrooms_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "course_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "course_id" TEXT NOT NULL,
    "class_group_id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "classroom_id" TEXT,
    "session_type" TEXT NOT NULL,
    CONSTRAINT "course_schedules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "course_schedules_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "class_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "course_schedules_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "course_schedules_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lecturer_id" TEXT NOT NULL,
    "course_schedule_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "gps_latitude" REAL,
    "gps_longitude" REAL,
    "location_verified" BOOLEAN NOT NULL,
    "location_accuracy" REAL,
    "method" TEXT NOT NULL,
    "class_rep_verified" BOOLEAN,
    "class_rep_comment" TEXT,
    "session_start_time" DATETIME,
    "session_end_time" DATETIME,
    "session_duration" INTEGER,
    "time_window_verified" BOOLEAN NOT NULL DEFAULT false,
    "meeting_link_verified" BOOLEAN NOT NULL DEFAULT false,
    "session_duration_met" BOOLEAN NOT NULL DEFAULT false,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_info" TEXT,
    "engagement_score" REAL,
    "virtual_session_id" TEXT,
    "verification_confidence_score" REAL,
    "student_attendance_data" TEXT,
    "session_quality_rating" INTEGER,
    "technical_issues" TEXT,
    CONSTRAINT "attendance_records_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_course_schedule_id_fkey" FOREIGN KEY ("course_schedule_id") REFERENCES "course_schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_virtual_session_id_fkey" FOREIGN KEY ("virtual_session_id") REFERENCES "virtual_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiated_by" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "summary" TEXT,
    "records_processed" INTEGER,
    "errors_count" INTEGER,
    "error_log" TEXT,
    "validation_results" TEXT,
    "started_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    "rollback_available" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "import_jobs_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "metadata" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "risk_score" REAL,
    "data_hash" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "virtual_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lecturer_id" TEXT NOT NULL,
    "course_schedule_id" TEXT NOT NULL,
    "meeting_link" TEXT NOT NULL,
    "meeting_id" TEXT,
    "platform" TEXT NOT NULL,
    "session_password" TEXT,
    "recording_enabled" BOOLEAN NOT NULL DEFAULT false,
    "recording_url" TEXT,
    "max_participants" INTEGER,
    "actual_participants" INTEGER,
    "session_notes" TEXT,
    "technical_issues" TEXT,
    "quality_rating" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "virtual_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "virtual_sessions_course_schedule_id_fkey" FOREIGN KEY ("course_schedule_id") REFERENCES "course_schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requester_id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "course_schedule_id" TEXT NOT NULL,
    "attendance_record_id" TEXT,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "response" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" DATETIME,
    "escalated_to" TEXT,
    "escalated_at" DATETIME,
    "resolution_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "verification_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sender_id" TEXT,
    "recipient_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduled_for" DATETIME,
    "sent_at" DATETIME,
    "read_at" DATETIME,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generated_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "parameters" TEXT,
    "data" TEXT,
    "file_path" TEXT,
    "file_size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "error_message" TEXT,
    "expires_at" DATETIME,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "report_type" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run" DATETIME,
    "next_run" DATETIME,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scheduled_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_user_id_key" ON "lecturers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_employee_id_key" ON "lecturers"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "programmes_name_key" ON "programmes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "courses_course_code_key" ON "courses"("course_code");

-- CreateIndex
CREATE UNIQUE INDEX "class_groups_name_programme_id_admission_year_key" ON "class_groups"("name", "programme_id", "admission_year");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_code_key" ON "buildings"("code");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_room_code_key" ON "classrooms"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_category_key_key" ON "system_settings"("category", "key");
