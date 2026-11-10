import React from 'react';
import { X, Share, PlusSquare, CheckCircle, Smartphone } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const IosInstallGuideModal: React.FC = () => {
  const { showIosGuide, setShowIosGuide } = usePwa();

  if (!showIosGuide) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 id="ios-install-title" className="text-base font-bold text-slate-900 dark:text-white">
                Install on iPhone / iPad
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add to your home screen for a fast, full-screen experience.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowIosGuide(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 touch-target-44 flex items-center justify-center"
            aria-label="Close installation instructions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Steps */}
        <div className="space-y-3 pt-2">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
              1
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Tap the Share button</span>
                <Share className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Located in Safari's bottom navigation bar (or top toolbar on iPad).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
              2
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Select &quot;Add to Home Screen&quot;</span>
                <PlusSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Scroll down the share sheet and tap the &quot;Add to Home Screen&quot; action.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
              3
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Confirm &quot;Add&quot;</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Tap &quot;Add&quot; in the top-right corner to launch directly from your home screen.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note & Close Button */}
        <div className="pt-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Note: Student academic data is never stored locally and requires live connectivity.
          </p>
          <button
            onClick={() => setShowIosGuide(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs touch-target-44 flex items-center justify-center"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

