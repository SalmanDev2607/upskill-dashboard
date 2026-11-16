import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  X, 
  Send, 
  MessageSquare, 
  Calendar, 
  Phone, 
  FileText, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export default function CoachInterventions({
  isOpen,
  onClose,
  student,
  course,
  onSuccess
}) {
  const [interventions, setInterventions] = useState([]);
  const [nudgeType, setNudgeType] = useState('slack_ping');
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !student) return;
    setIsLoading(true);

    // Set default tailored message
    const defaultMsg = course
      ? `Hi ${student.name.split(' ')[0]}, noticed you haven't logged activity in "${course.title}" for ${course.daysInactive} days. Can I help unblock any concepts?`
      : `Hi ${student.name.split(' ')[0]}, checking in on your learning track progress this week!`;
    setNudgeMessage(defaultMsg);

    fetch(`/api/students/${student.id}/interventions`)
      .then(res => res.json())
      .then(data => {
        setInterventions(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [isOpen, student, course]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nudgeMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: 'coach-1',
          studentId: student.id,
          courseId: course?.courseId || null,
          type: nudgeType,
          message: nudgeMessage.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setInterventions(data.interventions);
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'slack_ping':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case '1on1_scheduled':
        return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      case 'call':
        return <Phone className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Coach Intervention Desk
              </h3>
              <p className="text-xs text-slate-500">
                Direct outreach for <span className="font-semibold text-slate-800">{student.name}</span>
                {course && <span> &bull; {course.title}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nudge Form */}
        <form onSubmit={handleSubmit} className="py-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Intervention Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'slack_ping', label: 'Slack Nudge' },
                { id: '1on1_scheduled', label: '1-on-1 Meet' },
                { id: 'call', label: 'Phone Call' },
                { id: 'note', label: 'Coach Note' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setNudgeType(opt.id)}
                  className={`text-xs py-1.5 px-2 rounded-lg border font-semibold transition-all cursor-pointer ${
                    nudgeType === opt.id
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Message / Intervention Notes
            </label>
            <textarea
              rows={3}
              value={nudgeMessage}
              onChange={(e) => setNudgeMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Log notes or write message..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !nudgeMessage.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Delivering...' : 'Send Intervention'}
            </button>
          </div>
        </form>

        {/* Past Interventions Audit Log */}
        <div className="pt-3 border-t border-slate-100 flex-1 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Intervention History ({interventions.length})
          </h4>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
            </div>
          ) : interventions.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No previous interventions recorded.</p>
          ) : (
            <div className="space-y-2">
              {interventions.map((it) => (
                <div key={it.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      {getIconForType(it.type)}
                      <span className="capitalize">{it.type.replace('_', ' ')}</span>
                      {it.coach_name && <span className="text-slate-400 font-normal">by {it.coach_name}</span>}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(it.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{it.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
