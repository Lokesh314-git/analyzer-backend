import { SUBJECT_CODES, CAT_EXAMS } from '../types/academic.types.js';
export const DEFAULT_ACADEMIC_CONFIG = {
    passingMarks: 16,
    maxMarks: 40,
    totalExpectedStudents: 54,
    subjects: [...SUBJECT_CODES],
    catExams: [...CAT_EXAMS],
    collegeName: 'Department of Computer Science & Engineering',
    departmentName: 'B.Sc. Computer Science (AI & ML) - Semester V',
    semester: 'Semester V',
    academicYear: '2026-2027'
};
let currentConfig = { ...DEFAULT_ACADEMIC_CONFIG };
export function getAcademicConfig() {
    return { ...currentConfig };
}
export function updateAcademicConfig(updates) {
    currentConfig = {
        ...currentConfig,
        ...updates,
        passingMarks: updates.passingMarks !== undefined ? Number(updates.passingMarks) : currentConfig.passingMarks,
        maxMarks: updates.maxMarks !== undefined ? Number(updates.maxMarks) : currentConfig.maxMarks,
    };
    return { ...currentConfig };
}
