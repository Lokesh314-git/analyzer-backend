import React from 'react';
import { ExamStatus, SubmissionStatus } from '../../types/academic';

interface StatusBadgeProps {
  status?: ExamStatus | SubmissionStatus | string | null;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  className = ''
}) => {
  const norm = String(status || '').toUpperCase().trim();

  let bgClass = 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700';
  let dotColor = 'bg-slate-400';
  let label = status || 'PENDING';

  if (norm === 'PASS') {
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
    dotColor = 'bg-emerald-600';
    label = 'PASS';
  } else if (norm === 'FAIL') {
    bgClass = 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60';
    dotColor = 'bg-red-600';
    label = 'FAIL';
  } else if (norm === 'ABSENT' || norm === 'A' || norm === 'AB') {
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
    dotColor = 'bg-amber-600';
    label = 'ABSENT';
  } else if (norm === 'PENDING' || norm === 'PENDING / UNCONFIRMED') {
    bgClass = 'bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';
    dotColor = 'bg-slate-400';
    label = 'PENDING';
  } else if (norm === 'INVALID') {
    bgClass = 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60';
    dotColor = 'bg-purple-600';
    label = 'INVALID';
  } else if (norm === 'SUBMITTED / MARKED' || norm === 'SUBMITTED') {
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
    dotColor = 'bg-emerald-600';
    label = 'SUBMITTED';
  } else if (norm === 'NOT SUBMITTED' || norm === 'NS') {
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60';
    dotColor = 'bg-rose-600';
    label = 'NOT SUBMITTED';
  } else if (norm === 'ZERO MARKS') {
    bgClass = 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/60';
    dotColor = 'bg-orange-600';
    label = 'ZERO MARKS';
  } else if (norm === 'NOT CONFIGURED' || norm === 'UNCONFIGURED') {
    bgClass = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700';
    dotColor = 'bg-slate-400';
    label = 'NOT CONFIGURED';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium leading-none',
    md: 'text-xs px-2.5 py-1 font-semibold leading-tight',
    lg: 'text-xs sm:text-sm px-3 py-1.5 font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${sizeClasses} ${bgClass} transition-colors whitespace-nowrap ${className}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />}
      <span>{label}</span>
    </span>
  );
};
