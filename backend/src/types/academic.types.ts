export type SubjectCode = 'DL' | 'GEN AI' | 'RL' | 'BA' | 'RE&CCE';

export const SUBJECT_CODES: SubjectCode[] = ['DL', 'GEN AI', 'RL', 'BA', 'RE&CCE'];

// Subjects eligible for assessments and assignments (RE&CCE is exam only)
export const APPLICABLE_ASSESSMENT_SUBJECTS: SubjectCode[] = ['DL', 'GEN AI', 'RL', 'BA'];

export const SUBJECT_NAMES: Record<SubjectCode, string> = {
  'DL': 'Deep Learning',
  'GEN AI': 'Generative Artificial Intelligence',
  'RL': 'Reinforcement Learning',
  'BA': 'Business Analytics',
  'RE&CCE': 'Recruitment Essentials & Career Compentency Enhancement'
};

export type CatExam = 'CAT-1' | 'CAT-2' | 'CAT-3';
export const CAT_EXAMS: CatExam[] = ['CAT-1', 'CAT-2', 'CAT-3'];

export const CAT_INTERNAL_MAP: Record<CatExam, string> = {
  'CAT-1': 'Internal-I',
  'CAT-2': 'Internal-II',
  'CAT-3': 'Internal-III'
};

export type ExamStatus = 'PASS' | 'FAIL' | 'ABSENT' | 'PENDING' | 'INVALID';

export type SubmissionStatus =
  | 'NOT SUBMITTED'
  | 'ZERO MARKS'
  | 'SUBMITTED / MARKED'
  | 'PENDING'
  | 'NOT CONFIGURED'
  | 'NOT_APPLICABLE'
  | 'INVALID';

export interface SubjectMarksRecord {
  raw: string | number | null | undefined;
  numericMark: number | null;
  status: ExamStatus;
  invalidReason?: string;
}

export interface ComponentMarksRecord {
  rawValue: string | number | null | undefined;
  numericMark: number | null;
  status: SubmissionStatus;
  isApplicable: boolean;
  invalidReason?: string;
}

export interface SubjectFullRecord {
  subject: SubjectCode;
  subjectName: string;
  // Aliases for backward compatibility
  raw: string | number | null | undefined;
  numericMark: number | null;
  status: ExamStatus;
  // Explicit examination fields
  examRaw: string | number | null | undefined;
  examMark: number | null;
  examStatus: ExamStatus;
  invalidReason?: string;
  // Assessment and Assignment
  assessment: ComponentMarksRecord;
  assignment: ComponentMarksRecord;
}

export interface CatPerformance {
  cat: CatExam;
  internalName: string; // e.g. "Internal-I"
  overallStatus: ExamStatus;
  subjects: Record<SubjectCode, SubjectFullRecord>;
}

export interface SubmissionRecord {
  subject: SubjectCode;
  cat: CatExam;
  itemType: 'Assessment' | 'Assignment';
  rawValue: string | number | null | undefined;
  numericMark: number | null;
  status: SubmissionStatus;
  isConfigured: boolean;
  isApplicable?: boolean;
  invalidReason?: string;
}

export interface Student {
  id: string; // registerNumber or rollNumber
  slNo: number;
  rollNumber: string;
  registerNumber: string;
  name: string;
  // Canonical aliases for consistent naming across backend and frontend
  rollNo?: string;
  registerNo?: string;
  studentName?: string;
  department: string;
  // Conceptual structure: cat1, cat2, cat3
  cat1: Record<SubjectCode, SubjectFullRecord>;
  cat2: Record<SubjectCode, SubjectFullRecord>;
  cat3: Record<SubjectCode, SubjectFullRecord>;
  // CAT-indexed structure for dynamic iterations
  catMarks: Record<CatExam, CatPerformance>;
  // Flat maps for backward compatibility and fast item lookups
  assessments: Record<string, SubmissionRecord>;
  assignments: Record<string, SubmissionRecord>;
}

export interface AcademicConfig {
  passingMarks: number;
  maxMarks: number;
  totalExpectedStudents?: number;
  subjects: SubjectCode[];
  catExams: CatExam[];
  collegeName: string;
  departmentName: string;
  semester: string;
  academicYear: string;
}

export interface DataQualityIssue {
  id: string;
  studentName?: string;
  rollNumber?: string;
  registerNumber?: string;
  subject?: SubjectCode;
  cat?: CatExam;
  field: string;
  originalValue: string;
  expectedFormat: string;
  recommendedCorrection: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ColumnMappingDiagnostic {
  columnIndex: number;
  columnLetter: string;
  headerRow1: string;
  headerRow2: string;
  assignedCat?: CatExam;
  assignedSubject?: SubjectCode;
  assignedFieldType: 'identity' | 'mark' | 'assessment' | 'assignment' | 'unassigned';
  description: string;
}
