import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserX,
  Clock,
  Search,
  ChevronRight,
  ClipboardList,
  FileCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/shared/MetricCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import {
  CatExam,
  CAT_EXAMS,
  CAT_INTERNAL_MAP
} from '../../types/academic';
import { useSync } from '../../context/SyncContext';

export const SubjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshKey } = useSync();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<CatExam>('CAT-1');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    if (!id) return;
    setLoading(true);
    api.getSubjectById(id)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load subject details', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, refreshKey]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-500">Loading subject analytics...</p>
      </div>
    );
  }

  if (!data || !data.analytics) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl text-center max-w-md mx-auto my-12">
        <p className="font-semibold text-sm">Subject not found</p>
        <button onClick={() => navigate('/subjects')} className="mt-3 text-xs underline font-bold">Back to subjects</button>
      </div>
    );
  }

  const { analytics, studentResults } = data;
  const isAssessmentApplicable = analytics.isAssessmentApplicable ?? (analytics.subjectCode !== 'RE&CCE');
  const currentCatStats = analytics.catStats?.[selectedCat] || {};
  const currentAssessStats = currentCatStats?.assessment;
  const currentAssignStats = currentCatStats?.assignment;

  // Filter students
  const filteredStudents = (studentResults || []).filter((st: any) => {
    const catField = selectedCat === 'CAT-1' ? 'cat1' : selectedCat === 'CAT-2' ? 'cat2' : 'cat3';
    const markData = st[catField];
    const markStatus = markData?.examStatus || markData?.status;

    if (statusFilter !== 'ALL' && markStatus !== statusFilter) {
      return false;
    }
    if (search.trim() !== '') {
      const q = search.trim().toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        st.rollNumber.toLowerCase().includes(q) ||
        (st.registerNumber && st.registerNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/subjects')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition touch-target-44"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Subjects</span>
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {analytics.subjectCode}
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {analytics.subjectName}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Passing threshold: ≥ 16 / 40
            {!isAssessmentApplicable && ' • Exam Only (No Assessments or Assignments)'}
          </p>
        </div>

        {/* CAT Selector */}
        <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          {CAT_EXAMS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all touch-target-44 ${
                selectedCat === cat
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Passed"
          value={currentCatStats.passCount ?? 0}
          badge={`${currentCatStats.passPercentage ?? 0}%`}
          subtitle={`Passed in ${selectedCat}`}
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          title="Failed"
          value={currentCatStats.failCount ?? 0}
          subtitle={`Arrears in ${selectedCat}`}
          icon={XCircle}
          variant="danger"
        />
        <MetricCard
          title="Absent"
          value={currentCatStats.absentCount ?? 0}
          subtitle={`Absent in ${selectedCat}`}
          icon={UserX}
          variant="warning"
        />
        <MetricCard
          title="Pending"
          value={(currentCatStats.pendingCount ?? 0) + (currentCatStats.invalidCount ?? 0)}
          subtitle="Pending marks entry"
          icon={Clock}
          variant="neutral"
        />
      </div>

      {/* Assessment and Assignment Component Performance */}
      {isAssessmentApplicable && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Assessment */}
          <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
              <span className="flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                {selectedCat} Assessment
              </span>
              <span className="font-mono">{currentAssessStats?.complianceRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Submitted: <strong>{currentAssessStats?.submittedCount ?? 0}</strong></span>
              <span>Pending: <strong>{currentAssessStats?.pendingCount ?? 0}</strong></span>
              <span>Zero/NS: <strong>{(currentAssessStats?.zeroMarksCount ?? 0) + (currentAssessStats?.notSubmittedCount ?? 0)}</strong></span>
            </div>
          </div>

          {/* Assignment */}
          <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                {selectedCat} Assignment
              </span>
              <span className="font-mono">{currentAssignStats?.complianceRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Submitted: <strong>{currentAssignStats?.submittedCount ?? 0}</strong></span>
              <span>Pending: <strong>{currentAssignStats?.pendingCount ?? 0}</strong></span>
              <span>Zero/NS: <strong>{(currentAssignStats?.zeroMarksCount ?? 0) + (currentAssignStats?.notSubmittedCount ?? 0)}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Student Marks List for this Subject */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student in this subject..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 font-medium touch-target-44"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="ABSENT">ABSENT</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredStudents.map((st: any) => {
            const catField = selectedCat === 'CAT-1' ? 'cat1' : selectedCat === 'CAT-2' ? 'cat2' : 'cat3';
            const markData = st[catField];
            const examRaw = markData?.examRaw ?? markData?.raw;
            const examStatus = markData?.examStatus ?? markData?.status;

            return (
              <div
                key={st.id}
                onClick={() => navigate(`/students/${st.id}`)}
                className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 transition cursor-pointer touch-target-44 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{st.rollNumber}</p>
                  </div>
                  <StatusBadge status={examStatus} size="sm" />
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    Exam: {examRaw !== '' && examRaw !== null && examRaw !== undefined ? `${examRaw} / 40` : '-'}
                  </span>
                  <span className="text-blue-600 font-semibold flex items-center">
                    Profile <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-4">Roll No</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4 text-center">Exam Mark / 40</th>
                <th className="py-2.5 px-4 text-center">Exam Status</th>
                {isAssessmentApplicable && (
                  <>
                    <th className="py-2.5 px-4 text-center">Assessment</th>
                    <th className="py-2.5 px-4 text-center">Assignment</th>
                  </>
                )}
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((st: any) => {
                const catField = selectedCat === 'CAT-1' ? 'cat1' : selectedCat === 'CAT-2' ? 'cat2' : 'cat3';
                const markData = st[catField];
                const examRaw = markData?.examRaw ?? markData?.raw;
                const examStatus = markData?.examStatus ?? markData?.status;

                return (
                  <tr
                    key={st.id}
                    onClick={() => navigate(`/students/${st.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">{st.rollNumber}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{st.name}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {examRaw !== '' && examRaw !== null && examRaw !== undefined ? String(examRaw) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <StatusBadge status={examStatus} size="sm" />
                    </td>
                    {isAssessmentApplicable && (
                      <>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {markData?.assessment?.rawValue !== '' && markData?.assessment?.rawValue !== null && markData?.assessment?.rawValue !== undefined
                            ? String(markData.assessment.rawValue)
                            : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {markData?.assignment?.rawValue !== '' && markData?.assignment?.rawValue !== null && markData?.assignment?.rawValue !== undefined
                            ? String(markData.assignment.rawValue)
                            : '-'}
                        </td>
                      </>
                    )}
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700">
                        Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
