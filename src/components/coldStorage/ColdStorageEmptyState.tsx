import React from 'react';
import { Warehouse, Plus, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ColdStorageEmptyStateProps {
  onAddStorage?: () => void;
  title?: string;
  description?: string;
  showNavigateLink?: boolean;
}

export const ColdStorageEmptyState: React.FC<ColdStorageEmptyStateProps> = ({
  onAddStorage,
  title = 'No Storage Facilities Registered Yet',
  description = 'Register your first cold storage facility to monitor capacity, track inbound seed stock and deliveries, and view real-time occupancy rates.',
  showNavigateLink = true,
}) => {
  const { setActiveTab } = useApp();

  const handleAddClick = () => {
    if (onAddStorage) {
      onAddStorage();
    } else {
      setActiveTab('cold-storage');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 my-2">
      {/* Icon Badge */}
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/80 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
          <Warehouse className="w-8 h-8" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-2xs">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Friendly Heading & Description */}
      <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 max-w-md">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Storage</span>
        </button>

        {showNavigateLink && (
          <button
            type="button"
            onClick={() => setActiveTab('cold-storage')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <span>Manage Storage Facilities</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
