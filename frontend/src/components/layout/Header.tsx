import React from 'react';
import { Menu, Sun, Moon, GraduationCap, Download } from 'lucide-react';
import { SyncIndicator } from '../shared/SyncIndicator';
import { useTheme } from '../../context/ThemeContext';
import { usePwa } from '../../context/PwaContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, title }) => {
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = usePwa();
  const navigate = useNavigate();

  return (
    <header
      className="fixed top-0 left-0 right-0 w-full z-[1000] lg:sticky lg:top-0 lg:left-auto lg:right-auto lg:w-auto lg:z-30 min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:min-h-0 lg:h-14 pt-[env(safe-area-inset-top,0px)] lg:pt-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between box-border transition-colors"
    >
      {/* Left: Mobile Drawer Trigger + Page Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden touch-target-44 flex items-center justify-center shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center lg:hidden shrink-0 shadow-xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {title || 'Dashboard'}
          </h1>
        </div>
      </div>

      {/* Right Actions: Sync Pill + PWA Install + Theme Toggle + Profile Pill */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Sync Indicator with direct Google Sheets status */}
        <SyncIndicator compact={true} />

        {/* PWA Install Button (Available on Chromium or iOS) */}
        {isInstallable && !isInstalled && (
          <button
            onClick={() => promptInstall()}
            title="Install Student Marks Analytics"
            className="px-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition touch-target-44 flex items-center justify-center gap-1.5 font-bold text-xs shadow-xs"
            aria-label="Install App"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition touch-target-44 flex items-center justify-center"
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings / Profile Pill */}
        <button
          onClick={() => navigate('/settings')}
          title="Platform Settings"
          className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 touch-target-44"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
            GM
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Lecturer
          </span>
        </button>
      </div>
    </header>
  );
};
