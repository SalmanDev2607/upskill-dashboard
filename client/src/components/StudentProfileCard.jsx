import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  Target, 
  Award, 
  Calendar, 
  CheckCircle2, 
  ArrowRightLeft, 
  Check, 
  Info,
  Flame,
  Clock
} from 'lucide-react';

export default function StudentProfileCard({
  student,
  centers = [],
  onTransferCenter
}) {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState(student?.current_center_id || '');
  const [transferReason, setTransferReason] = useState('Relocation / Curriculum Advancement');
  const [isTransferring, setIsTransferring] = useState(false);

  if (!student) return null;

  const initials = student.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedCenterId || selectedCenterId === student.current_center_id) return;
    setIsTransferring(true);
    try {
      await onTransferCenter(student.id, selectedCenterId, transferReason);
      setIsTransferModalOpen(false);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left: Avatar, Name, Email, Center */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-xl text-white shadow-md shadow-blue-500/10 shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {student.name}
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                <MapPin className="w-3 h-3 text-slate-500" />
                {student.center_name || 'Center'} ({student.center_city || 'HQ'})
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              {student.email || `${student.id}@upskill.org`} &bull; Learner ID: <span className="font-mono text-slate-700 font-bold">{student.id}</span>
            </p>

            {/* Quick center mobility transfer trigger */}
            <button
              onClick={() => {
                setSelectedCenterId(student.current_center_id);
                setIsTransferModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3 h-3" />
              Transfer Center (Mobility)
            </button>
          </div>
        </div>

        {/* Center / Right: 3 Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          
          {/* Active Days Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Flame className={`w-4 h-4 ${student.activeDaysLast7Days > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                Last 7 Days Active
              </span>
              <span className="font-bold text-slate-700">{student.activeDaysLast7Days}/7d</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((dotIndex) => (
                <div
                  key={dotIndex}
                  className={`h-2 flex-1 rounded-full ${
                    dotIndex <= student.activeDaysLast7Days
                      ? 'bg-blue-600'
                      : 'bg-slate-200'
                  }`}
                  title={`Day ${dotIndex}: ${dotIndex <= student.activeDaysLast7Days ? 'Active' : 'No Activity'}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              {student.activeDaysLast7Days >= 3 ? 'Consistent Learner' : 'Needs Engagement'}
            </span>
          </div>

          {/* Goals Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-500" />
                Target Goals
              </span>
              <span className="font-bold text-slate-700">{student.goals?.length || 0}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(student.goals || []).map((g) => (
                <span
                  key={g.id}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    g.isEarned
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {g.name}
                  {g.isEarned && <Check className="w-2.5 h-2.5" />}
                </span>
              ))}
            </div>
          </div>

          {/* Earned Skills Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Earned Skills
              </span>
              <span className="font-bold text-amber-700 font-mono">
                {student.earnedSkills?.length || 0}
              </span>
            </div>
            {student.earnedSkills && student.earnedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {student.earnedSkills.map((sk) => (
                  <span
                    key={sk.id}
                    title={`Unlocked from ${sk.earned_from_course_title} (${sk.percent_complete}% >= 80%)`}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"
                  >
                    {sk.name}
                    <Check className="w-2.5 h-2.5 text-amber-600" />
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">None yet (&ge;80% required)</span>
            )}
          </div>

        </div>
      </div>

      {/* Helper Banner Explaining the 80% Rule */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            <strong>Rule Applied:</strong> A skill is earned when the course that teaches it reaches at least <strong>80% completion</strong>.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>At-Risk status triggers when course is inactive for &gt; 3 days.</span>
        </div>
      </div>

      {/* Center Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Transfer Learner to Another Center
                </h3>
                <p className="text-xs text-slate-500">
                  Multi-Center Mobility: Learner maintains all completed lessons and earned skills.
                </p>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Destination Center
                </label>
                <select
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.city} {c.id === student.current_center_id ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transfer Reason / Note
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Branch relocation, campus transfer"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring || selectedCenterId === student.current_center_id}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
