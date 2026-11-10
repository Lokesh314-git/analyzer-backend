import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Search, Download, ChevronRight, User } from 'lucide-react';
import { api } from '../../services/api';
import { Student, CatExam, SubjectCode, SUBJECT_CODES, CAT_EXAMS } from '../../types/academic';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useSync } from '../../context/SyncContext';

export const FailedStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey, triggerRefresh, isSyncing } = useSync();
  const [cat, setCat] = useState<CatExam>('CAT-1');
  const [subject, setSubject] = useState<SubjectCode | ''>('');
  const [search, setSearch] = useState('');
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    api.getFailedStudents({ cat })
      .then((res) => {
        if (isMounted) {
          setRawStudents(res.students || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load failed students', err);
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load failed students');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cat, refreshKey]);

  // Fast client-side filtering without re-fetching
  const students = useMemo(() => {
    let list = rawStudents;
    if (subject) {
      list = list.filter(s => s.catMarks[cat]?.subjects[subject]?.status === 'FAIL');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.registerNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rawStudents, subject, search, cat]);

  // Get failed subjects list for a student
  const getFailedSubjects = (st: Student) => {
    const subjMap = st.catMarks[cat]?.subjects || {};
    return Object.entries(subjMap)
      .filter(([_, data]) => data.status === 'FAIL')
      .map(([code]) => code);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-600">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Failed Students ({students.length})
            </h2>
            <p className="text-xs text-slate-500">
              Students scoring below 16 / 40 in one or more subjects
            </p>
          </div>
        </div>

        <a
          href={api.getExcelReportUrl(cat)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition self-start sm:self-auto shadow-xs touch-target-44"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </a>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search failed students..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* CAT Exam Pills */}
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            {CAT_EXAMS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all touch-target-44 ${
                  cat === c
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as SubjectCode | '')}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 font-medium touch-target-44"
          >
            <option value="">All Subjects</option>
            {SUBJECT_CODES.map((sc) => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading arrears...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">
            <p>{error}</p>
            <button
              onClick={triggerRefresh}
              disabled={isSyncing}
              className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center">
            <User className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No failed students in {cat}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All evaluated students passed their examinations.</p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((st) => {
                const failedSubjs = getFailedSubjects(st);
                return (
                  <div
                    key={st.id}
                    onClick={() => navigate(`/students/${st.id}`)}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 transition cursor-pointer touch-target-44 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {st.rollNumber} • {st.registerNumber}
                        </p>
                      </div>
                      <StatusBadge status="FAIL" size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-semibold">Arrears:</span>
                        <div className="flex flex-wrap gap-1">
                          {failedSubjs.map((sc) => (
                            <span key={sc} className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                              {sc}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-blue-600 text-xs font-semibold flex items-center">
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Roll No</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">Failed Subjects</th>
                    <th className="py-2.5 px-4 text-center">{cat} Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map((st) => {
                    const failedSubjs = getFailedSubjects(st);
                    return (
                      <tr
                        key={st.id}
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono text-slate-400">{st.slNo}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">{st.rollNumber}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{st.name}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {failedSubjs.map((sc) => (
                              <span key={sc} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                                {sc}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <StatusBadge status="FAIL" size="sm" />
                        </td>
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
          </>
        )}
      </div>
    </div>
  );
};
