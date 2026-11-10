export type SyncStatusType = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'access_denied'
  | 'stale'
  | 'error'
  | 'no_data';

export type DataSourceType = 
  | 'none'
  | 'google_sheets_live'
  | 'apps_script_live'
  | 'cache';

export type SourceMethod = 'public_csv' | 'apps_script';

export interface SheetConnectionConfig {
  sourceMethod: SourceMethod;
  url: string; // Google Sheets URL
  spreadsheetId: string;
  gid?: string;
  sheetName?: string;
  appsScriptUrl?: string;
  appsScriptToken?: string; // Stored securely on server, never exposed in client API responses
  hasTokenConfigured?: boolean; // Safe boolean flag for frontend display
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastConnectedAt?: string;
  confirmedApprovedSharing: boolean;
}

export interface SyncState {
  status: SyncStatusType;
  lastSuccessfulSync?: string | null;
  lastAttemptSync?: string | null;
  lastError?: string | null;
  isStale: boolean;
  consecutiveFailures: number;
  dataSource: DataSourceType;
  totalStudentsLoaded: number;
}
