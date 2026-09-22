import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  TrendingDown,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Boxes,
  Weight,
  Scale,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';

export const DeliveryReportView: React.FC = () => {
  const {
    deliveryTransactions,
    coldStorages,
    varieties,
    seedClasses,
    grades,
    companySettings,
  } = useApp();

  const [density, setDensity] = useState<TableDensity>('comfortable');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedStorage, setSelectedStorage] = useState('');
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

  // Filtered deliveries
  const filteredData = useMemo(() => {
    return deliveryTransactions.filter((d) => {
      if (d.date < startDate || d.date > endDate) return false;
      if (selectedStorage && d.coldStorageId !== selectedStorage) return false;
      return true;
    });
  }, [deliveryTransactions, startDate, endDate, selectedStorage]);

  const totalBags = filteredData.reduce((acc, d) => acc + d.sackQuantity, 0);
  const totalKg = filteredData.reduce((acc, d) => acc + d.totalKg, 0);
  const totalMt = filteredData.reduce((acc, d) => acc + d.totalMt, 0);

  const formattedRows = useMemo(() => {
    return filteredData.map((d) => {
      const storage = coldStorages.find((c) => c.id === d.coldStorageId)?.name || d.coldStorageId;
      const variety = varieties.find((v) => v.id === d.varietyId)?.name || d.varietyId;
      const seedClass = seedClasses.find((c) => c.id === d.classId)?.name || d.classId;
      const grade = grades.find((g) => g.id === d.gradeId)?.name || d.gradeId;

      return {
        id: d.id,
        date: d.date,
        deliveryNo: d.deliveryNo,
        reference: d.deliveryReference || d.doNumber || '-',
        storage,
        client: d.customerReceiver || d.clientReceiver || '-',
        destination: d.destination || '-',
        variety,
        class: seedClass,
        grade,
        bags: d.sackQuantity,
        kgPerBag: d.kgPerBag,
        totalKg: d.totalKg,
        totalMt: d.totalMt,
        vehicle: d.vehicleNo || '-',
        driver: d.driverName || '-',
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
    { header: 'Delivery No (DO)', key: 'deliveryNo', width: 16 },
    { header: 'Reference', key: 'reference', width: 14 },
    { header: 'From Cold Storage', key: 'storage', width: 24 },
    { header: 'Customer / Receiver', key: 'client', width: 24 },
    { header: 'Destination', key: 'destination', width: 18 },
    { header: 'Variety', key: 'variety', width: 16 },
    { header: 'Class', key: 'class', width: 14 },
    { header: 'Grade', key: 'grade', width: 18 },
    { header: 'Bags', key: 'bags', width: 12 },
    { header: 'KG/Bag', key: 'kgPerBag', width: 10 },
    { header: 'Total KG', key: 'totalKg', width: 14 },
    { header: 'Total MT', key: 'totalMt', width: 14 },
    { header: 'Vehicle No', key: 'vehicle', width: 16 },
  ];

  const handleExcel = () => {
    exportToExcel(
      formattedRows,
      exportColumns,
      'Delivery_Dispatches_Report_2024',
      'Stock Out from Cold Storage Report',
      companySettings,
      `Date Range: ${startDate} to ${endDate}`
    );
  };

  const handlePdf = () => {
    exportToPdf(
      formattedRows,
      exportColumns,
      'Delivery_Dispatches_Report_2024',
      'Stock Out from Cold Storage Report',
      companySettings,
      'l',
      `Date Range: ${startDate} to ${endDate} | Total Orders: ${formattedRows.length}`
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

  const hasActiveFilters = startDate !== '2024-01-01' || endDate !== '2024-12-31' || selectedStorage !== '';

  const handleResetFilters = () => {
    setStartDate('2024-01-01');
    setEndDate('2024-12-31');
    setSelectedStorage('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-0.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4.5 bg-sky-500 rounded-xs" />
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            DELIVERY REPORT
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {filteredData.length} Dispatches
          </span>
        </div>

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

      {/* Filter Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs no-print">
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-sky-500" />
            <span className="uppercase tracking-wider text-[11px]">FILTER RECORDS</span>
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-sm bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                ACTIVE
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              From Cold Storage
            </label>
            <select
              value={selectedStorage}
              onChange={(e) => {
                setSelectedStorage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            >
              <option value="">All Facilities</option>
              {coldStorages.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.name} ({cs.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DISPATCH ORDERS</span>
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {filteredData.length}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL SACKS</span>
            <Boxes className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {totalBags.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL WEIGHT</span>
            <Weight className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">METRIC TONS</span>
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {totalMt.toFixed(2)} <span className="text-xs font-normal text-slate-500">MT</span>
          </div>
        </div>
      </div>

      {/* Tabular Records */}
      <div className="bg-white dark:bg-slate-900 border border-sky-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-800 text-slate-100 dark:bg-slate-850 dark:text-white font-bold border-b-2 border-slate-900 dark:border-slate-700 select-none">
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  DATE {renderSortIndicator('date')}
                </th>
                <th
                  onClick={() => handleSort('deliveryNo')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  DO NO {renderSortIndicator('deliveryNo')}
                </th>
                <th
                  onClick={() => handleSort('storage')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  FROM STORAGE {renderSortIndicator('storage')}
                </th>
                <th
                  onClick={() => handleSort('client')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  CUSTOMER {renderSortIndicator('client')}
                </th>
                <th
                  onClick={() => handleSort('destination')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  DESTINATION {renderSortIndicator('destination')}
                </th>
                <th
                  onClick={() => handleSort('variety')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  VARIETY {renderSortIndicator('variety')}
                </th>
                <th
                  onClick={() => handleSort('class')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  CLASS {renderSortIndicator('class')}
                </th>
                <th
                  onClick={() => handleSort('grade')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  GRADE {renderSortIndicator('grade')}
                </th>
                <th
                  onClick={() => handleSort('bags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  BAGS {renderSortIndicator('bags')}
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
                  onClick={() => handleSort('vehicle')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  TRANSPORT {renderSortIndicator('vehicle')}
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
                  <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                    No delivery records found matching specified filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr
                    key={r.id}
                    className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                  >
                    <td className={`font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap ${tdPadding}`}>
                      {r.date}
                    </td>
                    <td className={`font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap ${tdPadding}`}>
                      {r.deliveryNo}
                    </td>
                    <td className={`font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap ${tdPadding}`}>
                      {r.storage}
                    </td>
                    <td className={`font-semibold text-slate-900 dark:text-white whitespace-nowrap ${tdPadding}`}>
                      {r.client}
                    </td>
                    <td className={`text-slate-600 dark:text-slate-300 whitespace-nowrap ${tdPadding}`}>
                      {r.destination}
                    </td>
                    <td className={`font-bold text-slate-900 dark:text-white whitespace-nowrap ${tdPadding}`}>
                      {r.variety}
                    </td>
                    <td className={`text-slate-600 dark:text-slate-300 whitespace-nowrap ${tdPadding}`}>{r.class}</td>
                    <td className={`text-slate-600 dark:text-slate-300 whitespace-nowrap ${tdPadding}`}>{r.grade}</td>
                    <td className={`text-right font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums ${tdPadding}`}>
                      {r.bags.toLocaleString()}
                    </td>
                    <td className={`text-right font-medium text-slate-800 dark:text-slate-200 font-mono tabular-nums ${tdPadding}`}>
                      {r.totalKg.toLocaleString()}
                    </td>
                    <td className={`text-right font-bold text-slate-900 dark:text-white font-mono tabular-nums ${tdPadding}`}>
                      {r.totalMt.toFixed(2)}
                    </td>
                    <td className={`text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap ${tdPadding}`}>
                      {r.vehicle}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {formattedRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs select-none">
                <tr>
                  <td colSpan={8} className={`${tdPadding} text-right uppercase tracking-wider`}>
                    TOTAL DISPATCHED:
                  </td>
                  <td className={`${tdPadding} text-right font-mono text-amber-600 dark:text-amber-400 font-black`}>
                    {totalBags.toLocaleString()}
                  </td>
                  <td className={`${tdPadding} text-right font-mono font-black`}>
                    {totalKg.toLocaleString()}
                  </td>
                  <td className={`${tdPadding} text-right font-mono text-emerald-600 dark:text-emerald-400 font-black`}>
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

      {/* Print Preview Modal */}
      {isPreviewOpen && (
        <PrintPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentTitle="Stock Out from Cold Storage Report (Deliveries)"
          subtitle={`Report Period: ${startDate} to ${endDate} | Total Orders: ${formattedRows.length}`}
          columns={exportColumns}
          data={formattedRows}
          summaryItems={[
            { label: 'Dispatches Executed', value: formattedRows.length },
            { label: 'Total Sacks / Bags', value: totalBags.toLocaleString() },
            { label: 'Total Net KG', value: totalKg.toLocaleString() },
            { label: 'Total Metric Tons', value: `${totalMt.toFixed(2)} MT` },
          ]}
          filename="Delivery_Report_2024"
        />
      )}
    </div>
  );
};
