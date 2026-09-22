import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  GitCompare,
  Boxes,
  Truck,
  Scale,
  Search,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Warehouse,
  Sprout,
  TrendingUp,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';
import { DateRangePicker } from '../common/DateRangePicker';

export interface InOutStockRecord {
  id: string;
  sourceId: string;
  movementType: 'IN' | 'OUT';
  date: string;
  voucherNo: string;
  srNo: string;
  storageId: string;
  storageName: string;
  varietyId: string;
  varietyName: string;
  varietyCode: string;
  classId: string;
  className: string;
  gradeId: string;
  gradeName: string;
  inBags: number;
  outBags: number;
  kgPerBag: number;
  movementKg: number;
  movementMt: number;
  runningBalanceBags?: number;
  partyName: string;
  partyRole: 'Grower' | 'Receiver';
  vehicleNo: string;
  driverName: string;
  status: string;
}

export const InOutStockAllRecordsView: React.FC = () => {
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
  const [selectedType, setSelectedType] = useState<'all' | 'IN' | 'OUT'>('all');
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
    setSelectedType('all');
    setSelectedStorage('');
    setSelectedVariety('');
    setSelectedClass('');
    setSelectedGrade('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // 1. Combine All IN and OUT transactions into a unified flat records list
  const combinedRecords = useMemo<InOutStockRecord[]>(() => {
    const list: InOutStockRecord[] = [];

    // Map Inbound (Stock In)
    stockTransactions.forEach((s) => {
      if (s.status && s.status !== 'approved') return;

      const storageObj = coldStorages.find((c) => c.id === s.coldStorageId);
      const varietyObj = varieties.find((v) => v.id === s.varietyId);
      const classObj = seedClasses.find((c) => c.id === s.classId);
      const gradeObj = grades.find((g) => g.id === s.gradeId);

      list.push({
        id: `IN-${s.id}`,
        sourceId: s.id,
        movementType: 'IN',
        date: s.date,
        voucherNo: s.kblChallanNo || s.transactionNo,
        srNo: s.srNo || '-',
        storageId: s.coldStorageId,
        storageName: storageObj?.name || 'Cold Storage',
        varietyId: s.varietyId,
        varietyName: varietyObj?.name || 'Potato',
        varietyCode: varietyObj?.code || '',
        classId: s.classId || '',
        className: classObj?.name || '-',
        gradeId: s.gradeId || '',
        gradeName: gradeObj?.name || '-',
        inBags: s.sackQuantity,
        outBags: 0,
        kgPerBag: s.kgPerBag,
        movementKg: s.totalKg,
        movementMt: s.totalMt,
        partyName: s.growerFarmerName || 'Inward Grower',
        partyRole: 'Grower',
        vehicleNo: s.truckNo || '-',
        driverName: s.driverName || '-',
        status: s.status || 'approved',
      });
    });

    // Map Outbound (Stock Out / Delivery)
    deliveryTransactions.forEach((d) => {
      const storageObj = coldStorages.find((c) => c.id === d.coldStorageId);
      const varietyObj = varieties.find((v) => v.id === d.varietyId);
      const classObj = seedClasses.find((c) => c.id === d.classId);
      const gradeObj = grades.find((g) => g.id === d.gradeId);

      list.push({
        id: `OUT-${d.id}`,
        sourceId: d.id,
        movementType: 'OUT',
        date: d.date,
        voucherNo: d.deliveryNo,
        srNo: d.deliveryReference || '-',
        storageId: d.coldStorageId,
        storageName: storageObj?.name || 'Cold Storage',
        varietyId: d.varietyId,
        varietyName: varietyObj?.name || 'Potato',
        varietyCode: varietyObj?.code || '',
        classId: d.classId || '',
        className: classObj?.name || '-',
        gradeId: d.gradeId || '',
        gradeName: gradeObj?.name || '-',
        inBags: 0,
        outBags: d.sackQuantity,
        kgPerBag: d.kgPerBag,
        movementKg: d.totalKg,
        movementMt: d.totalMt,
        partyName: d.customerReceiver || 'Delivery Receiver',
        partyRole: 'Receiver',
        vehicleNo: d.vehicleNo || '-',
        driverName: d.driverName || '-',
        status: d.status || 'delivered',
      });
    });

    // Sort chronologically ascending to calculate running balance accurately
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      // In first on the same date
      if (a.movementType !== b.movementType) return a.movementType === 'IN' ? -1 : 1;
      return a.voucherNo.localeCompare(b.voucherNo);
    });

    // Calculate item-wise running balance
    const balanceTracker = new Map<string, number>();
    list.forEach((rec) => {
      const itemKey = `${rec.storageId}|${rec.varietyId}|${rec.classId}|${rec.gradeId}`;
      const prevBal = balanceTracker.get(itemKey) || 0;
      const newBal = prevBal + rec.inBags - rec.outBags;
      balanceTracker.set(itemKey, newBal);
      rec.runningBalanceBags = newBal;
    });

    return list;
  }, [stockTransactions, deliveryTransactions, coldStorages, varieties, seedClasses, grades]);

  // 2. Filter records
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return combinedRecords.filter((r) => {
      if (selectedType !== 'all' && r.movementType !== selectedType) return false;
      if (selectedStorage && r.storageId !== selectedStorage) return false;
      if (selectedVariety && r.varietyId !== selectedVariety) return false;
      if (selectedClass && r.classId !== selectedClass) return false;
      if (selectedGrade && r.gradeId !== selectedGrade) return false;
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      if (q) {
        const match =
          r.voucherNo.toLowerCase().includes(q) ||
          r.srNo.toLowerCase().includes(q) ||
          r.storageName.toLowerCase().includes(q) ||
          r.varietyName.toLowerCase().includes(q) ||
          r.varietyCode.toLowerCase().includes(q) ||
          r.className.toLowerCase().includes(q) ||
          r.gradeName.toLowerCase().includes(q) ||
          r.partyName.toLowerCase().includes(q) ||
          r.vehicleNo.toLowerCase().includes(q) ||
          r.driverName.toLowerCase().includes(q) ||
          r.date.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    combinedRecords,
    selectedType,
    selectedStorage,
    selectedVariety,
    selectedClass,
    selectedGrade,
    startDate,
    endDate,
    searchQuery,
  ]);

  // 3. Overall Totals & Metrics
  const summaryMetrics = useMemo(() => {
    let totalInBags = 0;
    let totalInMt = 0;
    let inCount = 0;

    let totalOutBags = 0;
    let totalOutMt = 0;
    let outCount = 0;

    filteredRows.forEach((r) => {
      if (r.movementType === 'IN') {
        totalInBags += r.inBags;
        totalInMt += r.movementMt;
        inCount += 1;
      } else {
        totalOutBags += r.outBags;
        totalOutMt += r.movementMt;
        outCount += 1;
      }
    });

    const netBalanceBags = totalInBags - totalOutBags;
    const netBalanceMt = Number((totalInMt - totalOutMt).toFixed(3));
    const dispatchPercentage = totalInBags > 0 ? (totalOutBags / totalInBags) * 100 : 0;

    return {
      totalInBags,
      totalInMt: Number(totalInMt.toFixed(3)),
      inCount,
      totalOutBags,
      totalOutMt: Number(totalOutMt.toFixed(3)),
      outCount,
      netBalanceBags,
      netBalanceMt,
      dispatchPercentage: Number(dispatchPercentage.toFixed(1)),
      totalRecords: filteredRows.length,
    };
  }, [filteredRows]);

  // 4. Sort rows
  const sortedRows = useMemo(() => {
    return sortData(filteredRows, sortKey, sortDir);
  }, [filteredRows, sortKey, sortDir]);

  // 5. Paginate rows
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // Export handlers
  const exportColumns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Type', key: 'movementType', width: 10 },
    { header: 'Challan / Delivery No', key: 'voucherNo', width: 22 },
    { header: 'SR / Ref No', key: 'srNo', width: 16 },
    { header: 'Cold Storage', key: 'storageName', width: 22 },
    { header: 'Variety', key: 'varietyName', width: 16 },
    { header: 'Class', key: 'className', width: 12 },
    { header: 'Grade', key: 'gradeName', width: 12 },
    { header: 'In Bags', key: 'inBags', width: 12 },
    { header: 'Out Bags', key: 'outBags', width: 12 },
    { header: 'Net MT', key: 'movementMt', width: 12 },
    { header: 'Balance Bags', key: 'runningBalanceBags', width: 14 },
    { header: 'Party / Client', key: 'partyName', width: 22 },
    { header: 'Vehicle No', key: 'vehicleNo', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  const handleExportExcel = () => {
    const dataToExport = sortedRows.map((r) => ({
      date: r.date,
      movementType: r.movementType === 'IN' ? 'STOCK IN' : 'STOCK OUT',
      voucherNo: r.voucherNo,
      srNo: r.srNo,
      storageName: r.storageName,
      varietyName: r.varietyName,
      className: r.className,
      gradeName: r.gradeName,
      inBags: r.inBags || 0,
      outBags: r.outBags || 0,
      movementMt: r.movementMt,
      runningBalanceBags: r.runningBalanceBags ?? 0,
      partyName: `${r.partyName} (${r.partyRole})`,
      vehicleNo: r.vehicleNo,
      status: r.status.toUpperCase(),
    }));

    exportToExcel(
      dataToExport,
      exportColumns,
      `InOut_Stock_All_Records_${new Date().toISOString().split('T')[0]}`,
      'All Movement Records'
    );

    if (addToast) {
      addToast('Exported In, Out & Stock All Records to Excel', 'success');
    }
  };

  const handleExportPdf = () => {
    setIsPreviewOpen(true);
  };

  const thPadding = density === 'compact' ? 'py-1 px-2.5 text-[10.5px]' : density === 'comfortable' ? 'py-2.5 px-3.5 text-xs' : 'py-1.5 px-3 text-[11px]';
  const tdPadding = density === 'compact' ? 'py-1 px-2.5 text-[11px]' : density === 'comfortable' ? 'py-2.5 px-3.5 text-xs' : 'py-1.5 px-3 text-xs';

  const renderSortIndicator = (key: string) => {
    if (sortKey !== key) {
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
      {/* Top Header & Action Controls */}
      <div className="flex items-center justify-between gap-3 pt-0.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4.5 bg-indigo-500 rounded-xs" />
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            IN, OUT & STOCK ALL RECORDS
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {filteredRows.length} Records
          </span>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Density Switcher */}
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

          {/* Unified Print & Export Button Group */}
          <ReportButtonGroup
            onPrint={() => setIsPreviewOpen(true)}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Total Inbound */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              TOTAL STOCK IN
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {summaryMetrics.inCount} IN
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {summaryMetrics.totalInBags.toLocaleString()}
            </div>
            <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {summaryMetrics.totalInMt.toLocaleString()} MT
            </div>
          </div>
        </div>

        {/* Total Outbound */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
              TOTAL STOCK OUT
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              {summaryMetrics.outCount} OUT
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {summaryMetrics.totalOutBags.toLocaleString()}
            </div>
            <div className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {summaryMetrics.totalOutMt.toLocaleString()} MT
            </div>
          </div>
        </div>

        {/* Net Current Balance */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-sky-600" />
              CLOSING BALANCE
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black font-mono text-sky-700 dark:text-sky-300 tabular-nums">
              {summaryMetrics.netBalanceBags.toLocaleString()}
            </div>
            <div className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
              {summaryMetrics.netBalanceMt.toLocaleString()} MT
            </div>
          </div>
        </div>

        {/* Turnover & Total Activity */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              TURNOVER RATE
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {summaryMetrics.totalRecords} MOVS
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {summaryMetrics.dispatchPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Query Panel */}
      <div className="bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>FILTERS</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer uppercase"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>
        </div>

        {/* Filter inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Universal Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search challan, delivery, SR, party, vehicle..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Movement Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
            >
              <option value="all">ALL MOVEMENTS (IN & OUT)</option>
              <option value="IN">STOCK IN ONLY (RECEIPTS)</option>
              <option value="OUT">STOCK OUT ONLY (DISPATCH)</option>
            </select>
          </div>

          {/* Cold Storage */}
          <div>
            <select
              value={selectedStorage}
              onChange={(e) => {
                setSelectedStorage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">ALL COLD STORAGES</option>
              {coldStorages.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">ALL VARIETIES</option>
              {varieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">ALL GRADES</option>
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
            label="Transaction Period:"
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
          <table className="w-full text-left border-collapse min-w-[1280px]">
            <thead className="bg-slate-800 text-slate-100 dark:bg-slate-850 dark:text-white font-bold border-b-2 border-slate-900 dark:border-slate-700 select-none">
              <tr>
                <th className={`${thPadding} w-10 text-center font-semibold uppercase tracking-wider text-slate-100 dark:text-white`}>#</th>
                <th
                  onClick={() => handleSort('date')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Date {renderSortIndicator('date')}
                </th>
                <th
                  onClick={() => handleSort('movementType')}
                  className={`${thPadding} text-center font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Type {renderSortIndicator('movementType')}
                </th>
                <th
                  onClick={() => handleSort('voucherNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Challan / Delivery No {renderSortIndicator('voucherNo')}
                </th>
                <th
                  onClick={() => handleSort('srNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  SR / Ref No {renderSortIndicator('srNo')}
                </th>
                <th
                  onClick={() => handleSort('storageName')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Cold Storage {renderSortIndicator('storageName')}
                </th>
                <th
                  onClick={() => handleSort('varietyName')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Variety {renderSortIndicator('varietyName')}
                </th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white whitespace-nowrap`}>Class</th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white whitespace-nowrap`}>Grade</th>
                <th
                  onClick={() => handleSort('inBags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  In Bags {renderSortIndicator('inBags')}
                </th>
                <th
                  onClick={() => handleSort('outBags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Out Bags {renderSortIndicator('outBags')}
                </th>
                <th
                  onClick={() => handleSort('movementMt')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Net MT {renderSortIndicator('movementMt')}
                </th>
                <th
                  onClick={() => handleSort('runningBalanceBags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap select-none`}
                >
                  Balance Bags {renderSortIndicator('runningBalanceBags')}
                </th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white whitespace-nowrap`}>Party / Client</th>
                <th className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white whitespace-nowrap`}>Vehicle & Driver</th>
                <th className={`${thPadding} text-center font-semibold uppercase tracking-wider text-slate-100 dark:text-white whitespace-nowrap`}>Status</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400 font-sans">
                    <Boxes className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      No inbound or outbound transaction records found matching the criteria
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => {
                  const serialNumber = (currentPage - 1) * pageSize + index + 1;
                  const isIn = row.movementType === 'IN';

                  return (
                    <tr
                      key={row.id}
                      className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                    >
                      {/* Serial Number */}
                      <td className={`${tdPadding} text-center font-mono text-[11px] text-slate-400`}>
                        {serialNumber}
                      </td>

                      {/* Date */}
                      <td className={`${tdPadding} font-mono whitespace-nowrap text-slate-700 dark:text-slate-300`}>
                        {row.date}
                      </td>

                      {/* Movement Type Badge */}
                      <td className={`${tdPadding} text-center whitespace-nowrap`}>
                        {isIn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            <ArrowDownLeft className="w-3 h-3" />
                            STOCK IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            <ArrowUpRight className="w-3 h-3" />
                            STOCK OUT
                          </span>
                        )}
                      </td>

                      {/* Voucher / Challan / Delivery No */}
                      <td className={`${tdPadding} font-mono font-bold whitespace-nowrap text-sky-700 dark:text-sky-400`}>
                        {row.voucherNo}
                      </td>

                      {/* SR / Ref No */}
                      <td className={`${tdPadding} font-mono font-medium whitespace-nowrap text-slate-800 dark:text-slate-200`}>
                        {row.srNo}
                      </td>

                      {/* Cold Storage */}
                      <td className={`${tdPadding} font-sans font-medium whitespace-nowrap text-slate-900 dark:text-white`}>
                        {row.storageName}
                      </td>

                      {/* Variety */}
                      <td className={`${tdPadding} font-sans font-bold text-sky-800 dark:text-sky-300 whitespace-nowrap`}>
                        {row.varietyName}
                      </td>

                      {/* Class */}
                      <td className={`${tdPadding} font-sans text-xs whitespace-nowrap text-slate-600 dark:text-slate-400`}>
                        {row.className}
                      </td>

                      {/* Grade */}
                      <td className={`${tdPadding} font-sans text-xs whitespace-nowrap font-medium text-slate-700 dark:text-slate-300`}>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {row.gradeName}
                        </span>
                      </td>

                      {/* In Bags */}
                      <td className={`${tdPadding} text-right font-mono tabular-nums font-bold whitespace-nowrap text-emerald-600 dark:text-emerald-400`}>
                        {row.inBags > 0 ? row.inBags.toLocaleString() : '-'}
                      </td>

                      {/* Out Bags */}
                      <td className={`${tdPadding} text-right font-mono tabular-nums font-bold whitespace-nowrap text-amber-600 dark:text-amber-400`}>
                        {row.outBags > 0 ? row.outBags.toLocaleString() : '-'}
                      </td>

                      {/* Net MT */}
                      <td className={`${tdPadding} text-right font-mono tabular-nums font-semibold whitespace-nowrap text-slate-900 dark:text-white`}>
                        {isIn ? `+${row.movementMt.toFixed(3)}` : `-${row.movementMt.toFixed(3)}`}
                      </td>

                      {/* Running Balance Bags */}
                      <td className={`${tdPadding} text-right font-mono tabular-nums font-bold whitespace-nowrap text-sky-600 dark:text-sky-300`}>
                        {(row.runningBalanceBags ?? 0).toLocaleString()}
                      </td>

                      {/* Party / Client */}
                      <td className={`${tdPadding} font-sans whitespace-nowrap text-slate-700 dark:text-slate-300`}>
                        <div className="font-semibold text-xs leading-tight">{row.partyName}</div>
                      </td>

                      {/* Vehicle & Driver */}
                      <td className={`${tdPadding} font-sans whitespace-nowrap text-slate-600 dark:text-slate-400 text-xs`}>
                        <div className="font-mono text-slate-700 dark:text-slate-300">{row.vehicleNo}</div>
                        {row.driverName !== '-' && (
                          <div className="text-[10px] text-slate-400">{row.driverName}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className={`${tdPadding} text-center whitespace-nowrap`}>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Prominent Footer Subtotals Summary Row */}
            {sortedRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs select-none">
                <tr>
                  <td colSpan={9} className={`${tdPadding} uppercase tracking-wider`}>
                    TOTAL ({sortedRows.length} MOVEMENTS):
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap`}>
                    +{summaryMetrics.totalInBags.toLocaleString()} Bags
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums whitespace-nowrap`}>
                    -{summaryMetrics.totalOutBags.toLocaleString()} Bags
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-black text-sky-700 dark:text-sky-300 tabular-nums whitespace-nowrap`}>
                    {summaryMetrics.netBalanceMt >= 0 ? `+${summaryMetrics.netBalanceMt}` : summaryMetrics.netBalanceMt} MT
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-black text-sky-700 dark:text-sky-300 tabular-nums whitespace-nowrap`}>
                    {summaryMetrics.netBalanceBags.toLocaleString()} Bal
                  </td>
                  <td colSpan={3} className={`${tdPadding} text-left text-[11px] font-sans text-slate-500 font-normal`}>
                    Turnover: {summaryMetrics.dispatchPercentage}% Dispatched
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={sortedRows.length}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Print Preview & PDF Modal */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        documentTitle="IN, OUT & STOCK ALL RECORDS - COMPLETE TRANSACTION LEDGER"
        subtitle={`Period: ${startDate || 'All Time'} to ${endDate || 'Present'} • Total Movements: ${sortedRows.length}`}
        columns={exportColumns}
        data={sortedRows}
        summaryItems={[
          { label: 'Total Inbound Bags', value: `${summaryMetrics.totalInBags.toLocaleString()} Bags (${summaryMetrics.totalInMt} MT)` },
          { label: 'Total Outbound Bags', value: `${summaryMetrics.totalOutBags.toLocaleString()} Bags (${summaryMetrics.totalOutMt} MT)` },
          { label: 'Net Balance Bags', value: `${summaryMetrics.netBalanceBags.toLocaleString()} Bags (${summaryMetrics.netBalanceMt} MT)` },
          { label: 'Movement Ratio', value: `${summaryMetrics.dispatchPercentage}% Dispatched` },
        ]}
        filename="In_Out_Stock_All_Records"
        orientation="l"
      />
    </div>
  );
};
