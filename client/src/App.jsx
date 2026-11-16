import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar.jsx';
import StudentPicker from './components/StudentPicker.jsx';
import StudentProfileCard from './components/StudentProfileCard.jsx';
import MyCourses from './components/MyCourses.jsx';
import RecommendNext from './components/RecommendNext.jsx';
import EnrollModal from './components/EnrollModal.jsx';
import CoachInterventions from './components/CoachInterventions.jsx';
import GoalPathway from './components/GoalPathway.jsx';
import InteractiveSimulator from './components/InteractiveSimulator.jsx';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('s1'); // default to Aisha
  const [currentStudent, setCurrentStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [nudgeCourse, setNudgeCourse] = useState(null);

  // Fetch initial centers
  useEffect(() => {
    fetch('/api/centers')
      .then(res => res.json())
      .then(data => setCenters(data))
      .catch(err => console.error('Failed to load centers:', err));
  }, []);

  // Fetch students (optionally filtered by center)
  const fetchStudents = useCallback(async (centerId = selectedCenter) => {
    try {
      const url = centerId ? `/api/students?centerId=${centerId}` : '/api/students';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load students');
      const data = await res.json();
      setStudents(data);

      // If current selected student is not in the filtered center list, switch to first available
      if (data.length > 0) {
        const stillPresent = data.some(s => s.id === selectedStudentId);
        if (!stillPresent) {
          setSelectedStudentId(data[0].id);
        }
      } else {
        setSelectedStudentId(null);
        setCurrentStudent(null);
        setCourses([]);
        setRecommendation(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [selectedCenter, selectedStudentId]);

  useEffect(() => {
    fetchStudents(selectedCenter);
  }, [selectedCenter, fetchStudents]);

  // Fetch detailed data for selected student (Summary, Courses, Recommendation)
  const fetchStudentDetails = useCallback(async (studentId) => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, coursesRes, recRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/students/${studentId}/courses`),
        fetch(`/api/students/${studentId}/recommendation`)
      ]);

      if (!sumRes.ok) throw new Error('Failed to load student details');
      const sumData = await sumRes.json();
      const coursesData = await coursesRes.json();
      const recData = await recRes.json();

      setCurrentStudent(sumData);
      setCourses(coursesData);
      setRecommendation(recData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentDetails(selectedStudentId);
    }
  }, [selectedStudentId, fetchStudentDetails]);

  // Enroll Action
  const handleEnroll = async (studentId, courseId) => {
    const res = await fetch(`/api/students/${studentId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to enroll');
    }

    // Refresh state immediately
    setCourses(data.courses);
    setCurrentStudent(data.student);
    setRecommendation(data.recommendation);
    // Refresh student picker list to show updated active counts
    fetchStudents(selectedCenter);
  };

  // Simulate Lesson / Inactivity Progress Action (Add-on #3)
  const handleSimulateProgress = async (studentId, courseId, completedLessons, daysAgoActive = 0) => {
    const res = await fetch('/api/simulate/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, courseId, completedLessons, daysAgoActive })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to simulate progress');
    }

    setCourses(data.courses);
    setCurrentStudent(data.student);
    setRecommendation(data.recommendation);
    fetchStudents(selectedCenter);
  };

  // Transfer Student between Centers (Multi-Center Mobility)
  const handleTransferCenter = async (studentId, toCenterId, reason) => {
    const res = await fetch(`/api/students/${studentId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toCenterId, reason })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to transfer center');
    }
    setCurrentStudent(data.student);
    fetchStudents(selectedCenter);
  };

  // Reset DB
  const handleResetDb = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      await fetchStudents(selectedCenter);
      if (selectedStudentId) {
        await fetchStudentDetails(selectedStudentId);
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 text-slate-800 antialiased">
      {/* Top Navigation */}
      <Navbar
        centers={centers}
        selectedCenter={selectedCenter}
        onSelectCenter={setSelectedCenter}
        onResetDb={handleResetDb}
        isResetting={isResetting}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full flex-1">
        
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                if (selectedStudentId) fetchStudentDetails(selectedStudentId);
              }}
              className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded font-semibold text-red-900 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Student Picker */}
        <StudentPicker
          students={students}
          selectedStudentId={selectedStudentId}
          onSelectStudent={(id) => setSelectedStudentId(id)}
          isLoading={isLoading && (!students || students.length === 0)}
        />

        {currentStudent ? (
          <>
            {/* Student Profile Card (Name, Goals, Earned Skills >=80%, Active Days in last 7d) */}
            <StudentProfileCard
              student={currentStudent}
              centers={centers}
              onTransferCenter={handleTransferCenter}
            />

            {/* 3. Recommend Next Course */}
            <RecommendNext
              recommendation={recommendation}
              studentId={selectedStudentId}
              onEnroll={handleEnroll}
              isLoading={isLoading}
            />

            {/* 2. My Courses (Percent Complete, On-Track vs At-Risk >3d, Prerequisites) */}
            <MyCourses
              courses={courses}
              studentId={selectedStudentId}
              onSimulateProgress={handleSimulateProgress}
              onOpenEnrollModal={() => setIsEnrollModalOpen(true)}
              onOpenNudgeModal={(course) => {
                setNudgeCourse(course);
                setIsNudgeModalOpen(true);
              }}
              isLoading={isLoading}
            />

            {/* Add-on 2: Goal Pathway & Prerequisite Graph */}
            <GoalPathway
              student={currentStudent}
              courses={courses}
            />
          </>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-500 text-sm">
              No students found for this center filter. Please select "All Centers" or another center.
            </p>
          </div>
        )}
      </main>

      {/* Enroll Catalog Modal */}
      <EnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        studentId={selectedStudentId}
        studentName={currentStudent?.name || ''}
        onEnroll={handleEnroll}
      />

      {/* Coach Nudge & Intervention Modal (Add-on #1) */}
      <CoachInterventions
        isOpen={isNudgeModalOpen}
        onClose={() => {
          setIsNudgeModalOpen(false);
          setNudgeCourse(null);
        }}
        student={currentStudent}
        course={nudgeCourse}
        onSuccess={() => {
          if (selectedStudentId) fetchStudentDetails(selectedStudentId);
        }}
      />

      {/* Floating Evaluator Interactive Sandbox (Add-on #3) */}
      <InteractiveSimulator
        selectedStudentId={selectedStudentId}
        students={students}
        onSimulateProgress={handleSimulateProgress}
        onResetDb={handleResetDb}
        onSelectStudent={(id) => setSelectedStudentId(id)}
      />
    </div>
  );
}
