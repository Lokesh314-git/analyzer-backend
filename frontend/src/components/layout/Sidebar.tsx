import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  CheckCircle2,
  XCircle,
  UserX,
  ClipboardList,
  FileCheck,
  FileDown,
  Link2,
  Settings,
  GraduationCap,
  Download,
  X
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
}

const navSections: Array<{ title?: string; items: NavItem[] }> = [
  {
    items: [
      { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { name: 'All Students', to: '/students', icon: Users },
      { name: 'Subjects', to: '/subjects', icon: BookOpen },
    ]
  },
  {
    title: 'EXAMINATIONS',
    items: [
      { name: 'CAT-1 Analytics', to: '/cat/1', icon: BarChart3 },
      { name: 'CAT-2 Analytics', to: '/cat/2', icon: BarChart3 },
      { name: 'CAT-3 Analytics', to: '/cat/3', icon: BarChart3 },
    ]
  },
  {
    title: 'STUDENT ROSTER',
    items: [
      { name: 'Passed Students', to: '/students/passed', icon: CheckCircle2 },
      { name: 'Failed Students', to: '/students/failed', icon: XCircle },
      { name: 'Absent Students', to: '/students/absent', icon: UserX },
    ]
  },
  {
    title: 'SUBMISSIONS',
    items: [
      { name: 'Assessments', to: '/assessment', icon: ClipboardList },
      { name: 'Assignments', to: '/assignment', icon: FileCheck },
    ]
  },
  {
    title: 'CONFIGURATION',
    items: [
      { name: 'Reports & Exports', to: '/reports', icon: FileDown },
      { name: 'Spreadsheet Link', to: '/connection', icon: Link2 },
      { name: 'Settings', to: '/settings', icon: Settings },
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, promptInstall } = usePwa();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[1050] bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-[1100] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:z-30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight block">
                MarksAnalytics
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium">
                B.Sc CS (AI&ML) Sem V
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden touch-target-44 flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-0.5">
              {sec.title && (
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  {sec.title}
                </p>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Quick Install App Link in Sidebar if Installable */}
          {isInstallable && !isInstalled && (
            <div className="pt-2 px-1">
              <button
                onClick={() => {
                  onClose();
                  promptInstall();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition touch-target-44 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Mobile App</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Production PWA</span>
          <span className="font-mono text-[10px] text-emerald-600 font-semibold">Live v3.0</span>
        </div>
      </aside>
    </>
  );
};
