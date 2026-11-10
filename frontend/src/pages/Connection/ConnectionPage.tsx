import React, { useState, useEffect } from 'react';
import {
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Code2,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import { SheetConnectionConfig, DataQualityIssue, SourceMethod } from '../../types/academic';

export const ConnectionPage: React.FC = () => {
  const { syncState, syncNow, isSyncing, refreshKey } = useSync();
  const [sourceMethod, setSourceMethod] = useState<SourceMethod>('public_csv');
  const [url, setUrl] = useState('');
  const [gid, setGid] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [appsScriptToken, setAppsScriptToken] = useState('');
  const [hasTokenConfigured, setHasTokenConfigured] = useState(false);
  const [confirmedSharing, setConfirmedSharing] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dataQuality, setDataQuality] = useState<{
    totalIssues: number;
    issues: DataQualityIssue[];
    warnings: string[];
  } | null>(null);
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);

  useEffect(() => {
    api.getConnection().then((res) => {
      if (res.connection) {
        setSourceMethod(res.connection.sourceMethod || 'public_csv');
        setUrl(res.connection.url || '');
        setGid(res.connection.gid || '');
        setAppsScriptUrl(res.connection.appsScriptUrl || '');
        setHasTokenConfigured(Boolean(res.connection.hasTokenConfigured));
        setConfirmedSharing(res.connection.confirmedApprovedSharing || false);
      }
    });

    api.getDataQuality().then((dq) => {
      setDataQuality(dq);
    });
  }, [refreshKey]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sourceMethod === 'public_csv') {
      if (!url.trim()) {
        setMessage({ type: 'error', text: 'Please enter a valid Google Sheets URL.' });
        return;
      }
    } else {
      if (!appsScriptUrl.trim()) {
        setMessage({ type: 'error', text: 'Please enter your Google Apps Script Web App URL.' });
        return;
      }
    }

    setConnecting(true);
    setMessage(null);

    try {
      const payload: Partial<SheetConnectionConfig> = {
        sourceMethod,
        url,
        gid: gid.trim() || undefined,
        appsScriptUrl: appsScriptUrl.trim() || undefined,
        confirmedApprovedSharing: confirmedSharing
      };

      if (sourceMethod === 'apps_script' && appsScriptToken.trim()) {
        payload.appsScriptToken = appsScriptToken.trim();
      }

      const res = await api.postConnection(payload);

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Spreadsheet connected and validated successfully.' });
        setHasTokenConfigured(Boolean(res.connection?.hasTokenConfigured));
      } else {
        setMessage({ type: 'error', text: res.message || 'Connection attempt failed. Please check spreadsheet sharing.' });
      }

      const dq = await api.getDataQuality();
      setDataQuality(dq);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to connect spreadsheet.'
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleResetConnection = async () => {
    if (!window.confirm('Are you sure you want to disconnect and clear the spreadsheet configuration?')) return;
    try {
      await api.deleteConnection();
      setUrl('');
      setGid('');
      setAppsScriptUrl('');
      setAppsScriptToken('');
      setHasTokenConfigured(false);
      setMessage({ type: 'success', text: 'Connection configuration reset successfully.' });
      const dq = await api.getDataQuality();
      setDataQuality(dq);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reset connection.' });
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Spreadsheet Connection
          </h2>
          <p className="text-xs text-slate-500">
            Connect live Google Sheets marksheet via direct URL or Apps Script bridge
          </p>
        </div>

        <button
          onClick={() => syncNow()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition self-start sm:self-auto shadow-xs touch-target-44 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Fetch Fresh Data</span>
        </button>
      </div>

      {/* Status Alert Banner if message exists */}
      {message && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Connection Method Selector Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Radio Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setSourceMethod('public_csv')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all touch-target-44 ${
              sourceMethod === 'public_csv'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Direct Google Sheet URL</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceMethod('apps_script')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all touch-target-44 ${
              sourceMethod === 'apps_script'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Apps Script Bridge (Private)</span>
          </button>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          {sourceMethod === 'public_csv' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Google Spreadsheet Web URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY/edit"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ensure the sheet is set to "Anyone with the link can view".
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sheet Tab ID (GID, optional)
                </label>
                <input
                  type="text"
                  value={gid}
                  onChange={(e) => setGid(e.target.value)}
                  placeholder="0"
                  className="w-32 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="confirmedSharing"
                  checked={confirmedSharing}
                  onChange={(e) => setConfirmedSharing(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="confirmedSharing" className="text-xs text-slate-600 dark:text-slate-400">
                  I confirm this spreadsheet contains verified semester academic examination marks.
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Apps Script Web App Deployment URL
                </label>
                <input
                  type="url"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Security Token (Bearer Authentication, optional)
                </label>
                <input
                  type="password"
                  value={appsScriptToken}
                  onChange={(e) => setAppsScriptToken(e.target.value)}
                  placeholder={hasTokenConfigured ? '•••••••••••••••• (configured)' : 'Optional security token'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Collapsible Apps Script Guide */}
              <button
                type="button"
                onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 pt-1 touch-target-44"
              >
                <span>{showAppsScriptGuide ? 'Hide' : 'Show'} Apps Script Bridge setup instructions</span>
                {showAppsScriptGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAppsScriptGuide && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-2 border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Deployment Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li>Open your Google Spreadsheet, click <strong>Extensions &gt; Apps Script</strong>.</li>
                    <li>Paste the bridge template code and click <strong>Deploy &gt; New deployment</strong>.</li>
                    <li>Choose <strong>Web app</strong>, execute as <em>Me</em>, who has access: <em>Anyone</em>.</li>
                    <li>Copy the Web App URL into the field above.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={connecting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition shadow-xs touch-target-44 disabled:opacity-50 cursor-pointer"
            >
              {connecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              <span>{connecting ? 'Validating Connection...' : 'Save & Verify Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetConnection}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition touch-target-44"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </div>

      {/* Data Quality & Validation Summary */}
      {dataQuality && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Data Quality & Column Mapping Diagnostics
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              dataQuality.totalIssues === 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
            }`}>
              {dataQuality.totalIssues} Issues Detected
            </span>
          </div>

          {dataQuality.totalIssues === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              All examination columns and student rows mapped cleanly with zero errors.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto text-xs">
              {dataQuality.issues.slice(0, 5).map((iss, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {iss.studentName || 'Row'}: {iss.field} ({iss.originalValue || 'blank'})
                  </span>
                  <span className={`font-semibold text-[10px] uppercase ${iss.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {iss.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
