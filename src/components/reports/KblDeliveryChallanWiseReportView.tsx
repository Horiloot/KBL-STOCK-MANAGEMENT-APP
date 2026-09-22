import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  FileText,
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
  ChevronDown,
  ChevronRight,
  Boxes,
  User,
  X,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';
import { DateRangePicker } from '../common/DateRangePicker';

interface ChallanSummary {
  id: string;
  kblChallanNo: string;
  date: string;
  coldStorageId: string;
  storageName: string;
  srCount: number;
  srList: string[];
  varietiesList: string[];
  classesList: string[];
  gradesList: string[];
  totalBags: number;
  totalKg: number;
  totalMt: number;
  truckNo: string;
  driverName: string;
  growerFarmerName: string;
  lots: any[];
}

export const KblDeliveryChallanWiseReportView: React.FC = () => {
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expandedChallanId, setExpandedChallanId] = useState<string | null>(null);
  const [selectedChallanDetail, setSelectedChallanDetail] = useState<ChallanSummary | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
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
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Group inbound lots by KBL Challan Number
  const challanList = useMemo<ChallanSummary[]>(() => {
    const map = new Map<string, {
      kblChallanNo: string;
      date: string;
      coldStorageId: string;
      storageName: string;
      srSet: Set<string>;
      varietySet: Set<string>;
      classSet: Set<string>;
      gradeSet: Set<string>;
      totalBags: number;
      totalKg: number;
      totalMt: number;
      truckNo: string;
      driverName: string;
      growerFarmerName: string;
      lots: any[];
    }>();

    stockTransactions.forEach((s) => {
      const challanKey = s.kblChallanNo || 'NO-CHALLAN';
      const storageObj = coldStorages.find((c) => c.id === s.coldStorageId);
      const varietyObj = varieties.find((v) => v.id === s.varietyId);
      const classObj = seedClasses.find((c) => c.id === s.classId);
      const gradeObj = grades.find((g) => g.id === s.gradeId);

      if (!map.has(challanKey)) {
        map.set(challanKey, {
          kblChallanNo: challanKey,
          date: s.date,
          coldStorageId: s.coldStorageId,
          storageName: storageObj?.name || s.coldStorageId,
          srSet: new Set(),
          varietySet: new Set(),
          classSet: new Set(),
          gradeSet: new Set(),
          totalBags: 0,
          totalKg: 0,
          totalMt: 0,
          truckNo: s.truckNo || '-',
          driverName: s.driverName || '-',
          growerFarmerName: s.growerFarmerName || '-',
          lots: [],
        });
      }

      const item = map.get(challanKey)!;
      if (s.srNo) item.srSet.add(s.srNo);
      if (varietyObj?.name) item.varietySet.add(varietyObj.name);
      if (classObj?.name) item.classSet.add(classObj.name);
      if (gradeObj?.name) item.gradeSet.add(gradeObj.name);

      item.totalBags += s.sackQuantity;
      item.totalKg += s.totalKg;
      item.totalMt += s.totalMt;
      item.lots.push({
        ...s,
        varietyName: varietyObj?.name || s.varietyId,
        className: classObj?.name || s.classId,
        gradeName: gradeObj?.name || s.gradeId,
      });
    });

    return Array.from(map.values()).map((c) => ({
      id: c.kblChallanNo,
      kblChallanNo: c.kblChallanNo,
      date: c.date,
      coldStorageId: c.coldStorageId,
      storageName: c.storageName,
      srCount: c.srSet.size,
      srList: Array.from(c.srSet),
      varietiesList: Array.from(c.varietySet),
      classesList: Array.from(c.classSet),
      gradesList: Array.from(c.gradeSet),
      totalBags: c.totalBags,
      totalKg: c.totalKg,
      totalMt: c.totalMt,
      truckNo: c.truckNo,
      driverName: c.driverName,
      growerFarmerName: c.growerFarmerName,
      lots: c.lots,
    }));
  }, [stockTransactions, coldStorages, varieties, seedClasses, grades]);

  // Apply filters
  const filteredChallans = useMemo(() => {
    return challanList.filter((item) => {
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      if (selectedStorage && item.coldStorageId !== selectedStorage) return false;

      if (selectedVariety) {
        const vName = varieties.find((v) => v.id === selectedVariety)?.name;
        if (vName && !item.varietiesList.includes(vName)) return false;
      }

      if (selectedClass) {
        const cName = seedClasses.find((c) => c.id === selectedClass)?.name;
        if (cName && !item.classesList.includes(cName)) return false;
      }

      if (selectedGrade) {
        const gName = grades.find((g) => g.id === selectedGrade)?.name;
        if (gName && !item.gradesList.includes(gName)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const challan = item.kblChallanNo.toLowerCase();
        const srs = item.srList.join(' ').toLowerCase();
        const varietiesStr = item.varietiesList.join(' ').toLowerCase();
        const truck = item.truckNo.toLowerCase();
        const driver = item.driverName.toLowerCase();
        const farmer = item.growerFarmerName.toLowerCase();
        const storage = item.storageName.toLowerCase();

        if (
          !challan.includes(q) &&
          !srs.includes(q) &&
          !varietiesStr.includes(q) &&
          !truck.includes(q) &&
          !driver.includes(q) &&
          !farmer.includes(q) &&
          !storage.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [challanList, startDate, endDate, selectedStorage, selectedVariety, selectedClass, selectedGrade, searchQuery, varieties, seedClasses, grades]);

  // KPIs
  const totalBags = filteredChallans.reduce((acc, c) => acc + c.totalBags, 0);
  const totalMt = filteredChallans.reduce((acc, c) => acc + c.totalMt, 0);
  const totalSrCount = filteredChallans.reduce((acc, c) => acc + c.srCount, 0);
  const avgBagsPerChallan = filteredChallans.length > 0 ? (totalBags / filteredChallans.length).toFixed(0) : '0';
  const uniqueTrucks = new Set(filteredChallans.map((c) => c.truckNo).filter((t) => t && t !== '-')).size;

  const sortedRows = useMemo(() => {
    return sortData(filteredChallans, sortKey, sortDir);
  }, [filteredChallans, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const exportColumns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'KBL Challan No', key: 'kblChallanNo', width: 18 },
    { header: 'Cold Storage', key: 'storageName', width: 22 },
    { header: 'SR Count', key: 'srCount', width: 12 },
    { header: 'Potato Varieties', key: 'varietiesList', width: 20 },
    { header: 'Seed Classes', key: 'classesList', width: 16 },
    { header: 'Size Grades', key: 'gradesList', width: 16 },
    { header: 'Total Bags', key: 'totalBags', width: 14 },
    { header: 'Total MT', key: 'totalMt', width: 14 },
    { header: 'Truck No', key: 'truckNo', width: 16 },
    { header: 'Driver', key: 'driverName', width: 16 },
    { header: 'Grower/Farmer', key: 'growerFarmerName', width: 18 },
  ];

  const handleExportExcel = () => {
    const exportData = sortedRows.map((r) => ({
      ...r,
      varietiesList: r.varietiesList.join(', '),
      classesList: r.classesList.join(', '),
      gradesList: r.gradesList.join(', '),
    }));

    exportToExcel(
      exportData,
      exportColumns,
      `KBL_DELIVERY_CHALLAN_REPORT_${new Date().toISOString().split('T')[0]}`,
      'KBL DELIVERY CHALLAN WISE REPORT',
      companySettings,
      'Season 2024'
    );
    addToast('Challan report exported to Excel!', 'success');
  };

  const handleExportPdf = () => {
    const exportData = sortedRows.map((r) => ({
      ...r,
      varietiesList: r.varietiesList.join(', '),
      classesList: r.classesList.join(', '),
      gradesList: r.gradesList.join(', '),
    }));

    exportToPdf(
      exportData,
      exportColumns.slice(0, 10),
      `KBL_DELIVERY_CHALLAN_REPORT_${new Date().toISOString().split('T')[0]}`,
      'KBL DELIVERY CHALLAN WISE REPORT',
      companySettings,
      'l',
      'Season 2024'
    );
    addToast('Challan report exported to PDF!', 'success');
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
            KBL DELIVERY CHALLAN WISE REPORT
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {filteredChallans.length} Challan Batches
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
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL CHALLANS</span>
            <FileText className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredChallans.length}
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">WEIGHT (MT)</span>
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalMt.toFixed(2)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SR LOTS</span>
            <Layers className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalSrCount}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AVG / CHALLAN</span>
            <Scale className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {avgBagsPerChallan}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TRUCKS</span>
            <Truck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {uniqueTrucks}
          </div>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5 no-print">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-sky-500" />
            <span className="uppercase tracking-wider text-[11px]">FILTER & SEARCH</span>
          </div>
          {(searchQuery || selectedStorage || selectedVariety || selectedClass || selectedGrade || startDate || endDate) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Universal Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Challan, SR, Truck..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
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

          {/* Variety */}
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

          {/* Seed Class */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Grades</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Picker Component */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            label="Challan Period:"
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
                  KBL Challan No {renderSortIndicator('kblChallanNo')}
                </th>
                <th
                  onClick={() => handleSort('storageName')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Cold Storage {renderSortIndicator('storageName')}
                </th>
                <th
                  onClick={() => handleSort('srCount')}
                  className={`${thPadding} text-center font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  SR Lots {renderSortIndicator('srCount')}
                </th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white select-none`}>Varieties</th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white select-none`}>Classes & Grades</th>
                <th
                  onClick={() => handleSort('totalBags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Total Bags {renderSortIndicator('totalBags')}
                </th>
                <th
                  onClick={() => handleSort('totalMt')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  Total MT {renderSortIndicator('totalMt')}
                </th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white select-none`}>Truck & Driver</th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white select-none`}>Grower / Farmer</th>
                <th className={`${thPadding} text-center font-semibold uppercase tracking-wider text-slate-100 dark:text-white select-none`}>Action</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-sans">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      No KBL Challan records found matching the filters
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
                    className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                  >
                    <td className={`font-mono whitespace-nowrap text-slate-700 dark:text-slate-300 ${tdPadding}`}>
                      {row.date}
                    </td>
                    <td className={`whitespace-nowrap font-mono font-bold text-sky-700 dark:text-sky-400 ${tdPadding}`}>
                      {row.kblChallanNo}
                    </td>
                    <td className={`font-sans whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium ${tdPadding}`}>
                      {row.storageName}
                    </td>
                    <td className={`whitespace-nowrap text-center ${tdPadding}`}>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {row.srCount} SRs
                      </span>
                    </td>
                    <td className={`font-sans whitespace-nowrap ${tdPadding}`}>
                      <div className="flex flex-wrap gap-1">
                        {row.varietiesList.map((v) => (
                          <span
                            key={v}
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`font-sans whitespace-nowrap text-slate-500 text-xs ${tdPadding}`}>
                      <div>{row.classesList.join(', ')}</div>
                      <div className="text-[10px] text-slate-400">{row.gradesList.join(', ')}</div>
                    </td>
                    <td className={`whitespace-nowrap text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 ${tdPadding}`}>
                      {row.totalBags.toLocaleString()}
                    </td>
                    <td className={`whitespace-nowrap text-right font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300 ${tdPadding}`}>
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
                      <button
                        type="button"
                        onClick={() => setSelectedChallanDetail(row)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 cursor-pointer"
                        title="View Individual Lot Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>VIEW LOTS</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {paginatedRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700 text-xs select-none">
                <tr>
                  <td colSpan={6} className={`${tdPadding} font-sans uppercase tracking-wider`}>
                    TOTAL ({filteredChallans.length} Batches)
                  </td>
                  <td className={`${tdPadding} text-right text-emerald-700 dark:text-emerald-400 font-black`}>
                    {totalBags.toLocaleString()} Bags
                  </td>
                  <td className={`${tdPadding} text-right text-sky-700 dark:text-sky-400 font-black`}>
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

      {/* Detail Modal for inspecting lots under a Challan */}
      {selectedChallanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    CHALLAN: {selectedChallanDetail.kblChallanNo}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedChallanDetail.date} • {selectedChallanDetail.storageName} • {selectedChallanDetail.totalBags} Bags ({selectedChallanDetail.totalMt.toFixed(2)} MT)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChallanDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-slate-100 dark:bg-slate-850 dark:text-white font-bold border-b border-slate-900 select-none">
                  <tr className="text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-2">SR No</th>
                    <th className="p-2">Variety</th>
                    <th className="p-2">Class</th>
                    <th className="p-2">Grade</th>
                    <th className="p-2 text-right">Bags</th>
                    <th className="p-2 text-right">Kg/Bag</th>
                    <th className="p-2 text-right">Total Kg</th>
                    <th className="p-2 text-right">Total MT</th>
                    <th className="p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {selectedChallanDetail.lots.map((lot, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-bold text-slate-900 dark:text-slate-100">{lot.srNo}</td>
                      <td className="p-2 font-sans">{lot.varietyName}</td>
                      <td className="p-2 font-sans text-slate-500">{lot.className}</td>
                      <td className="p-2 font-sans">{lot.gradeName}</td>
                      <td className="p-2 text-right font-black text-emerald-600">{lot.sackQuantity}</td>
                      <td className="p-2 text-right text-slate-500">{lot.kgPerBag}</td>
                      <td className="p-2 text-right">{lot.totalKg.toLocaleString()}</td>
                      <td className="p-2 text-right font-bold text-sky-600">{lot.totalMt.toFixed(2)}</td>
                      <td className="p-2 font-sans text-slate-400">{lot.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedChallanDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        documentTitle="KBL DELIVERY CHALLAN WISE REPORT"
        subtitle={`Consignor challan breakdown and gate consignment registry (${companySettings.fiscalYear || '2024-2025'})`}
        columns={exportColumns.slice(0, 10)}
        data={sortedRows.map((r) => ({
          ...r,
          varietiesList: r.varietiesList.join(', '),
          classesList: r.classesList.join(', '),
          gradesList: r.gradesList.join(', '),
        }))}
        summaryItems={[
          { label: 'Total Challans', value: `${filteredChallans.length}` },
          { label: 'Total Bags', value: `${totalBags.toLocaleString()} Bags` },
          { label: 'Total MT', value: `${totalMt.toFixed(2)} MT` },
          { label: 'Vehicles Engaged', value: `${uniqueTrucks}` },
        ]}
        filename="KBL_Delivery_Challan_Report_2024"
        orientation="l"
      />
    </div>
  );
};
