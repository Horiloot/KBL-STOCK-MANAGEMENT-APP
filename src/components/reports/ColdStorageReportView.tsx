import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TableDensity } from '../../types';
import {
  Warehouse,
  Boxes,
  Percent,
  Banknote,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { exportToExcel, exportToPdf, validateAndTriggerPrint } from '../../utils/exportUtils';
import { sortData } from '../../utils/sortUtils';
import { TablePagination } from '../common/TablePagination';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { ReportButtonGroup } from '../common/ReportButtonGroup';

export const ColdStorageReportView: React.FC = () => {
  const {
    coldStorages,
    stockTransactions,
    deliveryTransactions,
    companySettings,
    addToast,
  } = useApp();

  const [density, setDensity] = useState<TableDensity>('comfortable');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>('name');
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

  // Compute facility utilization summaries
  const facilityReports = useMemo(() => {
    return coldStorages.map((cs) => {
      const inboundList = stockTransactions.filter((s) => s.coldStorageId === cs.id);
      const deliveryList = deliveryTransactions.filter((d) => d.coldStorageId === cs.id);

      const inboundBags = inboundList.reduce((acc, s) => acc + s.sackQuantity, 0);
      const inboundKg = inboundList.reduce((acc, s) => acc + s.totalKg, 0);
      const inboundMt = inboundList.reduce((acc, s) => acc + s.totalMt, 0);

      const deliveredBags = deliveryList.reduce((acc, d) => acc + d.sackQuantity, 0);
      const deliveredKg = deliveryList.reduce((acc, d) => acc + d.totalKg, 0);
      const deliveredMt = deliveryList.reduce((acc, d) => acc + d.totalMt, 0);

      const balanceBags = Math.max(0, inboundBags - deliveredBags);
      const balanceKg = Math.max(0, inboundKg - deliveredKg);
      const balanceMt = Math.max(0, inboundMt - deliveredMt);

      const occupancyRate = cs.capacity > 0 ? (balanceBags / cs.capacity) * 100 : 0;
      const estimatedRent = balanceBags * cs.rentPerBag;

      return {
        id: cs.id,
        name: cs.name,
        code: cs.code,
        location: cs.location,
        capacity: cs.capacity,
        rentPerBag: cs.rentPerBag,
        inboundBags,
        inboundMt,
        deliveredBags,
        deliveredMt,
        balanceBags,
        balanceKg,
        balanceMt,
        occupancyRate,
        estimatedRent,
      };
    });
  }, [coldStorages, stockTransactions, deliveryTransactions]);

  const sortedReports = useMemo(() => {
    return sortData(facilityReports, sortKey, sortDir);
  }, [facilityReports, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedReports.length / pageSize));
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedReports = sortedReports.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const totalCap = facilityReports.reduce((acc, f) => acc + f.capacity, 0);
  const totalIn = facilityReports.reduce((acc, f) => acc + f.inboundBags, 0);
  const totalOut = facilityReports.reduce((acc, f) => acc + f.deliveredBags, 0);
  const totalVault = facilityReports.reduce((acc, f) => acc + f.balanceBags, 0);
  const totalVaultMt = facilityReports.reduce((acc, f) => acc + f.balanceMt, 0);
  const totalEstRent = facilityReports.reduce((acc, f) => acc + f.estimatedRent, 0);
  const overallOccupancy = totalCap > 0 ? (totalVault / totalCap) * 100 : 0;

  const exportColumns = [
    { header: 'Cold Storage Facility', key: 'name', width: 28 },
    { header: 'Code', key: 'code', width: 12 },
    { header: 'Location', key: 'location', width: 22 },
    { header: 'Capacity (Bags)', key: 'capacity', width: 16 },
    { header: 'Rent Rate (৳/Bag)', key: 'rentPerBag', width: 18 },
    { header: 'Inbound (Bags)', key: 'inboundBags', width: 16 },
    { header: 'Delivered (Bags)', key: 'deliveredBags', width: 16 },
    { header: 'Current Vault Stock', key: 'balanceBags', width: 18 },
    { header: 'Vault Weight (MT)', key: 'balanceMt', width: 18 },
    { header: 'Occupancy Rate (%)', key: 'occupancyRate', width: 18 },
    { header: 'Est. Season Rent (৳)', key: 'estimatedRent', width: 20 },
  ];

  const handleExcel = () => {
    const data = facilityReports.map((f) => ({
      ...f,
      balanceMt: Number(f.balanceMt.toFixed(2)),
      occupancyRate: `${f.occupancyRate.toFixed(1)}%`,
      estimatedRent: Math.round(f.estimatedRent),
    }));

    exportToExcel(
      data,
      exportColumns,
      'Facility_Capacity_Utilization_Report_2024',
      'Cold Storage Facilities Utilization & Stock Distribution Report',
      companySettings,
      `Enterprise Facilities: ${facilityReports.length} | Overall Occupancy: ${overallOccupancy.toFixed(1)}%`
    );
  };

  const handlePdf = () => {
    const data = facilityReports.map((f) => ({
      ...f,
      balanceMt: Number(f.balanceMt.toFixed(2)),
      occupancyRate: Number(f.occupancyRate.toFixed(1)),
      estimatedRent: Math.round(f.estimatedRent),
    }));

    exportToPdf(
      data,
      exportColumns,
      'Facility_Capacity_Utilization_Report_2024',
      'Cold Storage Facilities Utilization & Stock Distribution Report',
      companySettings,
      'l',
      `Enterprise Facilities: ${facilityReports.length} | Overall Occupancy: ${overallOccupancy.toFixed(1)}%`
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

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-0.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4.5 bg-sky-500 rounded-xs" />
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white uppercase">
            COLD STORAGE REPORT
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {facilityReports.length} Facilities
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL CAPACITY</span>
            <Warehouse className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalCap.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CURRENT STOCK</span>
            <Boxes className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">
            {totalVault.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">OCCUPANCY RATE</span>
            <Percent className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {overallOccupancy.toFixed(1)}%
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PROJECTED RENT</span>
            <Banknote className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            ৳{Math.round(totalEstRent).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Facility Utilization Table */}
      <div className="bg-white dark:bg-slate-900 border border-sky-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-800 text-slate-100 dark:bg-slate-850 dark:text-white font-bold border-b-2 border-slate-900 dark:border-slate-700 select-none">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  COLD STORAGE FACILITY {renderSortIndicator('name')}
                </th>
                <th
                  onClick={() => handleSort('location')}
                  className={`${thPadding} font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  LOCATION {renderSortIndicator('location')}
                </th>
                <th
                  onClick={() => handleSort('capacity')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  CAPACITY (BAGS) {renderSortIndicator('capacity')}
                </th>
                <th
                  onClick={() => handleSort('rentPerBag')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  RENT RATE {renderSortIndicator('rentPerBag')}
                </th>
                <th
                  onClick={() => handleSort('inboundBags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  INBOUND BAGS {renderSortIndicator('inboundBags')}
                </th>
                <th
                  onClick={() => handleSort('deliveredBags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  DISPATCHED BAGS {renderSortIndicator('deliveredBags')}
                </th>
                <th
                  onClick={() => handleSort('balanceBags')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  CURRENT STOCK {renderSortIndicator('balanceBags')}
                </th>
                <th
                  onClick={() => handleSort('balanceMt')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  STOCK (MT) {renderSortIndicator('balanceMt')}
                </th>
                <th
                  onClick={() => handleSort('occupancyRate')}
                  className={`${thPadding} text-center font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  OCCUPANCY {renderSortIndicator('occupancyRate')}
                </th>
                <th
                  onClick={() => handleSort('estimatedRent')}
                  className={`${thPadding} text-right font-semibold uppercase tracking-wider text-slate-100 dark:text-white cursor-pointer hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors select-none`}
                >
                  EST. RENT {renderSortIndicator('estimatedRent')}
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${
                density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-xs' : 'text-sm'
              }`}
            >
              {paginatedReports.map((f) => (
                <tr
                  key={f.id}
                  className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-850/40 hover:bg-sky-50/60 dark:hover:bg-sky-950/25 transition-colors group"
                >
                  <td className={`whitespace-nowrap ${tdPadding}`}>
                    <span className="font-bold text-slate-900 dark:text-white">{f.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">({f.code})</span>
                  </td>
                  <td className={`text-slate-600 dark:text-slate-300 whitespace-nowrap ${tdPadding}`}>{f.location}</td>
                  <td className={`text-right font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums ${tdPadding}`}>
                    {f.capacity.toLocaleString()}
                  </td>
                  <td className={`text-right font-mono text-slate-500 tabular-nums ${tdPadding}`}>
                    ৳{f.rentPerBag}
                  </td>
                  <td className={`text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums ${tdPadding}`}>
                    {f.inboundBags.toLocaleString()}
                  </td>
                  <td className={`text-right font-mono text-amber-600 dark:text-amber-400 tabular-nums ${tdPadding}`}>
                    {f.deliveredBags.toLocaleString()}
                  </td>
                  <td className={`text-right font-mono font-bold text-sky-600 dark:text-sky-400 tabular-nums ${tdPadding}`}>
                    {f.balanceBags.toLocaleString()}
                  </td>
                  <td className={`text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums ${tdPadding}`}>
                    {f.balanceMt.toFixed(2)}
                  </td>
                  <td className={`text-center min-w-[110px] ${tdPadding}`}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            f.occupancyRate > 90
                              ? 'bg-rose-500'
                              : f.occupancyRate > 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, f.occupancyRate)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                        {f.occupancyRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className={`text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums ${tdPadding}`}>
                    ৳{Math.round(f.estimatedRent).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs select-none">
              <tr>
                <td colSpan={2} className={`${tdPadding} uppercase tracking-wider`}>
                  TOTAL ({facilityReports.length} FACILITIES):
                </td>
                <td className={`${tdPadding} text-right font-mono`}>
                  {totalCap.toLocaleString()}
                </td>
                <td></td>
                <td className={`${tdPadding} text-right font-mono`}>
                  {totalIn.toLocaleString()}
                </td>
                <td className={`${tdPadding} text-right font-mono text-amber-600 dark:text-amber-400`}>
                  {totalOut.toLocaleString()}
                </td>
                <td className={`${tdPadding} text-right font-mono text-sky-600 dark:text-sky-400 font-black`}>
                  {totalVault.toLocaleString()}
                </td>
                <td className={`${tdPadding} text-right font-mono text-emerald-600 dark:text-emerald-400 font-black`}>
                  {totalVaultMt.toFixed(2)} MT
                </td>
                <td className={`${tdPadding} text-center font-mono text-emerald-600 dark:text-emerald-400`}>
                  {overallOccupancy.toFixed(1)}% Avg
                </td>
                <td className={`${tdPadding} text-right font-mono text-amber-600 dark:text-amber-400 font-black`}>
                  ৳{Math.round(totalEstRent).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        {sortedReports.length > pageSize && (
          <TablePagination
            currentPage={effectivePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sortedReports.length}
            pageSizeOptions={[10, 15, 25, 50]}
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
          documentTitle="Cold Storage Facility Utilization & Summary Report"
          subtitle={`Total Facilities: ${facilityReports.length} | Enterprise Capacity: ${totalCap.toLocaleString()} Bags`}
          columns={exportColumns}
          data={facilityReports.map((f) => ({
            ...f,
            balanceMt: `${f.balanceMt.toFixed(2)} MT`,
            occupancyRate: `${f.occupancyRate.toFixed(1)}%`,
            estimatedRent: `৳${Math.round(f.estimatedRent).toLocaleString()}`,
          }))}
          summaryItems={[
            { label: 'Total Enterprise Capacity', value: `${totalCap.toLocaleString()} Bags` },
            { label: 'Vault Stored Stock', value: `${totalVault.toLocaleString()} Bags` },
            { label: 'Overall Occupancy', value: `${overallOccupancy.toFixed(1)}%` },
            { label: 'Projected Total Rent', value: `৳${Math.round(totalEstRent).toLocaleString()}` },
          ]}
          filename="Facility_Utilization_Report_2024"
        />
      )}
    </div>
  );
};
