import { syncManager } from '../services/synchronization/syncManager.js';
import { computeDashboardAnalytics } from '../services/analytics/dashboardAnalytics.js';
import { computeSubjectAnalytics } from '../services/analytics/subjectAnalytics.js';
import { getSubmissionTracking } from '../services/analytics/trackingEngine.js';
import { generateMasterExcel } from '../services/reports/excelReportService.js';
import { generateCatPdfReport } from '../services/reports/pdfReportService.js';
import { generateAcademicMarksCsvTemplate } from '../services/googleSheets/defaultStudentsData.js';
import { getAcademicConfig, updateAcademicConfig } from '../config/academic.config.js';
import { getSafeSheetConfig, updateSheetConfig, clearSheetConfig } from '../config/sheets.config.js';
import { parseGoogleSheetsUrl } from '../utils/urlParser.js';
import { SUBJECT_CODES, CAT_EXAMS } from '../types/academic.types.js';
// Health check
export const getHealth = (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
};
// Dashboard analytics
export const getDashboard = async (req, res) => {
    const cat = req.query.cat || 'CAT-1';
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const students = freshData.students;
    const syncState = freshData.syncState;
    if (students.length === 0) {
        res.json({
            syncState,
            summary: {
                totalStudents: 0,
                totalSubjects: 5,
                totalPassed: 0,
                totalFailed: 0,
                totalAbsent: 0,
                passPercentage: 0,
                failPercentage: 0,
                absentPercentage: 0,
                classAverage: 0,
                highestScore: 0,
                lowestScore: 0,
                catOverview: {
                    'CAT-1': { total: 0, passed: 0, failed: 0, absent: 0, pending: 0, invalid: 0, passPercentage: 0 },
                    'CAT-2': { total: 0, passed: 0, failed: 0, absent: 0, pending: 0, invalid: 0, passPercentage: 0 },
                    'CAT-3': { total: 0, passed: 0, failed: 0, absent: 0, pending: 0, invalid: 0, passPercentage: 0 }
                },
                overallComparison: [
                    { exam: 'CAT-1', passRate: 0, failRate: 0, absentRate: 0 },
                    { exam: 'CAT-2', passRate: 0, failRate: 0, absentRate: 0 },
                    { exam: 'CAT-3', passRate: 0, failRate: 0, absentRate: 0 }
                ],
                complianceRates: {
                    assessmentOverallRate: 0,
                    assignmentOverallRate: 0,
                    bySubject: SUBJECT_CODES.map(s => ({
                        subject: s,
                        assessmentRate: 0,
                        assignmentRate: 0
                    }))
                },
                subjectWisePassPercentage: SUBJECT_CODES.map(s => ({
                    subject: s,
                    subjectName: s,
                    cat1PassRate: 0,
                    cat2PassRate: 0,
                    cat3PassRate: 0
                })),
                subjectWiseFailCount: SUBJECT_CODES.map(s => ({
                    subject: s,
                    subjectName: s,
                    cat1FailCount: 0,
                    cat2FailCount: 0,
                    cat3FailCount: 0
                })),
                scoreDistribution: [
                    { range: '0-15 (Fail)', count: 0, percentage: 0 },
                    { range: '16-25', count: 0, percentage: 0 },
                    { range: '26-35', count: 0, percentage: 0 },
                    { range: '36-40', count: 0, percentage: 0 }
                ],
                attentionLists: {
                    studentsNeedingAttention: [],
                    absentStudents: [],
                    criticalFailureList: [],
                    submissionIssues: []
                }
            },
            activeCat: cat,
            diagnostics: freshData.diagnostics
        });
        return;
    }
    const summary = computeDashboardAnalytics(students, cat);
    res.json({
        syncState,
        summary,
        activeCat: cat,
        diagnostics: freshData.diagnostics
    });
};
// All students with filters, pagination, sorting
export const getStudents = async (req, res) => {
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const students = freshData.students;
    const { cat = 'CAT-1', status, search, page = '1', limit = '100' } = req.query;
    let filtered = [...students];
    if (search && typeof search === 'string' && search.trim() !== '') {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(q) ||
            s.rollNumber.toLowerCase().includes(q) ||
            s.registerNumber.toLowerCase().includes(q));
    }
    const selectedCat = cat;
    if (status && typeof status === 'string' && status !== 'ALL') {
        filtered = filtered.filter(s => s.catMarks[selectedCat]?.overallStatus === status);
    }
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
    const total = filtered.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);
    res.json({
        students: paginated,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1
        },
        diagnostics: freshData.diagnostics
    });
};
// Single student profile
export const getStudentById = async (req, res) => {
    const { id } = req.params;
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const student = freshData.students.find(s => s.id === id || s.rollNumber === id || s.registerNumber === id);
    if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
    }
    res.json({ student });
};
// Passed students
export const getPassedStudents = async (req, res) => {
    const cat = req.query.cat || 'CAT-1';
    const subject = req.query.subject;
    const search = req.query.search || '';
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    let passed = freshData.students.filter(s => {
        if (subject) {
            return s.catMarks[cat]?.subjects[subject]?.status === 'PASS';
        }
        return s.catMarks[cat]?.overallStatus === 'PASS';
    });
    if (search.trim()) {
        const q = search.trim().toLowerCase();
        passed = passed.filter(s => s.name.toLowerCase().includes(q) ||
            s.rollNumber.toLowerCase().includes(q) ||
            s.registerNumber.toLowerCase().includes(q));
    }
    res.json({
        cat,
        subject,
        count: passed.length,
        students: passed
    });
};
// Failed students
export const getFailedStudents = async (req, res) => {
    const cat = req.query.cat || 'CAT-1';
    const subject = req.query.subject;
    const search = req.query.search || '';
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    let failed = freshData.students.filter(s => {
        if (subject) {
            return s.catMarks[cat]?.subjects[subject]?.status === 'FAIL';
        }
        return s.catMarks[cat]?.overallStatus === 'FAIL';
    });
    if (search.trim()) {
        const q = search.trim().toLowerCase();
        failed = failed.filter(s => s.name.toLowerCase().includes(q) ||
            s.rollNumber.toLowerCase().includes(q) ||
            s.registerNumber.toLowerCase().includes(q));
    }
    const enriched = failed.map(s => {
        const catData = s.catMarks[cat];
        const failedSubjects = SUBJECT_CODES.filter(sc => catData?.subjects[sc]?.status === 'FAIL').map(sc => ({
            subject: sc,
            mark: catData?.subjects[sc]?.numericMark,
            raw: catData?.subjects[sc]?.raw
        }));
        return {
            ...s,
            failedSubjects
        };
    });
    res.json({
        cat,
        subject,
        count: enriched.length,
        students: enriched
    });
};
// Absent students
export const getAbsentStudents = async (req, res) => {
    const cat = req.query.cat || 'CAT-1';
    const subject = req.query.subject;
    const search = req.query.search || '';
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    let absent = freshData.students.filter(s => {
        if (subject) {
            return s.catMarks[cat]?.subjects[subject]?.status === 'ABSENT';
        }
        return s.catMarks[cat]?.overallStatus === 'ABSENT';
    });
    if (search.trim()) {
        const q = search.trim().toLowerCase();
        absent = absent.filter(s => s.name.toLowerCase().includes(q) ||
            s.rollNumber.toLowerCase().includes(q) ||
            s.registerNumber.toLowerCase().includes(q));
    }
    const enriched = absent.map(s => {
        const catData = s.catMarks[cat];
        const absentSubjects = SUBJECT_CODES.filter(sc => catData?.subjects[sc]?.status === 'ABSENT');
        return {
            ...s,
            absentSubjects
        };
    });
    res.json({
        cat,
        subject,
        count: enriched.length,
        students: enriched
    });
};
// All subjects list & summary
export const getSubjects = async (req, res) => {
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const students = freshData.students;
    if (students.length === 0) {
        res.json({ subjects: [] });
        return;
    }
    const list = SUBJECT_CODES.map(sc => computeSubjectAnalytics(sc, students));
    res.json({ subjects: list });
};
// Specific subject analytics
export const getSubjectById = async (req, res) => {
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
    const upper = idStr.toUpperCase();
    if (!SUBJECT_CODES.includes(upper)) {
        res.status(404).json({ error: `Subject ${idStr} not found.` });
        return;
    }
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const students = freshData.students;
    if (students.length === 0) {
        res.json({
            analytics: {
                subject: upper,
                subjectName: upper,
                cat1: { totalAppeared: 0, passed: 0, failed: 0, absent: 0, passRate: 0, averageMark: 0 },
                cat2: { totalAppeared: 0, passed: 0, failed: 0, absent: 0, passRate: 0, averageMark: 0 },
                cat3: { totalAppeared: 0, passed: 0, failed: 0, absent: 0, passRate: 0, averageMark: 0 },
                overallPassRate: 0
            },
            studentResults: []
        });
        return;
    }
    const analytics = computeSubjectAnalytics(upper, students);
    const studentResults = students.map(s => ({
        id: s.id,
        rollNumber: s.rollNumber,
        registerNumber: s.registerNumber,
        name: s.name,
        cat1: s.cat1 ? s.cat1[upper] : s.catMarks['CAT-1']?.subjects[upper],
        cat2: s.cat2 ? s.cat2[upper] : s.catMarks['CAT-2']?.subjects[upper],
        cat3: s.cat3 ? s.cat3[upper] : s.catMarks['CAT-3']?.subjects[upper],
        assessmentCat1: s.assessments[`CAT-1_${upper}`] || s.cat1?.[upper]?.assessment,
        assignmentCat1: s.assignments[`CAT-1_${upper}`] || s.cat1?.[upper]?.assignment,
        assessmentCat2: s.assessments[`CAT-2_${upper}`] || s.cat2?.[upper]?.assessment,
        assignmentCat2: s.assignments[`CAT-2_${upper}`] || s.cat2?.[upper]?.assignment,
        assessmentCat3: s.assessments[`CAT-3_${upper}`] || s.cat3?.[upper]?.assessment,
        assignmentCat3: s.assignments[`CAT-3_${upper}`] || s.cat3?.[upper]?.assignment,
        assessment: s.assessments[`CAT-1_${upper}`] || s.assessments[upper],
        assignment: s.assignments[`CAT-1_${upper}`] || s.assignments[upper]
    }));
    res.json({
        analytics,
        studentResults
    });
};
// CAT analytics: /api/cat/:catNum (1, 2, 3)
export const getCatAnalytics = async (req, res) => {
    const catNum = req.params.catNum;
    const catExam = `CAT-${catNum}`;
    if (!CAT_EXAMS.includes(catExam)) {
        res.status(400).json({ error: `Invalid CAT exam: ${catNum}. Expected 1, 2, or 3.` });
        return;
    }
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const students = freshData.students;
    if (students.length === 0) {
        res.json({
            cat: catExam,
            summary: { total: 0, passed: 0, failed: 0, absent: 0, passPercentage: 0 },
            subjectWisePassRate: SUBJECT_CODES.map(s => ({ subject: s, subjectName: s, passRate: 0 })),
            subjectWiseFailCount: SUBJECT_CODES.map(s => ({ subject: s, subjectName: s, failCount: 0 })),
            studentsNeedingAttention: [],
            absentStudents: []
        });
        return;
    }
    const summary = computeDashboardAnalytics(students, catExam);
    res.json({
        cat: catExam,
        summary: summary.catOverview[catExam],
        subjectWisePassRate: summary.subjectWisePassPercentage.map(s => ({
            subject: s.subject,
            subjectName: s.subjectName,
            passRate: catExam === 'CAT-1' ? s.cat1PassRate : catExam === 'CAT-2' ? s.cat2PassRate : s.cat3PassRate
        })),
        subjectWiseFailCount: summary.subjectWiseFailCount.map(s => ({
            subject: s.subject,
            subjectName: s.subjectName,
            failCount: catExam === 'CAT-1' ? s.cat1FailCount : catExam === 'CAT-2' ? s.cat2FailCount : s.cat3FailCount
        })),
        studentsNeedingAttention: summary.attentionLists.studentsNeedingAttention.filter(s => s.cat === catExam),
        absentStudents: summary.attentionLists.absentStudents.filter(s => s.cat === catExam)
    });
};
// Assessment issues & tracking
export const getAssessmentIssues = async (req, res) => {
    const { subject, status, search, cat } = req.query;
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const tracking = getSubmissionTracking(freshData.students, 'Assessment', {
        subject: subject,
        cat: cat,
        status: status,
        search: search
    });
    res.json(tracking);
};
// Assignment issues & tracking
export const getAssignmentIssues = async (req, res) => {
    const { subject, status, search, cat } = req.query;
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success) {
        res.status(freshData.syncState.status === 'access_denied' ? 403 : 503).json({
            error: freshData.error || 'Failed to retrieve live data from Google Sheets.',
            syncState: freshData.syncState
        });
        return;
    }
    const tracking = getSubmissionTracking(freshData.students, 'Assignment', {
        subject: subject,
        cat: cat,
        status: status,
        search: search
    });
    res.json(tracking);
};
// Data quality issues
export const getDataQuality = async (req, res) => {
    const freshData = await syncManager.getFreshStudentData();
    res.json({
        totalIssues: freshData.issues.length,
        issues: freshData.issues,
        warnings: freshData.warnings,
        mappingDiagnostics: freshData.mappingDiagnostics,
        headerLayout: freshData.headerLayout,
        syncState: freshData.syncState,
        diagnostics: freshData.diagnostics
    });
};
// Sync status
export const getSyncStatus = (req, res) => {
    res.json({
        ...syncManager.getSyncState(),
        diagnostics: syncManager.getLastDiagnostics()
    });
};
// Sync now (forces fresh network fetch)
export const postSyncNow = async (req, res) => {
    const { url, gid } = req.body || {};
    const result = await syncManager.syncNow(url, gid);
    res.json(result);
};
// Connection management
export const getConnection = (req, res) => {
    const safeConfig = getSafeSheetConfig();
    const syncState = syncManager.getSyncState();
    res.json({
        connection: safeConfig,
        syncState
    });
};
export const postConnection = async (req, res) => {
    const { sourceMethod = 'public_csv', url, spreadsheetId, gid, appsScriptUrl, appsScriptToken, autoSync = true, syncIntervalSeconds = 30, confirmedApprovedSharing = true } = req.body;
    let effectiveSpreadsheetId = spreadsheetId;
    let effectiveGid = gid;
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        const parsed = parseGoogleSheetsUrl(url);
        if (parsed.isValid && parsed.spreadsheetId) {
            effectiveSpreadsheetId = parsed.spreadsheetId;
            if (parsed.gid && !effectiveGid) {
                effectiveGid = parsed.gid;
            }
        }
    }
    updateSheetConfig({
        sourceMethod,
        url,
        spreadsheetId: effectiveSpreadsheetId,
        gid: effectiveGid,
        appsScriptUrl: appsScriptUrl || '',
        appsScriptToken: appsScriptToken !== undefined ? appsScriptToken : undefined,
        autoSync,
        syncIntervalSeconds,
        confirmedApprovedSharing
    });
    // Trigger immediate fresh sync
    const syncResult = await syncManager.syncNow();
    res.json({
        success: syncResult.success,
        message: syncResult.message,
        connection: getSafeSheetConfig(),
        syncState: syncResult.syncState,
        diagnostics: syncResult.diagnostics
    });
};
export const deleteConnection = (req, res) => {
    clearSheetConfig();
    syncManager.resetCache();
    res.json({
        success: true,
        message: 'Connection configuration reset.',
        syncState: syncManager.getSyncState()
    });
};
// Academic settings
export const getSettings = (req, res) => {
    res.json({
        academic: getAcademicConfig(),
        connection: getSafeSheetConfig()
    });
};
export const updateSettings = (req, res) => {
    const { academic, connection } = req.body;
    if (academic) {
        updateAcademicConfig(academic);
    }
    if (connection) {
        updateSheetConfig(connection);
    }
    res.json({
        success: true,
        academic: getAcademicConfig(),
        connection: getSafeSheetConfig()
    });
};
// Excel Report Export
export const getExcelReport = async (req, res) => {
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success || freshData.students.length === 0) {
        res.status(503).json({
            error: freshData.error || 'No student marks data available directly from Google Sheets.'
        });
        return;
    }
    const students = freshData.students;
    const cat = req.query.cat;
    try {
        const buffer = await generateMasterExcel(students, cat);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Semester_Marks_Report_${Date.now()}.xlsx"`);
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ error: `Excel generation failed: ${err.message}` });
    }
};
// PDF Report Export
export const getPdfReport = async (req, res) => {
    const freshData = await syncManager.getFreshStudentData();
    if (!freshData.success || freshData.students.length === 0) {
        res.status(503).json({
            error: freshData.error || 'No student marks data available directly from Google Sheets.'
        });
        return;
    }
    const students = freshData.students;
    const cat = req.query.cat || 'CAT-1';
    const title = req.query.title;
    try {
        const buffer = generateCatPdfReport(students, cat, title);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Semester_Marks_${cat}_${Date.now()}.pdf"`);
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ error: `PDF generation failed: ${err.message}` });
    }
};
// Download CSV template for Google Sheets
export const getCsvTemplate = (req, res) => {
    const csv = generateAcademicMarksCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Semester_Marks_Academic_Template_54_Students.csv"');
    res.send(csv);
};
