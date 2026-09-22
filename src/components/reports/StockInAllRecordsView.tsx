import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  Boxes,
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
  UserCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { exportToExcel, exportToPdf, validateAndTriggerPrint } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';
import { DateRangePicker } from '../common/DateRangePicker';

export const StockInAllRecordsView: React.FC = () => {
  const {
    stockTransactions,
    coldStorages,
    varieties,
    seedClasses,
    grades,
    productionBlocks,
    potatoTypes,
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
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting & Pagination
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

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStorage('');
    setSelectedVariety('');
    setSelectedClass('');
    setSelectedGrade('');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Filtered dataset
  const filteredTransactions = useMemo(() => {
    return stockTransactions.filter((s) => {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      if (selectedStorage && s.coldStorageId !== selectedStorage) return false;
      if (selectedVariety && s.varietyId !== selectedVariety) return false;
      if (selectedClass && s.classId !== selectedClass) return false;
      if (selectedGrade && s.gradeId !== selectedGrade) return false;
      if (selectedStatus !== 'all') {
        const itemStatus = s.status || 'approved';
        if (itemStatus !== selectedStatus) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const challan = (s.kblChallanNo || '').toLowerCase();
        const sr = (s.srNo || '').toLowerCase();
        const txNo = (s.transactionNo || '').toLowerCase();
        const truck = (s.truckNo || '').toLowerCase();
        const driver = (s.driverName || '').toLowerCase();
        const grower = (s.growerFarmerName || '').toLowerCase();
        const remarks = (s.remarks || '').toLowerCase();

        const storageName = (coldStorages.find((c) => c.id === s.coldStorageId)?.name || '').toLowerCase();
        const varietyName = (varieties.find((v) => v.id === s.varietyId)?.name || '').toLowerCase();

        if (
          !challan.includes(q) &&
          !sr.includes(q) &&
          !txNo.includes(q) &&
          !truck.includes(q) &&
          !driver.includes(q) &&
          !grower.includes(q) &&
          !remarks.includes(q) &&
          !storageName.includes(q) &&
          !varietyName.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    stockTransactions,
    startDate,
    endDate,
    selectedStorage,
    selectedVariety,
    selectedClass,
    selectedGrade,
    selectedStatus,
    searchQuery,
    coldStorages,
    varieties,
  ]);

  // Overall KPIs
  const totalBags = filteredTransactions.reduce((acc, s) => acc + s.sackQuantity, 0);
  const totalKg = filteredTransactions.reduce((acc, s) => acc + s.totalKg, 0);
  const totalMt = filteredTransactions.reduce((acc, s) => acc + s.totalMt, 0);
  const avgKgPerBag = totalBags > 0 ? (totalKg / totalBags).toFixed(1) : '0.0';
  const uniqueStorages = new Set(filteredTransactions.map((s) => s.coldStorageId)).size;
  const uniqueChallans = new Set(filteredTransactions.map((s) => s.kblChallanNo)).size;

  // Formatted Rows for Table & Export
  const formattedRows = useMemo(() => {
    return filteredTransactions.map((s) => {
      const storage = coldStorages.find((c) => c.id === s.coldStorageId)?.name || s.coldStorageId;
      const variety = varieties.find((v) => v.id === s.varietyId)?.name || s.varietyId;
      const seedClass = seedClasses.find((c) => c.id === s.classId)?.name || s.classId;
      const grade = grades.find((g) => g.id === s.gradeId)?.name || s.gradeId;
      const block = productionBlocks.find((b) => b.id === (s.productionBlockId || s.blockId))?.name || s.farmBlock || '-';
      const potatoType = potatoTypes.find((t) => t.id === (s.potatoTypeId || s.typeId))?.name || '-';

      return {
        id: s.id,
        date: s.date,
        transactionNo: s.transactionNo,
        kblChallanNo: s.kblChallanNo,
        srNo: s.srNo,
        storage,
        variety,
        class: seedClass,
        grade,
        block,
        potatoType,
        sackQuantity: s.sackQuantity,
        kgPerBag: s.kgPerBag,
        totalKg: s.totalKg,
        totalMt: s.totalMt,
        truckNo: s.truckNo || '-',
        driverName: s.driverName || '-',
        growerFarmerName: s.growerFarmerName || '-',
        status: s.status || 'approved',
        remarks: s.remarks || '-',
      };
    });
  }, [filteredTransactions, coldStorages, varieties, seedClasses, grades, productionBlocks, potatoTypes]);

  const sortedRows = useMemo(() => {
    return sortData(formattedRows, sortKey, sortDir);
  }, [formattedRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const exportColumns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Tx No', key: 'transactionNo', width: 14 },
    { header: 'KBL Challan', key: 'kblChallanNo', width: 16 },
    { header: 'SR No', key: 'srNo', width: 14 },
    { header: 'Cold Storage', key: 'storage', width: 22 },
    { header: 'Variety', key: 'variety', width: 16 },
    { header: 'Class', key: 'class', width: 14 },
    { header: 'Grade', key: 'grade', width: 14 },
    { header: 'Bags', key: 'sackQuantity', width: 12 },
    { header: 'Kg/Bag', key: 'kgPerBag', width: 10 },
    { header: 'Total Kg', key: 'totalKg', width: 14 },
    { header: 'Total MT', key: 'totalMt', width: 12 },
    { header: 'Truck No', key: 'truckNo', width: 15 },
    { header: 'Driver', key: 'driverName', width: 16 },
    { header: 'Grower/Farmer', key: 'growerFarmerName', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  const handleExportExcel = () => {
    exportToExcel(
      sortedRows,
      exportColumns,
      `STOCK_IN_ALL_RECORDS_${new Date().toISOString().split('T')[0]}`,
      'STOCK IN ALL RECORDS - COMPLETE INBOUND REPORT',
      companySettings,
      'Season 2024'
    );
    addToast('Stock Inbound records exported to Excel!', 'success');
  };

  const handleExportPdf = () => {
    exportToPdf(
      sortedRows,
      exportColumns.slice(0, 12),
      `STOCK_IN_ALL_RECORDS_${new Date().toISOString().split('T')[0]}`,
      'STOCK IN ALL RECORDS - INBOUND REPORT',
      companySettings,
      'l',
      'Season 2024'
    );
    addToast('Stock Inbound records exported to PDF!', 'success');
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
          <div className="w-1.5 h-4.5 bg-sky-600 dark:bg-sky-500 rounded-xs" />
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            STOCK IN ALL RECORDS
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {filteredTransactions.length} Lots
          </span>
        </div>

        {/* Toolbar: Density & Export buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Density Toggle */}
          <div
            className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-semibold"
            role="group"
            aria-label="Table density toggle"
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
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL INBOUND</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalBags.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">WEIGHT (MT)</span>
            <Scale className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalMt.toFixed(2)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL LOTS</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredTransactions.length}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CHALLANS</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {uniqueChallans}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AVG BAG WT</span>
            <Scale className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {avgKgPerBag}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">STORAGES</span>
            <Warehouse className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {uniqueStorages}
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>FILTERS</span>
          </div>
          {(searchQuery || selectedStorage || selectedVariety || selectedClass || selectedGrade || selectedStatus !== 'all' || startDate || endDate) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer uppercase"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {/* Universal Search */}
          <div className="relative xl:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Challan, SR, Driver, Farmer, Truck..."
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
              <option value="">All Seed Classes</option>
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

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Date Range Picker Component */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Main Table Container */}
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
                  onClick={() => handleSort('kblChallanNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  KBL Challan {renderSortIndicator('kblChallanNo')}
                </th>
                <th
                  onClick={() => handleSort('srNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  SR No {renderSortIndicator('srNo')}
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
                  onClick={() => handleSort('sackQuantity')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Bags {renderSortIndicator('sackQuantity')}
                </th>
                <th
                  onClick={() => handleSort('kgPerBag')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Kg/Bag {renderSortIndicator('kgPerBag')}
                </th>
                <th
                  onClick={() => handleSort('totalKg')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Total Kg {renderSortIndicator('totalKg')}
                </th>
                <th
                  onClick={() => handleSort('totalMt')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Total MT {renderSortIndicator('totalMt')}
                </th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white`}>Vehicle & Driver</th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white`}>Grower / Farmer</th>
                <th className={`${thPadding} text-center font-semibold uppercase tracking-wider text-slate-100 dark:text-white`}>Status</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-sans">
                    <Boxes className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      No stock inbound records found matching the filters
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                  >
                    <td className={`font-mono whitespace-nowrap text-slate-700 dark:text-slate-300 ${tdPadding}`}>
                      {row.date}
                    </td>
                    <td className={`whitespace-nowrap font-mono font-bold text-sky-700 dark:text-sky-400 ${tdPadding}`}>
                      {row.kblChallanNo}
                    </td>
                    <td className={`whitespace-nowrap font-mono font-semibold text-slate-800 dark:text-slate-200 ${tdPadding}`}>
                      {row.srNo}
                    </td>
                    <td className={`font-sans whitespace-nowrap text-slate-900 dark:text-white font-medium ${tdPadding}`}>
                      {row.storage}
                    </td>
                    <td className={`font-sans whitespace-nowrap font-bold text-sky-800 dark:text-sky-300 ${tdPadding}`}>
                      {row.variety}
                    </td>
                    <td className={`font-sans whitespace-nowrap text-slate-600 dark:text-slate-400 ${tdPadding}`}>
                      {row.class}
                    </td>
                    <td className={`font-sans whitespace-nowrap ${tdPadding}`}>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {row.grade}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 ${tdPadding}`}>
                      {row.sackQuantity.toLocaleString()}
                    </td>
                    <td className={`whitespace-nowrap text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 ${tdPadding}`}>
                      {row.kgPerBag}
                    </td>
                    <td className={`whitespace-nowrap text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300 ${tdPadding}`}>
                      {row.totalKg.toLocaleString()}
                    </td>
                    <td className={`whitespace-nowrap text-right font-mono tabular-nums font-bold text-sky-700 dark:text-sky-400 ${tdPadding}`}>
                      {row.totalMt.toFixed(2)}
                    </td>
                    <td className={`font-sans whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px] ${tdPadding}`}>
                      <div>{row.truckNo}</div>
                      <div className="text-[10px] text-slate-400">{row.driverName}</div>
                    </td>
                    <td className={`font-sans whitespace-nowrap text-slate-700 dark:text-slate-300 text-xs ${tdPadding}`}>
                      {row.growerFarmerName}
                    </td>
                    <td className={`whitespace-nowrap text-center ${tdPadding}`}>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          row.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {row.status === 'approved' ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <Clock className="w-2.5 h-2.5" />
                        )}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginatedRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs select-none">
                <tr>
                  <td colSpan={7} className={`${tdPadding} uppercase tracking-wider`}>
                    TOTAL ({filteredTransactions.length} LOTS)
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-black text-emerald-700 dark:text-emerald-400`}>
                    {totalBags.toLocaleString()} Bags
                  </td>
                  <td className={`${tdPadding} text-right font-mono text-slate-500`}>
                    avg {avgKgPerBag}
                  </td>
                  <td className={`${tdPadding} text-right font-mono`}>
                    {totalKg.toLocaleString()} Kg
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-black text-sky-700 dark:text-sky-400`}>
                    {totalMt.toFixed(2)} MT
                  </td>
                  <td colSpan={3}></td>
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
        documentTitle="STOCK IN ALL RECORDS - COMPLETE INBOUND REGISTER"
        subtitle={`Inbound lots and gate challans (${companySettings.fiscalYear || '2024-2025'})`}
        columns={exportColumns.slice(0, 12)}
        data={sortedRows}
        summaryItems={[
          { label: 'Total Inbound Bags', value: `${totalBags.toLocaleString()} Bags` },
          { label: 'Total Weight', value: `${totalMt.toFixed(2)} MT` },
          { label: 'Filtered Lots', value: `${filteredTransactions.length}` },
          { label: 'Storages', value: `${uniqueStorages}` },
        ]}
        filename="Stock_In_All_Records_2024"
        orientation="l"
      />
    </div>
  );
};
