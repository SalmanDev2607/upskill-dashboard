import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Award, 
  Plus, 
  Minus, 
  BellRing, 
  ChevronRight, 
  Compass,
  Check
} from 'lucide-react';

export default function MyCourses({
  courses = [],
  studentId,
  onSimulateProgress,
  onOpenEnrollModal,
  onOpenNudgeModal,
  isLoading
}) {
  const [updatingCourseId, setUpdatingCourseId] = useState(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs mb-8">
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-44 bg-slate-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Handle empty state (Student 4: Devendra Sharma)
  if (!courses || courses.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          No Enrolled Courses Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
          This learner is newly onboarded and has not enrolled in any courses. Browse eligible curriculum below to start their learning track.
        </p>
        <button
          onClick={onOpenEnrollModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          Enroll in First Course
        </button>
      </div>
    );
  }

  const handleLessonStep = async (course, increment) => {
    const newCompleted = Math.max(0, Math.min(course.totalLessons, course.completedLessons + increment));
    if (newCompleted === course.completedLessons) return;
    
    setUpdatingCourseId(course.courseId);
    try {
      await onSimulateProgress(studentId, course.courseId, newCompleted, 0); // 0 days ago = active today
    } finally {
      setUpdatingCourseId(null);
    }
  };

  const handleToggleInactivity = async (course) => {
    // If currently on-track, simulate 5 days inactive -> flips to at-risk
    // If currently at-risk, simulate active today (0 days) -> flips to on-track
    const daysAgo = course.trackStatus === 'at_risk' ? 0 : 5;
    setUpdatingCourseId(course.courseId);
    try {
      await onSimulateProgress(studentId, course.courseId, course.completedLessons, daysAgo);
    } finally {
      setUpdatingCourseId(null);
    }
  };

  return (
    <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            My Courses ({courses.length})
          </h2>
          <p className="text-xs text-slate-500">
            Real-time completion pacing. Tracks inactive students (&gt; 3 days) for coach intervention.
          </p>
        </div>

        <button
          onClick={onOpenEnrollModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-xs transition-colors cursor-pointer w-fit"
        >
          <Plus className="w-3.5 h-3.5 text-slate-600" />
          Browse & Enroll
        </button>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {courses.map((course) => {
          const isAtRisk = course.trackStatus === 'at_risk';
          const isCompleted = course.trackStatus === 'completed';
          const isUpdating = updatingCourseId === course.courseId;
          const earnsSkills = course.percentComplete >= 80;

          return (
            <div
              key={course.courseId}
              className={`rounded-xl border p-4.5 flex flex-col justify-between transition-all ${
                isAtRisk
                  ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                  : isCompleted
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                {/* Top Row: Course Title & Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {course.description}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {isCompleted ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : isAtRisk ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse-subtle">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      At-Risk ({course.daysInactive}d inactive)
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <Clock className="w-3.5 h-3.5" />
                      On-Track ({course.daysInactive}d inactive)
                    </span>
                  )}
                </div>

                {/* Progress Bar & Percentage */}
                <div className="mt-3 mb-3">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600">
                      {course.completedLessons} of {course.totalLessons} lessons completed
                    </span>
                    <span className={`font-mono text-sm font-bold ${
                      isCompleted ? 'text-emerald-700' : isAtRisk ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                      {course.percentComplete}%
                    </span>
                  </div>

                  {/* Progress track */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isAtRisk
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, course.percentComplete)}%` }}
                    />
                  </div>

                  {/* 80% Skill Earned Marker Note */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>0%</span>
                    <span className={`font-medium ${earnsSkills ? 'text-amber-700 font-bold' : ''}`}>
                      80% (Skills Earned Threshold) {earnsSkills ? '✓' : ''}
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Skills Taught */}
                <div className="mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Skills Taught:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {course.skillsTaught.map((skill) => (
                      <span
                        key={skill.id}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          earnsSkills
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {skill.name}
                        {earnsSkills && <Check className="w-2.5 h-2.5 text-amber-600" />}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prerequisites Summary */}
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div className="text-[11px] text-slate-500 mb-2">
                    <span className="text-slate-400">Prerequisites: </span>
                    <span className="font-semibold text-slate-700">
                      {course.prerequisites.map(p => p.title).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Interactive Controls (Tester / Coach Actions) */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Lesson increment/decrement controls */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Lessons:</span>
                  <button
                    onClick={() => handleLessonStep(course, -1)}
                    disabled={course.completedLessons <= 0 || isUpdating}
                    title="Undo 1 lesson"
                    className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-slate-800">
                    {course.completedLessons}
                  </span>
                  <button
                    onClick={() => handleLessonStep(course, 1)}
                    disabled={course.completedLessons >= course.totalLessons || isUpdating}
                    title="Complete 1 lesson"
                    className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Status Toggle & Coach Nudge */}
                <div className="flex items-center gap-2">
                  {/* Quick toggle inactivity to test on-track vs at-risk */}
                  <button
                    onClick={() => handleToggleInactivity(course)}
                    disabled={isUpdating || isCompleted}
                    title={isAtRisk ? 'Mark active today' : 'Simulate 5 days inactive'}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isAtRisk ? 'Test Active' : 'Test Inactive (>3d)'}
                  </button>

                  {/* Coach Nudge Action for At-Risk courses */}
                  {isAtRisk && (
                    <button
                      onClick={() => onOpenNudgeModal(course)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <BellRing className="w-3 h-3" />
                      Coach Nudge
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
