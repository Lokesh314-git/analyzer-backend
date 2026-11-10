import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Search,
  Download,
  ChevronRight,
  User
} from 'lucide-react';
import { api } from '../../services/api';
import { MetricCard } from '../../components/shared/MetricCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import {
  SubjectCode,
  APPLICABLE_ASSESSMENT_SUBJECTS,
  SUBJECT_NAMES,
  CatExam
} from '../../types/academic';
import { useSync } from '../../context/SyncContext';

export const AssignmentTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey } = useSync();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>('CAT-1');
  const [subject, setSubject] = useState<SubjectCode | ''>('');
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getAssignmentIssues({
      cat: cat !== 'ALL' ? (cat as CatExam) : 'ALL',
      subject: subject || undefined,
      status: status !== 'ALL' ? status : undefined,
      search
    })
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load assignment tracking', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cat, subject, status, search, refreshKey]);

  const stats = data?.stats || {
    totalTracked: 0,
    totalConfigured: 0,
    submittedCount: 0,
    notSubmittedCount: 0,
    zeroMarksCount: 0,
    pendingCount: 0,
    invalidCount: 0,
    complianceRate: 0
  };

  const items = data?.items || [];

  const renderScore = (item: any) => {
    if (item.status === 'NOT_APPLICABLE' || item.subject === 'RE&CCE') return 'N/A';
    if (item.status === 'NOT CONFIGURED') return 'N/A';
    if (item.numericMark !== null && item.numericMark !== undefined) return item.numericMark;
    if (item.assignmentMark !== null && item.assignmentMark !== undefined && item.assignmentMark !== '') return item.assignmentMark;
    if (item.score !== null && item.score !== undefined && item.score !== '') return item.score;
    if (item.rawMark !== null && item.rawMark !== undefined && item.rawMark !== '') return item.rawMark;
    if (item.rawValue !== null && item.rawValue !== undefined && item.rawValue !== '') return item.rawValue;
    return '-';
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Assignment Tracking ({items.length})
            </h2>
            <p className="text-xs text-slate-500">
              Tracking DL, GEN AI, RL, BA (RE&CCE is exam only)
            </p>
          </div>
        </div>

        <a
          href={api.getExcelReportUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition self-start sm:self-auto shadow-xs touch-target-44"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </a>
      </div>

      {/* Summary KPI Cards: 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Compliance Rate"
          value={`${stats.complianceRate}%`}
          subtitle="Submitted & marked"
          icon={FileCheck}
          variant="primary"
        />
        <MetricCard
          title="Submitted"
          value={stats.submittedCount}
          subtitle="Valid score recorded"
          icon={FileCheck}
          variant="success"
        />
        <MetricCard
          title="Pending"
          value={stats.pendingCount}
          subtitle="Awaiting entry"
          icon={FileCheck}
          variant="neutral"
        />
        <MetricCard
          title="Zero / Not Submitted"
          value={stats.zeroMarksCount + stats.notSubmittedCount}
          subtitle="Explicit NS or 0"
          icon={FileCheck}
          variant="danger"
        />
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name or roll number..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CAT Filter */}
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 font-medium touch-target-44"
          >
            <option value="CAT-1">CAT-1</option>
            <option value="CAT-2">CAT-2</option>
            <option value="CAT-3">CAT-3</option>
            <option value="ALL">All CATs</option>
          </select>

          {/* Subject Filter */}
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as SubjectCode | '')}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 font-medium touch-target-44"
          >
            <option value="">All 4 Subjects</option>
            {APPLICABLE_ASSESSMENT_SUBJECTS.map((sc) => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 font-medium touch-target-44"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PENDING">Pending</option>
            <option value="ZERO">Zero Marks</option>
            <option value="NOT_SUBMITTED">Not Submitted (NS)</option>
          </select>
        </div>
      </div>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading assignment records...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <User className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/students/${item.studentId}`)}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 transition cursor-pointer touch-target-44 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.studentName || item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        Roll: {item.rollNo || item.rollNumber} • Reg: {item.registerNo || item.registerNumber}
                      </p>
                    </div>
                    <StatusBadge status={item.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.cat} • {item.subject}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      Score: {renderScore(item)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-4">Roll No</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">Register No</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">CAT</th>
                    <th className="py-2.5 px-4 text-center">Score</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item: any) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/students/${item.studentId}`)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {item.rollNo || item.rollNumber}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {item.studentName || item.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                        {item.registerNo || item.registerNumber}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{item.subject}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{item.cat}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {renderScore(item)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700">
                          Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
