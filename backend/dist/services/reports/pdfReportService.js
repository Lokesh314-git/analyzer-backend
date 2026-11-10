import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAcademicConfig } from '../../config/academic.config.js';
export function generateCatPdfReport(students, cat = 'CAT-1', reportTitle) {
    const config = getAcademicConfig();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // Academic Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // Dark Blue
    doc.text(config.collegeName.toUpperCase(), 148, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(config.departmentName, 148, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${reportTitle || `${cat} EXAMINATION MARKS REPORT`} - ${config.semester} (${config.academicYear})`, 148, 28, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()} | Total Students: ${students.length}`, 148, 33, {
        align: 'center'
    });
    // Table Data
    const tableHeaders = [
        'Sl. No',
        'Roll Number',
        'Register Number',
        'Student Name',
        'DL (40)',
        'GEN AI (40)',
        'RL (40)',
        'BA (40)',
        'RE&CCE (40)',
        'Overall Status'
    ];
    const tableBody = students.map((st) => {
        const catData = st.catMarks[cat];
        const formatExamVal = (sub) => {
            const rec = catData?.subjects[sub];
            if (!rec)
                return '-';
            if (rec.status === 'ABSENT')
                return 'AB';
            if (rec.status === 'PENDING')
                return 'PENDING';
            if (rec.numericMark !== null)
                return String(rec.numericMark);
            return rec.raw !== undefined && rec.raw !== null ? String(rec.raw) : '-';
        };
        return [
            st.slNo,
            st.rollNumber,
            st.registerNumber,
            st.name,
            formatExamVal('DL'),
            formatExamVal('GEN AI'),
            formatExamVal('RL'),
            formatExamVal('BA'),
            formatExamVal('RE&CCE'),
            catData?.overallStatus ?? 'PENDING'
        ];
    });
    const runAutoTable = (options) => {
        if (typeof doc.autoTable === 'function') {
            doc.autoTable(options);
        }
        else {
            const fn = autoTable.default || autoTable;
            fn(doc, options);
        }
    };
    runAutoTable({
        startY: 38,
        head: [tableHeaders],
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [37, 99, 235], // Professional Blue #2563EB
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8
        },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'left' },
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'center' },
            7: { halign: 'center' },
            8: { halign: 'center' },
            9: { halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 9) {
                const val = String(data.cell.raw);
                if (val === 'PASS') {
                    data.cell.styles.textColor = [22, 163, 74];
                }
                else if (val === 'FAIL') {
                    data.cell.styles.textColor = [220, 38, 38];
                }
                else if (val === 'ABSENT') {
                    data.cell.styles.textColor = [217, 119, 6];
                }
                else if (val === 'INVALID') {
                    data.cell.styles.textColor = [124, 58, 237];
                }
                else if (val === 'PENDING') {
                    data.cell.styles.textColor = [100, 116, 139];
                }
            }
        }
    });
    // Summary box at bottom
    const passCount = students.filter(s => s.catMarks[cat]?.overallStatus === 'PASS').length;
    const failCount = students.filter(s => s.catMarks[cat]?.overallStatus === 'FAIL').length;
    const absentCount = students.filter(s => s.catMarks[cat]?.overallStatus === 'ABSENT').length;
    const pendingCount = students.filter(s => s.catMarks[cat]?.overallStatus === 'PENDING').length;
    const passPct = (passCount + failCount) > 0 ? ((passCount / (passCount + failCount)) * 100).toFixed(1) : '0';
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 180;
    if (finalY < 185) {
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`Summary Statistics: Total Students: ${students.length} | Passed: ${passCount} | Failed: ${failCount} | Absent: ${absentCount} | Pending: ${pendingCount} | Pass Rate: ${passPct}%`, 14, finalY);
    }
    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
}
