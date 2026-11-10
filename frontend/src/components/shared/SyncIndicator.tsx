import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Link2 } from 'lucide-react';
import { useSync } from '../../context/SyncContext';

interface SyncIndicatorProps {
  compact?: boolean;
  className?: string;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ compact = false, className = '' }) => {
  const { syncState, isSyncing, syncNow } = useSync();

  const getStatusColor = () => {
    if (isSyncing) return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800';
    if (!syncState) return 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

    switch (syncState.status) {
      case 'connected':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'access_denied':
        return 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getStatusLabel = () => {
    if (isSyncing) return 'Fetching live data...';
    if (!syncState) return 'Ready';
    switch (syncState.status) {
      case 'connected':
        return 'Live Connected';
      case 'access_denied':
        return 'Access Restricted';
      case 'error':
        return 'Connection Error';
      default:
        return 'Idle';
    }
  };

  const formatLastSync = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => syncNow()}
          disabled={isSyncing}
          title={`Status: ${getStatusLabel()} | Last: ${formatLastSync(syncState?.lastSuccessfulSync)}`}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer touch-target-44 ${getStatusColor()} ${
            isSyncing ? 'opacity-80' : 'hover:opacity-90 active:scale-95'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline font-semibold">{getStatusLabel()}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${getStatusColor()}`}>
          <span className={`w-2 h-2 rounded-full ${syncState?.status === 'connected' ? 'bg-emerald-500' : isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} />
          <span>{getStatusLabel()}</span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Last fetch: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatLastSync(syncState?.lastSuccessfulSync)}</strong>
          {syncState?.totalStudentsLoaded ? (
            <span className="hidden sm:inline"> • {syncState.totalStudentsLoaded} students validated</span>
          ) : null}
        </div>
      </div>

      <button
        onClick={() => syncNow()}
        disabled={isSyncing}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>Sync Now</span>
      </button>
    </div>
  );
};
