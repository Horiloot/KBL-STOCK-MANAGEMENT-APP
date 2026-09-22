import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  FileText,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Boxes,
  Scale,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';

export const SRWiseReportView: React.FC = () => {
  const {
    stockTransactions,
    coldStorages,
    varieties,
    seedClasses,
    grades,
    companySettings,
    addToast,
  } = useApp();

  const [density, setDensity] = useState<TableDensity>('comfortable');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const thPadding = density === 'compact' ? 'py-1 px-2.5 text-[10.5px]' : density === 'comfortable' ? 'py-2.5 px-3.5 text-xs' : 'py-1.5 px-3 text-[11px]';
  const tdPadding = density === 'compact' ? 'py-1 px-2.5 text-[11px]' : density === 'comfortable' ? 'py-2.5 px-3.5 text-xs' : 'py-1.5 px-3 text-xs';

  const renderSortIndicator = (colKey: string) => {
    if (sortKey !== colKey) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400/70 group-hover:text-sky-300 inline ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-sky-400 bg-sky-950/60 p-0.5 rounded inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sky-400 bg-sky-950/60 p-0.5 rounded inline ml-1" />
    );
  };

  // Group inbound lots by SR (Storage Receipt) No
  const srReportList = useMemo(() => {
    const srMap: Record<
      string,
      {
        srNo: string;
        date: string;
        coldStorageId: string;
        challans: Set<string>;
        varietyIds: Set<string>;
        classIds: Set<string>;
        gradeIds: Set<string>;
        totalBagsIn: number;
        totalKgIn: number;
        totalMtIn: number;
        trucks: Set<string>;
        drivers: Set<string>;
        growers: Set<string>;
      }
    > = {};

    stockTransactions.forEach((s) => {
      if (!srMap[s.srNo]) {
        srMap[s.srNo] = {
          srNo: s.srNo,
          date: s.date,
          coldStorageId: s.coldStorageId,
          challans: new Set(),
          varietyIds: new Set(),
          classIds: new Set(),
          gradeIds: new Set(),
          totalBagsIn: 0,
          totalKgIn: 0,
          totalMtIn: 0,
          trucks: new Set(),
          drivers: new Set(),
          growers: new Set(),
        };
      }

      const item = srMap[s.srNo];
      item.challans.add(s.kblChallanNo);
      item.varietyIds.add(s.varietyId);
      item.classIds.add(s.classId);
      item.gradeIds.add(s.gradeId);
      item.totalBagsIn += s.sackQuantity;
      item.totalKgIn += s.totalKg;
      item.totalMtIn += s.totalMt;
      if (s.truckNo) item.trucks.add(s.truckNo);
      if (s.driverName) item.drivers.add(s.driverName);
      if (s.growerFarmerName) item.growers.add(s.growerFarmerName);
    });

    return Object.values(srMap).map((item) => {
      const storage = coldStorages.find((c) => c.id === item.coldStorageId)?.name || item.coldStorageId;
      const varietiesList = Array.from(item.varietyIds)
        .map((vid) => varieties.find((v) => v.id === vid)?.name || vid)
        .join(', ');
      const classesList = Array.from(item.classIds)
        .map((cid) => seedClasses.find((c) => c.id === cid)?.name || cid)
        .join(', ');
      const gradesList = Array.from(item.gradeIds)
        .map((gid) => grades.find((g) => g.id === gid)?.name || gid)
        .join(', ');

      return {
        id: item.srNo,
        srNo: item.srNo,
        date: item.date,
        coldStorageId: item.coldStorageId,
        storage,
        challans: Array.from(item.challans).join(', '),
        varietyIds: Array.from(item.varietyIds),
        varieties: varietiesList,
        classes: classesList,
        grades: gradesList,
        bags: item.totalBagsIn,
        totalKg: item.totalKgIn,
        totalMt: item.totalMtIn,
        trucks: Array.from(item.trucks).join(', ') || '-',
        growers: Array.from(item.growers).join(', ') || '-',
      };
    });
  }, [stockTransactions, coldStorages, varieties, seedClasses, grades]);

  const filteredSRs = useMemo(() => {
    return srReportList.filter((s) => {
      if (selectedStorage && s.coldStorageId !== selectedStorage) {
        return false;
      }
      if (selectedVariety && !s.varietyIds.includes(selectedVariety)) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          s.srNo.toLowerCase().includes(q) ||
          s.challans.toLowerCase().includes(q) ||
          s.storage.toLowerCase().includes(q) ||
          s.varieties.toLowerCase().includes(q) ||
          s.growers.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [srReportList, selectedStorage, selectedVariety, searchTerm]);

  const sortedSRs = useMemo(() => {
    return sortData(filteredSRs, sortKey, sortDir);
  }, [filteredSRs, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedSRs.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedSRs = sortedSRs.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const totalSRCount = filteredSRs.length;
  const totalSRBags = filteredSRs.reduce((acc, s) => acc + s.bags, 0);
  const totalSRKg = filteredSRs.reduce((acc, s) => acc + s.totalKg, 0);
  const totalSRMt = filteredSRs.reduce((acc, s) => acc + s.totalMt, 0);

  const exportColumns = [
    { header: 'SR Number', key: 'srNo', width: 14 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Cold Storage', key: 'storage', width: 24 },
    { header: 'Challan Nos', key: 'challans', width: 20 },
    { header: 'Seed Varieties', key: 'varieties', width: 20 },
    { header: 'Classes', key: 'classes', width: 16 },
    { header: 'Grades', key: 'grades', width: 16 },
    { header: 'Total Bags', key: 'bags', width: 14 },
    { header: 'Total KG', key: 'totalKg', width: 14 },
    { header: 'Total MT', key: 'totalMt', width: 14 },
    { header: 'Grower/Farmer', key: 'growers', width: 22 },
  ];

  const handleExcel = () => {
    exportToExcel(
      filteredSRs,
      exportColumns,
      'SR_Wise_Summary_Report_2024',
      'Storage Receipt (SR-Wise) Stock Summary Report',
      companySettings,
      `Records: ${filteredSRs.length} | Generated: ${new Date().toLocaleDateString()}`
    );
    addToast('SR-wise report exported to Excel!', 'success');
  };

  const handlePdf = () => {
    exportToPdf(
      filteredSRs,
      exportColumns.slice(0, 10),
      'SR_Wise_Summary_Report_2024',
      'STORAGE RECEIPT (SR-WISE) STOCK SUMMARY REPORT',
      companySettings,
      'l',
      `Records: ${filteredSRs.length} | Generated: ${new Date().toLocaleDateString()}`
    );
    addToast('SR-wise report exported to PDF!', 'success');
  };

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pt-0.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4.5 bg-sky-500 rounded-xs" />
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            STORAGE RECEIPT (SR-WISE) REPORT
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {filteredSRs.length} SR Groups
          </span>
        </div>

        {/* Toolbar: Density & Export buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Density Toggle */}
          <div
            className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-semibold"
            role="group"
          >
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer uppercase ${
                density === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              COMPACT
            </button>
            <button
              type="button"
              onClick={() => setDensity('normal')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer uppercase ${
                density === 'normal'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              NORMAL
            </button>
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer uppercase ${
                density === 'comfortable'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              COMFORTABLE
            </button>
          </div>

          <ReportButtonGroup
            onPrint={() => setIsPreviewOpen(true)}
            onExportExcel={handleExcel}
            onExportPdf={handlePdf}
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL UNIQUE SRS</span>
            <Layers className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalSRCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL BAGS</span>
            <Boxes className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalSRBags.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">NET WEIGHT (KG)</span>
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalSRKg.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">METRIC TONS (MT)</span>
            <Scale className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalSRMt.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Box */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5 no-print">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Search className="w-3.5 h-3.5 text-sky-500" />
            <span className="uppercase tracking-wider text-[11px]">FILTER & SEARCH</span>
          </div>
          {(searchTerm || selectedStorage || selectedVariety) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStorage('');
                setSelectedVariety('');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search SR, Challan, Variety, Grower..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <select
              value={selectedStorage}
              onChange={(e) => {
                setSelectedStorage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Cold Storages</option>
              {coldStorages.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedVariety}
              onChange={(e) => {
                setSelectedVariety(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Varieties</option>
              {varieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white dark:bg-slate-900 border border-sky-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-800 text-slate-100 dark:bg-slate-850 dark:text-white font-bold border-b-2 border-slate-900 dark:border-slate-700 select-none">
              <tr>
                <th
                  onClick={() => handleSort('srNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  SR Number {renderSortIndicator('srNo')}
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Date {renderSortIndicator('date')}
                </th>
                <th
                  onClick={() => handleSort('storage')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Cold Storage {renderSortIndicator('storage')}
                </th>
                <th
                  onClick={() => handleSort('challans')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  KBL Challan(s) {renderSortIndicator('challans')}
                </th>
                <th
                  onClick={() => handleSort('varieties')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Potato Variety {renderSortIndicator('varieties')}
                </th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white select-none`}>
                  Class & Grade
                </th>
                <th
                  onClick={() => handleSort('bags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Total Bags {renderSortIndicator('bags')}
                </th>
                <th
                  onClick={() => handleSort('totalKg')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Total KG {renderSortIndicator('totalKg')}
                </th>
                <th
                  onClick={() => handleSort('totalMt')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Total MT {renderSortIndicator('totalMt')}
                </th>
                <th
                  onClick={() => handleSort('growers')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Grower / Farmer {renderSortIndicator('growers')}
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedSRs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic font-sans">
                    No SR receipt records found matching search filters.
                  </td>
                </tr>
              ) : (
                paginatedSRs.map((row) => (
                  <tr
                    key={row.id}
                    className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                  >
                    <td className={`font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap ${tdPadding}`}>
                      {row.srNo}
                    </td>
                    <td className={`font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap ${tdPadding}`}>
                      {row.date}
                    </td>
                    <td className={`font-sans font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap ${tdPadding}`}>
                      {row.storage}
                    </td>
                    <td className={`font-mono text-slate-600 dark:text-slate-300 ${tdPadding}`}>
                      {row.challans}
                    </td>
                    <td className={`font-sans font-semibold text-slate-900 dark:text-white ${tdPadding}`}>
                      {row.varieties}
                    </td>
                    <td className={`font-sans text-slate-600 dark:text-slate-300 text-xs ${tdPadding}`}>
                      <div>{row.classes}</div>
                      <div className="text-[10px] text-slate-400">{row.grades}</div>
                    </td>
                    <td className={`text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums ${tdPadding}`}>
                      {row.bags.toLocaleString()}
                    </td>
                    <td className={`text-right font-medium text-slate-800 dark:text-slate-200 font-mono tabular-nums ${tdPadding}`}>
                      {row.totalKg.toLocaleString()}
                    </td>
                    <td className={`text-right font-bold text-sky-700 dark:text-sky-400 font-mono tabular-nums ${tdPadding}`}>
                      {row.totalMt.toFixed(2)}
                    </td>
                    <td className={`font-sans text-slate-600 dark:text-slate-300 truncate max-w-[150px] ${tdPadding}`}>
                      {row.growers}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredSRs.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700 text-xs select-none">
                <tr>
                  <td colSpan={6} className={`${tdPadding} font-sans uppercase tracking-wider`}>
                    TOTAL ({filteredSRs.length} SR Groups)
                  </td>
                  <td className={`${tdPadding} text-right text-emerald-700 dark:text-emerald-400 font-black`}>
                    {totalSRBags.toLocaleString()} Bags
                  </td>
                  <td className={`${tdPadding} text-right font-black`}>
                    {totalSRKg.toLocaleString()} KG
                  </td>
                  <td className={`${tdPadding} text-right text-sky-700 dark:text-sky-400 font-black`}>
                    {totalSRMt.toFixed(2)} MT
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {sortedSRs.length > 0 && (
          <TablePagination
            currentPage={effectivePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedSRs.length}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Print Preview Modal */}
      {isPreviewOpen && (
        <PrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentTitle="Storage Receipt (SR-Wise) Stock Summary Report"
          subtitle={`Total SR Receipts: ${filteredSRs.length} | Generated: ${new Date().toLocaleDateString()}`}
          columns={exportColumns}
          data={filteredSRs}
          summaryItems={[
            { label: 'Total Storage Receipts', value: `${filteredSRs.length}` },
            { label: 'Total Bags', value: `${totalSRBags.toLocaleString()} Bags` },
            { label: 'Total Net Weight (KG)', value: `${totalSRKg.toLocaleString()} KG` },
            { label: 'Total Metric Tons', value: `${totalSRMt.toFixed(2)} MT` },
          ]}
          filename="SR_Wise_Summary_Report_2024"
        />
      )}
    </div>
  );
};
