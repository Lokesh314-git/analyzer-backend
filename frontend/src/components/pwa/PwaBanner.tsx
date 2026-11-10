import React, { useState } from 'react';
import { Download, RefreshCw, X, Sparkles } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const PwaBanner: React.FC = () => {
  const { isInstallable, isInstalled, updateAvailable, applyUpdate, promptInstall } = usePwa();
  const [dismissedInstall, setDismissedInstall] = useState(false);

  // 1. Update available banner has highest priority
  if (updateAvailable) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 sm:px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs z-[990]">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
          <span className="truncate">
            A new version of MarksAnalytics is ready.
          </span>
        </div>
        <button
          onClick={applyUpdate}
          className="px-2.5 py-1 bg-white text-blue-700 hover:bg-blue-50 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shrink-0 ml-2 shadow-xs cursor-pointer touch-target-44"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Update Now</span>
        </button>
      </div>
    );
  }

  // 2. Install App Banner (only if installable, not yet installed, and not dismissed this session)
  if (isInstallable && !isInstalled && !dismissedInstall) {
    return (
      <div className="bg-slate-900 text-white dark:bg-slate-800 dark:border-b dark:border-slate-700 px-3 sm:px-4 py-2 text-xs flex items-center justify-between shadow-xs z-[990]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Download className="w-3 h-3" />
          </div>
          <span className="truncate text-slate-200">
            Install <strong>Student Marks Analytics</strong> on your device for fast access.
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={() => promptInstall()}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer touch-target-44"
          >
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissedInstall(true)}
            className="p-1 text-slate-400 hover:text-white rounded-md transition touch-target-44 flex items-center justify-center"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

