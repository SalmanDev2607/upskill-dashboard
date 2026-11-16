import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase, initSchema } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DIR = path.resolve(__dirname, '../seed_data');

export function seedDatabase(db) {
  initSchema(db);

  // Clear existing data in correct FK order
  db.exec(`
    DELETE FROM coach_interventions;
    DELETE FROM student_daily_activity;
    DELETE FROM student_course_progress;
    DELETE FROM enrollments;
    DELETE FROM course_prerequisites;
    DELETE FROM course_skills;
    DELETE FROM courses;
    DELETE FROM student_goals;
    DELETE FROM skills;
    DELETE FROM student_center_transfers;
    DELETE FROM students;
    DELETE FROM coaches;
    DELETE FROM centers;
  `);

  // 1. Seed Centers
  const insertCenter = db.prepare(`
    INSERT INTO centers (id, name, city, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insertCenter.run('center-blr', 'Bengaluru Central Hub', 'Bengaluru', '2026-01-01T00:00:00Z');
  insertCenter.run('center-hyd', 'Hyderabad Innovation Campus', 'Hyderabad', '2026-01-01T00:00:00Z');
  insertCenter.run('center-del', 'Delhi NCR Tech Center', 'Noida', '2026-01-01T00:00:00Z');

  // 2. Seed Coaches
  const insertCoach = db.prepare(`
    INSERT INTO coaches (id, name, email, center_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertCoach.run('coach-1', 'Sandeep Kotharu', 'sandeep.kotharu@pathsaathi.com', 'center-blr', '2026-01-10T00:00:00Z');
  insertCoach.run('coach-2', 'Prakash Gudipati', 'prakash.gudipati@pathsaathi.com', 'center-hyd', '2026-01-10T00:00:00Z');
  insertCoach.run('coach-3', 'Neha Verma', 'neha.verma@upskill.org', 'center-del', '2026-01-10T00:00:00Z');

  // 3. Load Courses Seed JSON
  const rawCourses = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'courses.json'), 'utf-8'));
  const rawStudents = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'students.json'), 'utf-8'));
  const rawEnrollments = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'enrollments.json'), 'utf-8'));
  const rawProgress = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'progress.json'), 'utf-8'));

  // Collect all unique skill ids
  const skillsSet = new Set();
  rawCourses.forEach(c => {
    (c.skillsTaught || []).forEach(s => skillsSet.add(s));
  });
  rawStudents.forEach(s => {
    (s.goals || []).forEach(g => skillsSet.add(g));
  });

  const insertSkill = db.prepare(`
    INSERT INTO skills (id, name, category) VALUES (?, ?, ?)
  `);
  for (const skillId of skillsSet) {
    const formattedName = skillId
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    insertSkill.run(skillId, formattedName, 'Technical');
  }

  // Insert Courses
  const insertCourse = db.prepare(`
    INSERT INTO courses (id, title, description, total_lessons, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertCourseSkill = db.prepare(`
    INSERT INTO course_skills (course_id, skill_id) VALUES (?, ?)
  `);
  const insertCoursePrereq = db.prepare(`
    INSERT INTO course_prerequisites (course_id, prerequisite_course_id) VALUES (?, ?)
  `);

  for (const c of rawCourses) {
    // Find default total lessons from progress if available, else 12
    const matchingProg = rawProgress.find(p => p.courseId === c.id);
    const totalLessons = matchingProg ? matchingProg.totalLessons : 12;
    insertCourse.run(
      c.id,
      c.title,
      `Comprehensive industry training module covering ${c.title}.`,
      totalLessons,
      '2026-06-01T00:00:00Z'
    );

    for (const skill of c.skillsTaught || []) {
      insertCourseSkill.run(c.id, skill);
    }

    for (const prereq of c.prerequisites || []) {
      insertCoursePrereq.run(c.id, prereq);
    }
  }

  // Insert Students
  const insertStudent = db.prepare(`
    INSERT INTO students (id, name, email, current_center_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertStudentGoal = db.prepare(`
    INSERT INTO student_goals (student_id, skill_id, priority, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const studentCenterMap = {
    s1: 'center-blr',
    s2: 'center-blr',
    s3: 'center-hyd'
  };

  for (const s of rawStudents) {
    const centerId = studentCenterMap[s.id] || 'center-blr';
    const email = `${s.name.toLowerCase().replace(/\s+/g, '.')}@upskill.org`;
    insertStudent.run(s.id, s.name, email, centerId, '2026-07-01T00:00:00Z');

    (s.goals || []).forEach((goal, idx) => {
      insertStudentGoal.run(s.id, goal, idx + 1, '2026-07-01T00:00:00Z');
    });
  }

  // Seed 4th student: Devendra Sharma (Edge Case: New Student with 0 enrollments)
  insertStudent.run(
    's4',
    'Devendra Sharma',
    'devendra.sharma@upskill.org',
    'center-del',
    '2026-11-10T00:00:00Z'
  );
  insertStudentGoal.run('s4', 'frontend', 1, '2026-11-10T00:00:00Z');
  insertStudentGoal.run('s4', 'react', 2, '2026-11-10T00:00:00Z');

  // Insert Enrollments
  const insertEnrollment = db.prepare(`
    INSERT INTO enrollments (student_id, course_id, enrolled_at, status)
    VALUES (?, ?, ?, ?)
  `);

  for (const e of rawEnrollments) {
    const prog = rawProgress.find(p => p.studentId === e.studentId && p.courseId === e.courseId);
    const isCompleted = prog && prog.completedLessons >= prog.totalLessons;
    const status = isCompleted ? 'completed' : 'in_progress';
    insertEnrollment.run(e.studentId, e.courseId, e.enrolledAt, status);
  }

  // Insert Student Course Progress
  const insertProgress = db.prepare(`
    INSERT INTO student_course_progress (
      student_id, course_id, completed_lessons, total_lessons, last_active_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  // To provide realistic active days relative to current time while honoring raw timestamps:
  // Today's reference date: 2026-11-16 (or relative to now)
  const now = new Date('2026-11-16T12:00:00+05:30');

  for (const p of rawProgress) {
    const isCompleted = p.completedLessons >= p.totalLessons;
    const completedAt = isCompleted ? p.lastActiveAt : null;
    
    // We adjust dates so that:
    // s1 (Aisha) is active yesterday (2026-11-15) -> On-Track (< 3 days)
    // s2 (Rohan) was last active 4 days ago (2026-11-11) -> At-Risk (> 3 days)
    // s3 (Priya) was last active 6 days ago (2026-11-09) -> At-Risk (> 3 days)
    let adjustedLastActive = p.lastActiveAt;
    if (p.studentId === 's1') {
      if (p.courseId === 'c3') {
        adjustedLastActive = '2026-11-15T14:30:00+05:30'; // active 1 day ago -> ON-TRACK
      } else if (p.courseId === 'c2') {
        adjustedLastActive = '2026-11-13T10:00:00+05:30'; // active 3 days ago
      } else if (p.courseId === 'c1') {
        adjustedLastActive = '2026-09-14T18:00:00+05:30'; // finished course
      }
    } else if (p.studentId === 's2') {
      if (p.courseId === 'c5') {
        adjustedLastActive = '2026-11-11T16:00:00+05:30'; // active 5 days ago -> AT-RISK (>3 days)
      }
    } else if (p.studentId === 's3') {
      if (p.courseId === 'c6') {
        adjustedLastActive = '2026-11-09T18:30:00+05:30'; // active 7 days ago -> AT-RISK (>3 days)
      }
    }

    insertProgress.run(
      p.studentId,
      p.courseId,
      p.completedLessons,
      p.totalLessons,
      adjustedLastActive,
      completedAt
    );
  }

  // Insert Daily Activity logs for calculating "active days in the last 7 days"
  // Window: 2026-11-10 to 2026-11-16
  const insertActivity = db.prepare(`
    INSERT INTO student_daily_activity (student_id, activity_date, lessons_completed, minutes_spent)
    VALUES (?, ?, ?, ?)
  `);

  // Aisha (s1): 4 active days in last 7 days (Nov 15, Nov 14, Nov 12, Nov 11)
  insertActivity.run('s1', '2026-11-15', 2, 60);
  insertActivity.run('s1', '2026-11-14', 1, 45);
  insertActivity.run('s1', '2026-11-12', 1, 30);
  insertActivity.run('s1', '2026-11-11', 1, 40);

  // Rohan (s2): 1 active day in last 7 days (Nov 11)
  insertActivity.run('s2', '2026-11-11', 1, 25);

  // Priya (s3): 0 active days in last 7 days (last active Nov 09)
  insertActivity.run('s3', '2026-11-09', 1, 20);

  // Sample Transfer Log: Rohan previously transferred from Delhi to Bengaluru
  const insertTransfer = db.prepare(`
    INSERT INTO student_center_transfers (student_id, from_center_id, to_center_id, transferred_at, reason)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertTransfer.run('s2', 'center-del', 'center-blr', '2026-08-15T10:00:00Z', 'Relocation for campus program');

  // Sample Coach Intervention
  const insertIntervention = db.prepare(`
    INSERT INTO coach_interventions (coach_id, student_id, course_id, type, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertIntervention.run(
    'coach-1',
    's2',
    'c5',
    'nudge',
    'Sent automated Slack reminder: 5 days since last progress on Building Dashboards.',
    'delivered',
    '2026-11-15T09:00:00Z'
  );

  console.log('Database successfully seeded with normalized tables!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = getDatabase();
  seedDatabase(db);
}
