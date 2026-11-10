import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface PerformanceTrendProps {
  data: Array<{
    exam: string;
    passed: number;
    failed: number;
    absent: number;
    pending: number;
    passPercentage: number;
  }>;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg shadow-elevated text-xs space-y-1 z-50">
        <p className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
          {label} Examination
        </p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const PerformanceTrendChart: React.FC<PerformanceTrendProps> = ({ data }) => {
  return (
    <div className="w-full h-52 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="exam"
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <Tooltip content={<CustomBarTooltip />} />
          <Legend
            verticalAlign="top"
            height={30}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {value}
              </span>
            )}
          />
          <Bar dataKey="passed" name="Passed" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="failed" name="Failed" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="absent" name="Absent" fill="#D97706" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
