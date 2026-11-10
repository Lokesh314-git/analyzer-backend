import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.resolve(__dirname, '../../config/connection.json');
export const DEFAULT_SHEET_CONFIG = {
    sourceMethod: 'public_csv',
    url: process.env.SPREADSHEET_URL || 'https://docs.google.com/spreadsheets/d/1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY/edit?usp=sharing',
    spreadsheetId: process.env.SPREADSHEET_ID || '1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY',
    gid: process.env.WORKSHEET_GID || undefined,
    appsScriptUrl: process.env.APPS_SCRIPT_URL || '',
    appsScriptToken: process.env.APPS_SCRIPT_TOKEN || '',
    autoSync: true,
    syncIntervalSeconds: 30,
    confirmedApprovedSharing: true,
};
let currentSheetConfig = loadPersistedConfig();
function loadPersistedConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_SHEET_CONFIG,
                ...parsed,
                sourceMethod: parsed.sourceMethod || 'public_csv'
            };
        }
    }
    catch (err) {
        console.warn('Could not read persisted connection configuration, using defaults.', err);
    }
    return { ...DEFAULT_SHEET_CONFIG };
}
function persistConfig(config) {
    try {
        const dir = path.dirname(CONFIG_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
    }
    catch (err) {
        console.error('Failed to persist connection configuration to disk:', err);
    }
}
export function getSheetConfig() {
    return { ...currentSheetConfig };
}
/**
 * Returns configuration safe for client consumption (masks secrets)
 */
export function getSafeSheetConfig() {
    const cfg = { ...currentSheetConfig };
    cfg.hasTokenConfigured = Boolean(cfg.appsScriptToken && cfg.appsScriptToken.trim().length > 0);
    delete cfg.appsScriptToken; // Never send actual token to client
    return cfg;
}
export function updateSheetConfig(updates) {
    currentSheetConfig = {
        ...currentSheetConfig,
        ...updates
    };
    persistConfig(currentSheetConfig);
    return { ...currentSheetConfig };
}
export function clearSheetConfig() {
    currentSheetConfig = {
        sourceMethod: 'public_csv',
        url: '',
        spreadsheetId: '',
        gid: undefined,
        appsScriptUrl: '',
        appsScriptToken: '',
        autoSync: false,
        syncIntervalSeconds: 30,
        confirmedApprovedSharing: false
    };
    persistConfig(currentSheetConfig);
}
