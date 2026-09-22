import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  PackageCheck,
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
  Layers,
  Scale,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Truck,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';

interface ItemClosingStock {
  id: string;
  coldStorageId: string;
  storageName: string;
  varietyId: string;
  varietyName: string;
  varietyCode: string;
  classId: string;
  className: string;
  gradeId: string;
  gradeName: string;
  kgPerBag: number;
  inboundBags: number;
  inboundMt: number;
  outboundBags: number;
  outboundMt: number;
  closingBags: number;
  closingKg: number;
  closingMt: number;
  status: 'in_stock' | 'low_stock' | 'depleted';
}

export const AllItemClosingStockView: React.FC = () => {
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
  const [selectedStockStatus, setSelectedStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'depleted'>('all');

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
    setSelectedClass('');
    setSelectedGrade('');
    setSelectedStockStatus('all');
    setCurrentPage(1);
  };

  // Build aggregated items list across all storages and combinations
  const allClosingItems = useMemo<ItemClosingStock[]>(() => {
    // Map of storageId + varietyId + classId + gradeId
    const itemMap = new Map<string, ItemClosingStock>();

    // 1. Process all stock inbound
    stockTransactions.forEach((s) => {
      if (s.status && s.status !== 'approved') return;
      const key = `${s.coldStorageId}|${s.varietyId}|${s.classId}|${s.gradeId}`;

      const storageObj = coldStorages.find((c) => c.id === s.coldStorageId);
      const varietyObj = varieties.find((v) => v.id === s.varietyId);
      const classObj = seedClasses.find((c) => c.id === s.classId);
      const gradeObj = grades.find((g) => g.id === s.gradeId);

      const kgPerBag = s.kgPerBag || 50;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          id: key,
          coldStorageId: s.coldStorageId,
          storageName: storageObj?.name || s.coldStorageId,
          varietyId: s.varietyId,
          varietyName: varietyObj?.name || s.varietyId,
          varietyCode: varietyObj?.code || '',
          classId: s.classId,
          className: classObj?.name || s.classId,
          gradeId: s.gradeId,
          gradeName: gradeObj?.name || s.gradeId,
          kgPerBag,
          inboundBags: 0,
          inboundMt: 0,
          outboundBags: 0,
          outboundMt: 0,
          closingBags: 0,
          closingKg: 0,
          closingMt: 0,
          status: 'in_stock',
        });
      }

      const item = itemMap.get(key)!;
      item.inboundBags += s.sackQuantity;
      item.inboundMt += s.totalMt;
      item.closingBags += s.sackQuantity;
      item.closingKg += s.totalKg;
      item.closingMt += s.totalMt;
    });

    // 2. Process all delivery outbound
    deliveryTransactions.forEach((d) => {
      const key = `${d.coldStorageId}|${d.varietyId}|${d.classId}|${d.gradeId}`;

      if (itemMap.has(key)) {
        const item = itemMap.get(key)!;
        item.outboundBags += d.sackQuantity;
        item.outboundMt += d.totalMt;
        item.closingBags -= d.sackQuantity;
        item.closingKg -= d.totalKg;
        item.closingMt -= d.totalMt;
      } else {
        // Delivery with no prior recorded inbound in same exact key
        const storageObj = coldStorages.find((c) => c.id === d.coldStorageId);
        const varietyObj = varieties.find((v) => v.id === d.varietyId);
        const classObj = seedClasses.find((c) => c.id === d.classId);
        const gradeObj = grades.find((g) => g.id === d.gradeId);
        const kgPerBag = d.kgPerBag || 50;

        itemMap.set(key, {
          id: key,
          coldStorageId: d.coldStorageId,
          storageName: storageObj?.name || d.coldStorageId,
          varietyId: d.varietyId,
          varietyName: varietyObj?.name || d.varietyId,
          varietyCode: varietyObj?.code || '',
          classId: d.classId,
          className: classObj?.name || d.classId,
          gradeId: d.gradeId,
          gradeName: gradeObj?.name || d.gradeId,
          kgPerBag,
          inboundBags: 0,
          inboundMt: 0,
          outboundBags: d.sackQuantity,
          outboundMt: d.totalMt,
          closingBags: -d.sackQuantity,
          closingKg: -d.totalKg,
          closingMt: -d.totalMt,
          status: 'depleted',
        });
      }
    });

    // Set statuses
    const list = Array.from(itemMap.values());
    list.forEach((item) => {
      // Prevent negative display anomalies
      if (item.closingBags < 0) {
        item.closingBags = 0;
        item.closingKg = 0;
        item.closingMt = 0;
      }
      if (item.closingBags === 0) {
        item.status = 'depleted';
      } else if (item.closingBags < 500) {
        item.status = 'low_stock';
      } else {
        item.status = 'in_stock';
      }
    });

    return list;
  }, [stockTransactions, deliveryTransactions, coldStorages, varieties, seedClasses, grades]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allClosingItems.filter((item) => {
      if (selectedStorage && item.coldStorageId !== selectedStorage) return false;
      if (selectedVariety && item.varietyId !== selectedVariety) return false;
      if (selectedClass && item.classId !== selectedClass) return false;
      if (selectedGrade && item.gradeId !== selectedGrade) return false;
      if (selectedStockStatus !== 'all' && item.status !== selectedStockStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !item.storageName.toLowerCase().includes(q) &&
          !item.varietyName.toLowerCase().includes(q) &&
          !item.className.toLowerCase().includes(q) &&
          !item.gradeName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allClosingItems, selectedStorage, selectedVariety, selectedClass, selectedGrade, selectedStockStatus, searchQuery]);

  // KPIs
  const totalClosingBags = filteredItems.reduce((acc, item) => acc + item.closingBags, 0);
  const totalClosingMt = filteredItems.reduce((acc, item) => acc + item.closingMt, 0);
  const totalInboundBags = filteredItems.reduce((acc, item) => acc + item.inboundBags, 0);
  const totalOutboundBags = filteredItems.reduce((acc, item) => acc + item.outboundBags, 0);
  const inStockLinesCount = filteredItems.filter((item) => item.status === 'in_stock').length;
  const depletedLinesCount = filteredItems.filter((item) => item.status === 'depleted').length;

  const sortedItems = useMemo(() => {
    return sortData(filteredItems, sortKey, sortDir);
  }, [filteredItems, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedItems = sortedItems.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const exportColumns = [
    { header: 'Cold Storage', key: 'storageName', width: 22 },
    { header: 'Potato Variety', key: 'varietyName', width: 18 },
    { header: 'Seed Class', key: 'className', width: 16 },
    { header: 'Size Grade', key: 'gradeName', width: 14 },
    { header: 'Kg/Bag', key: 'kgPerBag', width: 10 },
    { header: 'Inbound Bags', key: 'inboundBags', width: 14 },
    { header: 'Inbound MT', key: 'inboundMt', width: 14 },
    { header: 'Outbound Bags', key: 'outboundBags', width: 14 },
    { header: 'Outbound MT', key: 'outboundMt', width: 14 },
    { header: 'Closing Stock (Bags)', key: 'closingBags', width: 18 },
    { header: 'Closing Stock (MT)', key: 'closingMt', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
  ];

  const handleExportExcel = () => {
    exportToExcel(
      sortedItems,
      exportColumns,
      `ALL_ITEM_CLOSING_STOCK_${new Date().toISOString().split('T')[0]}`,
      'ALL ITEM CLOSING STOCK - COMPREHENSIVE INVENTORY BALANCE',
      companySettings,
      'Season 2024'
    );
    addToast('All Item Closing Stock exported to Excel!', 'success');
  };

  const handleExportPdf = () => {
    exportToPdf(
      sortedItems,
      exportColumns.slice(0, 11),
      `ALL_ITEM_CLOSING_STOCK_${new Date().toISOString().split('T')[0]}`,
      'ALL ITEM CLOSING STOCK - INVENTORY BALANCE',
      companySettings,
      'l',
      'Season 2024'
    );
    addToast('All Item Closing Stock exported to PDF!', 'success');
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
            <div className="w-1.5 h-4.5 bg-emerald-600 dark:bg-emerald-500 rounded-xs" />
            <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
              ALL ITEM CLOSING STOCK
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {filteredItems.length} Item Lines
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Current net closing stock balance across all cold storages, potato varieties, seed classes, and size grades
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CLOSING STOCK</span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalClosingBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Bags on Hand
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CLOSING MT</span>
            <Scale className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalClosingMt.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Metric Tons Balance
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">INBOUND TOTAL</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalInboundBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Received Bags
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">OUTBOUND TOTAL</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalOutboundBags.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Delivered Bags
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ACTIVE ITEMS</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {inStockLinesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Lines with Stock &gt; 0
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DEPLETED LINES</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
            {depletedLinesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Zero Stock Remaining
          </div>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              COMPREHENSIVE DATA FILTER & SEARCH
            </span>
          </div>
          {(searchQuery || selectedStorage || selectedVariety || selectedClass || selectedGrade || selectedStockStatus !== 'all') && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Universal Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Variety, Storage, Grade..."
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

          {/* Stock Level Status */}
          <div>
            <select
              value={selectedStockStatus}
              onChange={(e) => {
                setSelectedStockStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; 500 Bags)</option>
              <option value="low_stock">Low Stock (&lt; 500 Bags)</option>
              <option value="depleted">Depleted (0 Bags)</option>
            </select>
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
                  onClick={() => handleSort('className')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Seed Class {renderSortIndicator('className')}
                </th>
                <th
                  onClick={() => handleSort('gradeName')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Size Grade {renderSortIndicator('gradeName')}
                </th>
                <th
                  onClick={() => handleSort('kgPerBag')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Kg/Bag {renderSortIndicator('kgPerBag')}
                </th>
                <th
                  onClick={() => handleSort('inboundBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Inbound Bags {renderSortIndicator('inboundBags')}
                </th>
                <th
                  onClick={() => handleSort('outboundBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Outbound Bags {renderSortIndicator('outboundBags')}
                </th>
                <th
                  onClick={() => handleSort('closingBags')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors text-emerald-700 dark:text-emerald-400"
                >
                  Closing Bags {renderSortIndicator('closingBags')}
                </th>
                <th
                  onClick={() => handleSort('closingMt')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors text-sky-700 dark:text-sky-400"
                >
                  Closing MT {renderSortIndicator('closingMt')}
                </th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 font-mono ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    <PackageCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      No closing stock item lines found matching the filters
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting the search criteria or resetting filters
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className={`font-sans whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold ${density === 'compact' ? 'py-1 px-3' : density === 'normal' ? 'py-2 px-3' : 'py-3 px-3'}`}>
                      {item.storageName}
                    </td>
                    <td className="font-sans whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                        {item.varietyName}
                      </span>
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {item.className}
                    </td>
                    <td className="font-sans whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.gradeName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right text-slate-500">
                      {item.kgPerBag}
                    </td>
                    <td className="whitespace-nowrap text-right font-medium text-slate-600 dark:text-slate-400">
                      {item.inboundBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-medium text-amber-600 dark:text-amber-400">
                      {item.outboundBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-black text-emerald-700 dark:text-emerald-400">
                      {item.closingBags.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-bold text-sky-700 dark:text-sky-400">
                      {item.closingMt.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'in_stock'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : item.status === 'low_stock'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {item.status === 'in_stock' ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <AlertTriangle className="w-2.5 h-2.5" />
                        )}
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginatedItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                  <td colSpan={5} className="py-2.5 px-3 font-sans uppercase tracking-wider">
                    FILTERED CLOSING STOCK TOTAL ({filteredItems.length} Item Lines)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 font-bold">
                    {totalInboundBags.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                    {totalOutboundBags.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-black">
                    {totalClosingBags.toLocaleString()} Bags
                  </td>
                  <td className="py-2.5 px-3 text-right text-sky-700 dark:text-sky-400 font-black">
                    {totalClosingMt.toFixed(2)} MT
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
          totalItems={sortedItems.length}
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
        documentTitle="ALL ITEM CLOSING STOCK REPORT"
        subtitle={`Item-wise inventory balance across all cold storages (${companySettings.fiscalYear || '2024-2025'})`}
        columns={exportColumns.slice(0, 11)}
        data={sortedItems}
        summaryItems={[
          { label: 'Total Closing Stock', value: `${totalClosingBags.toLocaleString()} Bags` },
          { label: 'Total Closing MT', value: `${totalClosingMt.toFixed(2)} MT` },
          { label: 'Total Inbound', value: `${totalInboundBags.toLocaleString()} Bags` },
          { label: 'Total Dispatched', value: `${totalOutboundBags.toLocaleString()} Bags` },
        ]}
        filename="All_Item_Closing_Stock_2024"
        orientation="l"
      />
    </div>
  );
};
