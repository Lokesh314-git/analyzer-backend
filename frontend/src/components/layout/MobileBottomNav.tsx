import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileDown,
  Settings,
  Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const location = useLocation();

  const isAnalyticsActive = location.pathname.startsWith('/cat/');
  const isStudentsActive = location.pathname.startsWith('/students');

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-elevated"
      style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
        {/* 1. Home */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors touch-target-44 ${
              isActive || location.pathname === '/'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Home</span>
        </NavLink>

        {/* 2. Students */}
        <NavLink
          to="/students"
          className={() =>
            `flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors touch-target-44 ${
              isStudentsActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Students</span>
        </NavLink>

        {/* 3. Analytics */}
        <NavLink
          to="/cat/1"
          className={() =>
            `flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors touch-target-44 ${
              isAnalyticsActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`
          }
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Analytics</span>
        </NavLink>

        {/* 4. Reports */}
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors touch-target-44 ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`
          }
        >
          <FileDown className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Reports</span>
        </NavLink>

        {/* 5. Menu / More */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors touch-target-44"
          aria-label="Open More Menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
};

