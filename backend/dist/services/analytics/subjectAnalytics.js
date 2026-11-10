import { CAT_EXAMS, SUBJECT_NAMES, CAT_INTERNAL_MAP } from '../../types/academic.types.js';
export function computeSubjectAnalytics(subject, students) {
    const isSubjectAssessmentApplicable = subject !== 'RE&CCE';
    const isSubjectAssignmentApplicable = subject !== 'RE&CCE';
    const catStats = {};
    let overallTotalExamMarks = 0;
    let overallExamMarkCount = 0;
    let overallTotalPass = 0;
    let overallTotalEvaluated = 0;
    let overallAssessSubmitted = 0;
    let overallAssessNotSubmitted = 0;
    let overallAssessZeroMarks = 0;
    let overallAssessPending = 0;
    let overallAssessConfigured = 0;
    let overallAssignSubmitted = 0;
    let overallAssignNotSubmitted = 0;
    let overallAssignZeroMarks = 0;
    let overallAssignPending = 0;
    let overallAssignConfigured = 0;
    for (const cat of CAT_EXAMS) {
        const internalName = CAT_INTERNAL_MAP[cat] || cat;
        let passCount = 0;
        let failCount = 0;
        let absentCount = 0;
        let pendingCount = 0;
        let invalidCount = 0;
        let totalMarks = 0;
        let markCount = 0;
        let highestMark = 0;
        let lowestMark = 40;
        for (const student of students) {
            const markRecord = student.catMarks?.[cat]?.subjects?.[subject];
            if (!markRecord) {
                pendingCount++;
                continue;
            }
            switch (markRecord.status) {
                case 'PASS':
                    passCount++;
                    if (markRecord.numericMark !== null) {
                        totalMarks += markRecord.numericMark;
                        markCount++;
                        if (markRecord.numericMark > highestMark)
                            highestMark = markRecord.numericMark;
                        if (markRecord.numericMark < lowestMark)
                            lowestMark = markRecord.numericMark;
                    }
                    break;
                case 'FAIL':
                    failCount++;
                    if (markRecord.numericMark !== null) {
                        totalMarks += markRecord.numericMark;
                        markCount++;
                        if (markRecord.numericMark > highestMark)
                            highestMark = markRecord.numericMark;
                        if (markRecord.numericMark < lowestMark)
                            lowestMark = markRecord.numericMark;
                    }
                    break;
                case 'ABSENT':
                    absentCount++;
                    break;
                case 'PENDING':
                    pendingCount++;
                    break;
                case 'INVALID':
                    invalidCount++;
                    break;
            }
        }
        const totalStudents = students.length;
        const evaluatedCount = passCount + failCount;
        const passPercentage = evaluatedCount > 0
            ? Number(((passCount / evaluatedCount) * 100).toFixed(1))
            : 0;
        const averageMarks = markCount > 0
            ? Number((totalMarks / markCount).toFixed(1))
            : 0;
        overallTotalExamMarks += totalMarks;
        overallExamMarkCount += markCount;
        overallTotalPass += passCount;
        overallTotalEvaluated += evaluatedCount;
        // Per-CAT Assessment Stats
        const isCatAssessApplicable = isSubjectAssessmentApplicable && !(cat === 'CAT-1' && (subject === 'RL' || subject === 'BA'));
        let catAssessSub = 0;
        let catAssessNS = 0;
        let catAssessZero = 0;
        let catAssessPend = 0;
        let catAssessInv = 0;
        let catAssessTotalScore = 0;
        let catAssessScoreCount = 0;
        // Per-CAT Assignment Stats
        const isCatAssignApplicable = isSubjectAssignmentApplicable;
        let catAssignSub = 0;
        let catAssignNS = 0;
        let catAssignZero = 0;
        let catAssignPend = 0;
        let catAssignInv = 0;
        let catAssignTotalScore = 0;
        let catAssignScoreCount = 0;
        if (isCatAssessApplicable || isCatAssignApplicable) {
            for (const st of students) {
                const asKey = `${cat}_${subject}`;
                if (isCatAssessApplicable) {
                    const as = st.assessments?.[asKey];
                    if (as && as.status !== 'NOT_APPLICABLE' && as.isConfigured !== false) {
                        if (as.status === 'SUBMITTED / MARKED') {
                            catAssessSub++;
                            if (as.numericMark !== null) {
                                catAssessTotalScore += as.numericMark;
                                catAssessScoreCount++;
                            }
                        }
                        else if (as.status === 'NOT SUBMITTED')
                            catAssessNS++;
                        else if (as.status === 'ZERO MARKS') {
                            catAssessZero++;
                            catAssessScoreCount++;
                        }
                        else if (as.status === 'PENDING')
                            catAssessPend++;
                        else if (as.status === 'INVALID')
                            catAssessInv++;
                    }
                }
                if (isCatAssignApplicable) {
                    const ag = st.assignments?.[asKey];
                    if (ag && ag.status !== 'NOT_APPLICABLE' && ag.isConfigured !== false) {
                        if (ag.status === 'SUBMITTED / MARKED') {
                            catAssignSub++;
                            if (ag.numericMark !== null) {
                                catAssignTotalScore += ag.numericMark;
                                catAssignScoreCount++;
                            }
                        }
                        else if (ag.status === 'NOT SUBMITTED')
                            catAssignNS++;
                        else if (ag.status === 'ZERO MARKS') {
                            catAssignZero++;
                            catAssignScoreCount++;
                        }
                        else if (ag.status === 'PENDING')
                            catAssignPend++;
                        else if (ag.status === 'INVALID')
                            catAssignInv++;
                    }
                }
            }
        }
        const catAssessConfigured = isCatAssessApplicable ? totalStudents : 0;
        const catAssessRate = catAssessConfigured > 0
            ? Number((((catAssessSub + catAssessZero) / catAssessConfigured) * 100).toFixed(1))
            : 0;
        const catAssignConfigured = isCatAssignApplicable ? totalStudents : 0;
        const catAssignRate = catAssignConfigured > 0
            ? Number((((catAssignSub + catAssignZero) / catAssignConfigured) * 100).toFixed(1))
            : 0;
        if (isCatAssessApplicable) {
            overallAssessSubmitted += catAssessSub;
            overallAssessNotSubmitted += catAssessNS;
            overallAssessZeroMarks += catAssessZero;
            overallAssessPending += catAssessPend;
            overallAssessConfigured += catAssessConfigured;
        }
        if (isCatAssignApplicable) {
            overallAssignSubmitted += catAssignSub;
            overallAssignNotSubmitted += catAssignNS;
            overallAssignZeroMarks += catAssignZero;
            overallAssignPending += catAssignPend;
            overallAssignConfigured += catAssignConfigured;
        }
        catStats[cat] = {
            cat,
            internalName,
            totalStudents,
            passCount,
            failCount,
            absentCount,
            pendingCount,
            invalidCount,
            passPercentage,
            averageMarks,
            highestMark: markCount > 0 ? highestMark : 0,
            lowestMark: markCount > 0 ? lowestMark : 0,
            assessment: {
                cat,
                internalName,
                isApplicable: isCatAssessApplicable,
                totalTracked: totalStudents,
                totalConfigured: catAssessConfigured,
                submitted: catAssessSub,
                notSubmitted: catAssessNS,
                zeroMarks: catAssessZero,
                pending: catAssessPend,
                invalid: catAssessInv,
                complianceRate: catAssessRate,
                averageMark: catAssessScoreCount > 0 ? Number((catAssessTotalScore / catAssessScoreCount).toFixed(1)) : null
            },
            assignment: {
                cat,
                internalName,
                isApplicable: isCatAssignApplicable,
                totalTracked: totalStudents,
                totalConfigured: catAssignConfigured,
                submitted: catAssignSub,
                notSubmitted: catAssignNS,
                zeroMarks: catAssignZero,
                pending: catAssignPend,
                invalid: catAssignInv,
                complianceRate: catAssignRate,
                averageMark: catAssignScoreCount > 0 ? Number((catAssignTotalScore / catAssignScoreCount).toFixed(1)) : null
            }
        };
    }
    const overallPassRate = overallTotalEvaluated > 0
        ? Number(((overallTotalPass / overallTotalEvaluated) * 100).toFixed(1))
        : 0;
    const overallAverageMark = overallExamMarkCount > 0
        ? Number((overallTotalExamMarks / overallExamMarkCount).toFixed(1))
        : 0;
    return {
        subjectCode: subject,
        subjectName: SUBJECT_NAMES[subject] || subject,
        isAssessmentApplicable: isSubjectAssessmentApplicable,
        isAssignmentApplicable: isSubjectAssignmentApplicable,
        totalStudents: students.length,
        catStats,
        overallPassRate,
        overallAverageMark,
        assessmentStats: {
            isApplicable: isSubjectAssessmentApplicable,
            totalTracked: overallAssessConfigured,
            submitted: overallAssessSubmitted,
            notSubmitted: overallAssessNotSubmitted,
            zeroMarks: overallAssessZeroMarks,
            pending: overallAssessPending,
            complianceRate: overallAssessConfigured > 0
                ? Number((((overallAssessSubmitted + overallAssessZeroMarks) / overallAssessConfigured) * 100).toFixed(1))
                : 0
        },
        assignmentStats: {
            isApplicable: isSubjectAssignmentApplicable,
            totalTracked: overallAssignConfigured,
            submitted: overallAssignSubmitted,
            notSubmitted: overallAssignNotSubmitted,
            zeroMarks: overallAssignZeroMarks,
            pending: overallAssignPending,
            complianceRate: overallAssignConfigured > 0
                ? Number((((overallAssignSubmitted + overallAssignZeroMarks) / overallAssignConfigured) * 100).toFixed(1))
                : 0
        }
    };
}
