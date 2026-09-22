import React from 'react';
import { Printer, FileSpreadsheet, FileText, Download } from 'lucide-react';

interface ReportButtonGroupProps {
  onPrint?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  totalRecords?: number;
  className?: string;
  disabled?: boolean;
}

export const ReportButtonGroup: React.FC<ReportButtonGroupProps> = ({
  onPrint,
  onExportExcel,
  onExportPdf,
  totalRecords,
  className = '',
  disabled = false,
}) => {
  return (
    <div
      className={`inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-2xs gap-1 ${className}`}
      role="group"
      aria-label="Print and Export Actions"
    >
      {/* Direct Print Button */}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-650 border border-slate-200/80 dark:border-slate-600 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          title="Print or view print preview formatted report"
        >
          <Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>PRINT</span>
        </button>
      )}

      {/* Export to Excel Button */}
      {onExportExcel && (
        <button
          type="button"
          onClick={onExportExcel}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          title="Export data to Microsoft Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
          <span>EXCEL</span>
        </button>
      )}

      {/* Export to PDF Button */}
      {onExportPdf && (
        <button
          type="button"
          onClick={onExportPdf}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          title="Export data to formal PDF document (.pdf)"
        >
          <FileText className="w-3.5 h-3.5 text-rose-100" />
          <span>PDF</span>
        </button>
      )}
    </div>
  );
};
