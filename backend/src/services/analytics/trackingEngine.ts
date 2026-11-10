import {
  Student,
  SubjectCode,
  SubmissionStatus,
  SUBJECT_CODES,
  SubmissionRecord,
  CatExam,
  CAT_EXAMS,
  CAT_INTERNAL_MAP,
  APPLICABLE_ASSESSMENT_SUBJECTS
} from '../../types/academic.types.js';

export interface TrackingItem {
  id: string;
  studentId: string;
  studentName: string;
  name: string;
  rollNumber: string;
  rollNo: string;
  registerNumber: string;
  registerNo: string;
  subject: SubjectCode;
  cat: CatExam;
  internalName: string; // e.g. "Internal-I"
  itemType: 'Assessment' | 'Assignment';
  rawValue: string | number | null | undefined;
  numericMark: number | null;
  rawMark?: string | number | null;
  score?: string | number | null;
  assignmentMark?: number | string | null;
  assessmentMark?: number | string | null;
  status: SubmissionStatus;
  assignmentStatus?: SubmissionStatus;
  assessmentStatus?: SubmissionStatus;
  isConfigured: boolean;
  isApplicable: boolean;
  invalidReason?: string;
}

export interface TrackingStats {
  totalTracked: number;
  totalConfigured: number;
  notConfiguredCount: number;
  submittedCount: number;
  notSubmittedCount: number;
  zeroMarksCount: number;
  pendingCount: number;
  invalidCount: number;
  complianceRate: number;
}

export interface FilterOptions {
  subject?: SubjectCode;
  cat?: CatExam | 'ALL';
  status?: SubmissionStatus | 'ISSUES_ONLY';
  search?: string;
}

export function getSubmissionTracking(
  students: Student[],
  itemType: 'Assessment' | 'Assignment',
  filter?: FilterOptions
): { stats: TrackingStats; items: TrackingItem[] } {
  const allItems: TrackingItem[] = [];

  let totalTracked = 0;
  let totalConfigured = 0;
  let notConfiguredCount = 0;
  let submittedCount = 0;
  let notSubmittedCount = 0;
  let zeroMarksCount = 0;
  let pendingCount = 0;
  let invalidCount = 0;

  const catsToProcess: CatExam[] =
    filter?.cat && filter.cat !== 'ALL'
      ? [filter.cat]
      : CAT_EXAMS;

  // By default, only track the 4 applicable subjects (DL, GEN AI, RL, BA).
  // RE&CCE is exam only and excluded from assessment & assignment tracking as per Section B, F, G.
  const subjectsToProcess: SubjectCode[] = filter?.subject
    ? [filter.subject]
    : APPLICABLE_ASSESSMENT_SUBJECTS;

  for (const st of students) {
    const recordMap = itemType === 'Assessment' ? st.assessments : st.assignments;

    for (const cat of catsToProcess) {
      const internalName = CAT_INTERNAL_MAP[cat] || cat;

      for (const subj of subjectsToProcess) {
        totalTracked++;

        // RE&CCE is never applicable
        const isApplicable = subj !== 'RE&CCE';
        const isMissingColumn = (cat === 'CAT-1' && itemType === 'Assessment' && (subj === 'RL' || subj === 'BA'));

        const recKey = `${cat}_${subj}`;
        const rec: SubmissionRecord | undefined = recordMap?.[recKey] || recordMap?.[subj];

        const isConfigured = !isMissingColumn && (rec?.isConfigured ?? (rec?.status !== 'NOT CONFIGURED' && rec?.status !== 'NOT_APPLICABLE' && rec !== undefined));

        let status: SubmissionStatus;
        if (!isApplicable) {
          status = 'NOT_APPLICABLE';
        } else if (isMissingColumn || !isConfigured || rec?.status === 'NOT CONFIGURED') {
          status = 'NOT CONFIGURED';
          notConfiguredCount++;
        } else {
          status = rec?.status ?? 'PENDING';
          totalConfigured++;
          if (status === 'SUBMITTED / MARKED') submittedCount++;
          else if (status === 'NOT SUBMITTED') notSubmittedCount++;
          else if (status === 'ZERO MARKS') zeroMarksCount++;
          else if (status === 'PENDING') pendingCount++;
          else if (status === 'INVALID') invalidCount++;
        }

        const scoreVal = rec?.numericMark !== null && rec?.numericMark !== undefined
          ? rec.numericMark
          : (rec?.rawValue !== undefined && rec?.rawValue !== null && rec?.rawValue !== '' ? rec.rawValue : null);

        const sName = st.name || (st as any).studentName || '';
        const sRoll = st.rollNumber || (st as any).rollNo || '';
        const sReg = st.registerNumber || (st as any).registerNo || '';

        const item: TrackingItem = {
          id: `${st.id}_${itemType}_${cat}_${subj}`,
          studentId: st.id,
          studentName: sName,
          name: sName,
          rollNumber: sRoll,
          rollNo: sRoll,
          registerNumber: sReg,
          registerNo: sReg,
          subject: subj,
          cat,
          internalName,
          itemType,
          rawValue: !isApplicable ? 'N/A' : isMissingColumn ? null : (rec?.rawValue ?? ''),
          numericMark: !isApplicable || isMissingColumn ? null : (rec?.numericMark ?? null),
          rawMark: !isApplicable ? 'N/A' : isMissingColumn ? null : (rec?.numericMark !== null && rec?.numericMark !== undefined ? rec.numericMark : (rec?.rawValue ?? null)),
          score: !isApplicable ? 'N/A' : isMissingColumn ? null : scoreVal,
          assignmentMark: itemType === 'Assignment' ? (!isApplicable ? 'N/A' : isMissingColumn ? null : scoreVal) : undefined,
          assessmentMark: itemType === 'Assessment' ? (!isApplicable ? 'N/A' : isMissingColumn ? null : scoreVal) : undefined,
          status,
          assignmentStatus: itemType === 'Assignment' ? status : undefined,
          assessmentStatus: itemType === 'Assessment' ? status : undefined,
          isConfigured: isConfigured && !isMissingColumn,
          isApplicable,
          invalidReason: rec?.invalidReason
        };

        allItems.push(item);
      }
    }
  }

  const complianceRate = totalConfigured > 0
    ? Number((((submittedCount + zeroMarksCount) / totalConfigured) * 100).toFixed(1))
    : 0;

  const stats: TrackingStats = {
    totalTracked,
    totalConfigured,
    notConfiguredCount,
    submittedCount,
    notSubmittedCount,
    zeroMarksCount,
    pendingCount,
    invalidCount,
    complianceRate
  };

  // Apply filters
  let filtered = allItems;

  if (filter?.subject) {
    filtered = filtered.filter(i => i.subject === filter.subject);
  }

  if (filter?.status) {
    if (filter.status === 'ISSUES_ONLY') {
      filtered = filtered.filter(i =>
        i.status === 'NOT SUBMITTED' ||
        i.status === 'ZERO MARKS' ||
        i.status === 'PENDING' ||
        i.status === 'INVALID'
      );
    } else {
      filtered = filtered.filter(i => i.status === filter.status);
    }
  }

  if (filter?.search && filter.search.trim() !== '') {
    const q = filter.search.trim().toLowerCase();
    filtered = filtered.filter(i =>
      (i.studentName && i.studentName.toLowerCase().includes(q)) ||
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.rollNumber && i.rollNumber.toLowerCase().includes(q)) ||
      (i.rollNo && i.rollNo.toLowerCase().includes(q)) ||
      (i.registerNumber && i.registerNumber.toLowerCase().includes(q)) ||
      (i.registerNo && i.registerNo.toLowerCase().includes(q)) ||
      (i.subject && i.subject.toLowerCase().includes(q))
    );
  }

  return {
    stats,
    items: filtered
  };
}
