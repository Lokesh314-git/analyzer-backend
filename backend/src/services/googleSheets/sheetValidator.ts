import { parse } from 'csv-parse/sync';
import { performance } from 'perf_hooks';
import {
  Student,
  SubjectCode,
  CatExam,
  DataQualityIssue,
  ColumnMappingDiagnostic,
  SUBJECT_CODES,
  SUBJECT_NAMES,
  CAT_EXAMS,
  CAT_INTERNAL_MAP,
  SubjectFullRecord,
  CatPerformance,
  SubmissionRecord,
  ExamStatus
} from '../../types/academic.types.js';
import { getAcademicConfig } from '../../config/academic.config.js';
import {
  classifySubjectMark,
  computeOverallCatStatus,
  classifySubmission
} from '../analytics/academicEngine.js';

export interface ParseResult {
  success: boolean;
  students: Student[];
  issues: DataQualityIssue[];
  warnings: string[];
  totalStudents: number;
  detectedColumns: string[];
  mappingDiagnostics: ColumnMappingDiagnostic[];
  headerLayout: 'two_row_grouped' | 'single_row' | 'unrecognized';
  headerParseDurationMs?: number;
  studentParseDurationMs?: number;
  totalParseDurationMs?: number;
  summary: {
    totalRows: number;
    validStudents: number;
    invalidMarksCount: number;
    duplicateCount: number;
  };
}

// Convert column index (0-based) to Excel letter (A, B, C... AA, AB... AN)
export function colIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Clean string for fuzzy header comparison
export function cleanHeader(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a row is completely blank
 */
export function isBlankRow(row: string[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every(cell => !cell || cell.trim() === '');
}

interface ColumnMapping {
  colIdx: number;
  cat?: CatExam;
  subject?: SubjectCode;
  type: 'regNo' | 'rollNo' | 'name' | 'slNo' | 'dept' | 'mark' | 'assessment' | 'assignment' | 'unknown';
}

/**
 * Parses Google Spreadsheet CSV using either two-row grouped headers or single-row headers.
 * NEVER falls back to demo/sample data.
 */
export function parseSpreadsheetCsv(csvString: string): ParseResult {
  const totalParseStart = performance.now();
  const config = getAcademicConfig();
  const issues: DataQualityIssue[] = [];
  const warnings: string[] = [];
  const mappingDiagnostics: ColumnMappingDiagnostic[] = [];

  if (!csvString || !csvString.trim()) {
    return {
      success: false,
      students: [],
      issues: [{
        id: 'empty_sheet',
        field: 'Spreadsheet',
        originalValue: '',
        expectedFormat: 'Non-empty CSV table',
        recommendedCorrection: 'The connected spreadsheet or worksheet tab is empty. Ensure student marks are present.',
        severity: 'error'
      }],
      warnings: ['Spreadsheet is completely empty.'],
      totalStudents: 0,
      detectedColumns: [],
      mappingDiagnostics: [],
      headerLayout: 'unrecognized',
      summary: { totalRows: 0, validStudents: 0, invalidMarksCount: 0, duplicateCount: 0 }
    };
  }

  let rawRecords: string[][];
  try {
    rawRecords = parse(csvString, {
      skip_empty_lines: false, // We inspect blank rows explicitly
      relax_column_count: true
    });
  } catch (err: any) {
    return {
      success: false,
      students: [],
      issues: [{
        id: 'csv_parse_error',
        field: 'CSV Format',
        originalValue: '',
        expectedFormat: 'Standard RFC 4180 CSV',
        recommendedCorrection: `Fix corrupted quotes or delimiters in source sheet: ${err.message}`,
        severity: 'error'
      }],
      warnings: [`Failed to parse CSV format: ${err.message}`],
      totalStudents: 0,
      detectedColumns: [],
      mappingDiagnostics: [],
      headerLayout: 'unrecognized',
      summary: { totalRows: 0, validStudents: 0, invalidMarksCount: 0, duplicateCount: 0 }
    };
  }

  // Filter out leading blank rows
  let firstNonEmptyRowIdx = 0;
  while (firstNonEmptyRowIdx < rawRecords.length && isBlankRow(rawRecords[firstNonEmptyRowIdx])) {
    firstNonEmptyRowIdx++;
  }

  if (firstNonEmptyRowIdx >= rawRecords.length) {
    return {
      success: false,
      students: [],
      issues: [{
        id: 'no_data_rows',
        field: 'Spreadsheet',
        originalValue: '',
        expectedFormat: 'Header row + Student rows',
        recommendedCorrection: 'Ensure the spreadsheet has headers and student mark rows.',
        severity: 'error'
      }],
      warnings: ['Spreadsheet contains only empty rows.'],
      totalStudents: 0,
      detectedColumns: [],
      mappingDiagnostics: [],
      headerLayout: 'unrecognized',
      summary: { totalRows: 0, validStudents: 0, invalidMarksCount: 0, duplicateCount: 0 }
    };
  }

  const row1 = rawRecords[firstNonEmptyRowIdx] || [];
  const row2 = rawRecords[firstNonEmptyRowIdx + 1] || [];

  // Determine header layout:
  // Two-row grouped header test: Row 1 contains "Internal-I" / "Internal-II" / "CAT-1", etc.
  const row1Clean = row1.map(cleanHeader);
  const row2Clean = row2.map(cleanHeader);

  // Distinguish two-row grouped headers from single-row headers:
  // 1. In a two-row grouped header, row 1 contains standalone exam names (e.g. "Internal-I", "Internal-II")
  //    and does NOT contain combined subject+CAT headers (e.g. "DL CAT-1").
  // 2. Row 2 must NOT look like a student data record (e.g. starting with numeric slNo or student register number).
  const row2LooksLikeData = row2.length > 0 && (
    /^\d+$/.test(row2[0]?.trim()) ||
    /^22[a-z]{2}/i.test(row2[0]?.trim()) ||
    /^22[a-z]{2}/i.test(row2[1]?.trim()) ||
    /^22[a-z]{2}/i.test(row2[2]?.trim()) ||
    /^cs\d+/i.test(row2[0]?.trim()) ||
    /^cs\d+/i.test(row2[1]?.trim())
  );

  const hasCombinedSubjectCatInRow1 = row1Clean.some(
    c => SUBJECT_CODES.some(sc => c.includes(cleanHeader(sc)) && (c.includes('cat') || c.includes('internal')))
  );

  const hasGroupedCatInRow1 = !hasCombinedSubjectCatInRow1 && !row2LooksLikeData && row1Clean.some(
    c => c === 'internal1' || c === 'internali' || c === 'cat1' ||
         c === 'internal2' || c === 'internalii' || c === 'cat2' ||
         c === 'internal3' || c === 'internaliii' || c === 'cat3' ||
         c.startsWith('internal') || c.startsWith('cat')
  );

  let headerLayout: 'two_row_grouped' | 'single_row' | 'unrecognized' = 'unrecognized';
  let dataStartRow = 0;
  const columnMappings: ColumnMapping[] = [];

  const maxCols = Math.max(row1.length, row2.length);

  if (hasGroupedCatInRow1 && rawRecords.length >= firstNonEmptyRowIdx + 3) {
    headerLayout = 'two_row_grouped';
    dataStartRow = firstNonEmptyRowIdx + 2;

    // Propagate merged CAT headers across empty cells in Row 1
    let activeCat: CatExam | undefined = undefined;
    let activeSubject: SubjectCode | undefined = undefined;

    for (let c = 0; c < maxCols; c++) {
      const cell1 = (row1[c] || '').trim();
      const cell2 = (row2[c] || '').trim();
      const c1Clean = cleanHeader(cell1);
      const c2Clean = cleanHeader(cell2);

      // Detect CAT change in Row 1: Check Internal-III, then Internal-II, then Internal-I
      // (Order is critical: checking 'internali' first would falsely match 'internalii' and 'internaliii')
      if (
        c1Clean.includes('internaliii') ||
        c1Clean.includes('internal3') ||
        c1Clean.includes('cat3') ||
        /internal[-_\s]*3\b|internal[-_\s]*iii\b|cat[-_\s]*3\b/i.test(cell1)
      ) {
        activeCat = 'CAT-3';
        activeSubject = undefined;
      } else if (
        c1Clean.includes('internalii') ||
        c1Clean.includes('internal2') ||
        c1Clean.includes('cat2') ||
        /internal[-_\s]*2\b|internal[-_\s]*ii\b|cat[-_\s]*2\b/i.test(cell1)
      ) {
        activeCat = 'CAT-2';
        activeSubject = undefined;
      } else if (
        c1Clean.includes('internali') ||
        c1Clean.includes('internal1') ||
        c1Clean.includes('cat1') ||
        /internal[-_\s]*1\b|internal[-_\s]*i\b|cat[-_\s]*1\b/i.test(cell1)
      ) {
        activeCat = 'CAT-1';
        activeSubject = undefined;
      }

      // Detect Identity Columns (typically columns A, B, C or identified by headers in row 1 or row 2)
      if (c === 0 && (c1Clean.includes('reg') || c2Clean.includes('reg') || c === 0)) {
        columnMappings.push({ colIdx: c, type: 'regNo' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: cell1,
          headerRow2: cell2,
          assignedFieldType: 'identity',
          description: 'Register Number'
        });
        continue;
      } else if (c === 1 && (c1Clean.includes('roll') || c2Clean.includes('roll') || c === 1)) {
        columnMappings.push({ colIdx: c, type: 'rollNo' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: cell1,
          headerRow2: cell2,
          assignedFieldType: 'identity',
          description: 'Roll Number'
        });
        continue;
      } else if (c === 2 && (c1Clean.includes('name') || c2Clean.includes('name') || c === 2)) {
        columnMappings.push({ colIdx: c, type: 'name' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: cell1,
          headerRow2: cell2,
          assignedFieldType: 'identity',
          description: 'Student Name'
        });
        continue;
      }

      // Under an active CAT: Identify Subject & Component in Row 2
      if (activeCat) {
        // Detect subject in cell2 or fallback to activeSubject
        let detectedSubj: SubjectCode | undefined = undefined;
        for (const sc of SUBJECT_CODES) {
          const scClean = cleanHeader(sc);
          if (c2Clean.includes(scClean) || (sc === 'RE&CCE' && (c2Clean.includes('recce') || c2Clean.includes('reandcce') || c2Clean.includes('cce')))) {
            detectedSubj = sc;
            break;
          }
        }

        if (detectedSubj) {
          activeSubject = detectedSubj;
        }

        const isAssessment = c2Clean.includes('assess');
        const isAssignment = c2Clean.includes('assign') || c2Clean.includes('asgn');

        if (activeSubject) {
          if (isAssessment) {
            columnMappings.push({ colIdx: c, cat: activeCat, subject: activeSubject, type: 'assessment' });
            mappingDiagnostics.push({
              columnIndex: c,
              columnLetter: colIndexToLetter(c),
              headerRow1: cell1,
              headerRow2: cell2,
              assignedCat: activeCat,
              assignedSubject: activeSubject,
              assignedFieldType: 'assessment',
              description: `${activeCat} ${activeSubject} Assessment`
            });
            continue;
          } else if (isAssignment) {
            columnMappings.push({ colIdx: c, cat: activeCat, subject: activeSubject, type: 'assignment' });
            mappingDiagnostics.push({
              columnIndex: c,
              columnLetter: colIndexToLetter(c),
              headerRow1: cell1,
              headerRow2: cell2,
              assignedCat: activeCat,
              assignedSubject: activeSubject,
              assignedFieldType: 'assignment',
              description: `${activeCat} ${activeSubject} Assignment`
            });
            continue;
          } else {
            // Main CAT Subject Mark
            columnMappings.push({ colIdx: c, cat: activeCat, subject: activeSubject, type: 'mark' });
            mappingDiagnostics.push({
              columnIndex: c,
              columnLetter: colIndexToLetter(c),
              headerRow1: cell1,
              headerRow2: cell2,
              assignedCat: activeCat,
              assignedSubject: activeSubject,
              assignedFieldType: 'mark',
              description: `${activeCat} ${activeSubject} Exam Mark`
            });
            continue;
          }
        }
      }

      // Also check standard positional fallback for the known 40-column layout (Columns A to AN)
      const positional = getPositionalField(c);
      if (positional) {
        columnMappings.push({ colIdx: c, ...positional });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: cell1,
          headerRow2: cell2,
          assignedCat: positional.cat,
          assignedSubject: positional.subject,
          assignedFieldType: positional.type as any,
          description: `Positional mapping: ${positional.cat || ''} ${positional.subject || ''} ${positional.type}`
        });
      } else {
        columnMappings.push({ colIdx: c, type: 'unknown' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: cell1,
          headerRow2: cell2,
          assignedFieldType: 'unassigned',
          description: 'Unassigned column'
        });
      }
    }
  } else {
    // Single header row format
    headerLayout = 'single_row';
    dataStartRow = firstNonEmptyRowIdx + 1;

    for (let c = 0; c < row1.length; c++) {
      const h = (row1[c] || '').trim();
      const hc = cleanHeader(h);

      if (hc.includes('registerno') || hc.includes('regno') || hc.includes('reg') || (c === 0 && hc.includes('no'))) {
        columnMappings.push({ colIdx: c, type: 'regNo' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: h,
          headerRow2: '',
          assignedFieldType: 'identity',
          description: 'Register Number'
        });
        continue;
      }

      if (hc.includes('rollno') || hc.includes('rollnumber') || hc.includes('roll')) {
        columnMappings.push({ colIdx: c, type: 'rollNo' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: h,
          headerRow2: '',
          assignedFieldType: 'identity',
          description: 'Roll Number'
        });
        continue;
      }

      if (hc.includes('name') || hc.includes('studentname')) {
        columnMappings.push({ colIdx: c, type: 'name' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: h,
          headerRow2: '',
          assignedFieldType: 'identity',
          description: 'Student Name'
        });
        continue;
      }

      // Check CAT and Subject in header string (check CAT-3 and CAT-2 before CAT-1)
      let matchedCat: CatExam | undefined = undefined;
      const catCheckOrder: CatExam[] = ['CAT-3', 'CAT-2', 'CAT-1'];
      for (const cat of catCheckOrder) {
        const catClean = cleanHeader(cat);
        const internalClean = cat === 'CAT-3' ? 'internal3' : cat === 'CAT-2' ? 'internal2' : 'internal1';
        const internalRoman = cat === 'CAT-3' ? 'internaliii' : cat === 'CAT-2' ? 'internalii' : 'internali';
        const catNum = cat.replace('CAT-', '');
        if (
          hc.includes(catClean) ||
          hc.includes(internalClean) ||
          hc.includes(internalRoman) ||
          hc.includes(`cat${catNum}`)
        ) {
          matchedCat = cat;
          break;
        }
      }

      let matchedSubj: SubjectCode | undefined = undefined;
      for (const sc of SUBJECT_CODES) {
        const scClean = cleanHeader(sc);
        if (hc.includes(scClean) || (sc === 'RE&CCE' && (hc.includes('recce') || hc.includes('reandcce') || hc.includes('cce')))) {
          matchedSubj = sc;
          break;
        }
      }

      const isAssessment = hc.includes('assess');
      const isAssignment = hc.includes('assign') || hc.includes('asgn');

      if (matchedSubj) {
        const catToUse = matchedCat || 'CAT-1'; // default to CAT-1 if only subject specified in single row
        if (isAssessment) {
          columnMappings.push({ colIdx: c, cat: catToUse, subject: matchedSubj, type: 'assessment' });
          mappingDiagnostics.push({
            columnIndex: c,
            columnLetter: colIndexToLetter(c),
            headerRow1: h,
            headerRow2: '',
            assignedCat: catToUse,
            assignedSubject: matchedSubj,
            assignedFieldType: 'assessment',
            description: `${catToUse} ${matchedSubj} Assessment`
          });
        } else if (isAssignment) {
          columnMappings.push({ colIdx: c, cat: catToUse, subject: matchedSubj, type: 'assignment' });
          mappingDiagnostics.push({
            columnIndex: c,
            columnLetter: colIndexToLetter(c),
            headerRow1: h,
            headerRow2: '',
            assignedCat: catToUse,
            assignedSubject: matchedSubj,
            assignedFieldType: 'assignment',
            description: `${catToUse} ${matchedSubj} Assignment`
          });
        } else {
          columnMappings.push({ colIdx: c, cat: catToUse, subject: matchedSubj, type: 'mark' });
          mappingDiagnostics.push({
            columnIndex: c,
            columnLetter: colIndexToLetter(c),
            headerRow1: h,
            headerRow2: '',
            assignedCat: catToUse,
            assignedSubject: matchedSubj,
            assignedFieldType: 'mark',
            description: `${catToUse} ${matchedSubj} Mark`
          });
        }
      } else {
        columnMappings.push({ colIdx: c, type: 'unknown' });
        mappingDiagnostics.push({
          columnIndex: c,
          columnLetter: colIndexToLetter(c),
          headerRow1: h,
          headerRow2: '',
          assignedFieldType: 'unassigned',
          description: 'Unassigned column'
        });
      }
    }
  }

  // Count marks columns found
  const markCols = columnMappings.filter(m => m.type === 'mark');
  if (markCols.length === 0) {
    issues.push({
      id: 'missing_all_mark_columns',
      field: 'Academic Mark Columns',
      originalValue: '0 mark columns detected',
      expectedFormat: 'Grouped Internal-I/II/III headers or CAT subject columns',
      recommendedCorrection: 'Ensure the sheet tab contains academic examination marks for DL, GEN AI, RL, BA, RE&CCE.',
      severity: 'error'
    });
    return {
      success: false,
      students: [],
      issues,
      warnings: ['No academic examination mark columns detected in the sheet.'],
      totalStudents: 0,
      detectedColumns: row1,
      mappingDiagnostics,
      headerLayout,
      summary: { totalRows: rawRecords.length, validStudents: 0, invalidMarksCount: 0, duplicateCount: 0 }
    };
  }

  // Find identity column indices
  let regCol = columnMappings.find(m => m.type === 'regNo')?.colIdx ?? 0;
  let rollCol = columnMappings.find(m => m.type === 'rollNo')?.colIdx ?? 1;
  const nameCol = columnMappings.find(m => m.type === 'name')?.colIdx ?? 2;

  // Verify whether rollNo and regNo columns are reversed in the spreadsheet headers.
  // In academic marksheets:
  // - Class Roll Number is typically a serial / class roll: '1', '2', '3'..., or short class ID 'CS001'.
  // - University Register Number is a university-assigned ID: 'TU6243202111001'..., typically 8+ chars or starts with university prefix (TU...).
  let sampleRollColHasLongIds = 0;
  let sampleRegColHasSmallInts = 0;
  let sampleChecked = 0;

  const sampleLimit = Math.min(rawRecords.length, dataStartRow + 10);
  for (let s = dataStartRow; s < sampleLimit; s++) {
    const sRow = rawRecords[s];
    if (isBlankRow(sRow)) continue;
    const vReg = (sRow[regCol] || '').trim();
    const vRoll = (sRow[rollCol] || '').trim();
    if (!vReg && !vRoll) continue;
    sampleChecked++;

    if (/^\d{1,4}$/.test(vReg)) {
      sampleRegColHasSmallInts++;
    }
    if (/^[a-zA-Z]{1,4}\d{4,}/.test(vRoll) || vRoll.length >= 8) {
      sampleRollColHasLongIds++;
    }
  }

  // If the column identified as regNo contains small integers (1, 2, 3...)
  // and the column identified as rollNo contains long university IDs (TU6243202111001...),
  // swap the column assignments so rollNo gets class roll and regNo gets university register number.
  if (sampleChecked > 0 && sampleRegColHasSmallInts >= sampleChecked * 0.7 && sampleRollColHasLongIds >= sampleChecked * 0.7) {
    const tempCol = regCol;
    regCol = rollCol;
    rollCol = tempCol;
  }

  const headerParseDurationMs = performance.now() - totalParseStart;
  const studentParseStart = performance.now();

  // Build which subject/CAT components are configured in this spreadsheet
  const configuredComponents = new Set<string>();
  // Direct O(1) index lookups for fast mark, assessment, and assignment access
  const markColMap = new Map<string, number>();
  const assessColMap = new Map<string, number>();
  const assignColMap = new Map<string, number>();

  columnMappings.forEach(m => {
    if (m.cat && m.subject) {
      const key = `${m.cat}_${m.subject}`;
      configuredComponents.add(`${key}_${m.type}`);
      if (m.type === 'mark') markColMap.set(key, m.colIdx);
      else if (m.type === 'assessment') assessColMap.set(key, m.colIdx);
      else if (m.type === 'assignment') assignColMap.set(key, m.colIdx);
    }
  });

  // Parse Student Rows
  const students: Student[] = [];
  const seenRegs = new Set<string>();
  let duplicateCount = 0;
  let invalidMarksCount = 0;

  for (let r = dataStartRow; r < rawRecords.length; r++) {
    const row = rawRecords[r];
    if (isBlankRow(row)) {
      continue; // Exclude completely empty rows
    }

    let regNoRaw = row[regCol] !== undefined ? String(row[regCol]).trim() : '';
    let rollNoRaw = row[rollCol] !== undefined ? String(row[rollCol]).trim() : '';
    const nameRaw = row[nameCol] !== undefined ? String(row[nameCol]).trim() : '';

    // Row-level safety reconciliation: if regNoRaw is a short integer and rollNoRaw is a university reg number, swap them
    if (/^\d{1,4}$/.test(regNoRaw) && (/^[a-zA-Z]{1,4}\d{4,}/.test(rollNoRaw) || rollNoRaw.length >= 8)) {
      const temp = regNoRaw;
      regNoRaw = rollNoRaw;
      rollNoRaw = temp;
    }

    // Ignore secondary header rows or summary rows (e.g. "Total", "Average", "Pass %")
    const cleanName = nameRaw.toLowerCase();
    if (cleanName.includes('average') || cleanName.includes('percentage') || cleanName.includes('passed') || cleanName.includes('failed')) {
      continue;
    }

    // Must have at least a name or register/roll number to be a student
    if (!nameRaw && !regNoRaw && !rollNoRaw) {
      continue;
    }

    if (!nameRaw) {
      issues.push({
        id: `missing_name_row_${r + 1}`,
        rollNumber: rollNoRaw,
        registerNumber: regNoRaw,
        field: 'Student Name',
        originalValue: '',
        expectedFormat: 'Student Name',
        recommendedCorrection: `Provide student name at row ${r + 1} (Reg No: ${regNoRaw || rollNoRaw}).`,
        severity: 'error'
      });
    }

    // Check duplicate register numbers
    const studentIdentity = regNoRaw || rollNoRaw || `STUDENT_${r + 1}`;
    if (regNoRaw) {
      if (seenRegs.has(regNoRaw)) {
        duplicateCount++;
        issues.push({
          id: `dup_reg_${regNoRaw}_row_${r + 1}`,
          studentName: nameRaw,
          rollNumber: rollNoRaw,
          registerNumber: regNoRaw,
          field: 'Register Number',
          originalValue: regNoRaw,
          expectedFormat: 'Unique Register Number',
          recommendedCorrection: `Resolve duplicate register number ${regNoRaw} for ${nameRaw}.`,
          severity: 'error'
        });
      } else {
        seenRegs.add(regNoRaw);
      }
    }

    // Parse CAT Exam Marks, Assessments & Assignments per CAT
    const catFullRecords: Record<CatExam, Record<SubjectCode, SubjectFullRecord>> = {
      'CAT-1': {} as any,
      'CAT-2': {} as any,
      'CAT-3': {} as any
    };
    const catPerformance: Record<CatExam, CatPerformance> = {} as any;
    const assessments: Record<string, SubmissionRecord> = {};
    const assignments: Record<string, SubmissionRecord> = {};

    for (const cat of CAT_EXAMS) {
      const internalName = CAT_INTERNAL_MAP[cat] || cat;
      const subjectExamRecords: Record<SubjectCode, any> = {} as any;

      for (const subj of SUBJECT_CODES) {
        const key = `${cat}_${subj}`;

        // 1. Examination Mark (O(1) index lookup)
        const markColIdx = markColMap.get(key);
        const rawMarkCell = markColIdx !== undefined && markColIdx < row.length ? row[markColIdx] : undefined;
        const examClassified = classifySubjectMark(rawMarkCell, config);
        subjectExamRecords[subj] = examClassified;

        if (examClassified.status === 'INVALID') {
          invalidMarksCount++;
          issues.push({
            id: `invalid_mark_${studentIdentity}_${subj}_${cat}`,
            studentName: nameRaw,
            rollNumber: rollNoRaw,
            registerNumber: regNoRaw,
            subject: subj,
            cat,
            field: `${subj} ${cat} Mark`,
            originalValue: String(rawMarkCell ?? ''),
            expectedFormat: `0 to ${config.maxMarks}, or 'A' / 'ABSENT'`,
            recommendedCorrection: examClassified.invalidReason || 'Verify mark value in spreadsheet',
            severity: 'error'
          });
        } else if (rawMarkCell !== undefined && rawMarkCell !== null) {
          const strRaw = String(rawMarkCell).trim();
          if (/^\d+,\d+$/.test(strRaw)) {
            issues.push({
              id: `warning_decimal_comma_${studentIdentity}_${subj}_${cat}`,
              studentName: nameRaw,
              rollNumber: rollNoRaw,
              registerNumber: regNoRaw,
              subject: subj,
              cat,
              field: `${subj} ${cat} Mark`,
              originalValue: strRaw,
              expectedFormat: `0 to ${config.maxMarks}`,
              recommendedCorrection: `Safely normalized decimal comma '${strRaw}' to numeric ${examClassified.numericMark} (Status: ${examClassified.status}).`,
              severity: 'warning'
            });
          } else if (/^[`'"]+\d+/.test(strRaw)) {
            issues.push({
              id: `warning_formatted_mark_${studentIdentity}_${subj}_${cat}`,
              studentName: nameRaw,
              rollNumber: rollNoRaw,
              registerNumber: regNoRaw,
              subject: subj,
              cat,
              field: `${subj} ${cat} Mark`,
              originalValue: strRaw,
              expectedFormat: `0 to ${config.maxMarks}`,
              recommendedCorrection: `Safely normalized formatted mark '${strRaw}' to numeric ${examClassified.numericMark} (Status: ${examClassified.status}).`,
              severity: 'warning'
            });
          }
        }

        // 2. Assessment (O(1) index lookup)
        let assessComponent: any;
        let assessSubmission: SubmissionRecord;

        if (subj === 'RE&CCE') {
          assessComponent = {
            rawValue: null,
            numericMark: null,
            status: 'NOT_APPLICABLE',
            isApplicable: false
          };
          assessSubmission = {
            subject: subj,
            cat,
            itemType: 'Assessment',
            rawValue: null,
            numericMark: null,
            status: 'NOT_APPLICABLE',
            isConfigured: false,
            isApplicable: false
          };
        } else {
          const isAssessConfigured = configuredComponents.has(`${key}_assessment`);
          const assessColIdx = assessColMap.get(key);
          const rawAssess = assessColIdx !== undefined && assessColIdx < row.length ? row[assessColIdx] : undefined;

          if (!isAssessConfigured) {
            assessComponent = {
              rawValue: null,
              numericMark: null,
              status: 'NOT CONFIGURED',
              isApplicable: false
            };
            assessSubmission = {
              subject: subj,
              cat,
              itemType: 'Assessment',
              rawValue: null,
              numericMark: null,
              status: 'NOT CONFIGURED',
              isConfigured: false,
              isApplicable: false
            };
          } else {
            const parsed = classifySubmission(rawAssess, subj, 'Assessment', cat, true);
            assessComponent = {
              rawValue: parsed.rawValue,
              numericMark: parsed.numericMark,
              status: parsed.status,
              isApplicable: true,
              invalidReason: parsed.invalidReason
            };
            assessSubmission = {
              ...parsed,
              isConfigured: true,
              isApplicable: true
            };

            if (parsed.status === 'INVALID') {
              issues.push({
                id: `invalid_assess_${studentIdentity}_${subj}_${cat}`,
                studentName: nameRaw,
                rollNumber: rollNoRaw,
                registerNumber: regNoRaw,
                subject: subj,
                cat,
                field: `${subj} ${cat} Assessment`,
                originalValue: String(rawAssess ?? ''),
                expectedFormat: "Numeric mark or 'NS'",
                recommendedCorrection: parsed.invalidReason || 'Fix assessment score in spreadsheet',
                severity: 'error'
              });
            }
          }
        }

        // 3. Assignment (O(1) index lookup)
        let assignComponent: any;
        let assignSubmission: SubmissionRecord;

        if (subj === 'RE&CCE') {
          assignComponent = {
            rawValue: null,
            numericMark: null,
            status: 'NOT_APPLICABLE',
            isApplicable: false
          };
          assignSubmission = {
            subject: subj,
            cat,
            itemType: 'Assignment',
            rawValue: null,
            numericMark: null,
            status: 'NOT_APPLICABLE',
            isConfigured: false,
            isApplicable: false
          };
        } else {
          const isAssignConfigured = configuredComponents.has(`${key}_assignment`);
          const assignColIdx = assignColMap.get(key);
          const rawAssign = assignColIdx !== undefined && assignColIdx < row.length ? row[assignColIdx] : undefined;

          if (!isAssignConfigured) {
            assignComponent = {
              rawValue: null,
              numericMark: null,
              status: 'NOT CONFIGURED',
              isApplicable: false
            };
            assignSubmission = {
              subject: subj,
              cat,
              itemType: 'Assignment',
              rawValue: null,
              numericMark: null,
              status: 'NOT CONFIGURED',
              isConfigured: false,
              isApplicable: false
            };
          } else {
            const parsed = classifySubmission(rawAssign, subj, 'Assignment', cat, true);
            assignComponent = {
              rawValue: parsed.rawValue,
              numericMark: parsed.numericMark,
              status: parsed.status,
              isApplicable: true,
              invalidReason: parsed.invalidReason
            };
            assignSubmission = {
              ...parsed,
              isConfigured: true,
              isApplicable: true
            };

            if (parsed.status === 'INVALID') {
              issues.push({
                id: `invalid_assign_${studentIdentity}_${subj}_${cat}`,
                studentName: nameRaw,
                rollNumber: rollNoRaw,
                registerNumber: regNoRaw,
                subject: subj,
                cat,
                field: `${subj} ${cat} Assignment`,
                originalValue: String(rawAssign ?? ''),
                expectedFormat: "Numeric mark or 'NS'",
                recommendedCorrection: parsed.invalidReason || 'Fix assignment score in spreadsheet',
                severity: 'error'
              });
            }
          }
        }

        const fullRecord: SubjectFullRecord = {
          subject: subj,
          subjectName: SUBJECT_NAMES[subj] || subj,
          raw: examClassified.raw,
          numericMark: examClassified.numericMark,
          status: examClassified.status,
          examRaw: examClassified.raw,
          examMark: examClassified.numericMark,
          examStatus: examClassified.status,
          invalidReason: examClassified.invalidReason,
          assessment: assessComponent,
          assignment: assignComponent
        };

        catFullRecords[cat][subj] = fullRecord;
        assessments[`${cat}_${subj}`] = assessSubmission;
        assignments[`${cat}_${subj}`] = assignSubmission;

        if (cat === 'CAT-1') {
          assessments[subj] = assessSubmission;
          assignments[subj] = assignSubmission;
        }
      }

      catPerformance[cat] = {
        cat,
        internalName,
        overallStatus: computeOverallCatStatus(subjectExamRecords),
        subjects: catFullRecords[cat]
      };
    }

    students.push({
      id: studentIdentity,
      slNo: students.length + 1,
      rollNumber: rollNoRaw || studentIdentity,
      rollNo: rollNoRaw || studentIdentity,
      registerNumber: regNoRaw || studentIdentity,
      registerNo: regNoRaw || studentIdentity,
      name: nameRaw || `Student ${students.length + 1}`,
      studentName: nameRaw || `Student ${students.length + 1}`,
      department: config.departmentName || 'BSC CS AI&ML',
      cat1: catFullRecords['CAT-1'],
      cat2: catFullRecords['CAT-2'],
      cat3: catFullRecords['CAT-3'],
      catMarks: catPerformance,
      assessments,
      assignments
    });
  }

  const studentParseDurationMs = performance.now() - studentParseStart;
  const totalParseDurationMs = performance.now() - totalParseStart;

  return {
    success: true,
    students,
    issues,
    warnings,
    totalStudents: students.length,
    detectedColumns: row1,
    mappingDiagnostics,
    headerLayout,
    headerParseDurationMs,
    studentParseDurationMs,
    totalParseDurationMs,
    summary: {
      totalRows: rawRecords.length,
      validStudents: students.length,
      invalidMarksCount,
      duplicateCount
    }
  };
}

/**
 * Standard fixed mapping fallback for the supplied 40-column spreadsheet layout (Columns A to AN)
 */
function getPositionalField(colIdx: number): { cat?: CatExam; subject?: SubjectCode; type: 'mark' | 'assessment' | 'assignment' } | null {
  // Column 3 = D (DL CAT-1 mark)
  const map: Record<number, { cat: CatExam; subject: SubjectCode; type: 'mark' | 'assessment' | 'assignment' }> = {
    // Internal-I / CAT-1 (Cols D to N: 3 to 13)
    3: { cat: 'CAT-1', subject: 'DL', type: 'mark' },
    4: { cat: 'CAT-1', subject: 'DL', type: 'assessment' },
    5: { cat: 'CAT-1', subject: 'DL', type: 'assignment' },
    6: { cat: 'CAT-1', subject: 'GEN AI', type: 'mark' },
    7: { cat: 'CAT-1', subject: 'GEN AI', type: 'assessment' },
    8: { cat: 'CAT-1', subject: 'GEN AI', type: 'assignment' },
    9: { cat: 'CAT-1', subject: 'RL', type: 'mark' },
    10: { cat: 'CAT-1', subject: 'RL', type: 'assignment' },
    11: { cat: 'CAT-1', subject: 'BA', type: 'mark' },
    12: { cat: 'CAT-1', subject: 'BA', type: 'assignment' },
    13: { cat: 'CAT-1', subject: 'RE&CCE', type: 'mark' },

    // Internal-II / CAT-2 (Cols O to AA: 14 to 26)
    14: { cat: 'CAT-2', subject: 'DL', type: 'mark' },
    15: { cat: 'CAT-2', subject: 'DL', type: 'assessment' },
    16: { cat: 'CAT-2', subject: 'DL', type: 'assignment' },
    17: { cat: 'CAT-2', subject: 'GEN AI', type: 'mark' },
    18: { cat: 'CAT-2', subject: 'GEN AI', type: 'assessment' },
    19: { cat: 'CAT-2', subject: 'GEN AI', type: 'assignment' },
    20: { cat: 'CAT-2', subject: 'RL', type: 'mark' },
    21: { cat: 'CAT-2', subject: 'RL', type: 'assessment' },
    22: { cat: 'CAT-2', subject: 'RL', type: 'assignment' },
    23: { cat: 'CAT-2', subject: 'BA', type: 'mark' },
    24: { cat: 'CAT-2', subject: 'BA', type: 'assessment' },
    25: { cat: 'CAT-2', subject: 'BA', type: 'assignment' },
    26: { cat: 'CAT-2', subject: 'RE&CCE', type: 'mark' },

    // Internal-III / CAT-3 (Cols AB to AN: 27 to 39)
    27: { cat: 'CAT-3', subject: 'DL', type: 'mark' },
    28: { cat: 'CAT-3', subject: 'DL', type: 'assessment' },
    29: { cat: 'CAT-3', subject: 'DL', type: 'assignment' },
    30: { cat: 'CAT-3', subject: 'GEN AI', type: 'mark' },
    31: { cat: 'CAT-3', subject: 'GEN AI', type: 'assessment' },
    32: { cat: 'CAT-3', subject: 'GEN AI', type: 'assignment' },
    33: { cat: 'CAT-3', subject: 'RL', type: 'mark' },
    34: { cat: 'CAT-3', subject: 'RL', type: 'assessment' },
    35: { cat: 'CAT-3', subject: 'RL', type: 'assignment' },
    36: { cat: 'CAT-3', subject: 'BA', type: 'mark' },
    37: { cat: 'CAT-3', subject: 'BA', type: 'assessment' },
    38: { cat: 'CAT-3', subject: 'BA', type: 'assignment' },
    39: { cat: 'CAT-3', subject: 'RE&CCE', type: 'mark' },
  };

  return map[colIdx] || null;
}
