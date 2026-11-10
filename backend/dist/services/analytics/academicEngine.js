/**
 * Classifies an individual mark in a specific subject and CAT exam.
 */
export function classifySubjectMark(rawValue, config) {
    // Check for blank / empty
    if (rawValue === null || rawValue === undefined) {
        return {
            raw: rawValue,
            numericMark: null,
            status: 'PENDING'
        };
    }
    let strVal = String(rawValue).trim();
    if (strVal === '') {
        return {
            raw: rawValue,
            numericMark: null,
            status: 'PENDING'
        };
    }
    // Strip leading/trailing formatting characters that spreadsheet software may insert (e.g. `12 or '12)
    strVal = strVal.replace(/^[`'"]+|[`'"]+$/g, '').trim();
    if (strVal === '') {
        return {
            raw: rawValue,
            numericMark: null,
            status: 'PENDING'
        };
    }
    // Check for absent variations and common typos (e.g. 'ASBENT' found in spreadsheet)
    const upper = strVal.toUpperCase();
    if (upper === 'ABSENT' ||
        upper === 'ASBENT' ||
        upper === 'A' ||
        upper === 'AB' ||
        upper === 'AAA' ||
        upper === 'AB.') {
        return {
            raw: rawValue,
            numericMark: null,
            status: 'ABSENT'
        };
    }
    // Normalize decimal comma format (e.g. "39,5" -> "39.5")
    if (/^\d+,\d+$/.test(strVal)) {
        strVal = strVal.replace(',', '.');
    }
    // Check if numeric
    const num = Number(strVal);
    if (isNaN(num)) {
        return {
            raw: rawValue,
            numericMark: null,
            status: 'INVALID',
            invalidReason: `Unrecognized mark text '${rawValue}'. Expected a number between 0 and ${config.maxMarks}, 'A', or 'ABSENT'.`
        };
    }
    // Check numeric boundaries
    if (num < 0) {
        return {
            raw: rawValue,
            numericMark: num,
            status: 'INVALID',
            invalidReason: `Negative mark '${num}' is not permitted.`
        };
    }
    if (num > config.maxMarks) {
        return {
            raw: rawValue,
            numericMark: num,
            status: 'INVALID',
            invalidReason: `Mark ${num} exceeds maximum permitted marks (${config.maxMarks}).`
        };
    }
    if (num >= config.passingMarks) {
        return {
            raw: rawValue,
            numericMark: num,
            status: 'PASS'
        };
    }
    return {
        raw: rawValue,
        numericMark: num,
        status: 'FAIL'
    };
}
/**
 * Computes overall CAT status across 5 subjects:
 * 1. INVALID if at least one unresolved invalid mark exists.
 * 2. FAIL if at least one subject has FAIL status.
 * 3. ABSENT if no failed subjects, but at least one subject is ABSENT.
 * 4. PENDING if no failed or absent subjects, but at least one subject is PENDING.
 * 5. PASS if all subjects have PASS status.
 */
export function computeOverallCatStatus(subjectMarks) {
    const records = Object.values(subjectMarks);
    if (records.some(r => r.status === 'INVALID')) {
        return 'INVALID';
    }
    if (records.some(r => r.status === 'FAIL')) {
        return 'FAIL';
    }
    if (records.some(r => r.status === 'ABSENT')) {
        return 'ABSENT';
    }
    if (records.some(r => r.status === 'PENDING')) {
        return 'PENDING';
    }
    if (records.length > 0 && records.every(r => r.status === 'PASS')) {
        return 'PASS';
    }
    return 'PENDING';
}
/**
 * Classifies assignment or assessment submission:
 * - Explicit NS / Not Submitted -> NOT SUBMITTED
 * - Numeric 0 -> ZERO MARKS
 * - Positive numeric mark -> SUBMITTED / MARKED
 * - Blank -> PENDING
 * - Invalid value -> INVALID
 */
export function classifySubmission(rawValue, subject, itemType, cat, isConfigured = true) {
    const catExam = cat || 'CAT-1';
    if (!isConfigured) {
        return {
            subject,
            cat: catExam,
            itemType,
            rawValue: null,
            numericMark: null,
            status: 'NOT CONFIGURED',
            isConfigured: false
        };
    }
    if (rawValue === null || rawValue === undefined) {
        return {
            subject,
            cat: catExam,
            itemType,
            rawValue,
            numericMark: null,
            status: 'PENDING',
            isConfigured: true
        };
    }
    let str = String(rawValue).trim();
    if (str === '') {
        return {
            subject,
            cat: catExam,
            itemType,
            rawValue,
            numericMark: null,
            status: 'PENDING',
            isConfigured: true
        };
    }
    // Strip leading/trailing formatting characters that spreadsheet software may insert
    str = str.replace(/^[`'"]+|[`'"]+$/g, '').trim();
    // Normalize decimal comma format if present
    if (/^\d+,\d+$/.test(str)) {
        str = str.replace(',', '.');
    }
    const upper = str.toUpperCase();
    if (upper === 'NS' || upper === 'NOT SUBMITTED' || upper === 'NOTSUBMITTED') {
        return {
            subject,
            cat: catExam,
            itemType,
            rawValue,
            numericMark: null,
            status: 'NOT SUBMITTED',
            isConfigured: true
        };
    }
    const num = Number(str);
    if (isNaN(num)) {
        return {
            subject,
            cat: catExam,
            itemType,
            rawValue,
            numericMark: null,
            status: 'INVALID',
            isConfigured: true,
            invalidReason: `Invalid value '${str}'. Expected numeric score or 'NS'.`
        };
    }
    if (num < 0) {
        return {
            subject,
            cat: catExam,
            itemType,
            rawValue,
            numericMark: num,
            status: 'INVALID',
            isConfigured: true,
            invalidReason: `Negative score '${num}' is not valid.`
        };
    }
    if (num === 0) {
        return {
            subject,
            cat: catExam,
            itemType,
            rawValue,
            numericMark: 0,
            status: 'ZERO MARKS',
            isConfigured: true
        };
    }
    return {
        subject,
        cat: catExam,
        itemType,
        rawValue,
        numericMark: num,
        status: 'SUBMITTED / MARKED',
        isConfigured: true
    };
}
