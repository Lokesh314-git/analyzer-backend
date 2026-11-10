import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Download, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { CatExam, CAT_EXAMS } from '../../types/academic';

export const ReportsPage: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<CatExam>('CAT-1');

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Academic Reports & Data Exports
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Download formatted Excel workbooks, PDF academic marks reports, and CSV templates
        </p>
      </div>

      {/* Reports Grid: 1 col on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Excel Master Marksheet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 w-fit mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Master Excel Marksheet (.xlsx)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete semester examination dataset containing student details, CAT-1, CAT-2, and CAT-3 subject scores, overall statuses, and cell formatting.
            </p>
          </div>
          <a
            href={api.getExcelReportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shadow-xs touch-target-44"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Master Excel</span>
          </a>
        </div>

        {/* PDF Examination Report */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 w-fit mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Official PDF Examination Report (.pdf)
            </h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Academic publication-ready PDF marks report with institution heading, student scores, pass/fail classifications, and summary statistics.
            </p>
            {/* CAT Selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Exam:</span>
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value as CatExam)}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 font-medium touch-target-44"
              >
                {CAT_EXAMS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <a
            href={api.getPdfReportUrl(selectedCat)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition shadow-xs touch-target-44"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {selectedCat} PDF Report</span>
          </a>
        </div>

        {/* CSV Format Template */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 w-fit mb-3">
              <FileDown className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Google Sheets Marks Template (.csv)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Standardized CSV structure containing all student names, roll numbers, and grouped headers for all 5 subjects across CAT examinations, Assessments, and Assignments.
            </p>
          </div>
          <a
            href={api.getCsvTemplateUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition shadow-xs touch-target-44"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </a>
        </div>
      </div>
    </div>
  );
};
