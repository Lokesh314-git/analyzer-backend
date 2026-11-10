import { performance } from 'perf_hooks';
import { fetchPublicCsv } from './services/googleSheets/sheetFetcher.js';
import { parseSpreadsheetCsv } from './services/googleSheets/sheetValidator.js';
import { computeDashboardAnalytics } from './services/analytics/dashboardAnalytics.js';
async function runBenchmark() {
    const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY/edit?usp=sharing';
    console.log('=== BASELINE PERFORMANCE MEASUREMENT (BEFORE OPTIMIZATION) ===');
    // 1. Google Sheets Fetch Time
    const t0 = performance.now();
    const fetchResult = await fetchPublicCsv(spreadsheetUrl);
    const t1 = performance.now();
    const fetchDuration = t1 - t0;
    if (!fetchResult.success || !fetchResult.csvData) {
        console.error('Fetch failed:', fetchResult.error);
        return;
    }
    const csvBytes = Buffer.byteLength(fetchResult.csvData, 'utf8');
    // 2. Spreadsheet Parsing Time
    const t2 = performance.now();
    const parseResult = parseSpreadsheetCsv(fetchResult.csvData);
    const t3 = performance.now();
    const parseDuration = t3 - t2;
    // 3. Analytics Calculation Time
    const t4 = performance.now();
    const dashboard = computeDashboardAnalytics(parseResult.students, 'CAT-1');
    const t5 = performance.now();
    const analyticsDuration = t5 - t4;
    const totalBackend = fetchDuration + parseDuration + analyticsDuration;
    console.log(`Google Sheets Fetch Time: ${fetchDuration.toFixed(2)} ms`);
    console.log(`Response Size: ${csvBytes} bytes (${(csvBytes / 1024).toFixed(2)} KB)`);
    console.log(`Spreadsheet Parsing Time: ${parseDuration.toFixed(2)} ms`);
    console.log(`Analytics Calculation Time: ${analyticsDuration.toFixed(2)} ms`);
    console.log(`Total Direct Processing Time: ${totalBackend.toFixed(2)} ms`);
    console.log(`Total Students Parsed: ${parseResult.students.length}`);
}
runBenchmark().catch(console.error);
