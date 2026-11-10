import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Student,
  CatExam,
  SubjectCode,
  SUBJECT_CODES,
  SUBJECT_NAMES,
  CAT_EXAMS,
  CAT_INTERNAL_MAP,
  SubjectFullRecord,
  CatPerformance
} from '../../types/academic.types.js';
import {
  classifySubjectMark,
  computeOverallCatStatus,
  classifySubmission
} from '../../services/analytics/academicEngine.js';
import { getAcademicConfig } from '../../config/academic.config.js';

export interface RawStudentInfo {
  slNo: number;
  rollNumber: string;
  registerNumber: string;
  name: string;
  department: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const initialStudents: RawStudentInfo[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../services/googleSheets/initialStudents.json'), 'utf8')
);

export const KNOWN_54_STUDENTS: RawStudentInfo[] = initialStudents;

/**
 * Isolated test fixture for testing analytics logic offline.
 * Strictly used in test suites. Never used in production data paths.
 */
export function generateTestFixtureStudents(): Student[] {
  const config = getAcademicConfig();

  return KNOWN_54_STUDENTS.map((s, idx) => {
    const studentNum = idx + 1;

    const catFullRecords: Record<CatExam, Record<SubjectCode, SubjectFullRecord>> = {
      'CAT-1': {} as any,
      'CAT-2': {} as any,
      'CAT-3': {} as any
    };
    const catMarks: Record<CatExam, CatPerformance> = {} as any;
    const assessments: Record<string, any> = {};
    const assignments: Record<string, any> = {};

    for (const cat of CAT_EXAMS) {
      const internalName = CAT_INTERNAL_MAP[cat] || cat;
      const subjectExamRecords: Record<SubjectCode, any> = {} as any;

      for (const subj of SUBJECT_CODES) {
        let rawMark: string | number;

        if (studentNum === 1) {
          rawMark = 38;
        } else if (studentNum === 2 && cat === 'CAT-1' && subj === 'RE&CCE') {
          rawMark = 12;
        } else if (studentNum === 6 && cat === 'CAT-1' && subj === 'BA') {
          rawMark = 'AB';
        } else if (studentNum === 13 && (cat === 'CAT-1' || cat === 'CAT-2')) {
          rawMark = subj === 'DL' || subj === 'RL' ? 10 : 20;
        } else if (studentNum === 26 && cat === 'CAT-3' && subj === 'RE&CCE') {
          rawMark = '';
        } else if (studentNum === 35 && cat === 'CAT-2' && subj === 'DL') {
          rawMark = 45;
        } else {
          const base = 18 + ((studentNum * 7 + (subj.charCodeAt(0) + subj.charCodeAt(1))) % 20);
          rawMark = Math.min(40, Math.max(8, base));
        }

        const examClassified = classifySubjectMark(rawMark, config);
        subjectExamRecords[subj] = examClassified;

        let assessRaw: string | number = 18;
        let assignRaw: string | number = 19;

        if (studentNum === 20) {
          assessRaw = 0;
          assignRaw = 'NS';
        }

        const isAssessConfig = !(cat === 'CAT-1' && (subj === 'RL' || subj === 'BA')) && subj !== 'RE&CCE';
        const isAssignConfig = subj !== 'RE&CCE';

        const assessParsed = classifySubmission(assessRaw, subj, 'Assessment', cat, isAssessConfig);
        const assignParsed = classifySubmission(assignRaw, subj, 'Assignment', cat, isAssignConfig);

        const assessStatus = subj === 'RE&CCE'
          ? 'NOT_APPLICABLE'
          : isAssessConfig
          ? assessParsed.status
          : 'NOT CONFIGURED';

        const assignStatus = subj === 'RE&CCE'
          ? 'NOT_APPLICABLE'
          : isAssignConfig
          ? assignParsed.status
          : 'NOT CONFIGURED';

        const assessComponent = {
          rawValue: isAssessConfig ? assessParsed.rawValue : null,
          numericMark: isAssessConfig ? assessParsed.numericMark : null,
          status: assessStatus,
          isApplicable: isAssessConfig
        };

        const assignComponent = {
          rawValue: isAssignConfig ? assignParsed.rawValue : null,
          numericMark: isAssignConfig ? assignParsed.numericMark : null,
          status: assignStatus,
          isApplicable: isAssignConfig
        };

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

        assessments[`${cat}_${subj}`] = {
          ...assessParsed,
          status: assessStatus,
          isConfigured: isAssessConfig,
          isApplicable: isAssessConfig
        };

        assignments[`${cat}_${subj}`] = {
          ...assignParsed,
          status: assignStatus,
          isConfigured: isAssignConfig,
          isApplicable: isAssignConfig
        };

        if (cat === 'CAT-1') {
          assessments[subj] = assessments[`${cat}_${subj}`];
          assignments[subj] = assignments[`${cat}_${subj}`];
        }
      }

      catMarks[cat] = {
        cat,
        internalName,
        overallStatus: computeOverallCatStatus(subjectExamRecords),
        subjects: catFullRecords[cat]
      };
    }

    return {
      id: s.registerNumber || s.rollNumber,
      slNo: s.slNo,
      rollNumber: s.rollNumber,
      registerNumber: s.registerNumber,
      name: s.name,
      department: s.department,
      cat1: catFullRecords['CAT-1'],
      cat2: catFullRecords['CAT-2'],
      cat3: catFullRecords['CAT-3'],
      catMarks,
      assessments,
      assignments
    };
  });
}
