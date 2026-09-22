import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateRentSummary } from '../../utils/stockEngine';
import { exportToExcel, validateAndTriggerPrint } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { SortableHeader } from '../common/SortableHeader';
import { TablePagination } from '../common/TablePagination';
import {
  Receipt,
  FileSpreadsheet,
  Printer,
  Calendar,
  Percent,
} from 'lucide-react';

export const RentManagementView: React.FC = () => {
  const {
    coldStorages,
    stockTransactions,
    deliveryTransactions,
    companySettings,
    addToast,
  } = useApp();

  const [seasonStart] = useState('2024-03-01');
  const [seasonEnd] = useState('2024-11-30');
  const [discountPercent] = useState<number>(0);

  const [sortKey, setSortKey] = useState<string>('code');
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

  // Compute calculated rent items using stockEngine
  const rawRentItems = useMemo(() => {
    return calculateRentSummary(
      coldStorages,
      stockTransactions,
      deliveryTransactions,
      seasonStart,
      seasonEnd
    );
  }, [coldStorages, stockTransactions, deliveryTransactions, seasonStart, seasonEnd]);

  const sortedRentItems = useMemo(() => {
    return sortData(rawRentItems, sortKey, sortDir);
  }, [rawRentItems, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRentItems.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRentItems = sortedRentItems.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const totalBagsInbound = rawRentItems.reduce((acc, r) => acc + r.totalBags, 0);
  const totalBagsDelivered = rawRentItems.reduce((acc, r) => acc + r.deliveredBags, 0);
  const totalRemainingBags = rawRentItems.reduce((acc, r) => acc + r.remainingBags, 0);
  const subtotalRent = rawRentItems.reduce((acc, r) => acc + r.totalRent, 0);
  const discountAmount = (subtotalRent * discountPercent) / 100;
  const netPayable = subtotalRent - discountAmount;

  const handleExportExcel = () => {
    const exportData = sortedRentItems.map((item) => ({
      code: item.code,
      name: item.coldStorageName,
      totalBags: item.totalBags,
      deliveredBags: item.deliveredBags,
      remainingBags: item.remainingBags,
      rentPerBag: `${companySettings.currency} ${item.rentPerBag}`,
      storageDurationDays: item.storageDurationDays,
      totalRent: item.totalRent,
    }));

    exportToExcel(
      exportData,
      [
        { header: 'Code', key: 'code', width: 12 },
        { header: 'Cold Storage Facility', key: 'name', width: 28 },
        { header: 'Inbound Bags', key: 'totalBags', width: 14 },
        { header: 'Delivered Bags', key: 'deliveredBags', width: 14 },
        { header: 'Remaining Bags', key: 'remainingBags', width: 14 },
        { header: 'Rent / Bag', key: 'rentPerBag', width: 14 },
        { header: 'Duration (Days)', key: 'storageDurationDays', width: 14 },
        { header: 'Estimated Rent', key: 'totalRent', width: 18 },
      ],
      'Cold_Storage_Rent_Accrual_Report_2024',
      'Cold Storage Rent Accrual & Billing Calculation',
      companySettings,
      `Season: ${seasonStart} to ${seasonEnd}`
    );
  };

  const handlePrint = () => {
    if (rawRentItems.length === 0) {
      if (addToast) addToast('Rent dataset is empty.', 'error');
      return;
    }

    const printData = rawRentItems.map((item) => ({
      code: item.code,
      coldStorageName: item.coldStorageName,
      totalBags: item.totalBags.toLocaleString(),
      deliveredBags: item.deliveredBags.toLocaleString(),
      remainingBags: item.remainingBags.toLocaleString(),
      rentPerBag: `${companySettings.currency} ${item.rentPerBag} / bag`,
      storageDurationDays: `${item.storageDurationDays} days`,
      totalRent: `${companySettings.currency} ${item.totalRent.toLocaleString()}`,
    }));

    validateAndTriggerPrint({
      data: printData,
      reportTitle: 'COLD STORAGE RENT ACCRUAL STATEMENT',
      companySettings,
      expectedMinRecords: 1,
      columns: [
        { header: 'Code', key: 'code' },
        { header: 'Cold Storage Facility', key: 'coldStorageName' },
        { header: 'Inbound Bags', key: 'totalBags', align: 'right' },
        { header: 'Dispatched', key: 'deliveredBags', align: 'right' },
        { header: 'Remaining Bags', key: 'remainingBags', align: 'right' },
        { header: 'Contract Rate', key: 'rentPerBag', align: 'right' },
        { header: 'Period', key: 'storageDurationDays', align: 'right' },
        { header: 'Accrued Rent', key: 'totalRent', align: 'right' },
      ],
      databaseCheck: () => ({ isConsistent: true }),
      onError: (msg) => {
        if (addToast) addToast(msg, 'error');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 uppercase">
            <Receipt className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            COLD STORAGE RENT MANAGEMENT & ACCRUALS
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase">
            AUTOMATED BILLING COMPUTATION BASED ON BAGGED OCCUPANCY, SEASONAL RATES, AND STORAGE DURATION
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer uppercase"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>EXPORT STATEMENT</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer uppercase"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT INVOICE</span>
          </button>
        </div>
      </div>

      {/* Season Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Season Calculation Timeline
              </h3>
              <p className="text-xs text-slate-500">
                Billing season active from <span className="font-semibold">{seasonStart}</span> to{' '}
                <span className="font-semibold">{seasonEnd}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Percent className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Discount:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{discountPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rent Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Inbound Bags
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {totalBagsInbound === 0 ? '-' : totalBagsInbound.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Total potato seed stock stored
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Stock Out Dispatched
          </span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {totalBagsDelivered === 0 ? '-' : totalBagsDelivered.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Released to farmers & clients
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Active Vault Bags
          </span>
          <span className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1 block">
            {totalRemainingBags === 0 ? '-' : totalRemainingBags.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Subject to monthly maintenance
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Gross Estimated Rent
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {companySettings.currency} {netPayable.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Accrued across all cold storages
          </span>
        </div>
      </div>

      {/* Rent Schedule Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
              FACILITY-WISE RENT ACCRUAL SCHEDULE (2024 SEASON)
            </h3>
            <p className="text-xs text-slate-500 uppercase">
              CONTRACTED RATE PER BAG × INBOUND VOLUME × STORAGE DURATION
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase text-[11px] tracking-wider select-none">
                <SortableHeader label="CODE" sortKey="code" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="COLD STORAGE FACILITY" sortKey="coldStorageName" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="INBOUND BAGS" sortKey="totalBags" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="DISPATCHED" sortKey="deliveredBags" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="REMAINING BAGS" sortKey="remainingBags" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="CONTRACT RATE" sortKey="rentPerBag" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="PERIOD" sortKey="storageDurationDays" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" />
                <SortableHeader label="ACCRUED RENT" sortKey="totalRent" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No rent records found.
                  </td>
                </tr>
              ) : (
                paginatedRentItems.map((item) => (
                  <tr key={item.coldStorageId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {item.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {item.coldStorageName}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                      {item.totalBags === 0 ? '-' : item.totalBags.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">
                      {item.deliveredBags === 0 ? '-' : item.deliveredBags.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-sky-600 dark:text-sky-400">
                      {item.remainingBags === 0 ? '-' : item.remainingBags.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {companySettings.currency} {item.rentPerBag} / bag
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {item.storageDurationDays} days
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {companySettings.currency} {item.totalRent.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <td colSpan={2} className="py-3 px-4 text-right uppercase text-[11px] tracking-wider">
                  TOTAL ACCRUAL:
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {totalBagsInbound === 0 ? '-' : totalBagsInbound.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right text-amber-600 font-mono">
                  {totalBagsDelivered === 0 ? '-' : totalBagsDelivered.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right text-sky-600 font-mono">
                  {totalRemainingBags === 0 ? '-' : totalRemainingBags.toLocaleString()}
                </td>
                <td colSpan={2}></td>
                <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                  {companySettings.currency} {netPayable.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {sortedRentItems.length > 0 && (
          <TablePagination
            currentPage={effectivePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedRentItems.length}
            pageSizeOptions={[10, 15, 25, 50]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setCurrentPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
};
