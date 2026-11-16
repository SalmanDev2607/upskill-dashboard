import React from 'react';
import { Target, Award, Calendar, CheckCircle2, AlertTriangle, ChevronRight, User } from 'lucide-react';

export default function StudentPicker({ 
  students = [], 
  selectedStudentId, 
  onSelectStudent,
  isLoading 
}) {
  if (isLoading && (!students || students.length === 0)) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs mb-8">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-36 bg-slate-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Learner Roster (Student Picker)
          </h2>
          <p className="text-xs text-slate-500">
            Select a student to monitor active pace, track prerequisite milestones, and evaluate next recommendations.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full w-fit">
          {students.length} Learners Available
        </span>
      </div>

      {/* Grid of Student Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {students.map((student) => {
          const isSelected = student.id === selectedStudentId;
          const initials = student.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2);

          return (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student.id)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Top Row: Avatar + Name + Center */}
              <div>
                <div className="flex items-start gap-2.5 mb-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {student.name}
                      </h3>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {student.center_city || student.center_name || 'Center'}
                    </span>
                  </div>
                </div>

                {/* Goals */}
                <div className="mb-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3 text-indigo-500" />
                    Target Goals
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(student.goals || []).map((goal) => (
                      <span
                        key={goal.id}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          goal.isEarned
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                        }`}
                      >
                        {goal.name}
                        {goal.isEarned && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Earned Skills */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-500" />
                    Earned Skills ({student.earnedSkills?.length || 0})
                  </div>
                  {student.earnedSkills && student.earnedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                      {student.earnedSkills.slice(0, 3).map((sk) => (
                        <span
                          key={sk.id}
                          title={`Earned from ${sk.earned_from_course_title} (${sk.percent_complete}%)`}
                          className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200 truncate"
                        >
                          {sk.name}
                        </span>
                      ))}
                      {student.earnedSkills.length > 3 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          +{student.earnedSkills.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No skills earned yet</span>
                  )}
                </div>
              </div>

              {/* Bottom Row: Active Days in Last 7 Days */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">{student.activeDaysLast7Days}</span>
                  <span className="text-slate-500 text-[11px]">/ 7 days active</span>
                </div>

                {/* Mini visual 7-day spark dots */}
                <div className="flex items-center gap-0.5" title={`${student.activeDaysLast7Days} active days in the last 7 days`}>
                  {[1, 2, 3, 4, 5, 6, 7].map((dotIndex) => (
                    <div
                      key={dotIndex}
                      className={`w-1.5 h-3.5 rounded-xs ${
                        dotIndex <= student.activeDaysLast7Days
                          ? 'bg-blue-600'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
