import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  User,
  GraduationCap
} from 'lucide-react';
import { api } from '../../services/api';
import {
  Student,
  SUBJECT_CODES,
  SUBJECT_NAMES,
  CAT_EXAMS,
  CAT_INTERNAL_MAP,
  CatExam,
  SubjectCode
} from '../../types/academic';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useSync } from '../../context/SyncContext';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshKey } = useSync();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CatExam>('CAT-1');
  const [expandedMobileSubjects, setExpandedMobileSubjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    if (!id) return;
    setLoading(true);
    api.getStudentById(id)
      .then((res) => {
        if (isMounted) {
          setStudent(res.student);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Student not found');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, refreshKey]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-500">Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center max-w-md mx-auto my-12 space-y-3">
        <p className="text-sm font-bold">Student Record Not Found</p>
        <p className="text-xs">{error || `No record matching ID ${id}`}</p>
        <button
          onClick={() => navigate('/students')}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold"
        >
          Back to Students
        </button>
      </div>
    );
  }

  // Get Subject Full Record for a given CAT and Subject
  const getSubjectRecord = (cat: CatExam, subj: SubjectCode) => {
    if (cat === 'CAT-1' && student.cat1?.[subj]) return student.cat1[subj];
    if (cat === 'CAT-2' && student.cat2?.[subj]) return student.cat2[subj];
    if (cat === 'CAT-3' && student.cat3?.[subj]) return student.cat3[subj];

    const catData = student.catMarks?.[cat];
    if (catData?.subjects?.[subj]) return catData.subjects[subj];

    return null;
  };

  const toggleMobileSubject = (sc: string) => {
    setExpandedMobileSubjects(prev => ({
      ...prev,
      [sc]: !prev[sc]
    }));
  };

  const renderComponentValue = (
    subj: SubjectCode,
    comp?: { rawValue?: string | number | null; status?: string; isApplicable?: boolean }
  ) => {
    if (subj === 'RE&CCE' || comp?.status === 'NOT_APPLICABLE') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          N/A
        </span>
      );
    }

    if (comp?.status === 'NOT CONFIGURED') {
      return <StatusBadge status="NOT CONFIGURED" size="sm" />;
    }

    if (!comp) {
      return <span className="text-slate-400 font-mono">-</span>;
    }

    const raw = comp.rawValue;
    const isBlank = raw === '' || raw === null || raw === undefined;

    return (
      <div className="inline-flex items-center gap-1.5">
        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
          {isBlank ? (comp.status === 'PENDING' ? 'PENDING' : '-') : String(raw)}
        </span>
        <StatusBadge status={comp.status as any} size="sm" />
      </div>
    );
  };

  const catPerf = student.catMarks?.[activeTab];
  const internalLabel = CAT_INTERNAL_MAP[activeTab] || activeTab;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/students')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition touch-target-44"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Student Directory</span>
      </button>

      {/* Student Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {student.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                <span>Roll: {student.rollNumber}</span>
                <span>•</span>
                <span>Reg: {student.registerNumber}</span>
              </div>
            </div>
          </div>

          {/* Quick Overall Status Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
            {CAT_EXAMS.map(c => (
              <div key={c} className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 font-semibold">{c}:</span>
                <StatusBadge status={student.catMarks[c]?.overallStatus} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3 CAT Tabs Switcher */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-2">
        {CAT_EXAMS.map((cat) => {
          const isSelected = activeTab === cat;
          const status = student.catMarks[cat]?.overallStatus;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-2 py-2 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all touch-target-44 cursor-pointer ${
                isSelected
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{cat} ({CAT_INTERNAL_MAP[cat]})</span>
              <StatusBadge status={status} size="sm" showDot={false} />
            </button>
          );
        })}
      </div>

      {/* CAT Subject Marks Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Table/Card Header */}
        <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {activeTab} Examination Marks & Components
            </h3>
            <p className="text-[11px] text-slate-400">
              Exam Pass Threshold: ≥ 16 / 40 • RE&CCE is Exam Only
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Overall:</span>
            <StatusBadge status={catPerf?.overallStatus} size="md" />
          </div>
        </div>

        {/* Desktop 5-Column Table (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4 text-center">Exam Mark / 40</th>
                <th className="py-2.5 px-4 text-center">Exam Status</th>
                <th className="py-2.5 px-4 text-center">Assessment</th>
                <th className="py-2.5 px-4 text-center">Assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {SUBJECT_CODES.map((sc) => {
                const rec = getSubjectRecord(activeTab, sc);
                const examDisplay = rec?.examRaw !== undefined && rec?.examRaw !== null && rec?.examRaw !== ''
                  ? String(rec.examRaw)
                  : rec?.raw !== undefined && rec?.raw !== null && rec?.raw !== ''
                  ? String(rec.raw)
                  : '-';
                const examStatus = rec?.examStatus || rec?.status;

                return (
                  <tr key={sc} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Subject */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>
                        <span className="font-bold">{sc}</span>
                        <span className="block text-[11px] font-normal text-slate-400">
                          {SUBJECT_NAMES[sc]}
                        </span>
                      </div>
                    </td>

                    {/* Exam Mark / 40 */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {examDisplay}
                    </td>

                    {/* Exam Status */}
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={examStatus} size="sm" />
                    </td>

                    {/* Assessment Mark */}
                    <td className="py-3 px-4 text-center">
                      {renderComponentValue(sc, rec?.assessment)}
                    </td>

                    {/* Assignment Mark */}
                    <td className="py-3 px-4 text-center">
                      {renderComponentValue(sc, rec?.assignment)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Compact Expandable Subject Cards (Hidden on md and up) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {SUBJECT_CODES.map((sc) => {
            const rec = getSubjectRecord(activeTab, sc);
            const examDisplay = rec?.examRaw !== undefined && rec?.examRaw !== null && rec?.examRaw !== ''
              ? String(rec.examRaw)
              : rec?.raw !== undefined && rec?.raw !== null && rec?.raw !== ''
              ? String(rec.raw)
              : '-';
            const examStatus = rec?.examStatus || rec?.status;
            const isExpanded = expandedMobileSubjects[sc] ?? true; // Default open for quick review

            return (
              <div key={sc} className="p-3.5 space-y-2.5">
                {/* Subject Header */}
                <div
                  onClick={() => toggleMobileSubject(sc)}
                  className="flex items-center justify-between cursor-pointer touch-target-44"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{sc}</span>
                    <span className="block text-[11px] text-slate-400">{SUBJECT_NAMES[sc]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {examDisplay} / 40
                    </span>
                    <StatusBadge status={examStatus} size="sm" />
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </div>

                {/* Sub-components if expanded */}
                {isExpanded && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg">
                    {/* Assessment */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Assessment:</span>
                      {renderComponentValue(sc, rec?.assessment)}
                    </div>
                    {/* Assignment */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Assignment:</span>
                      {renderComponentValue(sc, rec?.assignment)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
