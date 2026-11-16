import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function EnrollModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  onEnroll
}) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!isOpen || !studentId) return;
    setIsLoading(true);
    setErrorMsg(null);

    fetch(`/api/courses?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        setCourses(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg('Failed to load courses catalog.');
        setIsLoading(false);
      });
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    setErrorMsg(null);
    try {
      await onEnroll(studentId, courseId);
      // Refresh list
      const res = await fetch(`/api/courses?studentId=${studentId}`);
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Enroll Course Catalog
            </h3>
            <p className="text-xs text-slate-500">
              Enrolling for <strong className="text-slate-800">{studentName}</strong>. Enforces prerequisite rules strictly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Courses list */}
        <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            courses.map((c) => {
              const isEligible = c.eligibility?.isEligible;
              const isEnrolled = c.isEnrolled;
              const isProcessing = enrollingId === c.id;

              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isEnrolled
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : isEligible
                      ? 'bg-white border-blue-200 hover:border-blue-400 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {c.id}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {c.title}
                      </h4>
                      <span className="text-xs text-slate-500">
                        ({c.total_lessons} lessons)
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {c.description}
                    </p>

                    {/* Skills taught */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {c.skillsTaught.map((s) => (
                        <span
                          key={s.id}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>

                    {/* Prerequisites note */}
                    {c.prerequisites && c.prerequisites.length > 0 && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        <span className="text-slate-400">Prerequisites: </span>
                        {c.prerequisites.map((p) => p.title).join(', ')}
                      </div>
                    )}

                    {/* Unfulfilled prerequisites warning */}
                    {!isEligible && !isEnrolled && c.eligibility?.unfulfilledPrerequisites?.length > 0 && (
                      <div className="text-[11px] text-amber-700 flex items-center gap-1 font-medium pt-0.5">
                        <Lock className="w-3 h-3 text-amber-600" />
                        Must complete 100% of: {c.eligibility.unfulfilledPrerequisites.map(p => p.title).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Enroll button or status badge */}
                  <div className="shrink-0 flex items-center justify-end">
                    {isEnrolled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        Enrolled
                      </span>
                    ) : isEligible ? (
                      <button
                        onClick={() => handleEnroll(c.id)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? 'Enrolling...' : 'Enroll Now'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                        <Lock className="w-3 h-3" />
                        Prereqs Required
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
