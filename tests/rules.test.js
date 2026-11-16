import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initSchema } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import {
  getAllStudents,
  getStudentSummary,
  getStudentCourses,
  getEarnedSkills,
  checkCourseEligibility,
  recommendNextCourse,
  enrollStudent,
  simulateCourseProgress,
  transferStudent,
  createIntervention,
  getStudentInterventions
} from '../server/services.js';

describe('Upskill Dashboard - Rules & Business Logic Tests', () => {
  let db;

  beforeEach(() => {
    // In-memory test database for fast, isolated tests
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    seedDatabase(db);
  });

  test('1. Student Picker: shows goals, earned skills, and active days in last 7 days', () => {
    const students = getAllStudents(null, '2026-11-16T12:00:00+05:30', db);
    assert.ok(students.length >= 3, 'Must seed at least 3 students');

    // Test Aisha (s1)
    const aisha = students.find(s => s.id === 's1');
    assert.ok(aisha, 'Aisha must exist');
    assert.strictEqual(aisha.name, 'Aisha Rahman');
    assert.deepStrictEqual(aisha.goals.map(g => g.id), ['react', 'frontend']);

    // Aisha earned skills from c1 (12/12 = 100%) and c2 (10/12 = 83.3%)
    const aishaSkills = aisha.earnedSkills.map(s => s.id);
    assert.ok(aishaSkills.includes('html'), 'Earned html');
    assert.ok(aishaSkills.includes('css'), 'Earned css');
    assert.ok(aishaSkills.includes('frontend'), 'Earned frontend');
    assert.ok(aishaSkills.includes('javascript'), 'Earned javascript');
    assert.ok(!aishaSkills.includes('react'), 'React not yet earned (c3 is at 25% < 80%)');

    // Aisha active days in last 7 days
    assert.strictEqual(aisha.activeDaysLast7Days, 4, 'Aisha has 4 active days in last 7 days');
  });

  test('2. Earned Skills Rule: skill is earned ONLY when course is at least 80% complete', () => {
    // Rohan (s2): c4 is 10/10 (100% -> earns sql, data). c5 is 3/12 (25% -> does NOT earn dashboards)
    const rohanSkills = getEarnedSkills('s2', db).map(s => s.id);
    assert.ok(rohanSkills.includes('sql'));
    assert.ok(rohanSkills.includes('data'));
    assert.ok(!rohanSkills.includes('dashboards'), 'Dashboards must not be earned at 25%');

    // Now simulate Rohan completing lessons in c5 to 9/12 (75% -> still not earned)
    simulateCourseProgress('s2', 'c5', 9, 0, db);
    const skillsAt75 = getEarnedSkills('s2', db).map(s => s.id);
    assert.ok(!skillsAt75.includes('dashboards'), 'Dashboards must not be earned at 75%');

    // Advance c5 to 10/12 (83.3% >= 80% -> skill unlocked!)
    simulateCourseProgress('s2', 'c5', 10, 0, db);
    const skillsAt83 = getEarnedSkills('s2', db).map(s => s.id);
    assert.ok(skillsAt83.includes('dashboards'), 'Dashboards MUST be earned once course reaches 83.3% (>= 80%)');
  });

  test('3. Course Status Rule: on-track vs at-risk (inactive > 3 days) vs completed', () => {
    const refDate = '2026-11-16T12:00:00+05:30';
    const courses = getStudentCourses('s1', refDate, db);

    const c1 = courses.find(c => c.courseId === 'c1');
    const c2 = courses.find(c => c.courseId === 'c2');
    const c3 = courses.find(c => c.courseId === 'c3');

    // c1 is 100% complete
    assert.strictEqual(c1.percentComplete, 100);
    assert.strictEqual(c1.trackStatus, 'completed');

    // c3 was active 1 day ago (Nov 15) -> on-track
    assert.strictEqual(c3.trackStatus, 'on_track');
    assert.strictEqual(c3.percentComplete, 25);

    // Test Priya (s3): c6 last active Nov 09 (> 3 days inactive) -> at-risk
    const priyaCourses = getStudentCourses('s3', refDate, db);
    const c6 = priyaCourses.find(c => c.courseId === 'c6');
    assert.strictEqual(c6.trackStatus, 'at_risk');
    assert.ok(c6.daysInactive > 3, 'Must be inactive for more than 3 days');
  });

  test('4. Prerequisites Rule: course is eligible ONLY when all prerequisites are 100% complete', () => {
    // c3 (React Basics) requires c2 (JavaScript Essentials).
    // Let us test Devendra (s4) who has 0 courses completed.
    const devC2Elig = checkCourseEligibility('s4', 'c2', db); // requires c1
    assert.strictEqual(devC2Elig.isEligible, false, 'c2 is not eligible without c1');
    assert.strictEqual(devC2Elig.unfulfilledPrerequisites[0].id, 'c1');

    const devC1Elig = checkCourseEligibility('s4', 'c1', db); // requires nothing
    assert.strictEqual(devC1Elig.isEligible, true, 'c1 has no prereqs and should be eligible');

    // In seed data: Aisha (s1) has c2 at 10/12 (83.3%). Is c3 eligible if c2 is not 100%?
    // Let's test a hypothetical course cX that requires c2:
    db.prepare("INSERT INTO courses (id, title, total_lessons, created_at) VALUES ('c99', 'Advanced React', 10, '2026-01-01')").run();
    db.prepare("INSERT INTO course_prerequisites (course_id, prerequisite_course_id) VALUES ('c99', 'c2')").run();

    const c99EligBefore = checkCourseEligibility('s1', 'c99', db);
    assert.strictEqual(c99EligBefore.isEligible, false, 'c99 should not be eligible while c2 is only 83%');

    // Now complete c2 to 12/12 (100%)
    simulateCourseProgress('s1', 'c2', 12, 0, db);
    const c99EligAfter = checkCourseEligibility('s1', 'c99', db);
    assert.strictEqual(c99EligAfter.isEligible, true, 'c99 becomes eligible once c2 reaches 100%');
  });

  test('5. Recommend Next Course: matches goals and enforces prerequisites', () => {
    // Devendra (s4): goals are 'frontend', 'react'.
    // Has no completed courses.
    // c1 teaches 'frontend', has no prereqs.
    // c2 requires c1, c3 requires c2.
    // Top recommendation must be c1!
    const devRec = recommendNextCourse('s4', db);
    assert.strictEqual(devRec.hasRecommendation, true);
    assert.strictEqual(devRec.courseId, 'c1');
    assert.ok(devRec.reason.toLowerCase().includes('frontend'), 'Reason mentions matching goal frontend');

    // Rohan (s2): has c4 complete (100%), c5 in progress (25%).
    // Unenrolled courses: c1, c2, c3, c6.
    // c1 has no prereqs -> eligible.
    // c6 has no prereqs -> eligible.
    // c2 requires c1 -> not eligible.
    const rohanRec = recommendNextCourse('s2', db);
    assert.strictEqual(rohanRec.hasRecommendation, true);
    assert.ok(['c1', 'c6'].includes(rohanRec.courseId), 'Recommends an eligible course');
  });

  test('6. Enroll Course: enforces prerequisite checks and updates database state', () => {
    // Try to enroll Devendra (s4) directly in c2 (requires c1) -> should throw error
    assert.throws(() => {
      enrollStudent('s4', 'c2', db);
    }, /Prerequisite course\(s\)/);

    // Enroll Devendra in c1 (valid)
    const result = enrollStudent('s4', 'c1', db);
    assert.strictEqual(result.success, true);

    // Verify Devendra now has c1 in enrolled courses
    const s4Courses = getStudentCourses('s4', '2026-11-16T12:00:00+05:30', db);
    assert.strictEqual(s4Courses.length, 1);
    assert.strictEqual(s4Courses[0].courseId, 'c1');
    assert.strictEqual(s4Courses[0].percentComplete, 0);
  });

  test('7. Multi-Center: Center isolation and student transfer mobility', () => {
    // Coach at Bengaluru (center-blr) sees only Aisha (s1) and Rohan (s2)
    const blrStudents = getAllStudents('center-blr', '2026-11-16T12:00:00+05:30', db);
    const blrStudentIds = blrStudents.map(s => s.id);
    assert.ok(blrStudentIds.includes('s1'));
    assert.ok(blrStudentIds.includes('s2'));
    assert.ok(!blrStudentIds.includes('s3'), 'Priya (s3) is in Hyderabad, coach in BLR must not see her');

    // Transfer Priya (s3) from Hyderabad to Bengaluru
    transferStudent('s3', 'center-blr', 'Relocating to Bengaluru campus', db);

    // Coach in BLR now sees Priya!
    const blrStudentsAfter = getAllStudents('center-blr', '2026-11-16T12:00:00+05:30', db);
    assert.ok(blrStudentsAfter.some(s => s.id === 's3'), 'Priya is now visible in BLR center');

    // Check transfer audit log
    const transfers = db.prepare('SELECT * FROM student_center_transfers WHERE student_id = ?').all('s3');
    assert.strictEqual(transfers.length, 1);
    assert.strictEqual(transfers[0].from_center_id, 'center-hyd');
    assert.strictEqual(transfers[0].to_center_id, 'center-blr');
  });

  test('8. Coach Intervention: Nudges and action log', () => {
    const intervention = createIntervention('coach-1', 's2', 'c5', 'slack_ping', 'Check-in on module 4 blockers', db);
    assert.strictEqual(intervention.success, true);

    const list = getStudentInterventions('s2', db);
    assert.ok(list.length >= 2, 'Has logged interventions including newly created one');
    assert.strictEqual(list[0].type, 'slack_ping');
  });
});
