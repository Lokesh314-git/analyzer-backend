import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { useSync } from '../../context/SyncContext';

export const SubjectsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey } = useSync();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getSubjects()
      .then((res) => {
        if (isMounted) {
          setSubjects(res.subjects || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load subjects', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-500">Loading subject performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Subjects Overview ({subjects.length})
        </h2>
        <p className="text-xs text-slate-500">
          Curriculum subject performance across B.Sc CS (AI&ML)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((sub: any) => {
          const c1 = sub.catStats['CAT-1'];
          const c2 = sub.catStats['CAT-2'];
          const c3 = sub.catStats['CAT-3'];

          return (
            <div
              key={sub.subjectCode}
              onClick={() => navigate(`/subjects/${sub.subjectCode}`)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-subtle cursor-pointer transition-all duration-150 flex flex-col justify-between space-y-3 touch-target-44"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs">
                    {sub.subjectCode}
                  </span>
                  <span className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {sub.subjectName}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  54 Students Evaluated
                </p>
              </div>

              {/* CAT Pass Rates Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">CAT-1</span>
                  <span className="font-mono font-bold text-xs text-blue-600">
                    {c1?.passRate}%
                  </span>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">CAT-2</span>
                  <span className="font-mono font-bold text-xs text-blue-600">
                    {c2?.passRate}%
                  </span>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">CAT-3</span>
                  <span className="font-mono font-bold text-xs text-slate-400">
                    {c3?.totalPassed > 0 ? `${c3?.passRate}%` : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
