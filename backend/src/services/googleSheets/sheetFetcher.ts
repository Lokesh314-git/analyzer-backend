import axios, { AxiosError } from 'axios';
import https from 'https';
import http from 'http';
import { performance } from 'perf_hooks';
import { parseGoogleSheetsUrl } from '../../utils/urlParser.js';
import { SheetConnectionConfig } from '../../types/sync.types.js';

// Persistent Keep-Alive connection pooling agents for Google Sheets endpoints
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 30,
  maxFreeSockets: 10,
  timeout: 10000,
  keepAliveMsecs: 60000
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 30,
  maxFreeSockets: 10,
  timeout: 10000,
  keepAliveMsecs: 60000
});

export interface FetchSheetResult {
  success: boolean;
  csvData?: string;
  sourceMethod: 'public_csv' | 'apps_script';
  spreadsheetId?: string;
  gid?: string;
  error?: string;
  statusCode?: number;
  isAccessRestricted?: boolean;
  fetchDurationMs?: number;
  responseSizeBytes?: number;
}

/**
 * Checks if response text is actually HTML instead of valid CSV data
 */
export function isHtmlResponse(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim().toLowerCase();
  return (
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<head>') ||
    trimmed.includes('accounts.google.com') ||
    trimmed.includes('servicelogin') ||
    trimmed.includes('docs-viewer-banner') ||
    trimmed.includes('sign in - google accounts') ||
    trimmed.includes('google drive - page not found') ||
    trimmed.includes('<title>error</title>') ||
    (trimmed.includes('<table') && trimmed.includes('</table>'))
  );
}

/**
 * Source A: Fetch via public Google Sheets CSV export
 */
export async function fetchPublicCsv(
  urlOrSpreadsheetId: string,
  gid?: string,
  retries: number = 1
): Promise<FetchSheetResult> {
  let exportUrl: string;
  let sId: string = urlOrSpreadsheetId;
  let targetGid: string | undefined = gid;

  if (urlOrSpreadsheetId.startsWith('http://') || urlOrSpreadsheetId.startsWith('https://')) {
    const parsed = parseGoogleSheetsUrl(urlOrSpreadsheetId);
    if (!parsed.isValid || !parsed.exportUrl || !parsed.spreadsheetId) {
      return {
        success: false,
        sourceMethod: 'public_csv',
        error: parsed.error || 'Invalid Google Sheets URL format.'
      };
    }
    exportUrl = parsed.exportUrl;
    sId = parsed.spreadsheetId;
    if (!targetGid && parsed.gid) {
      targetGid = parsed.gid;
    }
  } else {
    sId = urlOrSpreadsheetId.trim();
    exportUrl = `https://docs.google.com/spreadsheets/d/${sId}/export?format=csv`;
    if (targetGid) {
      exportUrl += `&gid=${targetGid}`;
    }
  }

  let delay = 500;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const startTime = performance.now();
    try {
      const response = await axios.get(exportUrl, {
        httpsAgent,
        httpAgent,
        timeout: 10000,
        headers: {
          'Accept': 'text/csv, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SemesterMarksAnalytics/1.0',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        maxRedirects: 5,
        responseType: 'text'
      });

      const fetchDurationMs = performance.now() - startTime;
      const responseText = String(response.data);
      const responseSizeBytes = Buffer.byteLength(responseText, 'utf8');

      // Check if Google returned an HTML login or error page with HTTP 200
      if (isHtmlResponse(responseText)) {
        return {
          success: false,
          sourceMethod: 'public_csv',
          statusCode: 403,
          isAccessRestricted: true,
          spreadsheetId: sId,
          gid: targetGid,
          fetchDurationMs,
          responseSizeBytes,
          error: 'Spreadsheet access is restricted. Google returned a login/authentication HTML page instead of CSV. Ensure the sheet is shared as "Anyone with the link can view", or configure the Authorized Google Apps Script Bridge in Connection Settings.'
        };
      }

      return {
        success: true,
        sourceMethod: 'public_csv',
        csvData: responseText,
        spreadsheetId: sId,
        gid: targetGid,
        statusCode: response.status,
        fetchDurationMs,
        responseSizeBytes
      };
    } catch (err: any) {
      const fetchDurationMs = performance.now() - startTime;
      const isLastAttempt = attempt === retries;
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;

      if (status === 401 || status === 403) {
        return {
          success: false,
          sourceMethod: 'public_csv',
          statusCode: status,
          isAccessRestricted: true,
          spreadsheetId: sId,
          gid: targetGid,
          fetchDurationMs,
          error: 'Access denied (HTTP 403/401). Spreadsheet permissions prevent public CSV export. Use Authorized Apps Script or share spreadsheet with link permissions.'
        };
      }

      if (status === 404) {
        return {
          success: false,
          sourceMethod: 'public_csv',
          statusCode: 404,
          spreadsheetId: sId,
          gid: targetGid,
          fetchDurationMs,
          error: 'Google Spreadsheet or worksheet not found (HTTP 404). Please verify the Spreadsheet ID and worksheet GID.'
        };
      }

      if (isLastAttempt) {
        return {
          success: false,
          sourceMethod: 'public_csv',
          statusCode: status,
          spreadsheetId: sId,
          gid: targetGid,
          fetchDurationMs,
          error: axiosErr.message || 'Network error fetching Google Sheets CSV.'
        };
      }

      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }

  return {
    success: false,
    sourceMethod: 'public_csv',
    error: 'Failed to retrieve spreadsheet after retries.'
  };
}

/**
 * Source B: Fetch via Authorized Google Apps Script Web App Bridge
 */
export async function fetchAppsScriptBridge(
  appsScriptUrl: string,
  token?: string,
  retries: number = 1
): Promise<FetchSheetResult> {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    return {
      success: false,
      sourceMethod: 'apps_script',
      error: 'Google Apps Script web app URL is not configured.'
    };
  }

  let delay = 500;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const startTime = performance.now();
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json, text/csv, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'SemesterMarksAnalytics/1.0',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Append token as query parameter as well for Apps Script Web App compatibility
      let requestUrl = appsScriptUrl.trim();
      if (token && token.trim()) {
        const separator = requestUrl.includes('?') ? '&' : '?';
        requestUrl = `${requestUrl}${separator}token=${encodeURIComponent(token.trim())}`;
      }

      const response = await axios.get(requestUrl, {
        httpsAgent,
        httpAgent,
        timeout: 12000,
        headers,
        maxRedirects: 5,
        responseType: 'text'
      });

      const fetchDurationMs = performance.now() - startTime;
      const responseText = String(response.data);
      const responseSizeBytes = Buffer.byteLength(responseText, 'utf8');

      if (isHtmlResponse(responseText)) {
        return {
          success: false,
          sourceMethod: 'apps_script',
          statusCode: 403,
          isAccessRestricted: true,
          fetchDurationMs,
          responseSizeBytes,
          error: 'Apps Script endpoint returned Google authentication or error HTML. Ensure the Apps Script Web App is deployed with "Execute as: Me" and "Who has access: Anyone" or authorization token configured.'
        };
      }

      // Check if Apps Script returned JSON wrapper
      try {
        const parsedJson = JSON.parse(responseText);
        if (parsedJson.error) {
          return {
            success: false,
            sourceMethod: 'apps_script',
            fetchDurationMs,
            responseSizeBytes,
            error: `Apps Script error: ${parsedJson.error}`
          };
        }
        if (parsedJson.csv) {
          return {
            success: true,
            sourceMethod: 'apps_script',
            csvData: parsedJson.csv,
            statusCode: response.status,
            fetchDurationMs,
            responseSizeBytes: Buffer.byteLength(parsedJson.csv, 'utf8')
          };
        }
      } catch {
        // Not JSON, assume direct CSV text
      }

      return {
        success: true,
        sourceMethod: 'apps_script',
        csvData: responseText,
        statusCode: response.status,
        fetchDurationMs,
        responseSizeBytes
      };
    } catch (err: any) {
      const fetchDurationMs = performance.now() - startTime;
      const isLastAttempt = attempt === retries;
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;

      if (status === 401 || status === 403) {
        return {
          success: false,
          sourceMethod: 'apps_script',
          statusCode: status,
          isAccessRestricted: true,
          fetchDurationMs,
          error: 'Apps Script authorization failed (HTTP 401/403). Please verify the secret access token.'
        };
      }

      if (isLastAttempt) {
        return {
          success: false,
          sourceMethod: 'apps_script',
          statusCode: status,
          fetchDurationMs,
          error: axiosErr.message || 'Error communicating with Google Apps Script bridge.'
        };
      }

      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }

  return {
    success: false,
    sourceMethod: 'apps_script',
    error: 'Failed to retrieve data from Apps Script bridge after retries.'
  };
}

/**
 * Unified fetcher dispatching to Source A or Source B based on configuration
 */
export async function fetchSheetData(config: SheetConnectionConfig): Promise<FetchSheetResult> {
  if (config.sourceMethod === 'apps_script' && config.appsScriptUrl) {
    return fetchAppsScriptBridge(config.appsScriptUrl, config.appsScriptToken);
  }
  return fetchPublicCsv(config.url, config.gid);
}
