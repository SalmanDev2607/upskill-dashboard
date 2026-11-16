import React from 'react';
import { GraduationCap, Building2, RotateCcw, ShieldCheck, UserCheck } from 'lucide-react';

export default function Navbar({ 
  centers = [], 
  selectedCenter, 
  onSelectCenter, 
  onResetDb, 
  isResetting 
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Upskill
              </span>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                INTERNAL COACH DESK
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Learner Progress & At-Risk Intervention Hub
            </p>
          </div>
        </div>

        {/* Center Switcher (Multi-Center Coach View) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-150 p-1 pl-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium hidden md:inline text-slate-500">Coach Center:</span>
            <select
              value={selectedCenter || ''}
              onChange={(e) => onSelectCenter(e.target.value || null)}
              className="bg-white text-xs font-semibold py-1 px-2.5 rounded border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Centers (Global View)</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Reset DB Demo Button */}
          <button
            onClick={onResetDb}
            disabled={isResetting}
            title="Reset database back to initial seed data"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-400 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>
        </div>
      </div>
    </header>
  );
}
