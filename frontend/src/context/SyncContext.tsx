import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SyncState } from '../types/academic';
import { api } from '../services/api';

interface SyncContextType {
  syncState: SyncState | null;
  isSyncing: boolean;
  refreshKey: number;
  syncNow: (overrideUrl?: string, overrideGid?: string) => Promise<boolean>;
  triggerRefresh: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const fetchSyncState = useCallback(async () => {
    try {
      const state = await api.getSyncStatus();
      setSyncState(state);
    } catch (err) {
      console.warn('Failed to fetch sync status', err);
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    fetchSyncState();
  }, [fetchSyncState]);

  const syncNow = async (overrideUrl?: string, overrideGid?: string): Promise<boolean> => {
    if (isSyncing) return false;
    setIsSyncing(true);
    try {
      const res = await api.syncNow({ url: overrideUrl, gid: overrideGid });
      setSyncState(res.syncState);
      triggerRefresh();
      return res.success;
    } catch (err) {
      console.error('Manual sync failed', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchSyncState();
    // Background polling removed: data is fetched directly on page load / explicit user action
  }, [fetchSyncState]);

  return (
    <SyncContext.Provider value={{ syncState, isSyncing, refreshKey, syncNow, triggerRefresh }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

