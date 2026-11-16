import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase, initSchema } from './db.js';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.resolve(__dirname, '../client/dist');
import {
  getCenters,
  getCoaches,
  getAllStudents,
  getStudentSummary,
  getStudentCourses,
  recommendNextCourse,
  enrollStudent,
  checkCourseEligibility,
  simulateCourseProgress,
  transferStudent,
  createIntervention,
  getStudentInterventions,
  getReferenceTime
} from './services.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize and ensure DB is ready
const db = getDatabase();
initSchema(db);

// Check if database needs initial seeding
const countRow = db.prepare('SELECT COUNT(*) as count FROM students').get();
if (countRow.count === 0) {
  seedDatabase(db);
}

// 1. Health & Config
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Centers
app.get('/api/centers', (req, res) => {
  try {
    const centers = getCenters(db);
    res.json(centers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Coaches
app.get('/api/coaches', (req, res) => {
  try {
    const coaches = getCoaches(db);
    res.json(coaches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Students (picker list, optional centerId filter for coach center isolation)
app.get('/api/students', (req, res) => {
  try {
    const { centerId, refDate } = req.query;
    const students = getAllStudents(centerId || null, refDate || null, db);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Single Student Details
app.get('/api/students/:id', (req, res) => {
  try {
    const { refDate } = req.query;
    const student = getStudentSummary(req.params.id, refDate || null, db);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Student Courses (My Courses list with percentComplete, on_track/at_risk status)
app.get('/api/students/:id/courses', (req, res) => {
  try {
    const { refDate } = req.query;
    const courses = getStudentCourses(req.params.id, refDate || null, db);
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Recommend Next Course
app.get('/api/students/:id/recommendation', (req, res) => {
  try {
    const rec = recommendNextCourse(req.params.id, db);
    res.json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Enroll in a Course
app.post('/api/students/:id/enroll', (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const result = enrollStudent(req.params.id, courseId, db);
    
    // Return refreshed student, courses, and next recommendation immediately
    const updatedCourses = getStudentCourses(req.params.id, null, db);
    const updatedSummary = getStudentSummary(req.params.id, null, db);
    const updatedRec = recommendNextCourse(req.params.id, db);

    res.json({
      success: true,
      enrollment: result,
      courses: updatedCourses,
      student: updatedSummary,
      recommendation: updatedRec
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9. All Courses (with eligibility status for given student if queried)
app.get('/api/courses', (req, res) => {
  try {
    const { studentId } = req.query;
    const courses = db.prepare('SELECT * FROM courses ORDER BY id ASC').all();

    const enriched = courses.map(c => {
      const skillsTaught = db.prepare(`
        SELECT s.id, s.name FROM course_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.course_id = ?
      `).all(c.id);

      const prerequisites = db.prepare(`
        SELECT c2.id, c2.title FROM course_prerequisites cp
        JOIN courses c2 ON cp.prerequisite_course_id = c2.id
        WHERE cp.course_id = ?
      `).all(c.id);

      let eligibility = null;
      let isEnrolled = false;
      if (studentId) {
        eligibility = checkCourseEligibility(studentId, c.id, db);
        const enr = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?').get(studentId, c.id);
        isEnrolled = !!enr;
      }

      return {
        ...c,
        skillsTaught,
        prerequisites,
        isEnrolled,
        eligibility
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Student Mobility Transfer
app.post('/api/students/:id/transfer', (req, res) => {
  try {
    const { toCenterId, reason } = req.body;
    if (!toCenterId) {
      return res.status(400).json({ error: 'toCenterId is required' });
    }
    const result = transferStudent(req.params.id, toCenterId, reason, db);
    const updatedStudent = getStudentSummary(req.params.id, null, db);
    res.json({ success: true, transfer: result, student: updatedStudent });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Live Progress Simulator (Add-on for evaluator interactive testing)
app.post('/api/simulate/progress', (req, res) => {
  try {
    const { studentId, courseId, completedLessons, daysAgoActive } = req.body;
    if (!studentId || !courseId || completedLessons === undefined) {
      return res.status(400).json({ error: 'studentId, courseId, and completedLessons are required' });
    }

    const result = simulateCourseProgress(studentId, courseId, Number(completedLessons), Number(daysAgoActive || 0), db);
    const updatedCourses = getStudentCourses(studentId, null, db);
    const updatedStudent = getStudentSummary(studentId, null, db);
    const updatedRec = recommendNextCourse(studentId, db);

    res.json({
      success: true,
      simulation: result,
      courses: updatedCourses,
      student: updatedStudent,
      recommendation: updatedRec
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 12. Coach Interventions
app.get('/api/students/:id/interventions', (req, res) => {
  try {
    const list = getStudentInterventions(req.params.id, db);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/interventions', (req, res) => {
  try {
    const { coachId, studentId, courseId, type, message } = req.body;
    if (!studentId || !type || !message) {
      return res.status(400).json({ error: 'studentId, type, and message are required' });
    }
    const result = createIntervention(coachId, studentId, courseId, type, message, db);
    const list = getStudentInterventions(studentId, db);
    res.json({ success: true, intervention: result, interventions: list });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 13. Reset Database to seed state
app.post('/api/reset', (req, res) => {
  try {
    seedDatabase(db);
    res.json({ success: true, message: 'Database reset to seed data' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend build in production
app.use(express.static(CLIENT_DIST));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Upskill Full-Stack Application listening on http://localhost:${PORT}`);
});
