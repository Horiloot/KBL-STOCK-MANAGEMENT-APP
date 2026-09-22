import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  BarChart3,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Warehouse,
  Boxes,
  Scale,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';

export const StockReportView: React.FC = () => {
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
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
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

  // Filtered dataset
  const filteredData = useMemo(() => {
    return stockTransactions.filter((s) => {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      if (selectedStorage && s.coldStorageId !== selectedStorage) return false;
      if (selectedVariety && s.varietyId !== selectedVariety) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const storageName = (coldStorages.find((c) => c.id === s.coldStorageId)?.name || '').toLowerCase();
        const varietyName = (varieties.find((v) => v.id === s.varietyId)?.name || '').toLowerCase();
        const match =
          s.kblChallanNo.toLowerCase().includes(q) ||
          s.srNo.toLowerCase().includes(q) ||
          storageName.includes(q) ||
          varietyName.includes(q) ||
          (s.growerFarmerName && s.growerFarmerName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [stockTransactions, startDate, endDate, selectedStorage, selectedVariety, searchTerm, coldStorages, varieties]);

  const totalBags = filteredData.reduce((acc, s) => acc + s.sackQuantity, 0);
  const totalKg = filteredData.reduce((acc, s) => acc + s.totalKg, 0);
  const totalMt = filteredData.reduce((acc, s) => acc + s.totalMt, 0);
  const avgKgPerBag = totalBags > 0 ? (totalKg / totalBags).toFixed(1) : '-';

  const formattedRows = useMemo(() => {
    return filteredData.map((s) => {
      const storage = coldStorages.find((c) => c.id === s.coldStorageId)?.name || s.coldStorageId;
      const variety = varieties.find((v) => v.id === s.varietyId)?.name || s.varietyId;
      const seedClass = seedClasses.find((c) => c.id === s.classId)?.name || s.classId;
      const grade = grades.find((g) => g.id === s.gradeId)?.name || s.gradeId;

      return {
        id: s.id,
        date: s.date,
        challan: s.kblChallanNo,
        sr: s.srNo,
        storage,
        variety,
        class: seedClass,
        grade,
        bags: s.sackQuantity,
        kgPerBag: s.kgPerBag,
        totalKg: s.totalKg,
        totalMt: s.totalMt,
        truckNo: s.truckNo || '-',
        driver: s.driverName || '-',
        grower: s.growerFarmerName || '-',
      };
    });
  }, [filteredData, coldStorages, varieties, seedClasses, grades]);

  const sortedRows = useMemo(() => {
    return sortData(formattedRows, sortKey, sortDir);
  }, [formattedRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const exportColumns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'KBL Challan No', key: 'challan', width: 16 },
    { header: 'SR No', key: 'sr', width: 12 },
    { header: 'Cold Storage', key: 'storage', width: 26 },
    { header: 'Variety', key: 'variety', width: 16 },
    { header: 'Class', key: 'class', width: 14 },
    { header: 'Grade', key: 'grade', width: 18 },
    { header: 'Bags', key: 'bags', width: 12 },
    { header: 'KG/Bag', key: 'kgPerBag', width: 10 },
    { header: 'Total KG', key: 'totalKg', width: 14 },
    { header: 'Total MT', key: 'totalMt', width: 14 },
    { header: 'Truck No', key: 'truckNo', width: 16 },
    { header: 'Grower/Farmer', key: 'grower', width: 20 },
  ];

  const handleExcel = () => {
    exportToExcel(
      formattedRows,
      exportColumns,
      'Official_Stock_Inbound_Report_2024',
      'Potato Seed Inbound Stock Report',
      companySettings,
      `Date Range: ${startDate} to ${endDate}`
    );
    addToast('Stock inbound report exported to Excel!', 'success');
  };

  const handlePdf = () => {
    exportToPdf(
      formattedRows,
      exportColumns.slice(0, 11),
      'Official_Stock_Inbound_Report_2024',
      'POTATO SEED INBOUND STOCK REPORT',
      companySettings,
      'l',
      `Date Range: ${startDate} to ${endDate} | Total Lots: ${formattedRows.length}`
    );
    addToast('Stock inbound report exported to PDF!', 'success');
  };

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pt-0.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4.5 bg-sky-500 rounded-xs" />
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            POTATO SEED STOCK INBOUND REPORT
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {filteredData.length} Lots
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">MATCHING LOTS</span>
            <Warehouse className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredData.length}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL BAGS</span>
            <Boxes className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalBags.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL NET KG</span>
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalKg.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">METRIC TONS (MT)</span>
            <Scale className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalMt.toFixed(2)}
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
          {(searchTerm || selectedStorage || selectedVariety || startDate !== '2024-01-01' || endDate !== '2024-12-31') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStorage('');
                setSelectedVariety('');
                setStartDate('2024-01-01');
                setEndDate('2024-12-31');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Challan, SR, Grower..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                  {cs.name} ({cs.code})
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
                  onClick={() => handleSort('date')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Date {renderSortIndicator('date')}
                </th>
                <th
                  onClick={() => handleSort('challan')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Challan No {renderSortIndicator('challan')}
                </th>
                <th
                  onClick={() => handleSort('sr')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  SR No {renderSortIndicator('sr')}
                </th>
                <th
                  onClick={() => handleSort('storage')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Cold Storage {renderSortIndicator('storage')}
                </th>
                <th
                  onClick={() => handleSort('variety')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Variety {renderSortIndicator('variety')}
                </th>
                <th
                  onClick={() => handleSort('class')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Class {renderSortIndicator('class')}
                </th>
                <th
                  onClick={() => handleSort('grade')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Grade {renderSortIndicator('grade')}
                </th>
                <th
                  onClick={() => handleSort('bags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Bags {renderSortIndicator('bags')}
                </th>
                <th
                  onClick={() => handleSort('kgPerBag')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  KG/Bag {renderSortIndicator('kgPerBag')}
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
                  onClick={() => handleSort('truckNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Logistics {renderSortIndicator('truckNo')}
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 italic font-sans">
                    No inbound records found matching the specified report filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                  >
                    <td className={`font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap ${tdPadding}`}>
                      {row.date}
                    </td>
                    <td className={`font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap ${tdPadding}`}>
                      {row.challan}
                    </td>
                    <td className={`font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap ${tdPadding}`}>
                      {row.sr}
                    </td>
                    <td className={`font-sans font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap ${tdPadding}`}>
                      {row.storage}
                    </td>
                    <td className={`font-sans font-semibold text-slate-900 dark:text-white ${tdPadding}`}>
                      {row.variety}
                    </td>
                    <td className={`font-sans ${tdPadding}`}>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.class}
                      </span>
                    </td>
                    <td className={`font-sans text-slate-600 dark:text-slate-300 text-xs ${tdPadding}`}>
                      {row.grade}
                    </td>
                    <td className={`text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums ${tdPadding}`}>
                      {row.bags.toLocaleString()}
                    </td>
                    <td className={`text-right text-slate-500 font-mono tabular-nums ${tdPadding}`}>
                      {row.kgPerBag}
                    </td>
                    <td className={`text-right font-medium text-slate-800 dark:text-slate-200 font-mono tabular-nums ${tdPadding}`}>
                      {row.totalKg.toLocaleString()}
                    </td>
                    <td className={`text-right font-bold text-sky-700 dark:text-sky-400 font-mono tabular-nums ${tdPadding}`}>
                      {row.totalMt.toFixed(2)}
                    </td>
                    <td className={`font-mono text-[11px] text-slate-500 dark:text-slate-400 ${tdPadding}`}>
                      {row.truckNo}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {formattedRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700 text-xs select-none">
                <tr>
                  <td colSpan={7} className={`${tdPadding} font-sans uppercase tracking-wider`}>
                    TOTAL ({formattedRows.length} Lots)
                  </td>
                  <td className={`${tdPadding} text-right text-emerald-700 dark:text-emerald-400 font-black`}>
                    {totalBags.toLocaleString()}
                  </td>
                  <td className={`${tdPadding} text-right text-slate-500 font-normal`}>
                    {avgKgPerBag}
                  </td>
                  <td className={`${tdPadding} text-right font-black`}>
                    {totalKg.toLocaleString()} KG
                  </td>
                  <td className={`${tdPadding} text-right text-sky-700 dark:text-sky-400 font-black`}>
                    {totalMt.toFixed(2)} MT
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {sortedRows.length > 0 && (
          <TablePagination
            currentPage={effectivePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedRows.length}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Document Print Preview Modal */}
      {isPreviewOpen && (
        <PrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentTitle="Potato Seed Inbound Stock Report (Excel Register)"
          subtitle={`Report Period: ${startDate} to ${endDate} | Total Lots: ${formattedRows.length}`}
          columns={exportColumns}
          data={formattedRows}
          summaryItems={[
            { label: 'Total Inbound Lots', value: `${formattedRows.length}` },
            { label: 'Total Sacks / Bags', value: `${totalBags.toLocaleString()} Bags` },
            { label: 'Net Weight (KG)', value: `${totalKg.toLocaleString()} KG` },
            { label: 'Net Metric Tons', value: `${totalMt.toFixed(2)} MT` },
          ]}
          filename="Stock_Inbound_Report_2024"
        />
      )}
    </div>
  );
};
