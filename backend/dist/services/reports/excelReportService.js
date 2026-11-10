import ExcelJS from 'exceljs';
import { getAcademicConfig } from '../../config/academic.config.js';
function formatExamValue(rec) {
    if (!rec)
        return '-';
    if (rec.status === 'ABSENT')
        return 'AB';
    if (rec.status === 'PENDING')
        return 'PENDING';
    if (rec.numericMark !== null && rec.numericMark !== undefined)
        return rec.numericMark;
    if (rec.raw !== undefined && rec.raw !== null && rec.raw !== '')
        return rec.raw;
    return '-';
}
function formatComponentValue(rec) {
    if (!rec)
        return '-';
    if (rec.status === 'NOT_APPLICABLE' || rec.isApplicable === false)
        return 'N/A';
    if (rec.status === 'NOT CONFIGURED' || rec.isConfigured === false)
        return 'NOT CONFIGURED';
    if (rec.numericMark !== null && rec.numericMark !== undefined)
        return rec.numericMark;
    if (rec.status === 'ZERO MARKS')
        return 0;
    if (rec.status === 'PENDING')
        return 'PENDING';
    if (rec.status === 'NOT SUBMITTED')
        return 'NOT SUBMITTED';
    if (rec.rawValue !== undefined && rec.rawValue !== null && rec.rawValue !== '')
        return rec.rawValue;
    return rec.status || '-';
}
export async function generateMasterExcel(students, filterCat) {
    const config = getAcademicConfig();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Semester Marks Analytics Platform';
    workbook.created = new Date();
    // Primary Sheet: Master Marksheet (Examinations)
    const sheet = workbook.addWorksheet('Examination Marks');
    // Title headers
    sheet.mergeCells('A1:V1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${config.collegeName.toUpperCase()} - ${config.departmentName.toUpperCase()}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7FF' }
    };
    sheet.getRow(1).height = 30;
    sheet.mergeCells('A2:V2');
    const subCell = sheet.getCell('A2');
    subCell.value = `ACADEMIC PERFORMANCE & MARKS REPORT (${config.semester} - ${config.academicYear}) | Generated: ${new Date().toLocaleString()}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;
    // Header Row
    const headers = [
        'Sl. No',
        'Roll Number',
        'Register Number',
        'Student Name',
        // CAT-1
        'CAT-1 DL (40)',
        'CAT-1 GEN AI (40)',
        'CAT-1 RL (40)',
        'CAT-1 BA (40)',
        'CAT-1 RE&CCE (40)',
        'CAT-1 Status',
        // CAT-2
        'CAT-2 DL (40)',
        'CAT-2 GEN AI (40)',
        'CAT-2 RL (40)',
        'CAT-2 BA (40)',
        'CAT-2 RE&CCE (40)',
        'CAT-2 Status',
        // CAT-3
        'CAT-3 DL (40)',
        'CAT-3 GEN AI (40)',
        'CAT-3 RL (40)',
        'CAT-3 BA (40)',
        'CAT-3 RE&CCE (40)',
        'CAT-3 Status'
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    // Data rows
    students.forEach((st) => {
        const row = [
            st.slNo,
            st.rollNumber,
            st.registerNumber,
            st.name,
            // CAT-1
            formatExamValue(st.catMarks['CAT-1'].subjects['DL']),
            formatExamValue(st.catMarks['CAT-1'].subjects['GEN AI']),
            formatExamValue(st.catMarks['CAT-1'].subjects['RL']),
            formatExamValue(st.catMarks['CAT-1'].subjects['BA']),
            formatExamValue(st.catMarks['CAT-1'].subjects['RE&CCE']),
            st.catMarks['CAT-1'].overallStatus,
            // CAT-2
            formatExamValue(st.catMarks['CAT-2'].subjects['DL']),
            formatExamValue(st.catMarks['CAT-2'].subjects['GEN AI']),
            formatExamValue(st.catMarks['CAT-2'].subjects['RL']),
            formatExamValue(st.catMarks['CAT-2'].subjects['BA']),
            formatExamValue(st.catMarks['CAT-2'].subjects['RE&CCE']),
            st.catMarks['CAT-2'].overallStatus,
            // CAT-3
            formatExamValue(st.catMarks['CAT-3'].subjects['DL']),
            formatExamValue(st.catMarks['CAT-3'].subjects['GEN AI']),
            formatExamValue(st.catMarks['CAT-3'].subjects['RL']),
            formatExamValue(st.catMarks['CAT-3'].subjects['BA']),
            formatExamValue(st.catMarks['CAT-3'].subjects['RE&CCE']),
            st.catMarks['CAT-3'].overallStatus
        ];
        const dataRow = sheet.addRow(row);
        dataRow.height = 20;
        // Formatting status cells
        [10, 16, 22].forEach((colIdx) => {
            const cell = dataRow.getCell(colIdx);
            const val = String(cell.value);
            if (val === 'PASS') {
                cell.font = { bold: true, color: { argb: 'FF16A34A' } };
            }
            else if (val === 'FAIL') {
                cell.font = { bold: true, color: { argb: 'FFDC2626' } };
            }
            else if (val === 'ABSENT') {
                cell.font = { bold: true, color: { argb: 'FFD97706' } };
            }
            else if (val === 'INVALID') {
                cell.font = { bold: true, color: { argb: 'FF7C3AED' } };
            }
            else if (val === 'PENDING') {
                cell.font = { color: { argb: 'FF64748B' } };
            }
        });
        dataRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            if (typeof cell.value === 'number') {
                cell.alignment = { horizontal: 'center' };
            }
        });
    });
    // Auto-fit column widths
    sheet.columns.forEach((col, idx) => {
        if (idx === 3)
            col.width = 25; // Student Name
        else if (idx === 1 || idx === 2)
            col.width = 18; // Roll & Reg
        else
            col.width = 14;
    });
    // Secondary Sheet: Assessments & Assignments (All 39 Tracked Values)
    const assessSheet = workbook.addWorksheet('Assessments & Assignments');
    assessSheet.mergeCells('A1:AE1');
    const assessTitle = assessSheet.getCell('A1');
    assessTitle.value = `SEMESTER CONTINUOUS ASSESSMENTS & ASSIGNMENTS TRACKING`;
    assessTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
    assessTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    assessTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7FF' }
    };
    assessSheet.getRow(1).height = 28;
    const assessHeaders = [
        'Sl. No',
        'Roll Number',
        'Register Number',
        'Student Name',
        // CAT-1 (Internal-I)
        'CAT-1 DL Assess', 'CAT-1 DL Assign',
        'CAT-1 GEN AI Assess', 'CAT-1 GEN AI Assign',
        'CAT-1 RL Assess', 'CAT-1 RL Assign',
        'CAT-1 BA Assess', 'CAT-1 BA Assign',
        'CAT-1 RE&CCE',
        // CAT-2 (Internal-II)
        'CAT-2 DL Assess', 'CAT-2 DL Assign',
        'CAT-2 GEN AI Assess', 'CAT-2 GEN AI Assign',
        'CAT-2 RL Assess', 'CAT-2 RL Assign',
        'CAT-2 BA Assess', 'CAT-2 BA Assign',
        'CAT-2 RE&CCE',
        // CAT-3 (Internal-III)
        'CAT-3 DL Assess', 'CAT-3 DL Assign',
        'CAT-3 GEN AI Assess', 'CAT-3 GEN AI Assign',
        'CAT-3 RL Assess', 'CAT-3 RL Assign',
        'CAT-3 BA Assess', 'CAT-3 BA Assign',
        'CAT-3 RE&CCE'
    ];
    const assessHeaderRow = assessSheet.addRow(assessHeaders);
    assessHeaderRow.height = 25;
    assessHeaderRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0D9488' } // Teal
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    students.forEach((st) => {
        const row = [
            st.slNo,
            st.rollNumber,
            st.registerNumber,
            st.name,
            // CAT-1
            formatComponentValue(st.catMarks['CAT-1'].subjects['DL']?.assessment),
            formatComponentValue(st.catMarks['CAT-1'].subjects['DL']?.assignment),
            formatComponentValue(st.catMarks['CAT-1'].subjects['GEN AI']?.assessment),
            formatComponentValue(st.catMarks['CAT-1'].subjects['GEN AI']?.assignment),
            formatComponentValue(st.catMarks['CAT-1'].subjects['RL']?.assessment),
            formatComponentValue(st.catMarks['CAT-1'].subjects['RL']?.assignment),
            formatComponentValue(st.catMarks['CAT-1'].subjects['BA']?.assessment),
            formatComponentValue(st.catMarks['CAT-1'].subjects['BA']?.assignment),
            'N/A',
            // CAT-2
            formatComponentValue(st.catMarks['CAT-2'].subjects['DL']?.assessment),
            formatComponentValue(st.catMarks['CAT-2'].subjects['DL']?.assignment),
            formatComponentValue(st.catMarks['CAT-2'].subjects['GEN AI']?.assessment),
            formatComponentValue(st.catMarks['CAT-2'].subjects['GEN AI']?.assignment),
            formatComponentValue(st.catMarks['CAT-2'].subjects['RL']?.assessment),
            formatComponentValue(st.catMarks['CAT-2'].subjects['RL']?.assignment),
            formatComponentValue(st.catMarks['CAT-2'].subjects['BA']?.assessment),
            formatComponentValue(st.catMarks['CAT-2'].subjects['BA']?.assignment),
            'N/A',
            // CAT-3
            formatComponentValue(st.catMarks['CAT-3'].subjects['DL']?.assessment),
            formatComponentValue(st.catMarks['CAT-3'].subjects['DL']?.assignment),
            formatComponentValue(st.catMarks['CAT-3'].subjects['GEN AI']?.assessment),
            formatComponentValue(st.catMarks['CAT-3'].subjects['GEN AI']?.assignment),
            formatComponentValue(st.catMarks['CAT-3'].subjects['RL']?.assessment),
            formatComponentValue(st.catMarks['CAT-3'].subjects['RL']?.assignment),
            formatComponentValue(st.catMarks['CAT-3'].subjects['BA']?.assessment),
            formatComponentValue(st.catMarks['CAT-3'].subjects['BA']?.assignment),
            'N/A'
        ];
        const dataRow = assessSheet.addRow(row);
        dataRow.height = 19;
        dataRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            const val = String(cell.value);
            if (val === 'NOT CONFIGURED') {
                cell.font = { size: 8, italic: true, color: { argb: 'FF94A3B8' } };
                cell.alignment = { horizontal: 'center' };
            }
            else if (val === 'N/A') {
                cell.font = { size: 8, color: { argb: 'FFCBD5E1' } };
                cell.alignment = { horizontal: 'center' };
            }
            else if (val === 'PENDING') {
                cell.font = { size: 8, color: { argb: 'FF64748B' } };
                cell.alignment = { horizontal: 'center' };
            }
            else if (typeof cell.value === 'number') {
                cell.alignment = { horizontal: 'center' };
            }
        });
    });
    assessSheet.columns.forEach((col, idx) => {
        if (idx === 3)
            col.width = 25;
        else if (idx === 1 || idx === 2)
            col.width = 18;
        else
            col.width = 13;
    });
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
