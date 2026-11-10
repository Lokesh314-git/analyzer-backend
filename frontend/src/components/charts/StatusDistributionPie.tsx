import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { StatusBadge } from '../shared/StatusBadge';
import { Clock, CheckCircle2, XCircle, UserX, AlertCircle } from 'lucide-react';

interface StatusDistributionProps {
  overview: {
    passed: number;
    failed: number;
    absent: number;
    pending: number;
    invalid: number;
  };
  title?: string;
}

export const StatusDistributionPie: React.FC<StatusDistributionProps> = ({ overview, title }) => {
  const { passed = 0, failed = 0, absent = 0, pending = 0, invalid = 0 } = overview;
  const total = passed + failed + absent + pending + invalid;

  // Scenario 6: No valid records
  if (total === 0) {
    return (
      <div className="py-8 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No Examination Records Available</p>
        <p className="text-[11px] text-slate-400">Marks data has not been detected for this examination.</p>
      </div>
    );
  }

  // Scenario 4: All students PENDING (e.g. CAT-3 with 54 pending)
  if (pending === total) {
    return (
      <div className="space-y-3 py-1">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                All {total} Students Pending
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Marks awaiting entry in Google Sheet
              </p>
            </div>
          </div>
          <StatusBadge status="PENDING" size="sm" />
        </div>

        {/* 4-Item Breakdown Metric Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">Passed</span>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono">0</span>
          </div>
          <div className="p-2 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 block">Failed</span>
            <span className="text-base font-bold text-red-700 dark:text-red-300 font-mono">0</span>
          </div>
          <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block">Absent</span>
            <span className="text-base font-bold text-amber-700 dark:text-amber-300 font-mono">0</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block">Pending</span>
            <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{total}</span>
          </div>
        </div>

        {/* Full-width Single Status Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div className="bg-slate-400 dark:bg-slate-500 h-full w-full rounded-full" />
        </div>
      </div>
    );
  }

  // Scenario 1: All students PASS
  if (passed === total) {
    return (
      <div className="space-y-3 py-1">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                100% Pass Rate ({total} Students)
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                All students cleared all 5 examination subjects
              </p>
            </div>
          </div>
          <StatusBadge status="PASS" size="sm" />
        </div>
        <div className="w-full bg-emerald-100 dark:bg-emerald-950 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-600 h-full w-full rounded-full" />
        </div>
      </div>
    );
  }

  // Scenario 2: All students FAIL
  if (failed === total) {
    return (
      <div className="space-y-3 py-1">
        <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-900 dark:text-red-100">
                All {total} Students Require Re-evaluation
              </p>
              <p className="text-[11px] text-red-700 dark:text-red-400">
                0 passing students recorded
              </p>
            </div>
          </div>
          <StatusBadge status="FAIL" size="sm" />
        </div>
        <div className="w-full bg-red-100 dark:bg-red-950 h-2 rounded-full overflow-hidden">
          <div className="bg-red-600 h-full w-full rounded-full" />
        </div>
      </div>
    );
  }

  // Scenario 3: All students ABSENT
  if (absent === total) {
    return (
      <div className="space-y-3 py-1">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-100">
                All {total} Students Absent
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                No students present for examination
              </p>
            </div>
          </div>
          <StatusBadge status="ABSENT" size="sm" />
        </div>
        <div className="w-full bg-amber-100 dark:bg-amber-950 h-2 rounded-full overflow-hidden">
          <div className="bg-amber-600 h-full w-full rounded-full" />
        </div>
      </div>
    );
  }

  // Scenario 5: Mixed student statuses (Render high-contrast, compact Donut chart with center label)
  const chartData = [
    { name: 'Passed', value: passed, color: '#16A34A' },
    { name: 'Failed', value: failed, color: '#DC2626' },
    { name: 'Absent', value: absent, color: '#D97706' },
    { name: 'Pending', value: pending, color: '#64748B' },
    { name: 'Invalid', value: invalid, color: '#7C3AED' },
  ].filter(item => item.value > 0);

  const passRate = total > 0 ? ((passed / (passed + failed + absent || 1)) * 100).toFixed(1) : '0';

  // Custom Tooltip with high-contrast text and crisp card styling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg shadow-elevated text-xs z-50 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
            <span className="font-semibold text-slate-900 dark:text-white">{data.name}:</span>
            <span className="font-bold font-mono text-slate-800 dark:text-slate-100">{data.value}</span>
            <span className="text-[11px] text-slate-400 font-medium">({percent}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Compact Chart Container */}
      <div className="relative w-full h-44 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={48}
              outerRadius={68}
              paddingAngle={chartData.length > 1 ? 3 : 0}
              dataKey="value"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label inside Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-tight">
            {passRate}%
          </span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Pass Rate
          </span>
        </div>
      </div>

      {/* Clean Compact Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-2 py-1 bg-slate-50 dark:bg-slate-800/40 rounded-md">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{item.name}</span>
            </div>
            <span className="font-mono font-bold text-slate-900 dark:text-white pl-1">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
