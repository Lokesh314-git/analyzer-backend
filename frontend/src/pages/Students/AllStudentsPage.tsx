import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, ArrowUpDown, ChevronRight, User } from 'lucide-react';
import { api } from '../../services/api';
import { Student, CatExam } from '../../types/academic';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useSync } from '../../context/SyncContext';

export const AllStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey } = useSync();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CatExam>('CAT-1');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'slNo' | 'name' | 'rollNumber'>('slNo');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getStudents({ cat: catFilter, status: statusFilter !== 'ALL' ? statusFilter : undefined, search })
      .then((res) => {
        if (isMounted) {
          setStudents(res.students || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load students', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [catFilter, statusFilter, search, refreshKey]);

  // Client-side sorting
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'slNo') cmp = a.slNo - b.slNo;
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'rollNumber') cmp = a.rollNumber.localeCompare(b.rollNumber);
      return sortAsc ? cmp : -cmp;
    });
  }, [students, sortField, sortAsc]);

  const handleSort = (field: 'slNo' | 'name' | 'rollNumber') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Directory ({students.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official class roster & examination results across B.Sc CS (AI&ML)
          </p>
        </div>

        {/* Export Excel Button */}
        <a
          href={api.getExcelReportUrl(catFilter)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition self-start sm:self-auto shadow-xs touch-target-44"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </a>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, roll no, register no..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          {/* CAT Exam Filter */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as CatExam)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-blue-500 touch-target-44"
          >
            <option value="CAT-1">CAT-1</option>
            <option value="CAT-2">CAT-2</option>
            <option value="CAT-3">CAT-3</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-blue-500 touch-target-44"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="ABSENT">ABSENT</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
      </div>

      {/* Main Content: Table on Desktop (md:), Cards on Mobile (< md) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading student directory...</p>
          </div>
        ) : sortedStudents.length === 0 ? (
          <div className="py-12 text-center">
            <User className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No students found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search query or filters.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Compact Cards (Hidden on md and up) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sortedStudents.map((st) => (
                <div
                  key={st.id}
                  onClick={() => navigate(`/students/${st.id}`)}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 transition cursor-pointer touch-target-44 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {st.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        <span>{st.rollNumber}</span>
                        <span>•</span>
                        <span>{st.registerNumber}</span>
                      </div>
                    </div>
                    <span className="text-blue-600 text-xs font-semibold flex items-center shrink-0">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Status Pills across examinations */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-semibold">C1:</span>
                      <StatusBadge status={st.catMarks['CAT-1']?.overallStatus} size="sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-semibold">C2:</span>
                      <StatusBadge status={st.catMarks['CAT-2']?.overallStatus} size="sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-semibold">C3:</span>
                      <StatusBadge status={st.catMarks['CAT-3']?.overallStatus} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Clean Data Table (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th
                      onClick={() => handleSort('slNo')}
                      className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>#</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('rollNumber')}
                      className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Roll No</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Student Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-4">Register No</th>
                    <th className="py-2.5 px-4 text-center">CAT-1</th>
                    <th className="py-2.5 px-4 text-center">CAT-2</th>
                    <th className="py-2.5 px-4 text-center">CAT-3</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedStudents.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => navigate(`/students/${st.id}`)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-400">{st.slNo}</td>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {st.rollNumber}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {st.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {st.registerNumber}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={st.catMarks['CAT-1']?.overallStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={st.catMarks['CAT-2']?.overallStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={st.catMarks['CAT-3']?.overallStatus} size="sm" />
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
