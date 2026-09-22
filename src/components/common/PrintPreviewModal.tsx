import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExportColumn, exportToExcel, exportToPdf, validateAndTriggerPrint, getFormattedPrintDateTime } from '../../utils/exportUtils';
import { Printer, Download, FileSpreadsheet, X, Sprout } from 'lucide-react';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  subtitle?: string;
  voucherNo?: string;
  date?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  summaryItems?: { label: string; value: string | number }[];
  signatures?: string[];
  filename?: string;
  orientation?: 'p' | 'l';
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  subtitle,
  voucherNo,
  date,
  columns,
  data,
  summaryItems = [],
  signatures = ['Prepared By', 'Verified By (Store In-Charge)', 'Approved Signatory'],
  filename,
  orientation = 'l',
}) => {
  const { companySettings, currentUser, addToast } = useApp();
  const [, setIsValidating] = useState(false);

  if (!isOpen) return null;

  const resolvedFilename = filename || (documentTitle ? String(documentTitle).replace(/\s+/g, '_') : 'Report_Document');
  const printTimeStr = getFormattedPrintDateTime();
  const printDate = date || printTimeStr;
  const printedByStr = currentUser?.fullName || 'Md. Tariqul Islam (System User)';

  // Calculate totals for total row
  const numericColumns = columns.filter((c) => c.isNumeric);
  const totals: Record<string, number> = {};
  numericColumns.forEach((col) => {
    totals[col.key] = data.reduce((acc, row) => {
      const v = Number(row[col.key]);
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
  });

  const handlePrint = () => {
    validateAndTriggerPrint({
      data,
      columns,
      reportTitle: documentTitle,
      companySettings,
      subtitle,
      userName: printedByStr,
      expectedMinRecords: 1,
      onValidating: () => setIsValidating(true),
      databaseCheck: () => {
        if (!data || data.length === 0) {
          return { isConsistent: false, reason: 'Report dataset is empty.' };
        }
        return { isConsistent: true };
      },
      onSuccess: () => {
        setIsValidating(false);
      },
      onError: (msg) => {
        setIsValidating(false);
        if (addToast) addToast(msg, 'error');
      },
    });
  };

  const handlePdf = () => {
    exportToPdf(
      data,
      columns,
      resolvedFilename,
      documentTitle,
      companySettings,
      (orientation === 'p' ? 'p' : 'l') as 'p' | 'l',
      subtitle,
      printedByStr
    );
    if (addToast) addToast(`"${documentTitle}" exported to PDF successfully!`, 'success');
  };

  const handleExcel = () => {
    exportToExcel(
      data,
      columns,
      resolvedFilename,
      documentTitle,
      companySettings,
      subtitle,
      {
        printedBy: printedByStr,
        includeSummary: true,
      }
    );
    if (addToast) addToast(`"${documentTitle}" exported to Excel successfully!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto modal-backdrop printable-modal-wrapper">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl my-auto flex flex-col max-h-[94vh] printable-modal overflow-hidden">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white rounded-t-2xl no-print">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold tracking-tight uppercase">PRINT & DOCUMENT PREVIEW</h3>
              <p className="text-[11px] text-slate-400">
                Official Document Preview • {data.length} records ready • Printed by: {printedByStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-colors shadow-xs cursor-pointer uppercase"
              title="Print formatted document"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT NOW</span>
            </button>

            <button
              onClick={handlePdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer uppercase"
              title="Save document as PDF"
            >
              <Download className="w-4 h-4" />
              <span>SAVE AS PDF</span>
            </button>

            <button
              onClick={handleExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer uppercase"
              title="Export to Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>EXCEL</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 printable-document-body">
          {/* Printable Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {companySettings.logoUrl ? (
                  <img
                    src={companySettings.logoUrl}
                    alt="Company Logo"
                    className="w-12 h-12 rounded-xl object-contain border border-slate-200 p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center text-white shadow-sm">
                    <Sprout className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900">
                    {companySettings.companyName || 'KISAN BOTANIX LTD.'}
                  </h1>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {companySettings.tagline || companySettings.companyTagline || 'Potato Seed Stock & Cold Storage ERP'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {companySettings.address} | Phone: {companySettings.phone}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right border-l-2 sm:border-l-0 border-slate-300 pl-3 sm:pl-0 text-xs text-slate-600">
                <span className="inline-block px-3 py-1 rounded bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider mb-1">
                  FISCAL YEAR {companySettings.fiscalYear}
                </span>
                <div>
                  Date: <span className="font-semibold text-slate-900">{printDate}</span>
                </div>
                <div>
                  Printed By: <span className="font-bold text-slate-900">{printedByStr}</span>
                </div>
                {voucherNo && (
                  <div>
                    Doc No: <span className="font-bold text-slate-900">{voucherNo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-sky-700 uppercase tracking-wide">
                  {documentTitle}
                </h2>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Currency: <span className="font-semibold text-slate-800">{companySettings.currency}</span> | Units: Bags / Metric Tons (MT)
              </div>
            </div>
          </div>

          {/* Print Metadata Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3 rounded-lg bg-slate-100 border border-slate-200 text-[10.5px] font-semibold text-slate-700 uppercase tracking-wider mb-5">
            <span>PRINT DATE & TIME: {printTimeStr}</span>
            <span>PRINTED BY: {printedByStr}</span>
            <span>TOTAL RECORDS: {data.length}</span>
            <span>PAGE NO: PAGE 1 OF 1</span>
          </div>

          {/* Summary KPIs if present */}
          {summaryItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              {summaryItems.map((item, idx) => (
                <div key={idx} className="border-r last:border-r-0 border-slate-200 pr-2">
                  <span className="block text-[10px] uppercase font-semibold text-slate-500">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tabular Data with Zebra Striping & Header/Total Row Formatting */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-8 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-2.5 px-3 border-b border-slate-800 w-10 text-center">#</th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2.5 px-3 border-b border-slate-800 uppercase tracking-wider ${
                        col.align === 'right' || col.isNumeric ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="py-8 text-center text-slate-400 italic"
                    >
                      No records to display.
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={idx}
                        className={isEven ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        {columns.map((col) => {
                          const val = row[col.key];
                          const isNum = col.isNumeric || typeof val === 'number';
                          return (
                            <td
                              key={col.key}
                              className={`py-2 px-3 text-slate-800 ${
                                isNum ? 'text-right font-medium' : col.align === 'center' ? 'text-center' : 'text-left'
                              }`}
                            >
                              {val !== undefined && val !== null
                                ? isNum
                                  ? typeof val === 'number'
                                    ? val === 0
                                      ? '-'
                                      : val.toLocaleString()
                                    : val
                                  : val === '0' || val === 0
                                  ? '-'
                                  : String(val)
                                : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}

                {/* Separate Distinct Total Row */}
                {data.length > 0 && numericColumns.length > 0 && (
                  <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-900 border-b-4 border-double border-slate-900">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">★</td>
                    {columns.map((col, idx) => {
                      if (idx === 0) {
                        return (
                          <td key={col.key} className="py-2.5 px-3 uppercase tracking-wider font-extrabold text-slate-900">
                            TOTAL CONSOLIDATED
                          </td>
                        );
                      }
                      if (col.isNumeric) {
                        return (
                          <td key={col.key} className="py-2.5 px-3 text-right font-black text-slate-900">
                            {totals[col.key] !== undefined ? totals[col.key].toLocaleString() : '-'}
                          </td>
                        );
                      }
                      return <td key={col.key} className="py-2.5 px-3"></td>;
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-10 mt-10 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs text-slate-700">
            {signatures.map((sig, idx) => (
              <div key={idx} className="space-y-1">
                <div className="border-t border-dashed border-slate-400 pt-2 font-bold uppercase tracking-wider text-[11px]">
                  {sig}
                </div>
                <div className="text-[10px] text-slate-400">Authorized Signature & Seal</div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
            <span>{companySettings.companyName || 'KISAN BOTANIX LTD.'} • GENERATED ELECTRONICALLY • CONFIDENTIAL</span>
            <span>PAGE 1 OF 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
