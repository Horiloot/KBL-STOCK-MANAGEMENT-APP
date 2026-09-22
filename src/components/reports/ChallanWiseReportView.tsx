import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  FileText,
  Boxes,
  Scale,
  Search,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { exportToExcel, exportToPdf, validateAndTriggerPrint } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';

export const ChallanWiseReportView: React.FC = () => {
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

  // Group inbound lots by KBL Challan No
  const challanReportList = useMemo(() => {
    const challanMap: Record<
      string,
      {
        kblChallanNo: string;
        date: string;
        coldStorageId: string;
        srNos: Set<string>;
        varietyIds: Set<string>;
        classIds: Set<string>;
        gradeIds: Set<string>;
        totalBags: number;
        totalKg: number;
        totalMt: number;
        truckNo?: string;
        driverName?: string;
        growerFarmerName?: string;
      }
    > = {};

    stockTransactions.forEach((s) => {
      if (!challanMap[s.kblChallanNo]) {
        challanMap[s.kblChallanNo] = {
          kblChallanNo: s.kblChallanNo,
          date: s.date,
          coldStorageId: s.coldStorageId,
          srNos: new Set(),
          varietyIds: new Set(),
          classIds: new Set(),
          gradeIds: new Set(),
          totalBags: 0,
          totalKg: 0,
          totalMt: 0,
          truckNo: s.truckNo,
          driverName: s.driverName,
          growerFarmerName: s.growerFarmerName,
        };
      }

      const item = challanMap[s.kblChallanNo];
      item.srNos.add(s.srNo);
      item.varietyIds.add(s.varietyId);
      item.classIds.add(s.classId);
      item.gradeIds.add(s.gradeId);
      item.totalBags += s.sackQuantity;
      item.totalKg += s.totalKg;
      item.totalMt += s.totalMt;
    });

    return Object.values(challanMap).map((item) => {
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
        id: item.kblChallanNo,
        challanNo: item.kblChallanNo,
        date: item.date,
        storage,
        srs: Array.from(item.srNos).join(', '),
        varieties: varietiesList,
        classes: classesList,
        grades: gradesList,
        bags: item.totalBags,
        totalKg: item.totalKg,
        totalMt: item.totalMt,
        truckNo: item.truckNo || '-',
        driverName: item.driverName || '-',
        growerFarmerName: item.growerFarmerName || '-',
      };
    });
  }, [stockTransactions, coldStorages, varieties, seedClasses, grades]);

  const filteredChallans = useMemo(() => {
    return challanReportList.filter((c) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          c.challanNo.toLowerCase().includes(q) ||
          c.srs.toLowerCase().includes(q) ||
          c.storage.toLowerCase().includes(q) ||
          c.varieties.toLowerCase().includes(q) ||
          c.growerFarmerName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [challanReportList, searchTerm]);

  const sortedChallans = useMemo(() => {
    return sortData(filteredChallans, sortKey, sortDir);
  }, [filteredChallans, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedChallans.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedChallans = sortedChallans.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const totalChallanCount = filteredChallans.length;
  const totalChallanBags = filteredChallans.reduce((acc, c) => acc + c.bags, 0);
  const totalChallanKg = filteredChallans.reduce((acc, c) => acc + c.totalKg, 0);
  const totalChallanMt = filteredChallans.reduce((acc, c) => acc + c.totalMt, 0);

  const exportColumns = [
    { header: 'KBL Challan No', key: 'challanNo', width: 16 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Cold Storage', key: 'storage', width: 24 },
    { header: 'SR Receipts', key: 'srs', width: 18 },
    { header: 'Seed Varieties', key: 'varieties', width: 20 },
    { header: 'Classes', key: 'classes', width: 16 },
    { header: 'Grades', key: 'grades', width: 16 },
    { header: 'Total Bags', key: 'bags', width: 14 },
    { header: 'Total KG', key: 'totalKg', width: 14 },
    { header: 'Total MT', key: 'totalMt', width: 14 },
    { header: 'Truck No', key: 'truckNo', width: 16 },
    { header: 'Grower / Farmer', key: 'growerFarmerName', width: 22 },
  ];

  const handleExcel = () => {
    exportToExcel(
      filteredChallans,
      exportColumns,
      'Challan_Wise_Summary_Report_2024',
      'KBL Challan-Wise Seed Stock Summary Report',
      companySettings,
      `Records: ${filteredChallans.length} | Generated: ${new Date().toLocaleDateString()}`
    );
  };

  const handlePdf = () => {
    exportToPdf(
      filteredChallans,
      exportColumns,
      'Challan_Wise_Summary_Report_2024',
      'KBL Challan-Wise Seed Stock Summary Report',
      companySettings,
      'l',
      `Records: ${filteredChallans.length} | Generated: ${new Date().toLocaleDateString()}`
    );
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

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pt-0.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4.5 bg-sky-500 rounded-xs" />
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            CHALLAN-WISE REPORT
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {filteredChallans.length} Challans
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

          {/* Print and Export Button Group */}
          <ReportButtonGroup
            onPrint={() => setIsPreviewOpen(true)}
            onExportExcel={handleExcel}
            onExportPdf={handlePdf}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CHALLANS</span>
            <FileText className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalChallanCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL BAGS</span>
            <Boxes className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalChallanBags.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL KG</span>
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalChallanKg.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL MT</span>
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalChallanMt.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-slate-800 rounded-xl shadow-2xs no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Challan, SR, Storage, Variety..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <strong className="text-slate-800 dark:text-slate-200">{filteredChallans.length}</strong> Challans
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white dark:bg-slate-900 border border-sky-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-800 text-slate-100 dark:bg-slate-850 dark:text-white font-bold border-b-2 border-slate-900 dark:border-slate-700 select-none">
              <tr>
                <th
                  onClick={() => handleSort('challanNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  KBL CHALLAN NO {renderSortIndicator('challanNo')}
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  DATE {renderSortIndicator('date')}
                </th>
                <th
                  onClick={() => handleSort('storage')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  COLD STORAGE {renderSortIndicator('storage')}
                </th>
                <th
                  onClick={() => handleSort('srs')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  SR NUMBER(S) {renderSortIndicator('srs')}
                </th>
                <th
                  onClick={() => handleSort('varieties')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  POTATO VARIETY {renderSortIndicator('varieties')}
                </th>
                <th
                  onClick={() => handleSort('classes')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  CLASS & GRADE {renderSortIndicator('classes')}
                </th>
                <th
                  onClick={() => handleSort('bags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  TOTAL BAGS {renderSortIndicator('bags')}
                </th>
                <th
                  onClick={() => handleSort('totalKg')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  TOTAL KG {renderSortIndicator('totalKg')}
                </th>
                <th
                  onClick={() => handleSort('totalMt')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  TOTAL MT {renderSortIndicator('totalMt')}
                </th>
                <th
                  onClick={() => handleSort('truckNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  LOGISTICS {renderSortIndicator('truckNo')}
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedChallans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic font-sans">
                    No Challan records found matching search filters.
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((row) => (
                  <tr
                    key={row.id}
                    className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                  >
                    <td className={`font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap ${tdPadding}`}>
                      {row.challanNo}
                    </td>
                    <td className={`font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap ${tdPadding}`}>
                      {row.date}
                    </td>
                    <td className={`font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap ${tdPadding}`}>
                      {row.storage}
                    </td>
                    <td className={`font-mono text-slate-600 dark:text-slate-300 ${tdPadding}`}>
                      {row.srs}
                    </td>
                    <td className={`font-bold text-slate-900 dark:text-white whitespace-nowrap ${tdPadding}`}>
                      {row.varieties}
                    </td>
                    <td className={`text-slate-600 dark:text-slate-300 whitespace-nowrap ${tdPadding}`}>
                      <div>{row.classes}</div>
                      <div className="text-[10px] text-slate-400">{row.grades}</div>
                    </td>
                    <td className={`text-right font-bold text-slate-900 dark:text-white font-mono tabular-nums ${tdPadding}`}>
                      {row.bags.toLocaleString()}
                    </td>
                    <td className={`text-right font-medium text-slate-800 dark:text-slate-200 font-mono tabular-nums ${tdPadding}`}>
                      {row.totalKg.toLocaleString()}
                    </td>
                    <td className={`text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums ${tdPadding}`}>
                      {row.totalMt.toFixed(2)}
                    </td>
                    <td className={`text-slate-600 dark:text-slate-300 ${tdPadding}`}>
                      <div>{row.truckNo}</div>
                      <div className="text-[10px] text-slate-400">{row.driverName}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredChallans.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs select-none">
                <tr>
                  <td colSpan={6} className={`${tdPadding} uppercase tracking-wider`}>
                    TOTAL CHALLAN AGGREGATE ({filteredChallans.length} CHALLANS)
                  </td>
                  <td className={`${tdPadding} text-right font-mono text-sky-600 dark:text-sky-400 font-black`}>
                    {totalChallanBags.toLocaleString()}
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-bold text-slate-700 dark:text-slate-300`}>
                    {totalChallanKg.toLocaleString()}
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-black text-emerald-600 dark:text-emerald-400`}>
                    {totalChallanMt.toFixed(2)} MT
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {sortedChallans.length > 0 && (
          <TablePagination
            currentPage={effectivePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedChallans.length}
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
          documentTitle="KBL Challan-Wise Seed Stock Summary Report"
          subtitle={`Total Challans: ${filteredChallans.length} | Generated: ${new Date().toLocaleDateString()}`}
          columns={exportColumns}
          data={filteredChallans}
          summaryItems={[
            { label: 'Total Challans Processed', value: filteredChallans.length },
            { label: 'Total Sacks / Bags', value: totalChallanBags.toLocaleString() },
            { label: 'Total Net Weight (KG)', value: totalChallanKg.toLocaleString() },
            { label: 'Total Metric Tons', value: `${totalChallanMt.toFixed(2)} MT` },
          ]}
          filename="Challan_Wise_Summary_Report_2024"
        />
      )}
    </div>
  );
};
