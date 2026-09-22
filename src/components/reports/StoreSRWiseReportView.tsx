import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Warehouse,
  Sprout,
  Search,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Scale,
  Truck,
  Eye,
  Boxes,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';

interface SRLotRecord {
  id: string;
  srNo: string;
  kblChallanNo: string;
  date: string;
  coldStorageId: string;
  storageName: string;
  varietyId: string;
  varietyName: string;
  classId: string;
  className: string;
  gradeId: string;
  gradeName: string;
  kgPerBag: number;
  receivedBags: number;
  receivedMt: number;
  deliveredBags: number;
  deliveredMt: number;
  balanceBags: number;
  balanceMt: number;
  status: 'in_store' | 'partially_dispatched' | 'fully_dispatched';
  growerFarmerName: string;
  truckNo: string;
  driverName: string;
}

export const StoreSRWiseReportView: React.FC = () => {
  const {
    stockTransactions,
    deliveryTransactions,
    coldStorages,
    varieties,
    seedClasses,
    grades,
    companySettings,
    addToast,
  } = useApp();

  const [density, setDensity] = useState<TableDensity>('comfortable');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedLotStatus, setSelectedLotStatus] = useState<'all' | 'in_store' | 'partially_dispatched' | 'fully_dispatched'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting & Pagination
  const [sortKey, setSortKey] = useState<string>('srNo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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
    setSelectedClass('');
    setSelectedGrade('');
    setSelectedLotStatus('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Compile SR Lot List with delivered count
  const srRecords = useMemo<SRLotRecord[]>(() => {
    // Map of delivered bags by SR No
    const deliveriesBySr = new Map<string, { bags: number; mt: number }>();
    deliveryTransactions.forEach((d) => {
      const sr = d.srNo || '';
      if (!sr) return;
      const cur = deliveriesBySr.get(sr) || { bags: 0, mt: 0 };
      cur.bags += d.sackQuantity;
      cur.mt += d.totalMt;
      deliveriesBySr.set(sr, cur);
    });

    return stockTransactions.map((s) => {
      const storageObj = coldStorages.find((c) => c.id === s.coldStorageId);
      const varietyObj = varieties.find((v) => v.id === s.varietyId);
      const classObj = seedClasses.find((c) => c.id === s.classId);
      const gradeObj = grades.find((g) => g.id === s.gradeId);

      const delData = deliveriesBySr.get(s.srNo) || { bags: 0, mt: 0 };
      const receivedBags = s.sackQuantity;
      const deliveredBags = Math.min(receivedBags, delData.bags);
      const balanceBags = Math.max(0, receivedBags - deliveredBags);
      const balanceMt = (balanceBags * (s.kgPerBag || 50)) / 1000;

      let status: 'in_store' | 'partially_dispatched' | 'fully_dispatched' = 'in_store';
      if (balanceBags === 0 && receivedBags > 0) {
        status = 'fully_dispatched';
      } else if (deliveredBags > 0) {
        status = 'partially_dispatched';
      }

      return {
        id: s.id,
        srNo: s.srNo || 'NO-SR',
        kblChallanNo: s.kblChallanNo || 'NO-CHALLAN',
        date: s.date,
        coldStorageId: s.coldStorageId,
        storageName: storageObj?.name || s.coldStorageId,
        varietyId: s.varietyId,
        varietyName: varietyObj?.name || s.varietyId,
        classId: s.classId,
        className: classObj?.name || s.classId,
        gradeId: s.gradeId,
        gradeName: gradeObj?.name || s.gradeId,
        kgPerBag: s.kgPerBag || 50,
        receivedBags,
        receivedMt: s.totalMt,
        deliveredBags,
        deliveredMt: delData.mt,
        balanceBags,
        balanceMt,
        status,
        growerFarmerName: s.growerFarmerName || '-',
        truckNo: s.truckNo || '-',
        driverName: s.driverName || '-',
      };
    });
  }, [stockTransactions, deliveryTransactions, coldStorages, varieties, seedClasses, grades]);

  // Apply filters
  const filteredSRs = useMemo(() => {
    return srRecords.filter((r) => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      if (selectedStorage && r.coldStorageId !== selectedStorage) return false;
      if (selectedVariety && r.varietyId !== selectedVariety) return false;
      if (selectedClass && r.classId !== selectedClass) return false;
      if (selectedGrade && r.gradeId !== selectedGrade) return false;
      if (selectedLotStatus !== 'all' && r.status !== selectedLotStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !r.srNo.toLowerCase().includes(q) &&
          !r.kblChallanNo.toLowerCase().includes(q) &&
          !r.storageName.toLowerCase().includes(q) &&
          !r.varietyName.toLowerCase().includes(q) &&
          !r.growerFarmerName.toLowerCase().includes(q) &&
          !r.truckNo.toLowerCase().includes(q) &&
          !r.driverName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [srRecords, startDate, endDate, selectedStorage, selectedVariety, selectedClass, selectedGrade, selectedLotStatus, searchQuery]);

  // KPIs
  const totalReceivedBags = filteredSRs.reduce((acc, r) => acc + r.receivedBags, 0);
  const totalDeliveredBags = filteredSRs.reduce((acc, r) => acc + r.deliveredBags, 0);
  const totalBalanceBags = filteredSRs.reduce((acc, r) => acc + r.balanceBags, 0);
  const totalBalanceMt = filteredSRs.reduce((acc, r) => acc + r.balanceMt, 0);
  const inStoreCount = filteredSRs.filter((r) => r.status === 'in_store').length;
  const partialCount = filteredSRs.filter((r) => r.status === 'partially_dispatched').length;
  const fullyDispatchedCount = filteredSRs.filter((r) => r.status === 'fully_dispatched').length;

  const sortedRows = useMemo(() => {
    return sortData(filteredSRs, sortKey, sortDir);
  }, [filteredSRs, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const exportColumns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Store SR No', key: 'srNo', width: 14 },
    { header: 'KBL Challan', key: 'kblChallanNo', width: 16 },
    { header: 'Cold Storage', key: 'storageName', width: 22 },
    { header: 'Potato Variety', key: 'varietyName', width: 18 },
    { header: 'Seed Class', key: 'className', width: 14 },
    { header: 'Size Grade', key: 'gradeName', width: 14 },
    { header: 'Received Bags', key: 'receivedBags', width: 14 },
    { header: 'Dispatched Bags', key: 'deliveredBags', width: 16 },
    { header: 'Balance Bags', key: 'balanceBags', width: 14 },
    { header: 'Balance MT', key: 'balanceMt', width: 14 },
    { header: 'Lot Status', key: 'status', width: 16 },
    { header: 'Grower / Farmer', key: 'growerFarmerName', width: 18 },
  ];

  const handleExportExcel = () => {
    exportToExcel(
      sortedRows,
      exportColumns,
      `STORE_SR_WISE_REPORT_${new Date().toISOString().split('T')[0]}`,
      'STORE SR WISE REPORT - COMPLETE SERIAL RECEIPT REGISTER',
      companySettings,
      'Season 2024'
    );
    addToast('Store SR report exported to Excel!', 'success');
  };

  const handleExportPdf = () => {
    exportToPdf(
      sortedRows,
      exportColumns.slice(0, 11),
      `STORE_SR_WISE_REPORT_${new Date().toISOString().split('T')[0]}`,
      'STORE SR WISE REPORT',
      companySettings,
      'l',
      'Season 2024'
    );
    addToast('Store SR report exported to PDF!', 'success');
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
            <div className="w-1.5 h-4.5 bg-teal-600 dark:bg-teal-500 rounded-xs" />
            <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
              STORE SR WISE REPORT
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {filteredSRs.length} SR Lots
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Serial Receipt (SR) lot register, lot fulfillment, remaining storage balance, and grower allocations
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL SR LOTS</span>
            <FileCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredSRs.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Serial Receipts
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RECEIVED (BAGS)</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalReceivedBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Initial Inbound
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DISPATCHED</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {totalDeliveredBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Delivered from SRs
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">BALANCE (BAGS)</span>
            <Warehouse className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalBalanceBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Remaining in Store
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">BALANCE (MT)</span>
            <Scale className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalBalanceMt.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Metric Tons Balance
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LOT STATUS</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {inStoreCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Intact ({fullyDispatchedCount} Dispatched)
          </div>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              STORE SR DATA FILTER & SEARCH
            </span>
          </div>
          {(searchQuery || selectedStorage || selectedVariety || selectedClass || selectedGrade || selectedLotStatus !== 'all' || startDate || endDate) && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Universal Search */}
          <div className="relative xl:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search SR, Challan, Farmer, Truck..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Cold Storage */}
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
                  {cs.name}
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

          {/* Seed Class */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Classes</option>
              {seedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Size Grade */}
          <div>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Grades</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lot Status */}
          <div>
            <select
              value={selectedLotStatus}
              onChange={(e) => {
                setSelectedLotStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Lot Statuses</option>
              <option value="in_store">In Store (Intact)</option>
              <option value="partially_dispatched">Partially Dispatched</option>
              <option value="fully_dispatched">Fully Dispatched</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Date Range:
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
            >
              ALL DATES
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate('2024-01-01');
                setEndDate('2024-12-31');
                setCurrentPage(1);
              }}
              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
            >
              SEASON 2024
            </button>
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
                  onClick={() => handleSort('date')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Date {renderSortIndicator('date')}
                </th>
                <th
                  onClick={() => handleSort('srNo')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  SR No {renderSortIndicator('srNo')}
                </th>
                <th
                  onClick={() => handleSort('kblChallanNo')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  KBL Challan {renderSortIndicator('kblChallanNo')}
                </th>
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
                  Variety {renderSortIndicator('varietyName')}
                </th>
                <th
                  onClick={() => handleSort('className')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Class {renderSortIndicator('className')}
                </th>
                <th
                  onClick={() => handleSort('gradeName')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Grade {renderSortIndicator('gradeName')}
                </th>
                <th
                  onClick={() => handleSort('receivedBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Received {renderSortIndicator('receivedBags')}
                </th>
                <th
                  onClick={() => handleSort('deliveredBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Delivered {renderSortIndicator('deliveredBags')}
                </th>
                <th
                  onClick={() => handleSort('balanceBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors text-emerald-700 dark:text-emerald-400"
                >
                  Balance Bags {renderSortIndicator('balanceBags')}
                </th>
                <th
                  onClick={() => handleSort('balanceMt')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors text-sky-700 dark:text-sky-400"
                >
                  Balance MT {renderSortIndicator('balanceMt')}
                </th>
                <th className="py-2.5 px-3 text-center">Lot Status</th>
                <th className="py-2.5 px-3">Grower / Farmer</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 font-mono ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-sans">
                    <FileCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      No Store SR records found matching the filters
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
                    <td className={`font-sans whitespace-nowrap text-slate-700 dark:text-slate-300 ${density === 'compact' ? 'py-1 px-3' : density === 'normal' ? 'py-2 px-3' : 'py-3 px-3'}`}>
                      {row.date}
                    </td>
                    <td className="whitespace-nowrap font-black text-slate-900 dark:text-slate-100">
                      {row.srNo}
                    </td>
                    <td className="whitespace-nowrap font-bold text-sky-700 dark:text-sky-400">
                      {row.kblChallanNo}
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium">
                      {row.storageName}
                    </td>
                    <td className="font-sans whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                        {row.varietyName}
                      </span>
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {row.className}
                    </td>
                    <td className="font-sans whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {row.gradeName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold text-slate-700 dark:text-slate-300">
                      {row.receivedBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold text-amber-600 dark:text-amber-400">
                      {row.deliveredBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-black text-emerald-700 dark:text-emerald-400">
                      {row.balanceBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-bold text-sky-700 dark:text-sky-400">
                      {row.balanceMt.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.status === 'in_store'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : row.status === 'partially_dispatched'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {row.status === 'in_store' ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : row.status === 'partially_dispatched' ? (
                          <Clock className="w-2.5 h-2.5" />
                        ) : (
                          <AlertCircle className="w-2.5 h-2.5" />
                        )}
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-700 dark:text-slate-300 text-xs">
                      {row.growerFarmerName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginatedRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                  <td colSpan={7} className="py-2.5 px-3 font-sans uppercase tracking-wider">
                    FILTERED STORE SR TOTAL ({filteredSRs.length} Lots)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 font-bold">
                    {totalReceivedBags.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                    {totalDeliveredBags.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-black">
                    {totalBalanceBags.toLocaleString()} Bags
                  </td>
                  <td className="py-2.5 px-3 text-right text-sky-700 dark:text-sky-400 font-black">
                    {totalBalanceMt.toFixed(2)} MT
                  </td>
                  <td colSpan={2}></td>
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
        documentTitle="STORE SR WISE REPORT"
        subtitle={`Serial Receipt (SR) lot ledger and cold store balance (${companySettings.fiscalYear || '2024-2025'})`}
        columns={exportColumns.slice(0, 11)}
        data={sortedRows}
        summaryItems={[
          { label: 'Total SR Lots', value: `${filteredSRs.length}` },
          { label: 'Received Bags', value: `${totalReceivedBags.toLocaleString()} Bags` },
          { label: 'Dispatched Bags', value: `${totalDeliveredBags.toLocaleString()} Bags` },
          { label: 'Store Balance', value: `${totalBalanceBags.toLocaleString()} Bags (${totalBalanceMt.toFixed(2)} MT)` },
        ]}
        filename="Store_SR_Wise_Report_2024"
        orientation="l"
      />
    </div>
  );
};
