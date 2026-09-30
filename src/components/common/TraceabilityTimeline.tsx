import React from 'react';
import { WorkflowHistoryItem } from '../../types';
import { StatusBadge } from './StatusBadge';
import { 
  FileText, 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Dna, 
  Cpu, 
  Award, 
  Send, 
  Clock, 
  User as UserIcon 
} from 'lucide-react';

interface TraceabilityTimelineProps {
  history: WorkflowHistoryItem[];
  compact?: boolean;
}

export const TraceabilityTimeline: React.FC<TraceabilityTimelineProps> = ({ history, compact = false }) => {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium">No workflow events recorded yet.</p>
      </div>
    );
  }

  const getEventIcon = (eventType: string, status: string) => {
    if (eventType.includes('Register')) return <FileText className="w-4 h-4 text-slate-600" />;
    if (eventType.includes('Processing')) return <FlaskConical className="w-4 h-4 text-cyan-600" />;
    if (eventType.includes('QC Passed') || eventType.includes('Quality Check Passed')) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (eventType.includes('QC Failed') || eventType.includes('Failed') || status === 'QC_FAILED') return <XCircle className="w-4 h-4 text-rose-600" />;
    if (eventType.includes('Sequencing')) return <Dna className="w-4 h-4 text-indigo-600" />;
    if (eventType.includes('Bioinformatics') || eventType.includes('Analysis')) return <Cpu className="w-4 h-4 text-purple-600" />;
    if (eventType.includes('Approved') || eventType.includes('Review')) return <Award className="w-4 h-4 text-amber-600" />;
    if (eventType.includes('Delivered')) return <Send className="w-4 h-4 text-emerald-700" />;
    return <Clock className="w-4 h-4 text-slate-500" />;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((event, idx) => {
          const isLast = idx === history.length - 1;
          const { date, time } = formatDate(event.created_at);

          return (
            <li key={event.id || idx} className="relative pb-8">
              {!isLast && (
                <span
                  className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-start space-x-3.5">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-xs">
                    {getEventIcon(event.event_type, event.new_status)}
                  </div>
                </div>

                <div className="min-w-0 flex-1 pt-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{event.event_type}</p>
                      {event.new_status && (
                        <StatusBadge status={event.new_status} size="sm" />
                      )}
                    </div>
                    <time className="text-xs text-slate-500 font-mono">
                      {date} at {time}
                    </time>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">{event.user_name || 'System Operator'}</span>
                    {event.user_role && (
                      <span className="text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                        {event.user_role.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {event.comments && (
                    <div className="mt-2 text-xs text-slate-700 bg-slate-50 rounded-md p-2.5 border border-slate-200 font-mono leading-relaxed">
                      {event.comments}
                    </div>
                  )}

                  {event.previous_status && event.previous_status !== event.new_status && (
                    <div className="mt-1 text-2xs text-slate-400 font-mono">
                      Transition: {event.previous_status} &rarr; {event.new_status}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
