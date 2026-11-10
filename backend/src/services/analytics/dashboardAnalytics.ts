import {
  Student,
  CatExam,
  SubjectCode,
  SUBJECT_CODES,
  CAT_EXAMS,
  SUBJECT_NAMES,
  APPLICABLE_ASSESSMENT_SUBJECTS,
  CAT_INTERNAL_MAP
} from '../../types/academic.types.js';
import { computeSubjectAnalytics } from './subjectAnalytics.js';

export interface ComponentAnalyticsSummary {
  totalTracked: number;
  totalConfigured: number;
  submittedCount: number;
  pendingCount: number;
  zeroMarksCount: number;
  notSubmittedCount: number;
  invalidCount: number;
  complianceRate: number;
}

export interface DashboardSummary {
  totalStudents: number;
  totalSubjects: number;
  catOverview: Record<CatExam, {
    passed: number;
    failed: number;
    absent: number;
    pending: number;
    invalid: number;
    passPercentage: number;
  }>;
  overallComparison: Array<{
    exam: CatExam;
    internalName: string;
    passed: number;
    failed: number;
    absent: number;
    pending: number;
    passPercentage: number;
  }>;
  subjectWisePassPercentage: Array<{
    subject: SubjectCode;
    subjectName: string;
    cat1PassRate: number;
    cat2PassRate: number;
    cat3PassRate: number;
  }>;
  subjectWiseFailCount: Array<{
    subject: SubjectCode;
    subjectName: string;
    cat1FailCount: number;
    cat2FailCount: number;
    cat3FailCount: number;
  }>;
  // Specific Assessment & Assignment analytics (Section I)
  assessmentSummary: ComponentAnalyticsSummary;
  assignmentSummary: ComponentAnalyticsSummary;
  subjectWiseComponentCompletion: Array<{
    subject: SubjectCode;
    subjectName: string;
    assessmentRate: number;
    assignmentRate: number;
    assessmentSubmitted: number;
    assessmentTotal: number;
    assignmentSubmitted: number;
    assignmentTotal: number;
  }>;
  catWiseComponentComparison: Array<{
    cat: CatExam;
    internalName: string;
    assessmentRate: number;
    assignmentRate: number;
    assessmentConfigured: number;
    assessmentSubmitted: number;
    assignmentConfigured: number;
    assignmentSubmitted: number;
  }>;
  complianceRates: {
    assessmentOverallRate: number;
    assignmentOverallRate: number;
    bySubject: Array<{
      subject: SubjectCode;
      assessmentRate: number;
      assignmentRate: number;
    }>;
  };
  attentionLists: {
    studentsNeedingAttention: Array<{
      id: string;
      name: string;
      rollNumber: string;
      registerNumber: string;
      reason: string;
      failedSubjects: string[];
      cat: CatExam;
    }>;
    absentStudents: Array<{
      id: string;
      name: string;
      rollNumber: string;
      subject: SubjectCode;
      cat: CatExam;
    }>;
    pendingRecords: Array<{
      id: string;
      name: string;
      rollNumber: string;
      subject: SubjectCode;
      cat: CatExam;
    }>;
    submissionIssues: Array<{
      id: string;
      name: string;
      rollNumber: string;
      subject: SubjectCode;
      cat: CatExam;
      type: 'Assessment' | 'Assignment';
      status: string;
    }>;
  };
}

export function computeDashboardAnalytics(
  students: Student[],
  activeCat: CatExam = 'CAT-1'
): DashboardSummary {
  const catOverview: Record<CatExam, any> = {} as any;

  for (const cat of CAT_EXAMS) {
    let passed = 0;
    let failed = 0;
    let absent = 0;
    let pending = 0;
    let invalid = 0;

    for (const st of students) {
      const overall = st.catMarks?.[cat]?.overallStatus;
      if (overall === 'PASS') passed++;
      else if (overall === 'FAIL') failed++;
      else if (overall === 'ABSENT') absent++;
      else if (overall === 'PENDING') pending++;
      else if (overall === 'INVALID') invalid++;
    }

    const evaluated = passed + failed;
    const passPercentage = evaluated > 0 ? Number(((passed / evaluated) * 100).toFixed(1)) : 0;

    catOverview[cat] = {
      passed,
      failed,
      absent,
      pending,
      invalid,
      passPercentage
    };
  }

  const overallComparison = CAT_EXAMS.map(cat => ({
    exam: cat,
    internalName: CAT_INTERNAL_MAP[cat] || cat,
    passed: catOverview[cat].passed,
    failed: catOverview[cat].failed,
    absent: catOverview[cat].absent,
    pending: catOverview[cat].pending,
    passPercentage: catOverview[cat].passPercentage
  }));

  // Subject analytics computations (examination)
  const subjectAnalyticsMap = SUBJECT_CODES.map(subj => computeSubjectAnalytics(subj, students));

  const subjectWisePassPercentage = subjectAnalyticsMap.map(sa => ({
    subject: sa.subjectCode,
    subjectName: sa.subjectName,
    cat1PassRate: sa.catStats['CAT-1'].passPercentage,
    cat2PassRate: sa.catStats['CAT-2'].passPercentage,
    cat3PassRate: sa.catStats['CAT-3'].passPercentage
  }));

  const subjectWiseFailCount = subjectAnalyticsMap.map(sa => ({
    subject: sa.subjectCode,
    subjectName: sa.subjectName,
    cat1FailCount: sa.catStats['CAT-1'].failCount,
    cat2FailCount: sa.catStats['CAT-2'].failCount,
    cat3FailCount: sa.catStats['CAT-3'].failCount
  }));

  // Assessment & Assignment Analytics (Section I)
  // Strictly over APPLICABLE_ASSESSMENT_SUBJECTS (DL, GEN AI, RL, BA). RE&CCE excluded!
  let assessTracked = 0;
  let assessConfigured = 0;
  let assessSubmitted = 0;
  let assessPending = 0;
  let assessZeroMarks = 0;
  let assessNotSubmitted = 0;
  let assessInvalid = 0;

  let assignTracked = 0;
  let assignConfigured = 0;
  let assignSubmitted = 0;
  let assignPending = 0;
  let assignZeroMarks = 0;
  let assignNotSubmitted = 0;
  let assignInvalid = 0;

  const submissionIssues: Array<{
    id: string;
    name: string;
    rollNumber: string;
    subject: SubjectCode;
    cat: CatExam;
    type: 'Assessment' | 'Assignment';
    status: string;
  }> = [];

  for (const st of students) {
    for (const cat of CAT_EXAMS) {
      for (const subj of APPLICABLE_ASSESSMENT_SUBJECTS) {
        // Assessment
        const asKey = `${cat}_${subj}`;
        const as = st.assessments?.[asKey];
        assessTracked++;
        if (as && as.status !== 'NOT_APPLICABLE' && as.isConfigured !== false) {
          assessConfigured++;
          if (as.status === 'SUBMITTED / MARKED') assessSubmitted++;
          else if (as.status === 'PENDING') assessPending++;
          else if (as.status === 'ZERO MARKS') assessZeroMarks++;
          else if (as.status === 'NOT SUBMITTED') assessNotSubmitted++;
          else if (as.status === 'INVALID') assessInvalid++;

          if (as.status === 'NOT SUBMITTED' || as.status === 'ZERO MARKS' || as.status === 'PENDING' || as.status === 'INVALID') {
            submissionIssues.push({
              id: st.id,
              name: st.name,
              rollNumber: st.rollNumber,
              subject: subj,
              cat,
              type: 'Assessment',
              status: as.status
            });
          }
        }

        // Assignment
        const ag = st.assignments?.[asKey];
        assignTracked++;
        if (ag && ag.status !== 'NOT_APPLICABLE' && ag.isConfigured !== false) {
          assignConfigured++;
          if (ag.status === 'SUBMITTED / MARKED') assignSubmitted++;
          else if (ag.status === 'PENDING') assignPending++;
          else if (ag.status === 'ZERO MARKS') assignZeroMarks++;
          else if (ag.status === 'NOT SUBMITTED') assignNotSubmitted++;
          else if (ag.status === 'INVALID') assignInvalid++;

          if (ag.status === 'NOT SUBMITTED' || ag.status === 'ZERO MARKS' || ag.status === 'PENDING' || ag.status === 'INVALID') {
            submissionIssues.push({
              id: st.id,
              name: st.name,
              rollNumber: st.rollNumber,
              subject: subj,
              cat,
              type: 'Assignment',
              status: ag.status
            });
          }
        }
      }
    }
  }

  const assessmentComplianceRate = assessConfigured > 0
    ? Number((((assessSubmitted + assessZeroMarks) / assessConfigured) * 100).toFixed(1))
    : 0;

  const assignmentComplianceRate = assignConfigured > 0
    ? Number((((assignSubmitted + assignZeroMarks) / assignConfigured) * 100).toFixed(1))
    : 0;

  const assessmentSummary: ComponentAnalyticsSummary = {
    totalTracked: assessTracked,
    totalConfigured: assessConfigured,
    submittedCount: assessSubmitted,
    pendingCount: assessPending,
    zeroMarksCount: assessZeroMarks,
    notSubmittedCount: assessNotSubmitted,
    invalidCount: assessInvalid,
    complianceRate: assessmentComplianceRate
  };

  const assignmentSummary: ComponentAnalyticsSummary = {
    totalTracked: assignTracked,
    totalConfigured: assignConfigured,
    submittedCount: assignSubmitted,
    pendingCount: assignPending,
    zeroMarksCount: assignZeroMarks,
    notSubmittedCount: assignNotSubmitted,
    invalidCount: assignInvalid,
    complianceRate: assignmentComplianceRate
  };

  // Subject-wise Assessment & Assignment completion (for the 4 applicable subjects)
  const subjectWiseComponentCompletion = APPLICABLE_ASSESSMENT_SUBJECTS.map(subj => {
    let sAssessConfigured = 0;
    let sAssessSubmitted = 0;
    let sAssignConfigured = 0;
    let sAssignSubmitted = 0;

    for (const st of students) {
      for (const cat of CAT_EXAMS) {
        const as = st.assessments?.[`${cat}_${subj}`];
        if (as && as.status !== 'NOT_APPLICABLE' && as.isConfigured !== false) {
          sAssessConfigured++;
          if (as.status === 'SUBMITTED / MARKED' || as.status === 'ZERO MARKS') {
            sAssessSubmitted++;
          }
        }
        const ag = st.assignments?.[`${cat}_${subj}`];
        if (ag && ag.status !== 'NOT_APPLICABLE' && ag.isConfigured !== false) {
          sAssignConfigured++;
          if (ag.status === 'SUBMITTED / MARKED' || ag.status === 'ZERO MARKS') {
            sAssignSubmitted++;
          }
        }
      }
    }

    return {
      subject: subj,
      subjectName: SUBJECT_NAMES[subj] || subj,
      assessmentRate: sAssessConfigured > 0 ? Number(((sAssessSubmitted / sAssessConfigured) * 100).toFixed(1)) : 0,
      assignmentRate: sAssignConfigured > 0 ? Number(((sAssignSubmitted / sAssignConfigured) * 100).toFixed(1)) : 0,
      assessmentSubmitted: sAssessSubmitted,
      assessmentTotal: sAssessConfigured,
      assignmentSubmitted: sAssignSubmitted,
      assignmentTotal: sAssignConfigured
    };
  });

  // CAT-wise comparison (CAT-1, CAT-2, CAT-3)
  const catWiseComponentComparison = CAT_EXAMS.map(cat => {
    let cAssessConfigured = 0;
    let cAssessSubmitted = 0;
    let cAssignConfigured = 0;
    let cAssignSubmitted = 0;

    for (const st of students) {
      for (const subj of APPLICABLE_ASSESSMENT_SUBJECTS) {
        const as = st.assessments?.[`${cat}_${subj}`];
        if (as && as.status !== 'NOT_APPLICABLE' && as.isConfigured !== false) {
          cAssessConfigured++;
          if (as.status === 'SUBMITTED / MARKED' || as.status === 'ZERO MARKS') {
            cAssessSubmitted++;
          }
        }
        const ag = st.assignments?.[`${cat}_${subj}`];
        if (ag && ag.status !== 'NOT_APPLICABLE' && ag.isConfigured !== false) {
          cAssignConfigured++;
          if (ag.status === 'SUBMITTED / MARKED' || ag.status === 'ZERO MARKS') {
            cAssignSubmitted++;
          }
        }
      }
    }

    return {
      cat,
      internalName: CAT_INTERNAL_MAP[cat] || cat,
      assessmentRate: cAssessConfigured > 0 ? Number(((cAssessSubmitted / cAssessConfigured) * 100).toFixed(1)) : 0,
      assignmentRate: cAssignConfigured > 0 ? Number(((cAssignSubmitted / cAssignConfigured) * 100).toFixed(1)) : 0,
      assessmentConfigured: cAssessConfigured,
      assessmentSubmitted: cAssessSubmitted,
      assignmentConfigured: cAssignConfigured,
      assignmentSubmitted: cAssignSubmitted
    };
  });

  // Backward compatibility object for complianceRates
  const complianceRates = {
    assessmentOverallRate: assessmentComplianceRate,
    assignmentOverallRate: assignmentComplianceRate,
    bySubject: subjectWiseComponentCompletion.map(s => ({
      subject: s.subject,
      assessmentRate: s.assessmentRate,
      assignmentRate: s.assignmentRate
    }))
  };

  // Attention lists
  const studentsNeedingAttention: Array<{
    id: string;
    name: string;
    rollNumber: string;
    registerNumber: string;
    reason: string;
    failedSubjects: string[];
    cat: CatExam;
  }> = [];

  const absentStudents: Array<{
    id: string;
    name: string;
    rollNumber: string;
    subject: SubjectCode;
    cat: CatExam;
  }> = [];

  const pendingRecords: Array<{
    id: string;
    name: string;
    rollNumber: string;
    subject: SubjectCode;
    cat: CatExam;
  }> = [];

  for (const st of students) {
    const catData = st.catMarks?.[activeCat];
    if (catData) {
      if (catData.overallStatus === 'FAIL') {
        const failedSubjs = SUBJECT_CODES.filter(
          sc => catData.subjects[sc]?.status === 'FAIL'
        );
        studentsNeedingAttention.push({
          id: st.id,
          name: st.name,
          rollNumber: st.rollNumber,
          registerNumber: st.registerNumber,
          reason: `Failed in ${failedSubjs.join(', ')} (${activeCat})`,
          failedSubjects: failedSubjs,
          cat: activeCat
        });
      } else if (catData.overallStatus === 'INVALID') {
        const invalidSubjs = SUBJECT_CODES.filter(
          sc => catData.subjects[sc]?.status === 'INVALID'
        );
        studentsNeedingAttention.push({
          id: st.id,
          name: st.name,
          rollNumber: st.rollNumber,
          registerNumber: st.registerNumber,
          reason: `Invalid mark data in ${invalidSubjs.join(', ')}`,
          failedSubjects: [],
          cat: activeCat
        });
      }

      for (const sc of SUBJECT_CODES) {
        if (catData.subjects[sc]?.status === 'ABSENT') {
          absentStudents.push({
            id: st.id,
            name: st.name,
            rollNumber: st.rollNumber,
            subject: sc,
            cat: activeCat
          });
        }
        if (catData.subjects[sc]?.status === 'PENDING') {
          pendingRecords.push({
            id: st.id,
            name: st.name,
            rollNumber: st.rollNumber,
            subject: sc,
            cat: activeCat
          });
        }
      }
    }
  }

  return {
    totalStudents: students.length,
    totalSubjects: SUBJECT_CODES.length,
    catOverview,
    overallComparison,
    subjectWisePassPercentage,
    subjectWiseFailCount,
    assessmentSummary,
    assignmentSummary,
    subjectWiseComponentCompletion,
    catWiseComponentComparison,
    complianceRates,
    attentionLists: {
      studentsNeedingAttention,
      absentStudents,
      pendingRecords,
      submissionIssues
    }
  };
}
