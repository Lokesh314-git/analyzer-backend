import { describe, it, expect } from 'vitest';
import {
  CAT_EXAMS,
  CAT_INTERNAL_MAP,
  SUBJECT_CODES,
  APPLICABLE_ASSESSMENT_SUBJECTS,
  CatExam,
  SubjectCode
} from '../types/academic.types.js';
import {
  classifySubjectMark,
  computeOverallCatStatus,
  classifySubmission
} from '../services/analytics/academicEngine.js';
import { getAcademicConfig } from '../config/academic.config.js';
import { parseSpreadsheetCsv } from '../services/googleSheets/sheetValidator.js';
import { generateTestFixtureStudents } from './fixtures/testMarksheet.js';
import { computeSubjectAnalytics } from '../services/analytics/subjectAnalytics.js';
import { getSubmissionTracking } from '../services/analytics/trackingEngine.js';

describe('Section J: Verification Test Cases for Complete CAT, Assessment & Assignment Architecture', () => {
  const config = getAcademicConfig();

  // 1. Exactly 3 CAT examinations exist
  it('1. Exactly 3 CAT examinations exist: CAT-1, CAT-2, CAT-3', () => {
    expect(CAT_EXAMS).toHaveLength(3);
    expect(CAT_EXAMS).toEqual(['CAT-1', 'CAT-2', 'CAT-3']);
  });

  // 2. Internal-I maps to CAT-1, Internal-II to CAT-2, Internal-III to CAT-3
  it('2. Internal-I maps to CAT-1, Internal-II to CAT-2, Internal-III to CAT-3', () => {
    expect(CAT_INTERNAL_MAP['CAT-1']).toBe('Internal-I');
    expect(CAT_INTERNAL_MAP['CAT-2']).toBe('Internal-II');
    expect(CAT_INTERNAL_MAP['CAT-3']).toBe('Internal-III');
  });

  // 3. Every student has marks for all 5 subjects in every CAT
  it('3. Every student has marks for all 5 subjects (DL, GEN AI, RL, BA, RE&CCE) in every CAT', () => {
    const students = generateTestFixtureStudents();
    expect(students.length).toBeGreaterThan(0);

    for (const student of students) {
      for (const cat of CAT_EXAMS) {
        const catRecord = student.catMarks[cat];
        expect(catRecord).toBeDefined();
        expect(catRecord.cat).toBe(cat);
        expect(catRecord.internalName).toBe(CAT_INTERNAL_MAP[cat]);

        for (const subj of SUBJECT_CODES) {
          const subjectRecord = catRecord.subjects[subj];
          expect(subjectRecord).toBeDefined();
          expect(subjectRecord.subject).toBe(subj);
          expect(subjectRecord.examStatus).toBeDefined();
        }

        // Also test direct student.cat1, cat2, cat3 access
        const directCat = cat === 'CAT-1' ? student.cat1 : cat === 'CAT-2' ? student.cat2 : student.cat3;
        expect(directCat).toBeDefined();
        for (const subj of SUBJECT_CODES) {
          expect(directCat[subj]).toBeDefined();
          expect(directCat[subj].examStatus).toBeDefined();
        }
      }
    }
  });

  // 4. Maximum mark for examination is 40
  it('4. Maximum mark for examination is 40 (marks > 40 flagged as INVALID)', () => {
    expect(config.maxMarks).toBe(40);

    const validMax = classifySubjectMark(40, config);
    expect(validMax.status).toBe('PASS');
    expect(validMax.numericMark).toBe(40);

    const overMax = classifySubjectMark(41, config);
    expect(overMax.status).toBe('INVALID');
    expect(overMax.invalidReason).toContain('exceeds maximum permitted marks');
  });

  // 5. Passing mark is 16
  it('5. Passing mark is 16 (15 is FAIL, 16 is PASS)', () => {
    expect(config.passingMarks).toBe(16);

    const belowPass = classifySubjectMark(15, config);
    expect(belowPass.status).toBe('FAIL');
    expect(belowPass.numericMark).toBe(15);

    const atPass = classifySubjectMark(16, config);
    expect(atPass.status).toBe('PASS');
    expect(atPass.numericMark).toBe(16);
  });

  // 6. Passing student has all subject marks >= 16
  it('6. Passing student has all 5 subject marks >= 16', () => {
    const subjectMarks: Record<SubjectCode, any> = {
      'DL': classifySubjectMark(16, config),
      'GEN AI': classifySubjectMark(20, config),
      'RL': classifySubjectMark(18, config),
      'BA': classifySubjectMark(25, config),
      'RE&CCE': classifySubjectMark(30, config)
    };

    const overall = computeOverallCatStatus(subjectMarks);
    expect(overall).toBe('PASS');
  });

  // 7. Failing student has at least one subject mark < 16
  it('7. Failing student has at least one subject mark < 16', () => {
    const subjectMarks: Record<SubjectCode, any> = {
      'DL': classifySubjectMark(16, config),
      'GEN AI': classifySubjectMark(20, config),
      'RL': classifySubjectMark(18, config),
      'BA': classifySubjectMark(25, config),
      'RE&CCE': classifySubjectMark(15, config) // FAIL
    };

    const overall = computeOverallCatStatus(subjectMarks);
    expect(overall).toBe('FAIL');
  });

  // 8. RE&CCE has NO assessment or assignment records
  it('8. RE&CCE has NO assessment or assignment records (strictly NOT_APPLICABLE and excluded from tracking)', () => {
    expect(APPLICABLE_ASSESSMENT_SUBJECTS).not.toContain('RE&CCE');

    const students = generateTestFixtureStudents();
    for (const student of students) {
      for (const cat of CAT_EXAMS) {
        const catRecord = cat === 'CAT-1' ? student.cat1 : cat === 'CAT-2' ? student.cat2 : student.cat3;
        const recceRecord = catRecord['RE&CCE'];

        expect(recceRecord.assessment.status).toBe('NOT_APPLICABLE');
        expect(recceRecord.assessment.isApplicable).toBe(false);
        expect(recceRecord.assessment.numericMark).toBeNull();
        expect(recceRecord.assessment.rawValue).toBeNull();

        expect(recceRecord.assignment.status).toBe('NOT_APPLICABLE');
        expect(recceRecord.assignment.isApplicable).toBe(false);
        expect(recceRecord.assignment.numericMark).toBeNull();
        expect(recceRecord.assignment.rawValue).toBeNull();
      }
    }

    // Tracking analytics must exclude RE&CCE from default tracked items
    const tracking = getSubmissionTracking(students, 'Assessment');
    const recceItems = tracking.items.filter(i => i.subject === 'RE&CCE');
    expect(recceItems).toHaveLength(0);

    // Subject analytics for RE&CCE must indicate non-applicability
    const recceAnalytics = computeSubjectAnalytics('RE&CCE', students);
    expect(recceAnalytics.isAssessmentApplicable).toBe(false);
    expect(recceAnalytics.isAssignmentApplicable).toBe(false);
  });

  // 9. DL, GEN AI, RL and BA have assessment and assignment records
  it('9. DL, GEN AI, RL and BA have assessment and assignment records', () => {
    expect(APPLICABLE_ASSESSMENT_SUBJECTS).toEqual(['DL', 'GEN AI', 'RL', 'BA']);

    const students = generateTestFixtureStudents();
    const s = students[0];

    // DL in CAT-1 has both assessment and assignment
    expect(s.cat1['DL'].assessment.isApplicable).toBe(true);
    expect(s.cat1['DL'].assignment.isApplicable).toBe(true);
    expect(s.cat1['DL'].assessment.status).toBe('SUBMITTED / MARKED');

    // GEN AI in CAT-1 has both assessment and assignment
    expect(s.cat1['GEN AI'].assessment.isApplicable).toBe(true);
    expect(s.cat1['GEN AI'].assignment.isApplicable).toBe(true);

    // RL in CAT-2 has both assessment and assignment
    expect(s.cat2['RL'].assessment.isApplicable).toBe(true);
    expect(s.cat2['RL'].assignment.isApplicable).toBe(true);

    // BA in CAT-2 has both assessment and assignment
    expect(s.cat2['BA'].assessment.isApplicable).toBe(true);
    expect(s.cat2['BA'].assignment.isApplicable).toBe(true);
  });

  // 10. Assessment values are never swapped with assignment values
  it('10. Assessment values are never swapped with assignment values', () => {
    // Construct a test CSV where assessment and assignment have distinct recognizable values
    const row1 = ['Register No', 'Roll No', 'Name', 'Internal-I', '', ''];
    const row2 = ['', '', '', 'DL Mark', 'DL Assess', 'DL Assign'];
    const dataRow = ['22CS001', 'CS001', 'Test Student', '35', '14', '19'];

    const csv = [row1.join(','), row2.join(','), dataRow.join(',')].join('\n');
    const result = parseSpreadsheetCsv(csv);

    expect(result.success).toBe(true);
    const parsedStudent = result.students[0];

    const dlCat1 = parsedStudent.cat1['DL'];
    expect(dlCat1.examMark).toBe(35);
    expect(dlCat1.assessment.numericMark).toBe(14);
    expect(dlCat1.assignment.numericMark).toBe(19);

    // Verify they are never inverted
    expect(dlCat1.assessment.numericMark).not.toBe(19);
    expect(dlCat1.assignment.numericMark).not.toBe(14);
  });

  // 11. Blank values are interpreted as PENDING, never 0 or NS
  it('11. Blank values are interpreted as PENDING, never 0 or NS', () => {
    // Blank in examination
    const blankExam = classifySubjectMark('', config);
    expect(blankExam.status).toBe('PENDING');
    expect(blankExam.numericMark).toBeNull();
    expect(blankExam.numericMark).not.toBe(0);

    // Blank in assessment
    const blankAssess = classifySubmission('', 'DL', 'Assessment', 'CAT-1', true);
    expect(blankAssess.status).toBe('PENDING');
    expect(blankAssess.numericMark).toBeNull();
    expect(blankAssess.numericMark).not.toBe(0);
    expect(blankAssess.status).not.toBe('NOT SUBMITTED');

    // Blank in assignment
    const blankAssign = classifySubmission('  ', 'GEN AI', 'Assignment', 'CAT-1', true);
    expect(blankAssign.status).toBe('PENDING');
    expect(blankAssign.numericMark).toBeNull();
  });

  // 12. NS is interpreted as NOT SUBMITTED, never 0
  it('12. NS is interpreted as NOT SUBMITTED, never 0', () => {
    const nsAssess = classifySubmission('NS', 'DL', 'Assessment', 'CAT-1', true);
    expect(nsAssess.status).toBe('NOT SUBMITTED');
    expect(nsAssess.numericMark).toBeNull();
    expect(nsAssess.numericMark).not.toBe(0);

    const nsAssign = classifySubmission('NS', 'RL', 'Assignment', 'CAT-2', true);
    expect(nsAssign.status).toBe('NOT SUBMITTED');
    expect(nsAssign.numericMark).toBeNull();

    // In contrast, genuine 0 is classified as ZERO MARKS
    const zeroAssess = classifySubmission(0, 'DL', 'Assessment', 'CAT-1', true);
    expect(zeroAssess.status).toBe('ZERO MARKS');
    expect(zeroAssess.numericMark).toBe(0);
    expect(zeroAssess.status).not.toBe('NOT SUBMITTED');
  });

  // 13. Student profile table displays all 5 columns with correct data
  it('13. Student profile table data model provides all 5 columns for each subject per CAT', () => {
    const students = generateTestFixtureStudents();
    const student = students[0];

    for (const cat of CAT_EXAMS) {
      const catData = cat === 'CAT-1' ? student.cat1 : cat === 'CAT-2' ? student.cat2 : student.cat3;

      for (const subj of SUBJECT_CODES) {
        const record = catData[subj];

        // Column 1: Subject
        expect(record.subject).toBe(subj);
        expect(record.subjectName).toBeDefined();

        // Column 2: Exam Mark / 40
        expect(record.examRaw).toBeDefined();

        // Column 3: Exam Status
        expect(record.examStatus).toBeDefined();
        expect(['PASS', 'FAIL', 'ABSENT', 'PENDING', 'INVALID']).toContain(record.examStatus);

        // Column 4: Assessment Mark
        expect(record.assessment).toBeDefined();
        if (subj === 'RE&CCE') {
          expect(record.assessment.status).toBe('NOT_APPLICABLE');
        }

        // Column 5: Assignment Mark
        expect(record.assignment).toBeDefined();
        if (subj === 'RE&CCE') {
          expect(record.assignment.status).toBe('NOT_APPLICABLE');
        }
      }
    }
  });

  // 14. Exact 40-Column Two-Row Grouped Header Mapping (Columns A to AN)
  it('14. Maps the exact 40-column structure: Internal-I (D-N), Internal-II (O-AA), Internal-III (AB-AN)', () => {
    const row1 = ['Register No', 'Roll No', 'Name'];
    const row2 = ['', '', ''];

    // Internal-I (D to N)
    row1.push('INTERNAL - I', '', '', '', '', '', '', '', '', '', '');
    row2.push('DL', 'ASSESSMENT', 'ASSIGNMENT', 'GEN AI', 'ASSESSMENT', 'ASSIGNMENT', 'RL', 'ASSIGNMENT', 'BA', 'ASSIGNMENT', 'RE&CCE');

    // Internal-II (O to AA)
    row1.push('Internal-II', '', '', '', '', '', '', '', '', '', '', '', '');
    row2.push('DL', 'ASSESSMENT', 'ASSIGNMENT', 'GEN AI', 'ASSESSMENT', 'ASSIGNMENT', 'RL', 'ASSESSMENT', 'ASSIGNMENT', 'BA', 'ASSESSMENT', 'ASSIGNMENT', 'RE&CCE');

    // Internal-III (AB to AN)
    row1.push('Internal-III', '', '', '', '', '', '', '', '', '', '', '', '');
    row2.push('DL', 'ASSESSMENT', 'ASSIGNMENT', 'GEN AI', 'ASSESSMENT', 'ASSIGNMENT', 'RL', 'ASSESSMENT', 'ASSIGNMENT', 'BA', 'ASSESSMENT', 'ASSIGNMENT', 'RE&CCE');

    // Student row with distinct marks
    const studentRow = [
      '1', 'TU6243202111001', 'Abitha E',
      // Internal-I (cols 3-13: D-N)
      '33', '5', '5', '32', '5', '', '30', '5', '36.5', '5', '37',
      // Internal-II (cols 14-26: O-AA)
      '32', '5', '5', '34', '5', '5', '39', '5', '5', '38', '5', '5', '38',
      // Internal-III (cols 27-39: AB-AN)
      '', '', '5', '', '', '5', '', '', '5', '', '', '5', ''
    ];

    const csv = [row1.join(','), row2.join(','), studentRow.join(',')].join('\n');
    const result = parseSpreadsheetCsv(csv);

    expect(result.success).toBe(true);
    expect(result.students.length).toBe(1);
    const s = result.students[0];

    // CAT-1 Checks (Internal-I)
    expect(s.cat1.DL.examMark).toBe(33);
    expect(s.cat1.DL.examStatus).toBe('PASS');
    expect(s.cat1.DL.assessment.numericMark).toBe(5);
    expect(s.cat1.DL.assignment.numericMark).toBe(5);
    expect(s.cat1['GEN AI'].examMark).toBe(32);
    expect(s.cat1['GEN AI'].assignment.status).toBe('PENDING'); // Blank cell is PENDING
    expect(s.cat1.RL.examMark).toBe(30);
    expect(s.cat1.RL.assessment.status).toBe('NOT CONFIGURED'); // Missing column in Internal-I
    expect(s.cat1.RL.assignment.numericMark).toBe(5); // Assignment column K is 5
    expect(s.cat1.BA.examMark).toBe(36.5);
    expect(s.cat1.BA.assessment.status).toBe('NOT CONFIGURED'); // Missing column in Internal-I
    expect(s.cat1.BA.assignment.numericMark).toBe(5); // Assignment column M is 5
    expect(s.cat1['RE&CCE'].examMark).toBe(37);
    expect(s.cat1['RE&CCE'].assessment.status).toBe('NOT_APPLICABLE');
    expect(s.cat1['RE&CCE'].assignment.status).toBe('NOT_APPLICABLE');

    // CAT-2 Checks (Internal-II) - Must NOT be PENDING! Must read cols O to AA!
    expect(s.cat2.DL.examMark).toBe(32);
    expect(s.cat2.DL.examStatus).toBe('PASS');
    expect(s.cat2.DL.assessment.numericMark).toBe(5);
    expect(s.cat2.DL.assignment.numericMark).toBe(5);
    expect(s.cat2['GEN AI'].examMark).toBe(34);
    expect(s.cat2['GEN AI'].examStatus).toBe('PASS');
    expect(s.cat2.RL.examMark).toBe(39);
    expect(s.cat2.RL.examStatus).toBe('PASS');
    expect(s.cat2.RL.assessment.numericMark).toBe(5); // Internal-II has RL Assessment!
    expect(s.cat2.RL.assignment.numericMark).toBe(5);
    expect(s.cat2.BA.examMark).toBe(38);
    expect(s.cat2.BA.examStatus).toBe('PASS');
    expect(s.cat2.BA.assessment.numericMark).toBe(5); // Internal-II has BA Assessment!
    expect(s.cat2.BA.assignment.numericMark).toBe(5);
    expect(s.cat2['RE&CCE'].examMark).toBe(38);
    expect(s.cat2['RE&CCE'].examStatus).toBe('PASS');
    expect(s.catMarks['CAT-2'].overallStatus).toBe('PASS');

    // CAT-3 Checks (Internal-III) - Reads cols AB to AN
    expect(s.cat3.DL.examStatus).toBe('PENDING'); // Blank cell remains PENDING
    expect(s.cat3.DL.assessment.status).toBe('PENDING'); // Blank cell remains PENDING
    expect(s.cat3.DL.assignment.numericMark).toBe(5); // Assignment AD is 5
    expect(s.cat3['GEN AI'].assignment.numericMark).toBe(5);
    expect(s.cat3.RL.assignment.numericMark).toBe(5);
    expect(s.cat3.BA.assignment.numericMark).toBe(5);
    expect(s.cat3['RE&CCE'].examStatus).toBe('PENDING');
    expect(s.catMarks['CAT-3'].overallStatus).toBe('PENDING');
  });

  // 15. Discrepancy isolation: Internal-I RL/BA assignment is never mistaken for assessment
  it('15. Discrepancy isolation: Internal-I RL and BA assignment columns are never mistaken for assessment columns', () => {
    const row1 = ['Register No', 'Roll No', 'Name', 'INTERNAL - I', '', '', '', '', '', '', '', '', '', ''];
    const row2 = ['', '', '', 'DL', 'ASSESSMENT', 'ASSIGNMENT', 'GEN AI', 'ASSESSMENT', 'ASSIGNMENT', 'RL', 'ASSIGNMENT', 'BA', 'ASSIGNMENT', 'RE&CCE'];
    const studentRow = ['1', 'TU6243202111001', 'Abitha E', '33', '5', '5', '32', '5', '', '30', '7', '36.5', '9', '37'];

    const csv = [row1.join(','), row2.join(','), studentRow.join(',')].join('\n');
    const result = parseSpreadsheetCsv(csv);

    expect(result.success).toBe(true);
    const s = result.students[0];

    // RL: Col J=30 (Exam), Col K=7 (Assignment)
    expect(s.cat1.RL.examMark).toBe(30);
    expect(s.cat1.RL.assignment.numericMark).toBe(7);
    expect(s.cat1.RL.assignment.status).toBe('SUBMITTED / MARKED');
    expect(s.cat1.RL.assessment.status).toBe('NOT CONFIGURED');
    expect(s.cat1.RL.assessment.numericMark).toBeNull();
    // Assessment must NEVER have received the assignment value 7
    expect(s.cat1.RL.assessment.numericMark).not.toBe(7);

    // BA: Col L=36.5 (Exam), Col M=9 (Assignment)
    expect(s.cat1.BA.examMark).toBe(36.5);
    expect(s.cat1.BA.assignment.numericMark).toBe(9);
    expect(s.cat1.BA.assignment.status).toBe('SUBMITTED / MARKED');
    expect(s.cat1.BA.assessment.status).toBe('NOT CONFIGURED');
    expect(s.cat1.BA.assessment.numericMark).toBeNull();
    // Assessment must NEVER have received the assignment value 9
    expect(s.cat1.BA.assessment.numericMark).not.toBe(9);
  });
});

