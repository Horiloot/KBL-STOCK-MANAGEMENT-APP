import React from 'react';
import { useApp } from '../../context/AppContext';
import { Warehouse, RotateCcw } from 'lucide-react';

export const FilterBar: React.FC = () => {
  const {
    filters,
    setFilters,
    coldStorages,
    addNotification,
  } = useApp();

  const selectedStorage = coldStorages.find((cs) => cs.id === filters.coldStorageId);

  const handleStorageChange = (storageId: string) => {
    setFilters((prev) => ({
      ...prev,
      coldStorageId: storageId || undefined,
    }));

    if (storageId) {
      const storage = coldStorages.find((cs) => cs.id === storageId);
      addNotification(
        'Facility Filter Applied',
        `Filtering dashboard data for ${storage ? storage.name : 'selected facility'}.`,
        'info'
      );
    } else {
      addNotification('Filter Reset', 'Displaying data across all cold storages.', 'info');
    }
  };

  const handleReset = () => {
    setFilters((prev) => ({
      ...prev,
      coldStorageId: undefined,
    }));
    addNotification('Filter Reset', 'Displaying data across all cold storages.', 'info');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs mb-6 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
            <Warehouse className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 uppercase">
              FILTER BY COLD STORAGE FACILITY
              {selectedStorage && (
                <span className="bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {selectedStorage.code}
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <select
              value={filters.coldStorageId || ''}
              onChange={(e) => handleStorageChange(e.target.value)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-sky-500 outline-none transition-colors uppercase"
            >
              <option value="">ALL COLD STORAGES (CONSOLIDATED)</option>
              {coldStorages.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.name} ({cs.code})
                </option>
              ))}
            </select>
          </div>

          {filters.coldStorageId && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap uppercase cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              RESET
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
