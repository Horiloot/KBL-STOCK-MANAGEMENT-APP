import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { exportToExcel } from '../../utils/exportUtils';

interface ExcelImportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const {
    isImportModalOpen,
    setIsImportModalOpen,
    coldStorages,
    varieties,
    seedClasses,
    grades,
    productionBlocks,
    potatoTypes,
    addStockTransaction,
    addToast,
    companySettings,
  } = useApp();

  const isVisible = propIsOpen !== undefined ? propIsOpen : isImportModalOpen;
  const handleClose = propOnClose || (() => setIsImportModalOpen(false));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Column Mapping State
  const [mappings, setMappings] = useState({
    date: 'Date',
    kblChallanNo: 'KBL Challan No',
    srNo: 'SR No',
    coldStorage: 'Cold Storage',
    variety: 'Variety',
    seedClass: 'Class',
    grade: 'Grade',
    sackQuantity: 'Bags',
    kgPerBag: 'KG per Bag',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (!data || data.length < 2) {
          setErrorMsg('The uploaded spreadsheet appears to be empty or has no data rows.');
          return;
        }

        const headers = (data[0] || []).map((h) => String(h).trim());
        setColumnHeaders(headers);

        const rows = data.slice(1).map((row) => {
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = row[idx];
          });
          return rowObj;
        });

        setParsedRows(rows.filter((r) => Object.values(r).some((v) => v !== undefined && v !== '')));

        // Auto-guess column headers
        const guess: Record<string, string> = { ...mappings };
        headers.forEach((h) => {
          const lower = h.toLowerCase();
          if (lower.includes('date')) guess.date = h;
          else if (lower.includes('challan')) guess.kblChallanNo = h;
          else if (lower.includes('sr')) guess.srNo = h;
          else if (lower.includes('storage')) guess.coldStorage = h;
          else if (lower.includes('variet')) guess.variety = h;
          else if (lower.includes('class')) guess.seedClass = h;
          else if (lower.includes('grade')) guess.grade = h;
          else if (lower.includes('bag') || lower.includes('sack') || lower.includes('qty'))
            guess.sackQuantity = h;
          else if (lower.includes('kg')) guess.kgPerBag = h;
        });
        setMappings(guess as any);
      } catch {
        setErrorMsg('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Date': '2024-03-10',
        'KBL Challan No': 'KBL-CH-106',
        'SR No': 'SR-06',
        'Cold Storage': 'Himadri Cold Storage Ltd.',
        'Variety': 'Asterix',
        'Class': 'Foundation',
        'Grade': 'Grade-A (28-35mm)',
        'Bags': 300,
        'KG per Bag': 50,
      },
      {
        'Date': '2024-03-11',
        'KBL Challan No': 'KBL-CH-107',
        'SR No': 'SR-07',
        'Cold Storage': 'National Cold Storage Ltd.',
        'Variety': 'Cardinal',
        'Class': 'Certified-1',
        'Grade': 'Grade-B (35-45mm)',
        'Bags': 250,
        'KG per Bag': 50,
      },
    ];

    exportToExcel(
      sampleData,
      [
        { header: 'Date', key: 'Date', width: 14 },
        { header: 'KBL Challan No', key: 'KBL Challan No', width: 18 },
        { header: 'SR No', key: 'SR No', width: 14 },
        { header: 'Cold Storage', key: 'Cold Storage', width: 28 },
        { header: 'Variety', key: 'Variety', width: 18 },
        { header: 'Class', key: 'Class', width: 18 },
        { header: 'Grade', key: 'Grade', width: 22 },
        { header: 'Bags', key: 'Bags', width: 12 },
        { header: 'KG per Bag', key: 'KG per Bag', width: 14 },
      ],
      'Sample_Potato_Seed_Import_Template',
      'Sample Inbound Seed Stock Import Template',
      companySettings,
      'Use this template structure for bulk Excel uploads'
    );
  };

  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
      let importedCount = 0;

      parsedRows.forEach((row) => {
        const rawDate = row[mappings.date] || new Date().toISOString().split('T')[0];
        const challan = String(row[mappings.kblChallanNo] || `KBL-CH-${Date.now().toString().slice(-4)}`);
        const sr = String(row[mappings.srNo] || `SR-${Math.floor(Math.random() * 900 + 100)}`);
        const storageVal = String(row[mappings.coldStorage] || '');
        const varietyVal = String(row[mappings.variety] || '');
        const classVal = String(row[mappings.seedClass] || '');
        const gradeVal = String(row[mappings.grade] || '');
        const bags = parseInt(row[mappings.sackQuantity]) || 100;
        const kg = parseFloat(row[mappings.kgPerBag]) || 50;

        // Match Storage
        const matchedStorage =
          coldStorages.find(
            (c) =>
              c.name.toLowerCase().includes(storageVal.toLowerCase()) ||
              c.code.toLowerCase() === storageVal.toLowerCase()
          ) || coldStorages[0];

        // Match Variety
        const matchedVariety =
          varieties.find(
            (v) =>
              v.name.toLowerCase().includes(varietyVal.toLowerCase()) ||
              v.code.toLowerCase() === varietyVal.toLowerCase()
          ) || varieties[0];

        // Match Class
        const matchedClass =
          seedClasses.find(
            (c) =>
              c.name.toLowerCase().includes(classVal.toLowerCase()) ||
              c.code.toLowerCase() === classVal.toLowerCase()
          ) || seedClasses[0];

        // Match Grade
        const matchedGrade =
          grades.find(
            (g) =>
              g.name.toLowerCase().includes(gradeVal.toLowerCase()) ||
              g.code.toLowerCase() === gradeVal.toLowerCase()
          ) || grades[0];

        const totalKg = bags * kg;
        const totalMt = totalKg / 1000;

        addStockTransaction({
          date: String(rawDate).slice(0, 10),
          kblChallanNo: challan,
          srNo: sr,
          coldStorageId: matchedStorage?.id || 'cs-1',
          varietyId: matchedVariety?.id || 'var-1',
          classId: matchedClass?.id || 'class-1',
          gradeId: matchedGrade?.id || 'grade-1',
          productionBlockId: productionBlocks[0]?.id || 'block-1',
          blockId: productionBlocks[0]?.id || 'block-1',
          potatoTypeId: potatoTypes[0]?.id || 'type-1',
          typeId: potatoTypes[0]?.id || 'type-1',
          sackQuantity: bags,
          kgPerBag: kg,
          totalKg,
          totalMt,
          status: 'approved',
          remarks: 'Batch imported via Excel (.xlsx)',
        });

        importedCount++;
      });

      if (addToast) {
        addToast(`Successfully imported ${importedCount} stock lots from Excel!`, 'success');
      }
      setIsImportModalOpen(false);
      setFile(null);
      setParsedRows([]);
    } catch (err: any) {
      setErrorMsg('Error processing records: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isVisible}
      onClose={handleClose}
      title="Bulk Import Seed Data from Excel"
      subtitle="Upload .xlsx or .xls files, configure column mapping, and import inventory batches"
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs">
        {/* Step 1: Upload or Download Template */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              Need the official template?
            </h4>
            <p className="text-slate-500">
              Download our pre-structured Excel template with valid varieties and headers
            </p>
          </div>
          <button
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Download Sample Excel</span>
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
            file
              ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-sky-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <FileCheck className="w-10 h-10 text-emerald-600 mb-2" />
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {file.name}
              </span>
              <span className="text-slate-400 mt-0.5">
                {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} records detected
              </span>
              <span className="text-[11px] text-sky-600 dark:text-sky-400 mt-2 font-semibold">
                Click to choose a different file
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-slate-400 mb-2" />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drop your Excel file here
              </span>
              <span className="text-slate-400 mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and CSV
              </span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Column Mapping Preview */}
        {parsedRows.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-bold text-slate-900 dark:text-white">
                Column Mapping Configuration
              </h4>
              <span className="text-slate-400">{parsedRows.length} Rows Ready</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { field: 'date', label: 'Date' },
                { field: 'kblChallanNo', label: 'KBL Challan No' },
                { field: 'srNo', label: 'SR No' },
                { field: 'coldStorage', label: 'Cold Storage' },
                { field: 'variety', label: 'Variety' },
                { field: 'seedClass', label: 'Seed Class' },
                { field: 'grade', label: 'Size Grade' },
                { field: 'sackQuantity', label: 'Bags Quantity' },
                { field: 'kgPerBag', label: 'KG per Bag' },
              ].map((col) => (
                <div key={col.field} className="space-y-1">
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                    {col.label}
                  </label>
                  <select
                    value={(mappings as any)[col.field] || ''}
                    onChange={(e) =>
                      setMappings({ ...mappings, [col.field]: e.target.value })
                    }
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    <option value="">-- Ignore Column --</option>
                    {columnHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview of first 3 rows */}
            <div className="space-y-2 pt-2">
              <span className="font-semibold text-slate-500 block text-[11px]">
                Preview First 3 Records:
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold">
                      <th className="py-1 px-2">Date</th>
                      <th className="py-1 px-2">Challan</th>
                      <th className="py-1 px-2">SR</th>
                      <th className="py-1 px-2">Storage</th>
                      <th className="py-1 px-2">Variety</th>
                      <th className="py-1 px-2 text-right">Bags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 3).map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-1 px-2">{r[mappings.date] || '-'}</td>
                        <td className="py-1 px-2 font-semibold">
                          {r[mappings.kblChallanNo] || '-'}
                        </td>
                        <td className="py-1 px-2 font-mono">{r[mappings.srNo] || '-'}</td>
                        <td className="py-1 px-2">{r[mappings.coldStorage] || '-'}</td>
                        <td className="py-1 px-2">{r[mappings.variety] || '-'}</td>
                        <td className="py-1 px-2 text-right font-bold">
                          {r[mappings.sackQuantity] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(false)}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || isProcessing}
            onClick={handleExecuteImport}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Importing...'
                : `Commit & Import ${parsedRows.length} Lots`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
