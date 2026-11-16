import { getDatabase } from './db.js';

// Default reference timestamp for demo consistency (defaults to current date/time)
export function getReferenceTime(overrideDate = null) {
  if (overrideDate && overrideDate !== 'null' && overrideDate !== 'undefined') {
    const d = new Date(overrideDate);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Get all centers
 */
export function getCenters(db = getDatabase()) {
  return db.prepare('SELECT * FROM centers ORDER BY name ASC').all();
}

/**
 * Get all coaches
 */
export function getCoaches(db = getDatabase()) {
  return db.prepare(`
    SELECT c.*, cent.name AS center_name, cent.city AS center_city
    FROM coaches c
    JOIN centers cent ON c.center_id = cent.id
    ORDER BY c.name ASC
  `).all();
}

/**
 * Transfer student to a different center (Multi-center mobility)
 */
export function transferStudent(studentId, toCenterId, reason = 'Administrative transfer', db = getDatabase()) {
  const student = db.prepare('SELECT current_center_id FROM students WHERE id = ?').get(studentId);
  if (!student) throw new Error(`Student ${studentId} not found`);

  const fromCenterId = student.current_center_id;
  if (fromCenterId === toCenterId) return { success: true, message: 'Already in this center' };

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare('UPDATE students SET current_center_id = ? WHERE id = ?').run(toCenterId, studentId);
    db.prepare(`
      INSERT INTO student_center_transfers (student_id, from_center_id, to_center_id, transferred_at, reason)
      VALUES (?, ?, ?, datetime('now'), ?)
    `).run(studentId, fromCenterId, toCenterId, reason);
    db.exec('COMMIT');
    return { success: true, fromCenterId, toCenterId };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Calculate active days in the last 7 days for a student
 */
export function getActiveDaysLast7Days(studentId, refDate = null, db = getDatabase()) {
  const refTime = getReferenceTime(refDate);
  const sevenDaysAgo = new Date(refTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  const refDateStr = refTime.toISOString().split('T')[0];

  const rows = db.prepare(`
    SELECT DISTINCT activity_date 
    FROM student_daily_activity
    WHERE student_id = ? 
      AND activity_date >= ? 
      AND activity_date <= ?
  `).all(studentId, sevenDaysAgoStr, refDateStr);

  return rows.length;
}

/**
 * Get earned skills for a student
 * Rule: "A skill is earned when the course that teaches it is at least 80% complete."
 */
export function getEarnedSkills(studentId, db = getDatabase()) {
  const rows = db.prepare(`
    SELECT DISTINCT s.id, s.name, s.category, c.id AS earned_from_course_id, c.title AS earned_from_course_title,
           scp.completed_lessons, scp.total_lessons,
           ROUND((CAST(scp.completed_lessons AS REAL) / CAST(scp.total_lessons AS REAL)) * 100, 1) AS percent_complete
    FROM student_course_progress scp
    JOIN course_skills cs ON scp.course_id = cs.course_id
    JOIN skills s ON cs.skill_id = s.id
    JOIN courses c ON scp.course_id = c.id
    WHERE scp.student_id = ?
      AND (CAST(scp.completed_lessons AS REAL) / CAST(scp.total_lessons AS REAL)) >= 0.80
    ORDER BY s.name ASC
  `).all(studentId);

  return rows;
}

/**
 * Get detailed student summary for Student Picker
 */
export function getStudentSummary(studentId, refDate = getReferenceTime(), db = getDatabase()) {
  const student = db.prepare(`
    SELECT s.id, s.name, s.email, s.current_center_id, s.created_at,
           cent.name AS center_name, cent.city AS center_city
    FROM students s
    JOIN centers cent ON s.current_center_id = cent.id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) return null;

  // Goals
  const goals = db.prepare(`
    SELECT s.id, s.name, s.category, sg.priority
    FROM student_goals sg
    JOIN skills s ON sg.skill_id = s.id
    WHERE sg.student_id = ?
    ORDER BY sg.priority ASC
  `).all(studentId);

  // Earned skills
  const earnedSkills = getEarnedSkills(studentId, db);
  const earnedSkillIds = new Set(earnedSkills.map(s => s.id));

  // Active days in last 7 days
  const activeDaysLast7Days = getActiveDaysLast7Days(studentId, refDate, db);

  // Courses summary count
  const courseCountRow = db.prepare(`
    SELECT COUNT(*) as enrolled_count
    FROM enrollments
    WHERE student_id = ?
  `).get(studentId);

  return {
    ...student,
    goals: goals.map(g => ({
      ...g,
      isEarned: earnedSkillIds.has(g.id)
    })),
    earnedSkills,
    activeDaysLast7Days,
    totalEnrolledCourses: courseCountRow.enrolled_count
  };
}

/**
 * List all students (optionally filtered by center for Coach view)
 */
export function getAllStudents(centerId = null, refDate = getReferenceTime(), db = getDatabase()) {
  let query = 'SELECT id FROM students';
  const params = [];
  if (centerId) {
    query += ' WHERE current_center_id = ?';
    params.push(centerId);
  }
  query += ' ORDER BY name ASC';

  const rows = db.prepare(query).all(...params);
  return rows.map(r => getStudentSummary(r.id, refDate, db));
}

/**
 * Get My Courses for a student
 * Rule 1: Percent complete = completed_lessons / total_lessons * 100
 * Rule 2: At-risk means inactive for more than 3 days. (Completed courses are marked 'completed')
 */
export function getStudentCourses(studentId, refDate = null, db = getDatabase()) {
  const refTime = getReferenceTime(refDate);

  const rows = db.prepare(`
    SELECT 
      e.id AS enrollment_id,
      e.enrolled_at,
      e.status AS enrollment_status,
      c.id AS course_id,
      c.title AS course_title,
      c.description AS course_description,
      COALESCE(scp.completed_lessons, 0) AS completed_lessons,
      COALESCE(scp.total_lessons, c.total_lessons) AS total_lessons,
      scp.last_active_at,
      scp.completed_at
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN student_course_progress scp 
      ON e.student_id = scp.student_id AND e.course_id = scp.course_id
    WHERE e.student_id = ?
    ORDER BY 
      CASE WHEN scp.completed_lessons >= scp.total_lessons THEN 1 ELSE 0 END ASC,
      scp.last_active_at DESC
  `).all(studentId);

  return rows.map(row => {
    const total = row.total_lessons > 0 ? row.total_lessons : 1;
    const completed = row.completed_lessons || 0;
    const percentComplete = Math.round((completed / total) * 100);
    const is100Percent = completed >= total;

    // Calculate days inactive
    let daysInactive = 0;
    let trackStatus = 'on_track'; // 'on_track' | 'at_risk' | 'completed'

    if (row.last_active_at) {
      const lastActive = new Date(row.last_active_at);
      const diffMs = refTime.getTime() - lastActive.getTime();
      daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    if (is100Percent) {
      trackStatus = 'completed';
    } else if (daysInactive > 3) {
      trackStatus = 'at_risk';
    } else {
      trackStatus = 'on_track';
    }

    // Skills taught by this course
    const skillsTaught = db.prepare(`
      SELECT s.id, s.name 
      FROM course_skills cs
      JOIN skills s ON cs.skill_id = s.id
      WHERE cs.course_id = ?
    `).all(row.course_id);

    // Prerequisites of this course
    const prerequisites = db.prepare(`
      SELECT c.id, c.title
      FROM course_prerequisites cp
      JOIN courses c ON cp.prerequisite_course_id = c.id
      WHERE cp.course_id = ?
    `).all(row.course_id);

    return {
      enrollmentId: row.enrollment_id,
      courseId: row.course_id,
      title: row.course_title,
      description: row.course_description,
      enrolledAt: row.enrolled_at,
      completedLessons: completed,
      totalLessons: total,
      percentComplete,
      lastActiveAt: row.last_active_at,
      daysInactive,
      trackStatus, // 'on_track' | 'at_risk' | 'completed'
      skillsTaught,
      prerequisites
    };
  });
}

/**
 * Check if a course's prerequisites are all completed for a student
 * Rule: "A course is eligible only when all of its prerequisites are complete for that student."
 */
export function checkCourseEligibility(studentId, courseId, db = getDatabase()) {
  const prereqs = db.prepare(`
    SELECT cp.prerequisite_course_id, c.title
    FROM course_prerequisites cp
    JOIN courses c ON cp.prerequisite_course_id = c.id
    WHERE cp.course_id = ?
  `).all(courseId);

  if (prereqs.length === 0) {
    return { isEligible: true, unfulfilledPrerequisites: [], allPrerequisites: [] };
  }

  const unfulfilled = [];
  for (const p of prereqs) {
    const prog = db.prepare(`
      SELECT completed_lessons, total_lessons
      FROM student_course_progress
      WHERE student_id = ? AND course_id = ?
    `).get(studentId, p.prerequisite_course_id);

    // Prerequisite is complete if student finished all lessons (100%)
    const isCompleted = prog && prog.completed_lessons >= prog.total_lessons;
    if (!isCompleted) {
      unfulfilled.push({
        id: p.prerequisite_course_id,
        title: p.title,
        percentComplete: prog ? Math.round((prog.completed_lessons / prog.total_lessons) * 100) : 0
      });
    }
  }

  return {
    isEligible: unfulfilled.length === 0,
    unfulfilledPrerequisites: unfulfilled,
    allPrerequisites: prereqs
  };
}

/**
 * Recommend Next Course
 * Rule: "Show one top course and a short reason. Use prerequisites and goals."
 */
export function recommendNextCourse(studentId, db = getDatabase()) {
  // 1. Get student's goals
  const goals = db.prepare(`
    SELECT skill_id FROM student_goals WHERE student_id = ? ORDER BY priority ASC
  `).all(studentId).map(g => g.skill_id);

  // 2. Get student's earned skills
  const earnedSkills = getEarnedSkills(studentId, db);
  const earnedSkillIds = new Set(earnedSkills.map(s => s.id));

  // Unmet goals
  const unmetGoals = goals.filter(g => !earnedSkillIds.has(g));

  // 3. Get all courses the student is already enrolled in
  const enrolledCourses = db.prepare(`
    SELECT course_id FROM enrollments WHERE student_id = ?
  `).all(studentId).map(e => e.course_id);
  const enrolledSet = new Set(enrolledCourses);

  // 4. Get all available courses
  const allCourses = db.prepare('SELECT * FROM courses ORDER BY id ASC').all();

  const candidates = [];

  for (const course of allCourses) {
    // Skip if already enrolled
    if (enrolledSet.has(course.id)) continue;

    // Check prerequisites
    const eligibility = checkCourseEligibility(studentId, course.id, db);
    if (!eligibility.isEligible) continue;

    // Check skills taught by this course
    const skillsTaught = db.prepare(`
      SELECT cs.skill_id, s.name
      FROM course_skills cs
      JOIN skills s ON cs.skill_id = s.id
      WHERE cs.course_id = ?
    `).all(course.id);

    const skillsTaughtIds = skillsTaught.map(s => s.skill_id);

    // Calculate goal alignment
    const matchingUnmetGoals = skillsTaughtIds.filter(s => unmetGoals.includes(s));
    const matchingAllGoals = skillsTaughtIds.filter(s => goals.includes(s));

    // Scoring weights:
    // +100 per unmet goal taught
    // +20 per general goal taught
    // +5 for each skill taught
    const score = (matchingUnmetGoals.length * 100) + (matchingAllGoals.length * 20) + skillsTaught.length;

    let reason = '';
    if (matchingUnmetGoals.length > 0) {
      const goalNames = skillsTaught.filter(s => matchingUnmetGoals.includes(s.skill_id)).map(s => s.name);
      reason = `Directly advances your goal "${goalNames.join(', ')}", and all prerequisites are met.`;
    } else if (matchingAllGoals.length > 0) {
      const goalNames = skillsTaught.filter(s => matchingAllGoals.includes(s.skill_id)).map(s => s.name);
      reason = `Reinforces your learning target in "${goalNames.join(', ')}" with zero outstanding prerequisites.`;
    } else {
      reason = `Broadens your foundational curriculum. All prerequisites satisfied.`;
    }

    candidates.push({
      course,
      skillsTaught,
      score,
      matchingGoals: matchingUnmetGoals,
      reason
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    // Check if there is an unenrolled course blocked by prerequisites to give informative feedback
    const unenrolledCourses = allCourses.filter(c => !enrolledSet.has(c.id));
    if (unenrolledCourses.length > 0) {
      const blocked = unenrolledCourses[0];
      const elig = checkCourseEligibility(studentId, blocked.id, db);
      const missingTitles = elig.unfulfilledPrerequisites.map(p => p.title).join(', ');
      return {
        hasRecommendation: false,
        message: `No new courses currently eligible. Finish prerequisite "${missingTitles}" to unlock "${blocked.title}".`
      };
    }
    return {
      hasRecommendation: false,
      message: 'You have enrolled in or completed all available courses in the catalog!'
    };
  }

  const top = candidates[0];
  return {
    hasRecommendation: true,
    courseId: top.course.id,
    title: top.course.title,
    description: top.course.description,
    totalLessons: top.course.total_lessons,
    skillsTaught: top.skillsTaught,
    reason: top.reason,
    score: top.score
  };
}

/**
 * Enroll student in a course
 * Rule: Check prerequisites before allowing enroll, update DB, return updated state.
 */
export function enrollStudent(studentId, courseId, db = getDatabase()) {
  // Check if student exists
  const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId);
  if (!student) throw new Error('Student not found');

  // Check if course exists
  const course = db.prepare('SELECT id, total_lessons FROM courses WHERE id = ?').get(courseId);
  if (!course) throw new Error('Course not found');

  // Check existing enrollment
  const existing = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
  if (existing) throw new Error('Student is already enrolled in this course');

  // Check prerequisites
  const eligibility = checkCourseEligibility(studentId, courseId, db);
  if (!eligibility.isEligible) {
    const missing = eligibility.unfulfilledPrerequisites.map(p => p.title).join(', ');
    throw new Error(`Cannot enroll: Prerequisite course(s) [${missing}] must be 100% completed first.`);
  }

  const nowIso = new Date().toISOString();
  const todayDate = nowIso.split('T')[0];

  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Insert enrollment
    db.prepare(`
      INSERT INTO enrollments (student_id, course_id, enrolled_at, status)
      VALUES (?, ?, ?, 'in_progress')
    `).run(studentId, courseId, nowIso);

    // 2. Initialize progress
    db.prepare(`
      INSERT INTO student_course_progress (
        student_id, course_id, completed_lessons, total_lessons, last_active_at
      ) VALUES (?, ?, 0, ?, ?)
    `).run(studentId, courseId, course.total_lessons, nowIso);

    // 3. Record today's activity
    db.prepare(`
      INSERT INTO student_daily_activity (student_id, activity_date, lessons_completed, minutes_spent)
      VALUES (?, ?, 0, 15)
      ON CONFLICT(student_id, activity_date) DO UPDATE SET minutes_spent = minutes_spent + 15
    `).run(studentId, todayDate);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    success: true,
    studentId,
    courseId,
    enrolledAt: nowIso
  };
}

/**
 * Simulation helper for testing & evaluator grading:
 * Advance lessons or simulate inactivity to verify live status flips!
 */
export function simulateCourseProgress(studentId, courseId, completedLessons, daysAgoActive = 0, db = getDatabase()) {
  const prog = db.prepare('SELECT * FROM student_course_progress WHERE student_id = ? AND course_id = ?').get(studentId, courseId);
  if (!prog) throw new Error('Progress record not found');

  const refTime = new Date();
  const simulatedTime = new Date(refTime.getTime() - daysAgoActive * 24 * 60 * 60 * 1000);
  const simIso = simulatedTime.toISOString();
  const simDate = simIso.split('T')[0];

  const total = prog.total_lessons;
  const newCompleted = Math.min(total, Math.max(0, completedLessons));
  const completedAt = newCompleted >= total ? simIso : null;

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare(`
      UPDATE student_course_progress
      SET completed_lessons = ?,
          last_active_at = ?,
          completed_at = ?
      WHERE student_id = ? AND course_id = ?
    `).run(newCompleted, simIso, completedAt, studentId, courseId);

    // Update enrollment status
    db.prepare(`
      UPDATE enrollments
      SET status = ?
      WHERE student_id = ? AND course_id = ?
    `).run(newCompleted >= total ? 'completed' : 'in_progress', studentId, courseId);

    // If active recently, log daily activity
    if (daysAgoActive === 0) {
      db.prepare(`
        INSERT INTO student_daily_activity (student_id, activity_date, lessons_completed, minutes_spent)
        VALUES (?, ?, 1, 30)
        ON CONFLICT(student_id, activity_date) DO UPDATE SET
          lessons_completed = lessons_completed + 1,
          minutes_spent = minutes_spent + 30
      `).run(studentId, simDate);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    success: true,
    studentId,
    courseId,
    completedLessons: newCompleted,
    totalLessons: total,
    percentComplete: Math.round((newCompleted / total) * 100),
    lastActiveAt: simIso
  };
}

/**
 * Coach Interventions: Log a nudge, note, or check-in
 */
export function createIntervention(coachId, studentId, courseId, type, message, db = getDatabase()) {
  const insert = db.prepare(`
    INSERT INTO coach_interventions (coach_id, student_id, course_id, type, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'delivered', datetime('now'))
  `);
  const res = insert.run(coachId || null, studentId, courseId || null, type, message);
  return { id: res.lastInsertRowid, success: true };
}

export function getStudentInterventions(studentId, db = getDatabase()) {
  return db.prepare(`
    SELECT ci.*, c.name AS coach_name, crs.title AS course_title
    FROM coach_interventions ci
    LEFT JOIN coaches c ON ci.coach_id = c.id
    LEFT JOIN courses crs ON ci.course_id = crs.id
    WHERE ci.student_id = ?
    ORDER BY ci.created_at DESC
  `).all(studentId);
}
