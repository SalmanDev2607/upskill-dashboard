import React, { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  CheckCircle, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Award,
  Check
} from 'lucide-react';

export default function RecommendNext({
  recommendation,
  studentId,
  onEnroll,
  isLoading
}) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledSuccess, setEnrolledSuccess] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs mb-8">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-3"></div>
        <div className="h-28 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (!recommendation) return null;

  const handleEnrollClick = async () => {
    if (!recommendation.courseId) return;
    setIsEnrolling(true);
    try {
      await onEnroll(studentId, recommendation.courseId);
      setEnrolledSuccess(true);
      setTimeout(() => setEnrolledSuccess(false), 4000);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-indigo-950/20 mb-8 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-300">
            Intelligent Guidance Engine
          </span>
          <h2 className="text-lg font-extrabold tracking-tight text-white">
            Recommend Next Course
          </h2>
        </div>
      </div>

      {recommendation.hasRecommendation ? (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                {recommendation.courseId}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {recommendation.title}
              </h3>
              <span className="text-xs text-slate-300">
                &bull; {recommendation.totalLessons} Lessons
              </span>
            </div>

            {/* Recommendation Reason */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-blue-100 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">Why this course?</span>
                <p className="text-blue-100/90 leading-relaxed">
                  {recommendation.reason}
                </p>
              </div>
            </div>

            {/* Skills taught in this recommended course */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-300 mr-1">
                Teaches:
              </span>
              {(recommendation.skillsTaught || []).map((s) => (
                <span
                  key={s.skill_id || s.id}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/20"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          {/* Enroll Action Button */}
          <div className="shrink-0 flex flex-col items-start md:items-end justify-center gap-2">
            <button
              onClick={handleEnrollClick}
              disabled={isEnrolling || enrolledSuccess}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                enrolledSuccess
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40'
              }`}
            >
              {enrolledSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Successfully Enrolled!
                </>
              ) : isEnrolling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enrolling...
                </>
              ) : (
                <>
                  Enroll in Course
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <span className="text-[10px] text-slate-400 text-center sm:text-right">
              Updates your course list & prerequisite tree immediately.
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-xs text-slate-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <p>{recommendation.message}</p>
        </div>
      )}
    </section>
  );
}
