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
} from '../analytics/academicEngine.js';
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
  fs.readFileSync(path.resolve(__dirname, 'initialStudents.json'), 'utf8')
);

export const KNOWN_54_STUDENTS: RawStudentInfo[] = initialStudents;

/**
 * Generates a realistic, highly consistent academic marks dataset for the 54 students
 * adhering to all prompt specifications.
 */
export function generateRealisticSemesterData(): Student[] {
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
        let rawVal: any;

        // Base mark based on student hash & subject
        const baseMark = 18 + ((studentNum * 7 + subj.charCodeAt(0) * 3) % 20); // 18 to 37

        if (studentNum === 35 && cat === 'CAT-2' && subj === 'DL') {
          rawVal = 45;
        } else if (studentNum === 26 && cat === 'CAT-3' && subj === 'RE&CCE') {
          rawVal = '';
        } else if (studentNum === 6 && cat === 'CAT-1' && subj === 'BA') {
          rawVal = 'AB';
        } else if (studentNum === 2 && cat === 'CAT-1' && subj === 'RE&CCE') {
          rawVal = 12;
        } else if (studentNum === 13) {
          if (cat === 'CAT-1') rawVal = subj === 'RL' || subj === 'DL' ? 11 : 17;
          else if (cat === 'CAT-2') rawVal = subj === 'BA' ? 10 : 16;
          else rawVal = 19;
        } else if (studentNum === 19 && cat === 'CAT-2' && subj === 'GEN AI') {
          rawVal = 14; // FAIL
        } else if (studentNum === 44 && cat === 'CAT-1' && subj === 'DL') {
          rawVal = 'ABSENT';
        } else {
          rawVal = Math.min(40, Math.max(14, baseMark + (cat === 'CAT-1' ? 0 : cat === 'CAT-2' ? 2 : 3)));
          if (studentNum % 9 === 0 && cat === 'CAT-1' && subj === 'RL') {
            rawVal = 13;
          }
        }

        const examClassified = classifySubjectMark(rawVal, config);
        subjectExamRecords[subj] = examClassified;

        const isAssessConfig = !(cat === 'CAT-1' && (subj === 'RL' || subj === 'BA')) && subj !== 'RE&CCE';
        const isAssignConfig = subj !== 'RE&CCE';

        let assessVal: any = 8 + ((studentNum + (subj.charCodeAt(0) || 65)) % 3);
        let assignVal: any = 9 + ((studentNum + (subj.charCodeAt(1) || 66)) % 2);

        if (studentNum === 20 && subj === 'DL') {
          assessVal = 0;
          assignVal = 'NS';
        } else if (studentNum === 13 && subj === 'RL') {
          assignVal = 'NS';
        } else if (studentNum === 26 && subj === 'BA') {
          assessVal = '';
        } else if (studentNum === 5 && subj === 'GEN AI') {
          assignVal = 0;
        }

        const assessParsed = classifySubmission(assessVal, subj, 'Assessment', cat, isAssessConfig);
        const assignParsed = classifySubmission(assignVal, subj, 'Assignment', cat, isAssignConfig);

        const assessComponent = {
          rawValue: isAssessConfig ? assessParsed.rawValue : null,
          numericMark: isAssessConfig ? assessParsed.numericMark : null,
          status: isAssessConfig ? assessParsed.status : 'NOT_APPLICABLE',
          isApplicable: isAssessConfig
        };

        const assignComponent = {
          rawValue: isAssignConfig ? assignParsed.rawValue : null,
          numericMark: isAssignConfig ? assignParsed.numericMark : null,
          status: isAssignConfig ? assignParsed.status : 'NOT_APPLICABLE',
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
          status: isAssessConfig ? assessParsed.status : 'NOT_APPLICABLE',
          isConfigured: isAssessConfig,
          isApplicable: isAssessConfig
        };

        assignments[`${cat}_${subj}`] = {
          ...assignParsed,
          status: isAssignConfig ? assignParsed.status : 'NOT_APPLICABLE',
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
      id: s.rollNumber,
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

/**
 * Generates a full Google Sheets compatible CSV string containing all 54 students
 * and all CAT-1, CAT-2, CAT-3, Assessment, and Assignment columns.
 */
export function generateAcademicMarksCsvTemplate(): string {
  const dataset = generateRealisticSemesterData();
  const headers = [
    'Sl. No.',
    'Roll No',
    'Register No',
    'Name',
    'Department',
    // CAT 1
    'DL CAT-1',
    'GEN AI CAT-1',
    'RL CAT-1',
    'BA CAT-1',
    'RE&CCE CAT-1',
    // CAT 2
    'DL CAT-2',
    'GEN AI CAT-2',
    'RL CAT-2',
    'BA CAT-2',
    'RE&CCE CAT-2',
    // CAT 3
    'DL CAT-3',
    'GEN AI CAT-3',
    'RL CAT-3',
    'BA CAT-3',
    'RE&CCE CAT-3',
    // Assessments
    'DL Assessment',
    'GEN AI Assessment',
    'RL Assessment',
    'BA Assessment',
    'RE&CCE Assessment',
    // Assignments
    'DL Assignment',
    'GEN AI Assignment',
    'RL Assignment',
    'BA Assignment',
    'RE&CCE Assignment'
  ];

  const rows = [headers.join(',')];

  for (const st of dataset) {
    const row: (string | number)[] = [
      st.slNo,
      st.rollNumber,
      st.registerNumber,
      `"${st.name}"`,
      `"${st.department}"`,
      // CAT 1
      st.catMarks['CAT-1'].subjects['DL'].raw ?? '',
      st.catMarks['CAT-1'].subjects['GEN AI'].raw ?? '',
      st.catMarks['CAT-1'].subjects['RL'].raw ?? '',
      st.catMarks['CAT-1'].subjects['BA'].raw ?? '',
      st.catMarks['CAT-1'].subjects['RE&CCE'].raw ?? '',
      // CAT 2
      st.catMarks['CAT-2'].subjects['DL'].raw ?? '',
      st.catMarks['CAT-2'].subjects['GEN AI'].raw ?? '',
      st.catMarks['CAT-2'].subjects['RL'].raw ?? '',
      st.catMarks['CAT-2'].subjects['BA'].raw ?? '',
      st.catMarks['CAT-2'].subjects['RE&CCE'].raw ?? '',
      // CAT 3
      st.catMarks['CAT-3'].subjects['DL'].raw ?? '',
      st.catMarks['CAT-3'].subjects['GEN AI'].raw ?? '',
      st.catMarks['CAT-3'].subjects['RL'].raw ?? '',
      st.catMarks['CAT-3'].subjects['BA'].raw ?? '',
      st.catMarks['CAT-3'].subjects['RE&CCE'].raw ?? '',
      // Assessments
      st.assessments['DL'].rawValue ?? '',
      st.assessments['GEN AI'].rawValue ?? '',
      st.assessments['RL'].rawValue ?? '',
      st.assessments['BA'].rawValue ?? '',
      st.assessments['RE&CCE'].rawValue ?? '',
      // Assignments
      st.assignments['DL'].rawValue ?? '',
      st.assignments['GEN AI'].rawValue ?? '',
      st.assignments['RL'].rawValue ?? '',
      st.assignments['BA'].rawValue ?? '',
      st.assignments['RE&CCE'].rawValue ?? ''
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}
