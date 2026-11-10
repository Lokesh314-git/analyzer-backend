import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { PwaBanner } from '../pwa/PwaBanner';
import { IosInstallGuideModal } from '../pwa/IosInstallGuideModal';
import { useSync } from '../../context/SyncContext';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/students': 'Student Directory',
  '/students/passed': 'Passed Students',
  '/students/failed': 'Failed Students & Arrears',
  '/students/absent': 'Absent Students',
  '/subjects': 'Subjects Overview',
  '/cat/1': 'CAT-1 Analytics',
  '/cat/2': 'CAT-2 Analytics',
  '/cat/3': 'CAT-3 Analytics',
  '/assessment': 'Assessment Tracking',
  '/assignment': 'Assignment Tracking',
  '/reports': 'Reports & Exports',
  '/connection': 'Spreadsheet Link',
  '/settings': 'Platform Settings',
};

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();
  const { syncState, syncNow, isSyncing } = useSync();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPageTitle = (): string => {
    if (location.pathname.startsWith('/students/') && location.pathname !== '/students/passed' && location.pathname !== '/students/failed' && location.pathname !== '/students/absent') {
      return 'Student Profile';
    }
    if (location.pathname.startsWith('/subjects/') && location.pathname !== '/subjects') {
      return 'Subject Detail';
    }
    return routeTitles[location.pathname] || 'Academic Analytics';
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex transition-colors overflow-x-hidden max-w-full">
      {/* Sidebar Navigation (Desktop + Slide-over Drawer on Mobile) */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 max-w-full overflow-x-hidden">
        {/* Compact Top Header (Permanently fixed at top on mobile, sticky on desktop) */}
        <Header
          title={getPageTitle()}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Content Wrapper: padded top on mobile so content begins cleanly below the fixed header */}
        <div className="flex-1 flex flex-col pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:pt-0 min-w-0">
          {/* PWA Install / Update Notification Banner */}
          <PwaBanner />

          {/* Offline Shell Notification Banner */}
          {isOffline && (
            <div className="bg-amber-600 text-white px-3 sm:px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs z-[990]">
              <div className="flex items-center gap-2 min-w-0">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <strong>Offline Mode:</strong> Application shell is active. Live student marks require an internet connection.
                </span>
              </div>
            </div>
          )}

          {/* Direct Google Sheets Fetch Error Banner */}
          {!isOffline && syncState && (syncState.status === 'error' || syncState.status === 'access_denied') && (
            <div className="bg-red-600 text-white px-3 sm:px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs z-[990]">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <strong>Connection Error:</strong> {syncState.lastError || 'Unable to retrieve live data from Google Sheets.'}
                </span>
              </div>
              <button
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white/20 hover:bg-white/30 rounded font-semibold text-xs transition flex items-center gap-1 shrink-0 ml-2 cursor-pointer touch-target-44"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Retry</span>
              </button>
            </div>
          )}

          {/* Page Content: pb-20 on mobile reserves space for MobileBottomNav with safe area, pb-8 on desktop */}
          <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar (Screens < 1024px) */}
        <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />

        {/* iOS Safari PWA Installation Instructions Modal */}
        <IosInstallGuideModal />
      </div>
    </div>
  );
};
