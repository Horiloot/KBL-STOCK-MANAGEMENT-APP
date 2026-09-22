import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  Truck,
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
  Building2,
  CheckCircle2,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { exportToExcel, exportToPdf, validateAndTriggerPrint } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';

export const StockOutAllRecordsView: React.FC = () => {
  const {
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
  const [selectedClient, setSelectedClient] = useState('');
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
    setSelectedClient('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Distinct clients for filter dropdown
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    deliveryTransactions.forEach((d) => {
      const client = d.customerReceiver || d.clientReceiver;
      if (client) set.add(client);
    });
    return Array.from(set).sort();
  }, [deliveryTransactions]);

  // Filtered Delivery transactions
  const filteredDeliveries = useMemo(() => {
    return deliveryTransactions.filter((d) => {
      if (startDate && d.date < startDate) return false;
      if (endDate && d.date > endDate) return false;
      if (selectedStorage && d.coldStorageId !== selectedStorage) return false;
      if (selectedVariety && d.varietyId !== selectedVariety) return false;
      if (selectedClass && d.classId !== selectedClass) return false;
      if (selectedGrade && d.gradeId !== selectedGrade) return false;

      const client = d.customerReceiver || d.clientReceiver || '';
      if (selectedClient && client !== selectedClient) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const delNo = (d.deliveryNo || '').toLowerCase();
        const sr = (d.srNo || '').toLowerCase();
        const doNum = (d.doNumber || d.deliveryReference || '').toLowerCase();
        const dest = (d.destination || '').toLowerCase();
        const vehicle = (d.vehicleNo || '').toLowerCase();
        const driver = (d.driverName || '').toLowerCase();
        const remarks = (d.remarks || '').toLowerCase();

        const storageName = (coldStorages.find((c) => c.id === d.coldStorageId)?.name || '').toLowerCase();
        const varietyName = (varieties.find((v) => v.id === d.varietyId)?.name || '').toLowerCase();

        if (
          !delNo.includes(q) &&
          !sr.includes(q) &&
          !doNum.includes(q) &&
          !client.toLowerCase().includes(q) &&
          !dest.includes(q) &&
          !vehicle.includes(q) &&
          !driver.includes(q) &&
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
    deliveryTransactions,
    startDate,
    endDate,
    selectedStorage,
    selectedVariety,
    selectedClass,
    selectedGrade,
    selectedClient,
    searchQuery,
    coldStorages,
    varieties,
  ]);

  // Overall KPIs
  const totalBags = filteredDeliveries.reduce((acc, d) => acc + d.sackQuantity, 0);
  const totalKg = filteredDeliveries.reduce((acc, d) => acc + d.totalKg, 0);
  const totalMt = filteredDeliveries.reduce((acc, d) => acc + d.totalMt, 0);
  const avgBagsPerOrder = filteredDeliveries.length > 0 ? (totalBags / filteredDeliveries.length).toFixed(0) : '0';
  const activeClientsCount = new Set(filteredDeliveries.map((d) => d.customerReceiver || d.clientReceiver)).size;
  const activeStoragesCount = new Set(filteredDeliveries.map((d) => d.coldStorageId)).size;

  // Formatted Rows for Table & Export
  const formattedRows = useMemo(() => {
    return filteredDeliveries.map((d) => {
      const storage = coldStorages.find((c) => c.id === d.coldStorageId)?.name || d.coldStorageId;
      const variety = varieties.find((v) => v.id === d.varietyId)?.name || d.varietyId;
      const seedClass = seedClasses.find((c) => c.id === d.classId)?.name || d.classId;
      const grade = grades.find((g) => g.id === d.gradeId)?.name || d.gradeId;

      return {
        id: d.id,
        date: d.date,
        deliveryNo: d.deliveryNo,
        srNo: d.srNo || '-',
        doNumber: d.doNumber || d.deliveryReference || '-',
        clientReceiver: d.customerReceiver || d.clientReceiver || '-',
        destination: d.destination || '-',
        storage,
        variety,
        class: seedClass,
        grade,
        sackQuantity: d.sackQuantity,
        kgPerBag: d.kgPerBag,
        totalKg: d.totalKg,
        totalMt: d.totalMt,
        vehicleNo: d.vehicleNo || '-',
        driverName: d.driverName || '-',
        remarks: d.remarks || '-',
        status: d.status || 'delivered',
      };
    });
  }, [filteredDeliveries, coldStorages, varieties, seedClasses, grades]);

  const sortedRows = useMemo(() => {
    return sortData(formattedRows, sortKey, sortDir);
  }, [formattedRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const exportColumns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Delivery No', key: 'deliveryNo', width: 16 },
    { header: 'SR No', key: 'srNo', width: 14 },
    { header: 'Client Receiver', key: 'clientReceiver', width: 22 },
    { header: 'Destination', key: 'destination', width: 18 },
    { header: 'Cold Storage', key: 'storage', width: 20 },
    { header: 'Variety', key: 'variety', width: 16 },
    { header: 'Class', key: 'class', width: 14 },
    { header: 'Grade', key: 'grade', width: 14 },
    { header: 'Bags Out', key: 'sackQuantity', width: 12 },
    { header: 'Total Kg', key: 'totalKg', width: 14 },
    { header: 'Total MT', key: 'totalMt', width: 12 },
    { header: 'Vehicle No', key: 'vehicleNo', width: 15 },
    { header: 'Driver', key: 'driverName', width: 16 },
  ];

  const handleExportExcel = () => {
    exportToExcel(
      sortedRows,
      exportColumns,
      `STOCK_OUT_ALL_RECORDS_${new Date().toISOString().split('T')[0]}`,
      'STOCK OUT ALL RECORDS - DISPATCH & DELIVERY REPORT',
      companySettings,
      'Season 2024'
    );
    addToast('Stock Outbound records exported to Excel!', 'success');
  };

  const handleExportPdf = () => {
    exportToPdf(
      sortedRows,
      exportColumns.slice(0, 11),
      `STOCK_OUT_ALL_RECORDS_${new Date().toISOString().split('T')[0]}`,
      'STOCK OUT ALL RECORDS - DISPATCH REPORT',
      companySettings,
      'l',
      'Season 2024'
    );
    addToast('Stock Outbound records exported to PDF!', 'success');
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
            <div className="w-1.5 h-4.5 bg-amber-500 rounded-xs" />
            <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
              STOCK OUT ALL RECORDS
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {filteredDeliveries.length} Dispatches
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete outbound dispatches, client consignments, gate passes, and cold storage withdrawals
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL STOCK OUT</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalBags.toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
            Delivered Sacks
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">WEIGHT (MT)</span>
            <Scale className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalMt.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {(totalKg / 1000).toFixed(1)} Metric Tons
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DISPATCH ORDERS</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredDeliveries.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Consignment Gate Passes
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CLIENTS</span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {activeClientsCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Receiving Entities
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AVG / DISPATCH</span>
            <Scale className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {avgBagsPerOrder}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Bags per Truck Order
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">STORAGES</span>
            <Warehouse className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {activeStoragesCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Dispatch Points
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
          {(searchQuery || selectedStorage || selectedVariety || selectedClass || selectedGrade || selectedClient || startDate || endDate) && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {/* Universal Search */}
          <div className="relative xl:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Delivery No, Client, Vehicle, Dest..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Client Receiver */}
          <div>
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Client Receivers</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
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
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Dispatch Date Range:
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

          {/* Quick Date Presets */}
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
                  onClick={() => handleSort('deliveryNo')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Delivery No {renderSortIndicator('deliveryNo')}
                </th>
                <th
                  onClick={() => handleSort('clientReceiver')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Client Receiver {renderSortIndicator('clientReceiver')}
                </th>
                <th
                  onClick={() => handleSort('destination')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Destination {renderSortIndicator('destination')}
                </th>
                <th
                  onClick={() => handleSort('storage')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  From Storage {renderSortIndicator('storage')}
                </th>
                <th
                  onClick={() => handleSort('variety')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Variety {renderSortIndicator('variety')}
                </th>
                <th
                  onClick={() => handleSort('class')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Class {renderSortIndicator('class')}
                </th>
                <th
                  onClick={() => handleSort('grade')}
                  className="py-2.5 px-3 cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Grade {renderSortIndicator('grade')}
                </th>
                <th
                  onClick={() => handleSort('sackQuantity')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Bags Out {renderSortIndicator('sackQuantity')}
                </th>
                <th
                  onClick={() => handleSort('kgPerBag')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Kg/Bag {renderSortIndicator('kgPerBag')}
                </th>
                <th
                  onClick={() => handleSort('totalKg')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Total Kg {renderSortIndicator('totalKg')}
                </th>
                <th
                  onClick={() => handleSort('totalMt')}
                  className="py-2.5 px-3 text-right cursor-pointer group hover:text-sky-600 transition-colors"
                >
                  Total MT {renderSortIndicator('totalMt')}
                </th>
                <th className="py-2.5 px-3">Vehicle & Driver</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 font-mono ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-sans">
                    <Truck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      No stock outbound delivery records found matching the filters
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
                    <td className="whitespace-nowrap font-bold text-amber-700 dark:text-amber-400">
                      {row.deliveryNo}
                    </td>
                    <td className="font-sans whitespace-nowrap font-semibold text-slate-900 dark:text-slate-100">
                      {row.clientReceiver}
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{row.destination}</span>
                      </div>
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                      {row.storage}
                    </td>
                    <td className="font-sans whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        {row.variety}
                      </span>
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {row.class}
                    </td>
                    <td className="font-sans whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {row.grade}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right font-black text-amber-700 dark:text-amber-400">
                      {row.sackQuantity.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right text-slate-600 dark:text-slate-400">
                      {row.kgPerBag}
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold text-slate-700 dark:text-slate-300">
                      {row.totalKg.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap text-right font-bold text-sky-700 dark:text-sky-400">
                      {row.totalMt.toFixed(2)}
                    </td>
                    <td className="font-sans whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px]">
                      <div>{row.vehicleNo}</div>
                      <div className="text-[10px] text-slate-400">{row.driverName}</div>
                    </td>
                    <td className="whitespace-nowrap text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5" />
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
                  <td colSpan={8} className="py-2.5 px-3 font-sans uppercase tracking-wider">
                    FILTERED OUTBOUND TOTAL ({filteredDeliveries.length} Dispatches)
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-700 dark:text-amber-400 font-black">
                    {totalBags.toLocaleString()} Bags
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    avg {(totalKg / (totalBags || 1)).toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {totalKg.toLocaleString()} Kg
                  </td>
                  <td className="py-2.5 px-3 text-right text-sky-700 dark:text-sky-400 font-black">
                    {totalMt.toFixed(2)} MT
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
        documentTitle="STOCK OUT ALL RECORDS - DISPATCH REGISTER"
        subtitle={`Outbound client deliveries and gate dispatches (${companySettings.fiscalYear || '2024-2025'})`}
        columns={exportColumns.slice(0, 11)}
        data={sortedRows}
        summaryItems={[
          { label: 'Total Dispatched Bags', value: `${totalBags.toLocaleString()} Bags` },
          { label: 'Total Dispatched MT', value: `${totalMt.toFixed(2)} MT` },
          { label: 'Filtered Dispatches', value: `${filteredDeliveries.length}` },
          { label: 'Active Clients', value: `${activeClientsCount}` },
        ]}
        filename="Stock_Out_All_Records_2024"
        orientation="l"
      />
    </div>
  );
};
