-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
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
    CONSTRAINT "lecturers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "duration_semesters" INTEGER NOT NULL,
    "description" TEXT,
    "delivery_modes" TEXT NOT NULL
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
    "method" TEXT NOT NULL,
    "class_rep_verified" BOOLEAN,
    "class_rep_comment" TEXT,
    CONSTRAINT "attendance_records_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_course_schedule_id_fkey" FOREIGN KEY ("course_schedule_id") REFERENCES "course_schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiated_by" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "summary" TEXT,
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
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
