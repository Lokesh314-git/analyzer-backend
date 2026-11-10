import { describe, it, expect, beforeEach } from 'vitest';
import { syncManager } from '../services/synchronization/syncManager.js';
import { computeDashboardAnalytics } from '../services/analytics/dashboardAnalytics.js';
import { computeSubjectAnalytics } from '../services/analytics/subjectAnalytics.js';
import { getSubmissionTracking } from '../services/analytics/trackingEngine.js';
import { SUBJECT_CODES, CAT_EXAMS } from '../types/academic.types.js';
import { generateTestFixtureStudents } from './fixtures/testMarksheet.js';
describe('Analytics & API Logic Integration Tests', () => {
    beforeEach(() => {
        // Seed with isolated test fixture for pure analytics computation tests
        syncManager.setTestDataset(generateTestFixtureStudents());
    });
    it('loads test fixture students when set explicitly for tests', () => {
        const students = syncManager.getCachedStudents();
        expect(students.length).toBe(54);
        expect(students[0].name).toBe('Abitha E');
        expect(students[53].name).toBe('Ragul M');
    });
    it('computes accurate dashboard analytics across CAT-1, CAT-2, CAT-3', () => {
        const students = syncManager.getCachedStudents();
        const dashboard = computeDashboardAnalytics(students, 'CAT-1');
        expect(dashboard.totalStudents).toBe(54);
        expect(dashboard.totalSubjects).toBe(5);
        expect(dashboard.catOverview['CAT-1'].passed).toBeGreaterThan(0);
        expect(dashboard.catOverview['CAT-1'].failed).toBeGreaterThan(0);
        expect(dashboard.overallComparison.length).toBe(3);
        expect(dashboard.subjectWisePassPercentage.length).toBe(5);
        expect(dashboard.subjectWiseFailCount.length).toBe(5);
    });
    it('computes subject-wise analytics for DL, GEN AI, RL, BA, RE&CCE', () => {
        const students = syncManager.getCachedStudents();
        for (const sc of SUBJECT_CODES) {
            const stats = computeSubjectAnalytics(sc, students);
            expect(stats.subjectCode).toBe(sc);
            expect(stats.totalStudents).toBe(54);
            for (const cat of CAT_EXAMS) {
                expect(stats.catStats[cat].passCount +
                    stats.catStats[cat].failCount +
                    stats.catStats[cat].absentCount +
                    stats.catStats[cat].pendingCount +
                    stats.catStats[cat].invalidCount).toBe(54);
            }
        }
    });
    it('verifies special case: student failing RE&CCE appears in RE&CCE failed list and overall CAT failed list', () => {
        const students = syncManager.getCachedStudents();
        // Student 2 (Anantha Jothi L) configured with RE&CCE CAT-1 = 12 (FAIL), others PASS
        const s2 = students.find(s => s.slNo === 2);
        expect(s2).toBeDefined();
        if (s2) {
            expect(s2.catMarks['CAT-1'].subjects['RE&CCE'].status).toBe('FAIL');
            expect(s2.catMarks['CAT-1'].subjects['DL'].status).toBe('PASS');
            expect(s2.catMarks['CAT-1'].overallStatus).toBe('FAIL');
        }
    });
    it('tracks assignments and assessments with complete separation', () => {
        const students = syncManager.getCachedStudents();
        const assessments = getSubmissionTracking(students, 'Assessment', { cat: 'CAT-1' });
        const assignments = getSubmissionTracking(students, 'Assignment', { cat: 'CAT-1' });
        // RE&CCE is strictly excluded from tracking denominator (4 applicable subjects: DL, GEN AI, RL, BA)
        expect(assessments.stats.totalTracked).toBe(54 * 4);
        expect(assignments.stats.totalTracked).toBe(54 * 4);
        expect(assessments.stats.submittedCount).toBeGreaterThan(0);
        expect(assignments.stats.submittedCount).toBeGreaterThan(0);
    });
    it('ensures no student marks are retained or marked stale when a sync fails (zero stale cache)', async () => {
        // Clear test dataset to test network failure behavior
        syncManager.clearTestDataset();
        // Attempt sync with an unreachable/invalid URL
        const result = await syncManager.syncNow('https://docs.google.com/spreadsheets/d/invalid_id_999/edit');
        expect(result.success).toBe(false);
        // Stale caching must NOT occur: dataSource must be none, totalStudentsLoaded must be 0, isStale false
        const syncState = syncManager.getSyncState();
        expect(syncState.isStale).toBe(false);
        expect(syncState.status).toBe('error');
        expect(syncState.totalStudentsLoaded).toBe(0);
        expect(result.studentsCount).toBe(0);
    });
});
