import React from 'react';
import { GitFork, CheckCircle2, Lock, ArrowRight, Target, Award } from 'lucide-react';

export default function GoalPathway({ student, courses = [] }) {
  if (!student) return null;

  // Build a dependency map from courses
  const courseMap = {};
  courses.forEach(c => {
    courseMap[c.courseId] = c;
  });

  return (
    <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs mb-8">
      <div className="flex items-center gap-2 mb-3">
        <GitFork className="w-5 h-5 text-indigo-600" />
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Goal Pathway & Prerequisite Graph
          </h2>
          <p className="text-xs text-slate-500">
            Visual progression of prerequisite courses leading to target goal skills.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {(student.goals || []).map((goal) => {
          return (
            <div
              key={goal.id}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                goal.isEarned
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : 'bg-slate-50/50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className={`w-4 h-4 ${goal.isEarned ? 'text-emerald-600' : 'text-indigo-600'}`} />
                    <span className="font-bold text-sm text-slate-900 capitalize">
                      Goal: {goal.name}
                    </span>
                  </div>
                  {goal.isEarned ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Goal Mastered (&ge;80%)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      In Progress
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  {goal.isEarned
                    ? `Congratulations! You have completed at least 80% of courses teaching ${goal.name}.`
                    : `Complete prerequisite sequence and reach 80% completion in relevant modules.`}
                </p>

                {/* Pathway Step Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {goal.id === 'react' ? (
                    <>
                      <span className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                        Web Foundations (c1) ✓
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                        JavaScript Essentials (c2) ✓
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold">
                        React Basics (c3)
                      </span>
                    </>
                  ) : goal.id === 'dashboards' ? (
                    <>
                      <span className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                        SQL Fundamentals (c4) ✓
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold">
                        Building Dashboards (c5)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                        Fundamental Track
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold">
                        {goal.name} Core
                      </span>
                    </>
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
