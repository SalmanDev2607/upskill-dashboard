import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export default function InteractiveSimulator({
  selectedStudentId,
  students = [],
  onSimulateProgress,
  onResetDb,
  onSelectStudent
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const runScenario = async (action) => {
    setIsSimulating(true);
    try {
      if (action === 'aisha_80') {
        onSelectStudent('s1');
        // React Basics totalLessons = 16. 80% is 13 lessons.
        await onSimulateProgress('s1', 'c3', 13, 0);
      } else if (action === 'aisha_at_risk') {
        onSelectStudent('s1');
        // Set inactive for 5 days (>3 days)
        await onSimulateProgress('s1', 'c3', 4, 5);
      } else if (action === 'rohan_dashboards_80') {
        onSelectStudent('s2');
        // Building Dashboards totalLessons = 12. 80% is 10 lessons.
        await onSimulateProgress('s2', 'c5', 10, 0);
      } else if (action === 'priya_complete') {
        onSelectStudent('s3');
        // User Research 101 totalLessons = 10. 100% complete.
        await onSimulateProgress('s3', 'c6', 10, 0);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 text-white shadow-2xl transition-all">
      {/* Drawer Toggle Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-extrabold text-xs tracking-wide uppercase text-blue-300">
            Interactive Evaluator Sandbox & Rule Verifier
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (1-click scenarios to verify 80% earned skills, &gt;3d at-risk status, and prerequisite locks)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span>{isOpen ? 'Collapse Panel' : 'Quick Scenarios'}</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Controls Drawer */}
      {isOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            
            {/* Scenario 1: Aisha 80% */}
            <button
              onClick={() => runScenario('aisha_80')}
              disabled={isSimulating}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Test 80% Rule
                </span>
                <Play className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </div>
              <p className="text-[11px] text-slate-300">
                Advance Aisha's React Basics to 13/16 (81%). Watch <strong>React</strong> unlock under Earned Skills!
              </p>
            </button>

            {/* Scenario 2: Aisha At-Risk */}
            <button
              onClick={() => runScenario('aisha_at_risk')}
              disabled={isSimulating}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  Test At-Risk (&gt;3d)
                </span>
                <Play className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </div>
              <p className="text-[11px] text-slate-300">
                Simulate 5 days inactivity on Aisha. Watch status badge flip to <strong>At-Risk</strong> and show Coach Nudge.
              </p>
            </button>

            {/* Scenario 3: Rohan Dashboards */}
            <button
              onClick={() => runScenario('rohan_dashboards_80')}
              disabled={isSimulating}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Rohan Goal Unlock
                </span>
                <Play className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </div>
              <p className="text-[11px] text-slate-300">
                Advance Rohan's Building Dashboards to 10/12 (83%). Unlocks <strong>Dashboards</strong> goal skill!
              </p>
            </button>

            {/* Scenario 4: Priya Complete 100% */}
            <button
              onClick={() => runScenario('priya_complete')}
              disabled={isSimulating}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  Priya 100% Complete
                </span>
                <Play className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </div>
              <p className="text-[11px] text-slate-300">
                Complete User Research 101 (10/10). Marks course Completed and refreshes Recommend Next.
              </p>
            </button>

          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>
              All state changes are stored directly in SQLite and can be reset anytime.
            </span>
            <button
              onClick={onResetDb}
              disabled={isSimulating}
              className="flex items-center gap-1 px-3 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-md font-bold cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Seed Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
