import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, XCircle, UserX, Clock, ArrowRight, Download, Users } from 'lucide-react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/shared/MetricCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { CatExam, CAT_INTERNAL_MAP, SUBJECT_CODES, SUBJECT_NAMES } from '../../types/academic';
import { useSync } from '../../context/SyncContext';

export const CatAnalyticsPage: React.FC = () => {
  const { catNum } = useParams<{ catNum: string }>();
  const navigate = useNavigate();
  const { refreshKey, triggerRefresh, isSyncing } = useSync();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeCat: CatExam = `CAT-${catNum || '1'}` as CatExam;
  const internalExam = CAT_INTERNAL_MAP[activeCat] || `Internal-${catNum || 'I'}`;

  useEffect(() => {
    let isMounted = true;
    if (!catNum) return;
    setLoading(true);
    setError(null);
    api.getCatAnalytics(catNum)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load CAT analytics', err);
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load examination analytics');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [catNum, refreshKey]);

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-48 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
          <div className="h-48 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900 text-center max-w-md mx-auto my-12 space-y-3">
        <h3 className="text-sm font-bold">Unable to Load {activeCat} Live Analytics</h3>
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={triggerRefresh}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition cursor-pointer touch-target-44"
        >
          <span>Retry Live Fetch</span>
        </button>
      </div>
    );
  }

  const { summary, subjectWisePassRate, subjectWiseFailCount, studentsNeedingAttention, absentStudents } = data;
  const isAllPending = summary.pending === summary.total && summary.passed === 0;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeCat} / {internalExam} Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Passing threshold: ≥ 16 / 40 • 5 Subjects evaluated
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href={api.getPdfReportUrl(activeCat)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-xs touch-target-44"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF Report</span>
          </a>
          <a
            href={api.getExcelReportUrl(activeCat)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs touch-target-44"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel Marksheet</span>
          </a>
        </div>
      </div>

      {/* KPI Cards: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Passed Overall"
          value={summary.passed}
          badge={!isAllPending ? `${summary.passPercentage}%` : undefined}
          subtitle="Passed all 5 subjects"
          icon={CheckCircle2}
          variant="success"
          onClick={() => navigate('/students/passed')}
        />
        <MetricCard
          title="Failed Overall"
          value={summary.failed}
          subtitle="Failed ≥ 1 subject"
          icon={XCircle}
          variant="danger"
          onClick={() => navigate('/students/failed')}
        />
        <MetricCard
          title="Absent"
          value={summary.absent}
          subtitle="Absent mark"
          icon={UserX}
          variant="warning"
          onClick={() => navigate('/students/absent')}
        />
        <MetricCard
          title="Pending"
          value={summary.pending + summary.invalid}
          subtitle="Pending entry"
          icon={Clock}
          variant="neutral"
        />
      </div>

      {/* Subject-Wise Pass & Fail Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pass Rates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Subject Pass Percentage
          </h3>
          <div className="space-y-2.5">
            {subjectWisePassRate.map((s: any) => (
              <div key={s.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">{s.subject} ({s.subjectName})</span>
                  <span className="text-blue-600 font-bold font-mono">{s.passRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${s.passRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Failed Counts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Subject Arrear Breakdown
          </h3>
          <div className="space-y-2">
            {subjectWiseFailCount.map((s: any) => (
              <div key={s.subject} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{s.subject}</span>
                  <span className="text-slate-400 block text-[11px]">{s.subjectName}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  s.failCount > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                }`}>
                  {s.failCount} Failed
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Student Lists in this CAT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Failed students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Academic Support Needed ({studentsNeedingAttention.length})
            </h3>
            <button
              onClick={() => navigate('/students/failed')}
              className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 touch-target-44"
            >
              View table <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {studentsNeedingAttention.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No students requiring academic support in {activeCat}.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {studentsNeedingAttention.map((st: any) => (
                <div
                  key={st.id}
                  onClick={() => navigate(`/students/${st.id}`)}
                  className="py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition text-xs touch-target-44"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                    <span className="text-slate-400 block text-[11px] font-mono">{st.rollNumber}</span>
                  </div>
                  <span className="font-semibold text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded text-[11px]">
                    {st.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Absent students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Absent Students ({absentStudents.length})
            </h3>
            <button
              onClick={() => navigate('/students/absent')}
              className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 touch-target-44"
            >
              View table <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {absentStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No absent students recorded in {activeCat}.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {absentStudents.map((st: any) => (
                <div
                  key={st.id}
                  onClick={() => navigate(`/students/${st.id}`)}
                  className="py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition text-xs touch-target-44"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                    <span className="text-slate-400 block text-[11px] font-mono">{st.rollNumber}</span>
                  </div>
                  <span className="font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded text-[11px]">
                    {st.subject}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
