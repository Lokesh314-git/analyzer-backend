import { performance } from 'perf_hooks';
import { getSheetConfig, updateSheetConfig } from '../../config/sheets.config.js';
import { fetchSheetData } from '../googleSheets/sheetFetcher.js';
import { parseSpreadsheetCsv } from '../googleSheets/sheetValidator.js';
class SynchronizationManager {
    syncState = {
        status: 'disconnected',
        lastSuccessfulSync: null,
        lastAttemptSync: null,
        lastError: null,
        isStale: false,
        consecutiveFailures: 0,
        dataSource: 'none',
        totalStudentsLoaded: 0
    };
    inFlightFetchPromise = null;
    testStudentsOverride = null;
    testIssuesOverride = [];
    lastDiagnostics;
    lastHeaderLayout = 'unrecognized';
    lastMappingDiagnostics = [];
    lastIssues = [];
    lastWarnings = [];
    constructor() {
        this.syncState = {
            status: 'disconnected',
            lastSuccessfulSync: null,
            lastAttemptSync: null,
            lastError: null,
            isStale: false,
            consecutiveFailures: 0,
            dataSource: 'none',
            totalStudentsLoaded: 0
        };
    }
    getSyncState() {
        return { ...this.syncState };
    }
    /**
     * For backwards compatibility and unit test assertions: returns test dataset if set
     */
    getCachedStudents() {
        return this.testStudentsOverride || [];
    }
    getCachedIssues() {
        return this.testIssuesOverride.length > 0 ? this.testIssuesOverride : this.lastIssues;
    }
    getCachedWarnings() {
        return this.lastWarnings;
    }
    getMappingDiagnostics() {
        return this.lastMappingDiagnostics;
    }
    getHeaderLayout() {
        return this.lastHeaderLayout;
    }
    getLastDiagnostics() {
        return this.lastDiagnostics;
    }
    resetCache() {
        this.testStudentsOverride = null;
        this.testIssuesOverride = [];
        this.lastDiagnostics = undefined;
        this.lastHeaderLayout = 'unrecognized';
        this.lastMappingDiagnostics = [];
        this.lastIssues = [];
        this.lastWarnings = [];
        this.inFlightFetchPromise = null;
        this.syncState = {
            status: 'disconnected',
            lastSuccessfulSync: null,
            lastAttemptSync: null,
            lastError: null,
            isStale: false,
            consecutiveFailures: 0,
            dataSource: 'none',
            totalStudentsLoaded: 0
        };
    }
    /**
     * For isolated unit testing: inject test fixtures without calling network
     */
    setTestDataset(students, issues = []) {
        this.testStudentsOverride = students;
        this.testIssuesOverride = issues;
        this.syncState = {
            status: 'connected',
            lastSuccessfulSync: new Date().toISOString(),
            lastAttemptSync: new Date().toISOString(),
            lastError: null,
            isStale: false,
            consecutiveFailures: 0,
            dataSource: 'google_sheets_live',
            totalStudentsLoaded: students.length
        };
    }
    clearTestDataset() {
        this.testStudentsOverride = null;
        this.testIssuesOverride = [];
    }
    startPeriodicSync(intervalSeconds = 30) {
        // Disabled in favor of on-demand live fetching without persistent caching
        console.log(`Live direct fetching active. Background cache polling disabled to maintain single source of truth.`);
    }
    stopPeriodicSync() {
        // No-op
    }
    /**
     * Primary data-fetching method: Always retrieves fresh data directly from Google Sheets
     * using Keep-Alive connection and in-flight request coalescing.
     * NEVER caches student marks in memory or persists old marks.
     */
    async getFreshStudentData(forceRefresh = false) {
        if (this.testStudentsOverride !== null) {
            return {
                success: true,
                students: this.testStudentsOverride,
                issues: this.testIssuesOverride,
                warnings: [],
                mappingDiagnostics: [],
                headerLayout: 'two_row_grouped',
                syncState: this.syncState
            };
        }
        if (!forceRefresh && this.inFlightFetchPromise) {
            return this.inFlightFetchPromise;
        }
        const promise = this.executeFreshFetch();
        this.inFlightFetchPromise = promise;
        try {
            return await promise;
        }
        finally {
            if (this.inFlightFetchPromise === promise) {
                this.inFlightFetchPromise = null;
            }
        }
    }
    async executeFreshFetch() {
        const fetchStart = performance.now();
        this.syncState.lastAttemptSync = new Date().toISOString();
        const config = getSheetConfig();
        if (!config.url && !config.appsScriptUrl) {
            this.syncState.status = 'disconnected';
            this.syncState.lastError = 'No spreadsheet URL configured.';
            this.syncState.dataSource = 'none';
            this.syncState.totalStudentsLoaded = 0;
            return {
                success: false,
                students: [],
                issues: [],
                warnings: ['No spreadsheet URL configured.'],
                mappingDiagnostics: [],
                headerLayout: 'unrecognized',
                syncState: this.syncState,
                error: 'No spreadsheet URL configured. Please connect a spreadsheet.'
            };
        }
        this.syncState.status = 'connecting';
        try {
            const fetchResult = await fetchSheetData(config);
            if (!fetchResult.success || !fetchResult.csvData) {
                this.syncState.consecutiveFailures++;
                const errorMessage = fetchResult.error || 'Failed to download Google Sheets CSV.';
                this.syncState.lastError = errorMessage;
                this.syncState.status = fetchResult.isAccessRestricted ? 'access_denied' : 'error';
                this.syncState.dataSource = 'none';
                this.syncState.totalStudentsLoaded = 0;
                this.syncState.isStale = false; // Never silently display stale data
                return {
                    success: false,
                    students: [],
                    issues: [],
                    warnings: [errorMessage],
                    mappingDiagnostics: [],
                    headerLayout: 'unrecognized',
                    syncState: this.syncState,
                    error: errorMessage
                };
            }
            // Parse the freshly retrieved CSV
            const parseStart = performance.now();
            const parseResult = parseSpreadsheetCsv(fetchResult.csvData);
            const parseDurationMs = performance.now() - parseStart;
            if (!parseResult.success) {
                this.syncState.consecutiveFailures++;
                const errorMsg = parseResult.warnings.join('; ') || 'Spreadsheet validation failed.';
                this.syncState.lastError = errorMsg;
                this.syncState.status = parseResult.totalStudents === 0 ? 'no_data' : 'error';
                this.syncState.dataSource = 'none';
                this.syncState.totalStudentsLoaded = 0;
                this.syncState.isStale = false;
                this.lastIssues = parseResult.issues;
                this.lastWarnings = parseResult.warnings;
                this.lastMappingDiagnostics = parseResult.mappingDiagnostics;
                this.lastHeaderLayout = parseResult.headerLayout;
                return {
                    success: false,
                    students: [],
                    issues: parseResult.issues,
                    warnings: parseResult.warnings,
                    mappingDiagnostics: parseResult.mappingDiagnostics,
                    headerLayout: parseResult.headerLayout,
                    syncState: this.syncState,
                    error: `Validation failed: ${errorMsg}`
                };
            }
            if (parseResult.students.length === 0) {
                this.syncState.status = 'no_data';
                this.syncState.dataSource = 'none';
                this.syncState.totalStudentsLoaded = 0;
                this.syncState.isStale = false;
                this.lastIssues = parseResult.issues;
                this.lastWarnings = parseResult.warnings;
                this.lastMappingDiagnostics = parseResult.mappingDiagnostics;
                this.lastHeaderLayout = parseResult.headerLayout;
                return {
                    success: false,
                    students: [],
                    issues: parseResult.issues,
                    warnings: parseResult.warnings,
                    mappingDiagnostics: parseResult.mappingDiagnostics,
                    headerLayout: parseResult.headerLayout,
                    syncState: this.syncState,
                    error: 'No student records detected in the sheet.'
                };
            }
            const source = fetchResult.sourceMethod === 'apps_script'
                ? 'apps_script_live'
                : 'google_sheets_live';
            const totalDurationMs = performance.now() - fetchStart;
            const fetchDurationMs = fetchResult.fetchDurationMs || 0;
            const responseSizeBytes = fetchResult.responseSizeBytes || Buffer.byteLength(fetchResult.csvData, 'utf8');
            this.syncState = {
                status: 'connected',
                lastSuccessfulSync: new Date().toISOString(),
                lastAttemptSync: new Date().toISOString(),
                lastError: null,
                isStale: false,
                consecutiveFailures: 0,
                dataSource: source,
                totalStudentsLoaded: parseResult.students.length
            };
            this.lastDiagnostics = {
                fetchDurationMs,
                responseSizeBytes,
                parseDurationMs,
                totalDurationMs
            };
            this.lastIssues = parseResult.issues;
            this.lastWarnings = parseResult.warnings;
            this.lastMappingDiagnostics = parseResult.mappingDiagnostics;
            this.lastHeaderLayout = parseResult.headerLayout;
            console.log(`[DIAGNOSTICS] Google Sheets fetch: ${fetchDurationMs.toFixed(1)}ms (${(responseSizeBytes / 1024).toFixed(2)} KB) | Parse: ${parseDurationMs.toFixed(1)}ms | Students: ${parseResult.students.length} | Total: ${totalDurationMs.toFixed(1)}ms`);
            return {
                success: true,
                students: parseResult.students,
                issues: parseResult.issues,
                warnings: parseResult.warnings,
                mappingDiagnostics: parseResult.mappingDiagnostics,
                headerLayout: parseResult.headerLayout,
                syncState: this.syncState,
                diagnostics: this.lastDiagnostics
            };
        }
        catch (err) {
            this.syncState.consecutiveFailures++;
            this.syncState.lastError = err.message || 'Unexpected sync error.';
            this.syncState.status = 'error';
            this.syncState.dataSource = 'none';
            this.syncState.totalStudentsLoaded = 0;
            this.syncState.isStale = false;
            return {
                success: false,
                students: [],
                issues: [],
                warnings: [err.message || 'Unexpected error'],
                mappingDiagnostics: [],
                headerLayout: 'unrecognized',
                syncState: this.syncState,
                error: err.message || 'Unexpected error during synchronization.'
            };
        }
    }
    /**
     * Explicit user trigger for sync now
     */
    async syncNow(overrideUrl, overrideGid) {
        if (overrideUrl) {
            updateSheetConfig({
                url: overrideUrl,
                gid: overrideGid !== undefined ? overrideGid : undefined
            });
        }
        const result = await this.getFreshStudentData(true);
        return {
            success: result.success,
            syncState: result.syncState,
            message: result.success
                ? `Successfully fetched ${result.students.length} students live from Google Sheets.`
                : (result.error || 'Failed to fetch spreadsheet.'),
            studentsCount: result.students.length,
            issuesCount: result.issues.length,
            diagnostics: result.diagnostics
        };
    }
}
export const syncManager = new SynchronizationManager();
