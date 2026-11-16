import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const DB_PATH = path.join(DB_DIR, 'upskill.db');

export function getDatabase(dbPath = DB_PATH) {
  const db = new DatabaseSync(dbPath);
  
  // Enable foreign keys and WAL mode for high performance & integrity
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  
  return db;
}

export function initSchema(db) {
  db.exec(`
    -- Centers (multi-center architecture)
    CREATE TABLE IF NOT EXISTS centers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Coaches assigned to centers
    CREATE TABLE IF NOT EXISTS coaches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      center_id TEXT NOT NULL REFERENCES centers(id) ON UPDATE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Students (learners with current center assignment)
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      current_center_id TEXT NOT NULL REFERENCES centers(id) ON UPDATE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Student mobility transfer log (tracks movement across centers)
    CREATE TABLE IF NOT EXISTS student_center_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      from_center_id TEXT REFERENCES centers(id),
      to_center_id TEXT NOT NULL REFERENCES centers(id),
      transferred_at TEXT NOT NULL DEFAULT (datetime('now')),
      reason TEXT
    );

    -- Normalized skills catalog
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT
    );

    -- Student learning goals (junction table)
    CREATE TABLE IF NOT EXISTS student_goals (
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      priority INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (student_id, skill_id)
    );

    -- Courses catalog
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      total_lessons INTEGER NOT NULL DEFAULT 12,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Skills taught by courses (junction table)
    CREATE TABLE IF NOT EXISTS course_skills (
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      PRIMARY KEY (course_id, skill_id)
    );

    -- Course prerequisites DAG
    CREATE TABLE IF NOT EXISTS course_prerequisites (
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      prerequisite_course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      PRIMARY KEY (course_id, prerequisite_course_id)
    );

    -- Course enrollments
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('in_progress', 'completed', 'dropped')) DEFAULT 'in_progress',
      UNIQUE (student_id, course_id)
    );

    -- Granular course progress
    CREATE TABLE IF NOT EXISTS student_course_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      completed_lessons INTEGER NOT NULL DEFAULT 0,
      total_lessons INTEGER NOT NULL DEFAULT 12,
      last_active_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE (student_id, course_id)
    );

    -- Daily activity log (used for 7-day activity calculations and audit)
    CREATE TABLE IF NOT EXISTS student_daily_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      activity_date TEXT NOT NULL,
      lessons_completed INTEGER NOT NULL DEFAULT 1,
      minutes_spent INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (student_id, activity_date)
    );

    -- Coach interventions (At-risk intervention & nudge tracking)
    CREATE TABLE IF NOT EXISTS coach_interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id TEXT REFERENCES coaches(id),
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('nudge', 'slack_ping', '1on1_scheduled', 'call', 'note')),
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'delivered', 'resolved')) DEFAULT 'delivered',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_students_center ON students(current_center_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_progress_student ON student_course_progress(student_id);
    CREATE INDEX IF NOT EXISTS idx_activity_student_date ON student_daily_activity(student_id, activity_date);
    CREATE INDEX IF NOT EXISTS idx_interventions_student ON coach_interventions(student_id);
  `);
}
