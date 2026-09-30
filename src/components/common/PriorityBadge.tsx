import React from 'react';
import { RequestPriority } from '../../types';

interface PriorityBadgeProps {
  priority: RequestPriority | string;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className = '' }) => {
  switch (priority) {
    case 'URGENT':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wider ${className}`}>
          Urgent
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider ${className}`}>
          High
        </span>
      );
    case 'STANDARD':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider ${className}`}>
          Standard
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider ${className}`}>
          Low
        </span>
      );
  }
};
