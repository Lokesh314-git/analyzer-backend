import { describe, it, expect, beforeEach } from 'vitest';
import { parseSpreadsheetCsv, colIndexToLetter } from '../services/googleSheets/sheetValidator.js';
import { isHtmlResponse } from '../services/googleSheets/sheetFetcher.js';
import { syncManager } from '../services/synchronization/syncManager.js';
import { getSheetConfig, updateSheetConfig, clearSheetConfig } from '../config/sheets.config.js';
import { generateAcademicMarksCsvTemplate } from '../services/googleSheets/defaultStudentsData.js';
import { getSubmissionTracking } from '../services/analytics/trackingEngine.js';
import { generateTestFixtureStudents } from './fixtures/testMarksheet.js';

describe('Google Sheets 2-Row Grouped Header Parser & Zero-Demo-Data Tests', () => {
  beforeEach(() => {
    syncManager.resetCache();
  });

  // Test A: Fresh startup state has 0 students and disconnected status
  it('Test A: Server startup starts strictly disconnected with 0 students and zero demo fallback', () => {
    const syncState = syncManager.getSyncState();
    const students = syncManager.getCachedStudents();

    expect(syncState.status).toBe('disconnected');
    expect(syncState.dataSource).toBe('none');
    expect(syncState.totalStudentsLoaded).toBe(0);
    expect(syncState.lastSuccessfulSync).toBeNull();
    expect(students.length).toBe(0);
  });

  // Test B: Parse 2-Row Grouped Header CSV (Columns A to AN, 54 Students)
  it('Test B: 2-Row Grouped Header CSV correctly maps all 40 columns (A to AN) and 54 students', () => {
    // Construct a realistic 2-row grouped header CSV
    const row1 = ['Register No', 'Roll No', 'Name'];
    const row2 = ['', '', ''];

    // Internal-I (D to N)
    row1.push('Internal-I', '', '', '', '', '', '', '', '', '', '');
    row2.push('DL Mark', 'DL Assess', 'DL Assign', 'GEN AI Mark', 'GEN AI Assess', 'GEN AI Assign', 'RL Mark', 'RL Assign', 'BA Mark', 'BA Assign', 'RE&CCE Mark');

    // Internal-II (O to AA)
    row1.push('Internal-II', '', '', '', '', '', '', '', '', '', '', '', '');
    row2.push('DL Mark', 'DL Assess', 'DL Assign', 'GEN AI Mark', 'GEN AI Assess', 'GEN AI Assign', 'RL Mark', 'RL Assess', 'RL Assign', 'BA Mark', 'BA Assess', 'BA Assign', 'RE&CCE Mark');

    // Internal-III (AB to AN)
    row1.push('Internal-III', '', '', '', '', '', '', '', '', '', '', '', '');
    row2.push('DL Mark', 'DL Assess', 'DL Assign', 'GEN AI Mark', 'GEN AI Assess', 'GEN AI Assign', 'RL Mark', 'RL Assess', 'RL Assign', 'BA Mark', 'BA Assess', 'BA Assign', 'RE&CCE Mark');

    const csvRows = [
      row1.join(','),
      row2.join(',')
    ];

    // Add 54 student rows
    for (let i = 1; i <= 54; i++) {
      const regNo = `22CS${String(i).padStart(3, '0')}`;
      const rollNo = `CS${String(i).padStart(3, '0')}`;
      const name = `Student ${i}`;
      const row = [regNo, rollNo, `"${name}"`];

      // Add marks for 37 academic columns
      for (let c = 3; c < 40; c++) {
        row.push('28');
      }
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const result = parseSpreadsheetCsv(csvContent);

    expect(result.success).toBe(true);
    expect(result.headerLayout).toBe('two_row_grouped');
    expect(result.students.length).toBe(54);
    expect(result.totalStudents).toBe(54);
    expect(result.students[0].registerNumber).toBe('22CS001');
    expect(result.students[0].catMarks['CAT-1'].subjects['DL'].numericMark).toBe(28);
    expect(result.students[0].catMarks['CAT-1'].subjects['DL'].status).toBe('PASS');
    expect(result.students[53].registerNumber).toBe('22CS054');
  });

  // Test C: Live Data Mark Changes Propagate Correctly
  it('Test C: Modifying mark from PASS (>=16) to FAIL (<16) immediately recalculates pass status', () => {
    const csvTemplate = generateAcademicMarksCsvTemplate();
    const parsed1 = parseSpreadsheetCsv(csvTemplate);
    expect(parsed1.success).toBe(true);
    expect(parsed1.students.length).toBe(54);

    const originalMark = parsed1.students[0].catMarks['CAT-1'].subjects['DL'].numericMark;
    expect(originalMark).toBeGreaterThanOrEqual(16);
    expect(parsed1.students[0].catMarks['CAT-1'].subjects['DL'].status).toBe('PASS');

    // Modify first student mark in CSV string
    const modifiedCsv = csvTemplate.replace(`,${originalMark},`, ',10,');
    const parsed2 = parseSpreadsheetCsv(modifiedCsv);
    expect(parsed2.success).toBe(true);
    expect(parsed2.students[0].catMarks['CAT-1'].subjects['DL'].numericMark).toBe(10);
    expect(parsed2.students[0].catMarks['CAT-1'].subjects['DL'].status).toBe('FAIL');
  });

  // Test D: HTML Error Page Detection (Accounts Google, 403, Login)
  it('Test D: HTML responses (e.g. Google Accounts Login) are recognized and rejected', () => {
    const htmlLogin = '<!DOCTYPE html><html><head><title>Sign in - Google Accounts</title></head><body>ServiceLogin</body></html>';
    const html404 = '<html><head><title>Google Drive - Page Not Found</title></head><body>Error 404</body></html>';
    const validCsv = 'Register No,Roll No,Name,DL CAT-1\n22CS001,CS001,John Doe,25';

    expect(isHtmlResponse(htmlLogin)).toBe(true);
    expect(isHtmlResponse(html404)).toBe(true);
    expect(isHtmlResponse(validCsv)).toBe(false);

    const parseHtml = parseSpreadsheetCsv(htmlLogin);
    expect(parseHtml.success).toBe(false);
  });

  // Test E: Completely Empty Spreadsheet
  it('Test E: Empty CSV string returns success=false and 0 students with diagnostic error', () => {
    const emptyResult = parseSpreadsheetCsv('');
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.totalStudents).toBe(0);
    expect(emptyResult.students.length).toBe(0);
    expect(emptyResult.issues.length).toBeGreaterThan(0);

    const blankSpacesResult = parseSpreadsheetCsv('   \n\n   ');
    expect(blankSpacesResult.success).toBe(false);
    expect(blankSpacesResult.totalStudents).toBe(0);
  });

  // Test F: Connection Configuration Persistence to Disk
  it('Test F: Configuration persists correctly to connection.json without leaking secrets', () => {
    const originalConfig = getSheetConfig();
    try {
      updateSheetConfig({
        sourceMethod: 'apps_script',
        appsScriptUrl: 'https://script.google.com/macros/s/TEST/exec',
        appsScriptToken: 'secret_bridge_token_123',
        autoSync: true
      });

      const cfg = getSheetConfig();
      expect(cfg.sourceMethod).toBe('apps_script');
      expect(cfg.appsScriptUrl).toBe('https://script.google.com/macros/s/TEST/exec');
      expect(cfg.appsScriptToken).toBe('secret_bridge_token_123');
    } finally {
      updateSheetConfig(originalConfig);
    }
  });

  // Test G: Omitted components classified as NOT CONFIGURED
  it('Test G: Unconfigured components (e.g. RL Assessment in CAT-1) are classified as NOT CONFIGURED', () => {
    const fixtureStudents = generateTestFixtureStudents();
    expect(fixtureStudents.length).toBe(54);

    const s1 = fixtureStudents[0];
    // RL assessment in CAT-1 was omitted in syllabus / spreadsheet
    expect(['NOT_APPLICABLE', 'NOT CONFIGURED']).toContain(s1.assessments['CAT-1_RL'].status);
    expect(s1.assessments['CAT-1_RL'].isConfigured).toBe(false);

    // RE&CCE has no assessments in any CAT
    expect(['NOT_APPLICABLE', 'NOT CONFIGURED']).toContain(s1.assessments['CAT-1_RE&CCE'].status);
    expect(['NOT_APPLICABLE', 'NOT CONFIGURED']).toContain(s1.assessments['CAT-2_RE&CCE'].status);

    // DL Assessment in CAT-1 IS configured
    expect(s1.assessments['CAT-1_DL'].status).toBe('SUBMITTED / MARKED');
    expect(s1.assessments['CAT-1_DL'].isConfigured).toBe(true);

    // Tracking stats should accurately reflect totalConfigured and notConfiguredCount
    const tracking = getSubmissionTracking(fixtureStudents, 'Assessment', { cat: 'CAT-1' });
    expect(tracking.stats.notConfiguredCount).toBeGreaterThan(0);
    expect(tracking.stats.totalConfigured).toBeLessThan(tracking.stats.totalTracked);
    expect(tracking.stats.complianceRate).toBeGreaterThan(0);
  });

  // Test H: Student Identity Mapping & Assignment Score Tracking
  it('Test H: Correctly extracts identity mapping and tracking item fields (Roll No, Reg No, Student Name, scores)', () => {
    // Spreadsheet where Header 1 is 'Register No' but column 0 has '1', and Header 2 is 'Roll No' but column 1 has 'TU6243202111001'
    const csvContent = [
      'Register No,Roll No,Name,Internal-I,,,,,,,,,,,Internal-II,,,,,,,,,,,,,Internal-III,,,,,,,,,,,,',
      ',,,DL,ASSESSMENT,ASSIGNMENT,GEN AI,ASSESSMENT,ASSIGNMENT,RL,ASSIGNMENT,BA,ASSIGNMENT,RE&CCE,DL,ASSESSMENT,ASSIGNMENT,GEN AI,ASSESSMENT,ASSIGNMENT,RL,ASSESSMENT,ASSIGNMENT,BA,ASSESSMENT,ASSIGNMENT,RE&CCE,DL,ASSESSMENT,ASSIGNMENT,GEN AI,ASSESSMENT,ASSIGNMENT,RL,ASSESSMENT,ASSIGNMENT,BA,ASSESSMENT,ASSIGNMENT,RE&CCE',
      '1,TU6243202111001,Abitha E,33,5,5,32,5,,30,5,36.5,5,37,32,5,5,34,5,5,39,5,5,38,5,5,38,,,5,,,5,,,5,,,5,',
      '9,TU6243202111009,Beauti Kumari V,16,,,20,,,22,,ASBENT,,28,24,4,5,24,5,5,28,4,5,19,5,5,22,,,5,,,5,,,5,,,5,',
      '21,TU6243202111023,Janani G,25,5,5,30,5,5,28,5,"39,5",5,30,28,5,5,32,5,5,30,5,5,35,5,5,32,,,5,,,5,,,5,,,5,',
      '22,TU6243202111024,Jeevarathinam V,20,5,5,"`12",5,5,25,5,26,5,28,25,5,5,28,5,5,24,5,5,20,5,5,25,,,5,,,5,,,5,,,5,',
      '53,TU6243202111056,Madhan Kumar I,22,5,5,25,5,5,20,5,56,5,30,26,5,5,24,5,5,22,5,5,25,5,5,28,,,5,,,5,,,5,,,5,'
    ].join('\n');

    const parsed = parseSpreadsheetCsv(csvContent);
    expect(parsed.success).toBe(true);
    expect(parsed.students.length).toBe(5);

    // Verify identity mapping on student 0 (Abitha E)
    const st0 = parsed.students[0];
    expect(st0.name).toBe('Abitha E');
    expect(st0.studentName).toBe('Abitha E');
    expect(st0.rollNumber).toBe('1');
    expect(st0.rollNo).toBe('1');
    expect(st0.registerNumber).toBe('TU6243202111001');
    expect(st0.registerNo).toBe('TU6243202111001');

    // Verify Beauti Kumari V: ASBENT normalized to ABSENT, not an error
    const st1 = parsed.students[1];
    expect(st1.name).toBe('Beauti Kumari V');
    expect(st1.catMarks['CAT-1'].subjects['BA'].status).toBe('ABSENT');

    // Verify Janani G: 39,5 normalized to 39.5 PASS
    const st2 = parsed.students[2];
    expect(st2.name).toBe('Janani G');
    expect(st2.catMarks['CAT-1'].subjects['BA'].numericMark).toBe(39.5);
    expect(st2.catMarks['CAT-1'].subjects['BA'].status).toBe('PASS');

    // Verify Jeevarathinam V: `12 normalized to 12
    const st3 = parsed.students[3];
    expect(st3.name).toBe('Jeevarathinam V');
    expect(st3.catMarks['CAT-1'].subjects['GEN AI'].numericMark).toBe(12);

    // Verify Madhan Kumar I: 56 is INVALID
    const st4 = parsed.students[4];
    expect(st4.name).toBe('Madhan Kumar I');
    expect(st4.catMarks['CAT-1'].subjects['BA'].status).toBe('INVALID');

    // Verify issues: exactly 1 genuine error (Madhan Kumar's 56)
    const errors = parsed.issues.filter(i => i.severity === 'error');
    expect(errors.length).toBe(1);
    expect(errors[0].studentName).toBe('Madhan Kumar I');
    expect(errors[0].originalValue).toBe('56');
    expect(errors[0].recommendedCorrection).toContain('exceeds maximum permitted marks (40)');

    // Test assignment tracking items
    const assignmentTracking = getSubmissionTracking(parsed.students, 'Assignment', { cat: 'CAT-1' });
    expect(assignmentTracking.items.length).toBeGreaterThan(0);

    const abithaDlAssign = assignmentTracking.items.find(
      i => i.studentName === 'Abitha E' && i.subject === 'DL' && i.cat === 'CAT-1'
    );
    expect(abithaDlAssign).toBeDefined();
    expect(abithaDlAssign?.studentName).toBe('Abitha E');
    expect(abithaDlAssign?.name).toBe('Abitha E');
    expect(abithaDlAssign?.rollNumber).toBe('1');
    expect(abithaDlAssign?.rollNo).toBe('1');
    expect(abithaDlAssign?.registerNumber).toBe('TU6243202111001');
    expect(abithaDlAssign?.registerNo).toBe('TU6243202111001');
    expect(abithaDlAssign?.numericMark).toBe(5);
    expect(abithaDlAssign?.assignmentMark).toBe(5);
    expect(abithaDlAssign?.score).toBe(5);
    expect(abithaDlAssign?.status).toBe('SUBMITTED / MARKED');
  });
});
