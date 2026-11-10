import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'purple' | 'neutral';
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary',
  badge,
  onClick,
  className = ''
}) => {
  const variantStyles = {
    primary: {
      border: 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700',
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300',
      numColor: 'text-slate-900 dark:text-white',
    },
    success: {
      border: 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700',
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
      numColor: 'text-emerald-700 dark:text-emerald-400',
    },
    danger: {
      border: 'border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-700',
      iconBg: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400',
      badge: 'bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300',
      numColor: 'text-red-600 dark:text-red-400',
    },
    warning: {
      border: 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700',
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
      numColor: 'text-amber-600 dark:text-amber-400',
    },
    purple: {
      border: 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700',
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
      badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300',
      numColor: 'text-purple-700 dark:text-purple-300',
    },
    neutral: {
      border: 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
      iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      numColor: 'text-slate-900 dark:text-white',
    }
  }[variant];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={`bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-xs transition-all duration-150 ${variantStyles.border} ${
        onClick ? 'cursor-pointer hover:shadow-subtle active:scale-[0.99] touch-target-44' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          {title}
        </p>
        <div className={`p-1.5 rounded-lg shrink-0 ${variantStyles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight ${variantStyles.numColor}`}>
          {value}
        </span>
        {badge && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${variantStyles.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};
