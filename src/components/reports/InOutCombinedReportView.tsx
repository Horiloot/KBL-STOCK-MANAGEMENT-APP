import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  GitCompare,
  FileSpreadsheet,
  Printer,
  Warehouse,
  Sprout,
  Search,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Scale,
  Building2,
  Boxes,
  Truck,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';

interface CombinedReportRow {
  id: string;
  storageId: string;
  storageName: string;
  varietyId: string;
  varietyName: string;
  varietyCode: string;
  inboundBags: number;
  inboundKg: number;
  inboundMt: number;
  outboundBags: number;
  outboundKg: number;
  outboundMt: number;
  closingBags: number;
  closingKg: number;
  closingMt: number;
  dispatchRate: number; // percentage
  status: string;
}

export const InOutCombinedReportView: React.FC = () => {
  const {
    stockTransactions,
    deliveryTransactions,
    coldStorages,
    varieties,
    companySettings,
    addToast,
  } = useApp();

  const [density, setDensity] = useState<TableDensity>('comfortable');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting & Pagination
  const [sortKey, setSortKey] = useState<string>('closingBags');
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

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStorage('');
    setSelectedVariety('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Build combined aggregate data by storage & variety
  const combinedData = useMemo<CombinedReportRow[]>(() => {
    const map = new Map<string, CombinedReportRow>();

    // 1. Inbound Transactions
    stockTransactions.forEach((s) => {
      if (s.status && s.status !== 'approved') return;
      if (startDate && s.date < startDate) return;
      if (endDate && s.date > endDate) return;

      const key = `${s.coldStorageId}|${s.varietyId}`;
      const storageObj = coldStorages.find((c) => c.id === s.coldStorageId);
      const varietyObj = varieties.find((v) => v.id === s.varietyId);

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          storageId: s.coldStorageId,
          storageName: storageObj?.name || s.coldStorageId,
          varietyId: s.varietyId,
          varietyName: varietyObj?.name || s.varietyId,
          varietyCode: varietyObj?.code || '',
          inboundBags: 0,
          inboundKg: 0,
          inboundMt: 0,
          outboundBags: 0,
          outboundKg: 0,
          outboundMt: 0,
          closingBags: 0,
          closingKg: 0,
          closingMt: 0,
          dispatchRate: 0,
          status: 'Balanced',
        });
      }

      const row = map.get(key)!;
      row.inboundBags += s.sackQuantity;
      row.inboundKg += s.totalKg;
      row.inboundMt += s.totalMt;
    });

    // 2. Outbound Transactions
    deliveryTransactions.forEach((d) => {
      if (startDate && d.date < startDate) return;
      if (endDate && d.date > endDate) return;

      const key = `${d.coldStorageId}|${d.varietyId}`;
      const storageObj = coldStorages.find((c) => c.id === d.coldStorageId);
      const varietyObj = varieties.find((v) => v.id === d.varietyId);

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          storageId: d.coldStorageId,
          storageName: storageObj?.name || d.coldStorageId,
          varietyId: d.varietyId,
          varietyName: varietyObj?.name || d.varietyId,
          varietyCode: varietyObj?.code || '',
          inboundBags: 0,
          inboundKg: 0,
          inboundMt: 0,
          outboundBags: 0,
          outboundKg: 0,
          outboundMt: 0,
          closingBags: 0,
          closingKg: 0,
          closingMt: 0,
          dispatchRate: 0,
          status: 'Balanced',
        });
      }

      const row = map.get(key)!;
      row.outboundBags += d.sackQuantity;
      row.outboundKg += d.totalKg;
      row.outboundMt += d.totalMt;
    });

    // Compute closing and dispatch rates
    const list = Array.from(map.values());
    list.forEach((row) => {
      row.closingBags = Math.max(0, row.inboundBags - row.outboundBags);
      row.closingKg = Math.max(0, row.inboundKg - row.outboundKg);
      row.closingMt = Math.max(0, row.inboundMt - row.outboundMt);

      row.dispatchRate =
        row.inboundBags > 0
          ? Math.min(100, (row.outboundBags / row.inboundBags) * 100)
          : row.outboundBags > 0
          ? 100
          : 0;

      if (row.closingBags === 0 && row.outboundBags > 0) {
        row.status = 'Fully Dispatched';
      } else if (row.dispatchRate > 60) {
        row.status = 'High Turnover';
      } else if (row.dispatchRate > 0) {
        row.status = 'Active Stock';
      } else {
        row.status = 'Stored (Zero Out)';
      }
    });

    return list;
  }, [stockTransactions, deliveryTransactions, coldStorages, varieties, startDate, endDate]);

  // Apply filters
  const filteredData = useMemo(() => {
    return combinedData.filter((row) => {
      if (selectedStorage && row.storageId !== selectedStorage) return false;
      if (selectedVariety && row.varietyId !== selectedVariety) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !row.storageName.toLowerCase().includes(q) &&
          !row.varietyName.toLowerCase().includes(q) &&
          !row.status.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [combinedData, selectedStorage, selectedVariety, searchQuery]);

  // Overall KPIs
  const totalInboundBags = filteredData.reduce((acc, r) => acc + r.inboundBags, 0);
  const totalInboundMt = filteredData.reduce((acc, r) => acc + r.inboundMt, 0);
  const totalOutboundBags = filteredData.reduce((acc, r) => acc + r.outboundBags, 0);
  const totalOutboundMt = filteredData.reduce((acc, r) => acc + r.outboundMt, 0);
  const totalClosingBags = filteredData.reduce((acc, r) => acc + r.closingBags, 0);
  const totalClosingMt = filteredData.reduce((acc, r) => acc + r.closingMt, 0);

  const overallDispatchRate =
    totalInboundBags > 0 ? ((totalOutboundBags / totalInboundBags) * 100).toFixed(1) : '0.0';

  const sortedRows = useMemo(() => {
    return sortData(filteredData, sortKey, sortDir);
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const exportColumns = [
    { header: 'Cold Storage', key: 'storageName', width: 22 },
    { header: 'Potato Variety', key: 'varietyName', width: 18 },
    { header: 'Stock In (Bags)', key: 'inboundBags', width: 14 },
    { header: 'Stock In (MT)', key: 'inboundMt', width: 14 },
    { header: 'Stock Out (Bags)', key: 'outboundBags', width: 14 },
    { header: 'Stock Out (MT)', key: 'outboundMt', width: 14 },
    { header: 'Closing Stock (Bags)', key: 'closingBags', width: 18 },
    { header: 'Closing Stock (MT)', key: 'closingMt', width: 18 },
    { header: 'Dispatch Rate %', key: 'dispatchRate', width: 16 },
    { header: 'Movement Status', key: 'status', width: 16 },
  ];

  const handleExportExcel = () => {
    exportToExcel(
      sortedRows,
      exportColumns,
      `IN_OUT_STOCK_COMBINED_${new Date().toISOString().split('T')[0]}`,
      'IN, OUT & STOCK COMBINED REPORT - INVENTORY RECONCILIATION',
      companySettings,
      'Season 2024'
    );
    addToast('Combined In/Out report exported to Excel!', 'success');
  };

  const handleExportPdf = () => {
    exportToPdf(
      sortedRows,
      exportColumns.slice(0, 10),
      `IN_OUT_STOCK_COMBINED_${new Date().toISOString().split('T')[0]}`,
      'IN, OUT & STOCK COMBINED REPORT',
      companySettings,
      'l',
      'Season 2024'
    );
    addToast('Combined In/Out report exported to PDF!', 'success');
  };

  const renderSortIndicator = (colKey: string) => {
    if (sortKey !== colKey) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors inline ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sky-600 dark:text-sky-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-600 dark:text-sky-400 inline ml-1" />
    );
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4.5 bg-indigo-600 dark:bg-indigo-500 rounded-xs" />
            <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
              IN, OUT & STOCK COMBINED REPORT
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {filteredData.length} Facility Lines
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidated reconciliation statement comparing total stock receipts, outbound dispatches, and remaining stock
          </p>
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

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer uppercase"
            title="Export full filtered report to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EXCEL</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer uppercase"
            title="Print Preview & PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">PRINT / PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">STOCK IN (BAGS)</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalInboundBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {totalInboundMt.toFixed(1)} MT Received
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">STOCK OUT (BAGS)</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {totalOutboundBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {totalOutboundMt.toFixed(1)} MT Dispatched
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CLOSING (BAGS)</span>
            <Warehouse className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalClosingBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Current Net Balance
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CLOSING (MT)</span>
            <Scale className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalClosingMt.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Metric Tons in Storage
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TURNOVER RATE</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {overallDispatchRate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Delivered vs Received
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ACTIVE LINES</span>
            <PieChart className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredData.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Storage & Variety Segments
          </div>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              COMPREHENSIVE DATA FILTER & RECONCILIATION OPTIONS
            </span>
          </div>
          {(searchQuery || selectedStorage || selectedVariety || startDate || endDate) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET FILTERS</span>
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Universal Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Variety, Storage, Status..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Cold Storage Facility */}
          <div>
            <select
              value={selectedStorage}
              onChange={(e) => {
                setSelectedStorage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Cold Storages</option>
              {coldStorages.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.name} ({cs.code})
                </option>
              ))}
            </select>
          </div>

          {/* Variety */}
          <div>
            <select
              value={selectedVariety}
              onChange={(e) => {
                setSelectedVariety(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Varieties</option>
              {varieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              placeholder="Start Date"
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              placeholder="End Date"
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('storageName')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Cold Storage {renderSortIndicator('storageName')}
                </th>
                <th
                  onClick={() => handleSort('varietyName')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Potato Variety {renderSortIndicator('varietyName')}
                </th>
                <th
                  onClick={() => handleSort('inboundBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors text-emerald-700 dark:text-emerald-400"
                >
                  Stock In (Bags) {renderSortIndicator('inboundBags')}
                </th>
                <th
                  onClick={() => handleSort('inboundMt')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Stock In (MT) {renderSortIndicator('inboundMt')}
                </th>
                <th
                  onClick={() => handleSort('outboundBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors text-amber-700 dark:text-amber-400"
                >
                  Stock Out (Bags) {renderSortIndicator('outboundBags')}
                </th>
                <th
                  onClick={() => handleSort('outboundMt')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Stock Out (MT) {renderSortIndicator('outboundMt')}
                </th>
                <th
                  onClick={() => handleSort('closingBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors text-sky-700 dark:text-sky-400"
                >
                  Closing Stock (Bags) {renderSortIndicator('closingBags')}
                </th>
                <th
                  onClick={() => handleSort('closingMt')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Closing MT {renderSortIndicator('closingMt')}
                </th>
                <th
                  onClick={() => handleSort('dispatchRate')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Turnover % {renderSortIndicator('dispatchRate')}
                </th>
                <th className="py-2.5 px-3 text-center">Movement Status</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 font-mono ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    <GitCompare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      No matching combined stock records found
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting the search criteria or resetting filters
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className={`font-sans whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold ${density === 'compact' ? 'py-1 px-3' : density === 'normal' ? 'py-2 px-3' : 'py-3 px-3'}`}>
                      {row.storageName}
                    </td>
                    <td className="font-sans whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                        {row.varietyName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right font-black text-emerald-700 dark:text-emerald-400">
                      {row.inboundBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right text-slate-600 dark:text-slate-400">
                      {row.inboundMt.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap text-right font-black text-amber-700 dark:text-amber-400">
                      {row.outboundBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right text-slate-600 dark:text-slate-400">
                      {row.outboundMt.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap text-right font-black text-sky-700 dark:text-sky-400">
                      {row.closingBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-bold text-slate-700 dark:text-slate-300">
                      {row.closingMt.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{row.dispatchRate.toFixed(1)}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden inline-block">
                          <div
                            className={`h-full ${
                              row.dispatchRate >= 80
                                ? 'bg-amber-500'
                                : row.dispatchRate >= 40
                                ? 'bg-indigo-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, row.dispatchRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.status === 'Fully Dispatched'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : row.status === 'High Turnover'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginatedRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                  <td colSpan={2} className="py-2.5 px-3 font-sans uppercase tracking-wider">
                    COMBINED RECONCILIATION TOTAL ({filteredData.length} Lines)
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-black">
                    {totalInboundBags.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {totalInboundMt.toFixed(2)} MT
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-700 dark:text-amber-400 font-black">
                    {totalOutboundBags.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {totalOutboundMt.toFixed(2)} MT
                  </td>
                  <td className="py-2.5 px-3 text-right text-sky-700 dark:text-sky-400 font-black">
                    {totalClosingBags.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {totalClosingMt.toFixed(2)} MT
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-indigo-700 dark:text-indigo-400">
                    avg {overallDispatchRate}%
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination bar */}
        <TablePagination
          currentPage={effectivePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sortedRows.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        documentTitle="IN, OUT & STOCK COMBINED REPORT"
        subtitle={`Reconciliation of inbound, outbound & closing stock (${companySettings.fiscalYear || '2024-2025'})`}
        columns={exportColumns.slice(0, 10)}
        data={sortedRows}
        summaryItems={[
          { label: 'Total Inbound Bags', value: `${totalInboundBags.toLocaleString()} Bags` },
          { label: 'Total Outbound Bags', value: `${totalOutboundBags.toLocaleString()} Bags` },
          { label: 'Total Closing Stock', value: `${totalClosingBags.toLocaleString()} Bags` },
          { label: 'Overall Turnover', value: `${overallDispatchRate}%` },
        ]}
        filename="In_Out_Stock_Combined_2024"
        orientation="l"
      />
    </div>
  );
};
