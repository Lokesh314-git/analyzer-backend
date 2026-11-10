import { describe, it, expect } from 'vitest';
import { classifySubjectMark, computeOverallCatStatus, classifySubmission } from '../services/analytics/academicEngine.js';
import { DEFAULT_ACADEMIC_CONFIG } from '../config/academic.config.js';
describe('Academic Classification Engine - Individual Marks', () => {
    const config = DEFAULT_ACADEMIC_CONFIG;
    it('classifies 15/40 as FAIL', () => {
        const res = classifySubjectMark(15, config);
        expect(res.status).toBe('FAIL');
        expect(res.numericMark).toBe(15);
    });
    it('classifies 16/40 as PASS', () => {
        const res = classifySubjectMark(16, config);
        expect(res.status).toBe('PASS');
        expect(res.numericMark).toBe(16);
    });
    it('classifies 40/40 as PASS', () => {
        const res = classifySubjectMark(40, config);
        expect(res.status).toBe('PASS');
        expect(res.numericMark).toBe(40);
    });
    it('classifies 41/40 as INVALID', () => {
        const res = classifySubjectMark(41, config);
        expect(res.status).toBe('INVALID');
        expect(res.invalidReason).toContain('exceeds maximum permitted marks');
    });
    it('classifies ABSENT, Absent, A, AB, and common typo ASBENT as ABSENT', () => {
        expect(classifySubjectMark('ABSENT', config).status).toBe('ABSENT');
        expect(classifySubjectMark('Absent', config).status).toBe('ABSENT');
        expect(classifySubjectMark('A', config).status).toBe('ABSENT');
        expect(classifySubjectMark('AB', config).status).toBe('ABSENT');
        expect(classifySubjectMark('ASBENT', config).status).toBe('ABSENT');
    });
    it('safely normalizes decimal comma representation (e.g. 39,5 -> 39.5) and classifies as PASS', () => {
        const res = classifySubjectMark('39,5', config);
        expect(res.status).toBe('PASS');
        expect(res.numericMark).toBe(39.5);
    });
    it('safely normalizes formatted marks with backticks or quotes (e.g. `12 -> 12)', () => {
        const res = classifySubjectMark('`12', config);
        expect(res.status).toBe('FAIL'); // 12 < 16 passing mark
        expect(res.numericMark).toBe(12);
        const resQuote = classifySubjectMark("'12", config);
        expect(resQuote.status).toBe('FAIL');
        expect(resQuote.numericMark).toBe(12);
    });
    it('correctly classifies mark 56 as INVALID exceeding maximum permitted examination mark of 40', () => {
        const res = classifySubjectMark('56', config);
        expect(res.status).toBe('INVALID');
        expect(res.numericMark).toBe(56);
        expect(res.invalidReason).toContain('exceeds maximum permitted marks (40)');
    });
    it('classifies blank/empty as PENDING without converting to zero', () => {
        expect(classifySubjectMark('', config).status).toBe('PENDING');
        expect(classifySubjectMark('  ', config).status).toBe('PENDING');
        expect(classifySubjectMark(null, config).status).toBe('PENDING');
        expect(classifySubjectMark(undefined, config).status).toBe('PENDING');
        expect(classifySubjectMark('', config).numericMark).toBeNull();
    });
    it('classifies unrecognized text as INVALID', () => {
        const res = classifySubjectMark('XYZ', config);
        expect(res.status).toBe('INVALID');
        expect(res.invalidReason).toContain('Unrecognized mark text');
    });
    it('classifies negative marks as INVALID', () => {
        const res = classifySubjectMark(-5, config);
        expect(res.status).toBe('INVALID');
        expect(res.invalidReason).toContain('Negative mark');
    });
});
describe('Overall Student Classification per CAT', () => {
    const makeSubjectRecord = (status, mark) => ({
        raw: mark ?? status,
        numericMark: mark,
        status
    });
    it('PASS: when all five subjects have PASS status', () => {
        const marks = {
            'DL': makeSubjectRecord('PASS', 25),
            'GEN AI': makeSubjectRecord('PASS', 30),
            'RL': makeSubjectRecord('PASS', 20),
            'BA': makeSubjectRecord('PASS', 18),
            'RE&CCE': makeSubjectRecord('PASS', 35),
        };
        expect(computeOverallCatStatus(marks)).toBe('PASS');
    });
    it('FAIL: when at least one subject has FAIL status', () => {
        const marks = {
            'DL': makeSubjectRecord('PASS', 25),
            'GEN AI': makeSubjectRecord('PASS', 30),
            'RL': makeSubjectRecord('PASS', 20),
            'BA': makeSubjectRecord('PASS', 18),
            'RE&CCE': makeSubjectRecord('FAIL', 12),
        };
        expect(computeOverallCatStatus(marks)).toBe('FAIL');
    });
    it('ABSENT: when no failed subjects, but at least one subject is ABSENT', () => {
        const marks = {
            'DL': makeSubjectRecord('PASS', 25),
            'GEN AI': makeSubjectRecord('PASS', 30),
            'RL': makeSubjectRecord('PASS', 20),
            'BA': makeSubjectRecord('ABSENT', null),
            'RE&CCE': makeSubjectRecord('PASS', 28),
        };
        expect(computeOverallCatStatus(marks)).toBe('ABSENT');
    });
    it('PENDING: when no failed or absent subjects, but at least one subject is PENDING', () => {
        const marks = {
            'DL': makeSubjectRecord('PASS', 25),
            'GEN AI': makeSubjectRecord('PASS', 30),
            'RL': makeSubjectRecord('PENDING', null),
            'BA': makeSubjectRecord('PASS', 22),
            'RE&CCE': makeSubjectRecord('PASS', 28),
        };
        expect(computeOverallCatStatus(marks)).toBe('PENDING');
    });
    it('INVALID: when at least one unresolved invalid mark exists', () => {
        const marks = {
            'DL': makeSubjectRecord('PASS', 25),
            'GEN AI': makeSubjectRecord('PASS', 30),
            'RL': makeSubjectRecord('INVALID', null),
            'BA': makeSubjectRecord('FAIL', 10),
            'RE&CCE': makeSubjectRecord('PASS', 28),
        };
        expect(computeOverallCatStatus(marks)).toBe('INVALID');
    });
});
describe('Assignment and Assessment Tracking Classification', () => {
    it('classifies explicit NS as NOT SUBMITTED', () => {
        const res = classifySubmission('NS', 'DL', 'Assignment');
        expect(res.status).toBe('NOT SUBMITTED');
        expect(res.numericMark).toBeNull();
        const res2 = classifySubmission('Not Submitted', 'DL', 'Assessment');
        expect(res2.status).toBe('NOT SUBMITTED');
    });
    it('classifies numeric 0 as ZERO MARKS (never not submitted)', () => {
        const res = classifySubmission(0, 'DL', 'Assignment');
        expect(res.status).toBe('ZERO MARKS');
        expect(res.numericMark).toBe(0);
        const resStr = classifySubmission('0', 'GEN AI', 'Assessment');
        expect(resStr.status).toBe('ZERO MARKS');
    });
    it('classifies positive numeric marks as SUBMITTED / MARKED', () => {
        const res = classifySubmission(8, 'RL', 'Assignment');
        expect(res.status).toBe('SUBMITTED / MARKED');
        expect(res.numericMark).toBe(8);
    });
    it('classifies blank as PENDING', () => {
        const res = classifySubmission('', 'BA', 'Assessment');
        expect(res.status).toBe('PENDING');
        expect(res.numericMark).toBeNull();
    });
    it('classifies unconfigured items as NOT CONFIGURED', () => {
        const res = classifySubmission(null, 'RL', 'Assessment', 'CAT-1', false);
        expect(res.status).toBe('NOT CONFIGURED');
        expect(res.isConfigured).toBe(false);
    });
});
