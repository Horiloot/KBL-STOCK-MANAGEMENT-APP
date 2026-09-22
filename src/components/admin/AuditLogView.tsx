import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLog } from '../../types';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Printer,
  Shield,
  Clock,
  User,
  Boxes,
  Truck,
  Building,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { exportToExcel, exportToPdf, ExportColumn } from '../../utils/exportUtils';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { SortableHeader } from '../common/SortableHeader';
import { TablePagination } from '../common/TablePagination';

export const AuditLogView: React.FC = () => {
  const { auditLogs, currentUser, companySettings, addToast, hasPermission } = useApp();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [sortField, setSortField] = useState<'timestamp' | 'userName' | 'action' | 'module'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Available unique modules
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.module) set.add(log.module.toUpperCase());
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Filtered & Sorted logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesUser = log.userName.toLowerCase().includes(query);
        const matchesDetails = log.details.toLowerCase().includes(query);
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesModule = log.module ? log.module.toLowerCase().includes(query) : false;
        const matchesRecord = log.recordId ? log.recordId.toLowerCase().includes(query) : false;
        if (!matchesUser && !matchesDetails && !matchesAction && !matchesModule && !matchesRecord) {
          return false;
        }
      }

      // Module filter
      if (selectedModule !== 'ALL' && log.module?.toUpperCase() !== selectedModule) {
        return false;
      }

      // Action filter
      if (selectedAction !== 'ALL' && log.action.toUpperCase() !== selectedAction) {
        return false;
      }

      // Date Range filter
      if (selectedDateRange !== 'ALL') {
        const logDate = new Date(log.timestamp).getTime();
        const now = Date.now();
        if (selectedDateRange === 'TODAY') {
          const startOfToday = new Date().setHours(0, 0, 0, 0);
          if (logDate < startOfToday) return false;
        } else if (selectedDateRange === 'WEEK') {
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (logDate < weekAgo) return false;
        } else if (selectedDateRange === 'MONTH') {
          const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (logDate < monthAgo) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortField === 'userName') {
        comparison = a.userName.localeCompare(b.userName);
      } else if (sortField === 'action') {
        comparison = a.action.localeCompare(b.action);
      } else if (sortField === 'module') {
        comparison = (a.module || '').localeCompare(b.module || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [auditLogs, searchQuery, selectedModule, selectedAction, selectedDateRange, sortField, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const stockEvents = auditLogs.filter((l) =>
      ['STOCK', 'DELIVERY', 'INVENTORY'].includes(l.module?.toUpperCase() || '') ||
      l.details.toLowerCase().includes('stock') ||
      l.details.toLowerCase().includes('bag')
    ).length;
    const userEvents = auditLogs.filter((l) =>
      ['USER', 'AUTH', 'SETTINGS'].includes(l.module?.toUpperCase() || '')
    ).length;
    const distinctUsers = new Set(auditLogs.map((l) => l.userName)).size;

    return { total, stockEvents, userEvents, distinctUsers };
  }, [auditLogs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Sorting helper
  const handleSort = (field: 'timestamp' | 'userName' | 'action' | 'module') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Export Columns definition
  const exportColumns: ExportColumn[] = [
    { header: 'Date & Time', key: 'formattedTime', width: 22 },
    { header: 'User', key: 'userName', width: 18 },
    { header: 'Module', key: 'module', width: 14 },
    { header: 'Action', key: 'action', width: 12 },
    { header: 'Record ID', key: 'recordId', width: 16 },
    { header: 'Change Details / Description', key: 'details', width: 45 },
  ];

  const exportData = useMemo(() => {
    return filteredLogs.map((log) => ({
      ...log,
      formattedTime: new Date(log.timestamp).toLocaleString(),
      module: log.module || 'SYSTEM',
      recordId: log.recordId || '-',
    }));
  }, [filteredLogs]);

  // Handle Excel Export
  const handleExcelExport = () => {
    exportToExcel(
      exportData,
      exportColumns,
      `Audit_Trail_Log_${new Date().toISOString().slice(0, 10)}`,
      'SYSTEM AUDIT & ACTIVITY TRAIL REPORT',
      companySettings,
      `Total Events: ${filteredLogs.length} | Generated by ${currentUser.fullName}`,
      {
        printedBy: currentUser.fullName,
        includeSummary: false,
      }
    );
    addToast('Audit log records exported to Excel.', 'success');
  };

  // Handle PDF Export
  const handlePdfExport = () => {
    exportToPdf(
      exportData,
      exportColumns,
      `Audit_Trail_Log_${new Date().toISOString().slice(0, 10)}`,
      'SYSTEM AUDIT & ACTIVITY TRAIL REPORT',
      companySettings,
      'l',
      `Filter Scope: ${selectedModule} module, ${selectedAction} action | Records: ${filteredLogs.length}`,
      currentUser.fullName
    );
    addToast('Audit log records exported to PDF.', 'success');
  };

  // Module Icon & Badge Helper
  const getModuleBadge = (mod?: string) => {
    const m = (mod || 'SYSTEM').toUpperCase();
    if (m === 'STOCK') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Boxes className="w-3 h-3" />
          STOCK
        </span>
      );
    }
    if (m === 'DELIVERY') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Truck className="w-3 h-3" />
          DELIVERY
        </span>
      );
    }
    if (m === 'COLD_STORAGE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
          <Building className="w-3 h-3" />
          STORAGE
        </span>
      );
    }
    if (m === 'USER' || m === 'AUTH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <User className="w-3 h-3" />
          {m}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Database className="w-3 h-3" />
        {m}
      </span>
    );
  };

  // Action Badge Helper
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act === 'CREATE' || act === 'INSERT') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          CREATE
        </span>
      );
    }
    if (act === 'UPDATE' || act === 'EDIT') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          UPDATE
        </span>
      );
    }
    if (act === 'DELETE' || act === 'REMOVE') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          DELETE
        </span>
      );
    }
    if (act === 'LOGIN') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
          LOGIN
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        {act}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 uppercase">
            <History className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>AUDIT TRAIL & USER ACTIVITY LOGS</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tracks user actions across the platform for accountability, including timestamps and changes made to stocks
          </p>
        </div>

        {/* Action Buttons: Excel, PDF, Print */}
        <div className="flex items-center gap-2 no-print flex-wrap">
          <button
            onClick={handleExcelExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer uppercase shadow-2xs"
            title="EXPORT AUDIT LOG TO EXCEL"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>EXCEL EXPORT</span>
          </button>

          <button
            onClick={handlePdfExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer uppercase shadow-2xs"
            title="EXPORT AUDIT LOG TO PDF"
          >
            <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>PDF EXPORT</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer uppercase shadow-2xs"
            title="PRINT REPORT"
          >
            <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>PRINT REPORT</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              TOTAL LOGGED ACTIONS
            </span>
            <Shield className="w-4 h-4 text-sky-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 block font-mono">
            {stats.total.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Full accountability trail</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              STOCK ALTERATIONS
            </span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 block font-mono">
            {stats.stockEvents.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Receiving, transfers & dispatches</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              USER & GOVERNANCE
            </span>
            <User className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1.5 block font-mono">
            {stats.userEvents.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Logins, roles & permissions</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              RECORDED OPERATORS
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5 block font-mono">
            {stats.distinctUsers}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Active platform contributors</span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box without placeholder */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder=""
              aria-label="Search audit logs"
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                title="CLEAR SEARCH"
              >
                ✕
              </button>
            )}
          </div>

          {/* Module Selector */}
          <div className="w-full md:w-44">
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase font-semibold"
            >
              <option value="ALL">ALL MODULES</option>
              {availableModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Action Selector */}
          <div className="w-full md:w-40">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase font-semibold"
            >
              <option value="ALL">ALL ACTIONS</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>

          {/* Date Filter Range */}
          <div className="w-full md:w-36">
            <select
              value={selectedDateRange}
              onChange={(e) => {
                setSelectedDateRange(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase font-semibold"
            >
              <option value="ALL">ALL TIME</option>
              <option value="TODAY">TODAY</option>
              <option value="WEEK">PAST 7 DAYS</option>
              <option value="MONTH">PAST 30 DAYS</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedModule !== 'ALL' || selectedAction !== 'ALL' || selectedDateRange !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedModule('ALL');
                setSelectedAction('ALL');
                setSelectedDateRange('ALL');
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer uppercase shrink-0"
              title="RESET FILTERS"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 uppercase font-bold select-none">
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                <SortableHeader label="DATE & TIME" sortKey="timestamp" currentSortKey={sortField} currentSortDir={sortOrder} onSort={(k) => handleSort(k as any)} />
                <SortableHeader label="OPERATOR / USER" sortKey="userName" currentSortKey={sortField} currentSortDir={sortOrder} onSort={(k) => handleSort(k as any)} />
                <SortableHeader label="MODULE" sortKey="module" currentSortKey={sortField} currentSortDir={sortOrder} onSort={(k) => handleSort(k as any)} />
                <SortableHeader label="ACTION" sortKey="action" currentSortKey={sortField} currentSortDir={sortOrder} onSort={(k) => handleSort(k as any)} />
                <th className="py-3 px-4">RECORD / REF ID</th>
                <th className="py-3 px-4 min-w-[280px]">DETAILS & AUDIT TRAIL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No activity logs found matching the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={log.id || idx}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-850/40'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {itemIndex}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.userName}</span>
                        </div>
                        {log.userEmail && (
                          <div className="text-[10px] text-slate-400 font-normal">{log.userEmail}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">{getModuleBadge(log.module)}</td>
                      <td className="py-2.5 px-4">{getActionBadge(log.action)}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {log.recordId ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                            {log.recordId}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">
                        <p className="leading-snug">{log.details}</p>
                        {(log.previousValue || log.newValue) && (
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-mono">
                            {log.previousValue && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 line-through">
                                {log.previousValue}
                              </span>
                            )}
                            {log.newValue && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                                {log.newValue}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredLogs.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[15, 30, 50, 100]}
        />
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        documentTitle="SYSTEM AUDIT & ACTIVITY TRAIL REPORT"
        subtitle={`Total Filtered Events: ${filteredLogs.length} | Exported by ${currentUser.fullName}`}
        columns={exportColumns}
        data={exportData}
        filename={`Audit_Trail_Report_${new Date().toISOString().slice(0, 10)}`}
        orientation="l"
      />
    </div>
  );
};
