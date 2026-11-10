import React, { useState, useEffect } from 'react';
import { Sliders, Save, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import { AcademicConfig, SheetConnectionConfig } from '../../types/academic';

export const SettingsPage: React.FC = () => {
  const { syncState, syncNow, isSyncing, triggerRefresh } = useSync();
  const [academic, setAcademic] = useState<AcademicConfig | null>(null);
  const [connection, setConnection] = useState<SheetConnectionConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then((res) => {
      setAcademic(res.academic);
      setConnection(res.connection);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academic) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      await api.updateSettings({
        academic,
        connection: connection || undefined
      });
      setSavedSuccess(true);
      triggerRefresh();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearConnection = async () => {
    if (confirm('Are you sure you want to clear the connection configuration?')) {
      await api.deleteConnection();
      triggerRefresh();
      const res = await api.getSettings();
      setConnection(res.connection);
    }
  };

  if (!academic) {
    return (
      <div className="py-16 text-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-500">Loading platform settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Platform Configuration
        </h2>
        <p className="text-xs text-slate-500">
          Academic rules, pass/fail thresholds, and synchronization controls
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Academic Rules Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Academic Examination Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Passing Marks Threshold
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={academic.passingMarks}
                onChange={(e) => setAcademic({ ...academic, passingMarks: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Passing score (≥ 16 / 40)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Maximum Exam Marks
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={academic.maxMarks}
                onChange={(e) => setAcademic({ ...academic, maxMarks: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Maximum score (40)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Student Count
              </label>
              <input
                type="number"
                min="1"
                value={academic.totalExpectedStudents}
                onChange={(e) => setAcademic({ ...academic, totalExpectedStudents: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Class roster: 54</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Institution Name
              </label>
              <input
                type="text"
                value={academic.collegeName}
                onChange={(e) => setAcademic({ ...academic, collegeName: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department / Program
              </label>
              <input
                type="text"
                value={academic.departmentName}
                onChange={(e) => setAcademic({ ...academic, departmentName: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition shadow-xs touch-target-44 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>

          <button
            type="button"
            onClick={handleClearConnection}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition touch-target-44"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Connection</span>
          </button>
        </div>
      </form>
    </div>
  );
};
