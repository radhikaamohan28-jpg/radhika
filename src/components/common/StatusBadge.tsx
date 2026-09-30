import React from 'react';
import { SampleStatus, RequestStatus, ReportStatus } from '../../types';

type AllStatuses = SampleStatus | RequestStatus | ReportStatus | string;

interface StatusBadgeProps {
  status: AllStatuses;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  // Requests & Generic
  PENDING: { label: 'Pending', bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
  PROCESSING: { label: 'Processing', bg: 'bg-blue-50 text-blue-800 border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' },

  // Samples
  REGISTERED: { label: 'Registered', bg: 'bg-slate-100 text-slate-800 border-slate-300', text: 'text-slate-800', dot: 'bg-slate-500' },
  PROCESSING_COMPLETED: { label: 'Extracted (Ready for QC)', bg: 'bg-cyan-50 text-cyan-800 border-cyan-200', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  
  // QC
  QC_PASSED: { label: 'QC Passed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  QC_FAILED: { label: 'QC Failed', bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-600' },
  PASSED: { label: 'Passed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  FAILED: { label: 'Failed', bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-600' },
  PENDING_REVIEW: { label: 'Pending Review', bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },

  // Sequencing
  SEQUENCING: { label: 'Sequencing Active', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-500 animate-pulse' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  SEQUENCING_COMPLETED: { label: 'Sequencing Done', bg: 'bg-teal-50 text-teal-800 border-teal-200', text: 'text-teal-800', dot: 'bg-teal-600' },

  // Analysis
  ANALYSIS: { label: 'Analysis Active', bg: 'bg-purple-50 text-purple-800 border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500 animate-pulse' },
  ANALYSIS_COMPLETED: { label: 'Analysis Done', bg: 'bg-violet-50 text-violet-800 border-violet-200', text: 'text-violet-800', dot: 'bg-violet-600' },

  // Reports
  DRAFT: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' },
  GENERATED: { label: 'Report Generated', bg: 'bg-sky-50 text-sky-800 border-sky-200', text: 'text-sky-800', dot: 'bg-sky-500' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500 animate-pulse' },
  APPROVED: { label: 'Clinically Approved', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-600' },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold', text: 'text-emerald-900', dot: 'bg-emerald-700' },

  // Users
  ACTIVE: { label: 'Active', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700 border-slate-300', text: 'text-slate-700', dot: 'bg-slate-400' },
  SUSPENDED: { label: 'Suspended', bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-500' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const config = statusConfig[status] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs tracking-wide';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${config.bg} ${sizeClasses} whitespace-nowrap ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
};
