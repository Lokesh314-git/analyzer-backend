import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  XCircle,
  UserX,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  ClipboardList,
  BookOpen
} from 'lucide-react';
import { MetricCard } from '../../components/shared/MetricCard';
import { SyncIndicator } from '../../components/shared/SyncIndicator';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { PerformanceTrendChart } from '../../components/charts/PerformanceTrendChart';
import { SubjectPassBarChart } from '../../components/charts/SubjectPassBarChart';
import { StatusDistributionPie } from '../../components/charts/StatusDistributionPie';
import { api } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import { CatExam, CAT_EXAMS } from '../../types/academic';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey, triggerRefresh, isSyncing } = useSync();
  const [activeCat, setActiveCat] = useState<CatExam>('CAT-1');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    api.getDashboard(activeCat)
      .then((res) => {
        if (isMounted) {
          setData(res.summary);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl lg:col-span-2" />
          <div className="h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900 text-center max-w-md mx-auto my-10 space-y-3">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto text-red-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Unable to Fetch Live Spreadsheet</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
        </div>
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

  const currentOverview = data?.catOverview?.[activeCat] || {
    total: 0,
    passed: 0,
    failed: 0,
    absent: 0,
    pending: 0,
    invalid: 0,
    passPercentage: 0
  };

  const isAllPending = currentOverview.pending === data?.totalStudents && currentOverview.passed === 0;

  return (
    <div className="space-y-5">
      {/* Compact Sync & Status Bar */}
      <SyncIndicator />

      {/* Header with CAT Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Semester Examination Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Performance overview for B.Sc CS (AI&ML) Semester V
          </p>
        </div>

        {/* Minimalist CAT Switcher */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          {CAT_EXAMS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all touch-target-44 flex items-center justify-center ${
                activeCat === cat
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards: 2 columns on mobile, 5 columns on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Total Students"
          value={data.totalStudents}
          subtitle="Enrolled class roster"
          icon={Users}
          variant="primary"
          onClick={() => navigate('/students')}
        />
        <MetricCard
          title="Passed"
          value={currentOverview.passed}
          badge={!isAllPending ? `${currentOverview.passPercentage}%` : undefined}
          subtitle={`All 5 subjects in ${activeCat}`}
          icon={CheckCircle2}
          variant="success"
          onClick={() => navigate('/students/passed')}
        />
        <MetricCard
          title="Failed"
          value={currentOverview.failed}
          subtitle={`Arrears in ${activeCat}`}
          icon={XCircle}
          variant="danger"
          onClick={() => navigate('/students/failed')}
        />
        <MetricCard
          title="Absent"
          value={currentOverview.absent}
          subtitle={`Absent in ${activeCat}`}
          icon={UserX}
          variant="warning"
          onClick={() => navigate('/students/absent')}
        />
        <MetricCard
          title="Pending"
          value={currentOverview.pending + currentOverview.invalid}
          subtitle="Pending marks entry"
          icon={Clock}
          variant="neutral"
          onClick={() => navigate('/connection')}
        />
      </div>

      {/* Charts Grid: Trends & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CAT Performance Trend across CAT-1, CAT-2, CAT-3 */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                CAT Examination Comparison
              </h3>
              <p className="text-[11px] text-slate-400">Student outcomes across internal examinations</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <PerformanceTrendChart data={data.overallComparison} />
        </div>

        {/* Selected CAT Performance Distribution (Handled elegantly when all pending) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {activeCat} Status Breakdown
              </h3>
              <p className="text-[11px] text-slate-400">Overall student evaluation outcomes</p>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {activeCat}
            </span>
          </div>
          <StatusDistributionPie overview={currentOverview} title={activeCat} />
        </div>
      </div>

      {/* Subject-Wise Pass Percentage Chart */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Subject-Wise Pass Percentage
            </h3>
            <p className="text-[11px] text-slate-400">Passing rates for all 5 subjects across CAT examinations</p>
          </div>
          <BookOpen className="w-4 h-4 text-slate-400" />
        </div>
        <SubjectPassBarChart data={data.subjectWisePassPercentage} />
      </div>

      {/* Continuous Submissions Overview: Separate Assessment & Assignment Tracking */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Continuous Submissions Overview
            </h3>
            <p className="text-[11px] text-slate-400">
              Tracking DL, GEN AI, RL, BA (RE&CCE is exam only)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/assessment')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-300 transition cursor-pointer touch-target-44 flex items-center gap-1"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Assessments</span>
            </button>
            <button
              onClick={() => navigate('/assignment')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300 transition cursor-pointer touch-target-44 flex items-center gap-1"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Assignments</span>
            </button>
          </div>
        </div>

        {/* 2 Dedicated Side-by-Side Cards: Assessment vs Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assessment Summary */}
          <div className="p-3.5 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Assessment Submissions
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                {data?.assessmentSummary?.complianceRate ?? 0}% Compliance
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Submitted</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                  {data?.assessmentSummary?.submittedCount ?? 0}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Pending</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                  {data?.assessmentSummary?.pendingCount ?? 0}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Zero / NS</span>
                <span className="font-bold font-mono text-red-600">
                  {(data?.assessmentSummary?.zeroMarksCount ?? 0) + (data?.assessmentSummary?.notSubmittedCount ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Summary */}
          <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Assignment Submissions
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {data?.assignmentSummary?.complianceRate ?? 0}% Compliance
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Submitted</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                  {data?.assignmentSummary?.submittedCount ?? 0}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Pending</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                  {data?.assignmentSummary?.pendingCount ?? 0}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Zero / NS</span>
                <span className="font-bold font-mono text-red-600">
                  {(data?.assignmentSummary?.zeroMarksCount ?? 0) + (data?.assignmentSummary?.notSubmittedCount ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Student Lists: Arrears & Submission Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Academic Arrears in active CAT */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Students Requiring Academic Attention ({activeCat})
            </h3>
            <button
              onClick={() => navigate('/students/failed')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 touch-target-44"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {(data?.attentionLists?.studentsNeedingAttention?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No students currently requiring attention in {activeCat}.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {(data?.attentionLists?.studentsNeedingAttention || []).map((st: any) => (
                <div
                  key={st.id}
                  onClick={() => navigate(`/students/${st.id}`)}
                  className="py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition touch-target-44"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{st.rollNumber}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                    {st.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission Issues */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Submission Alerts
            </h3>
            <button
              onClick={() => navigate('/assignment')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 touch-target-44"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {(data?.attentionLists?.submissionIssues?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No pending or missing submissions detected.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {(data?.attentionLists?.submissionIssues || []).slice(0, 6).map((sub: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/students/${sub.id}`)}
                  className="py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition touch-target-44"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{sub.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{sub.rollNumber} • {sub.subject}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {sub.type}
                    </span>
                    <StatusBadge status={sub.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
