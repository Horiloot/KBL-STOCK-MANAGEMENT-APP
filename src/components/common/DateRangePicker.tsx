import React, { useState } from 'react';
import { Calendar, X, Clock, ChevronDown } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  className?: string;
  label?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
  label = 'Date Period:',
}) => {
  const [showPresets, setShowPresets] = useState(false);

  // Helper date generators
  const setPreset = (preset: 'season2024' | 'thisMonth' | 'last30Days' | 'today' | 'all') => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (preset) {
      case 'season2024':
        onChange('2024-01-01', '2024-12-31');
        break;
      case 'thisMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        onChange(formatDate(firstDay), formatDate(lastDay));
        break;
      }
      case 'last30Days': {
        const past30 = new Date();
        past30.setDate(today.getDate() - 30);
        onChange(formatDate(past30), formatDate(today));
        break;
      }
      case 'today':
        onChange(formatDate(today), formatDate(today));
        break;
      case 'all':
        onChange('', '');
        break;
    }
    setShowPresets(false);
  };

  const hasActiveRange = Boolean(startDate || endDate);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Label & Icon */}
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 select-none">
        <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {label}
        </span>
      </div>

      {/* Date input container */}
      <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-2xs">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          placeholder="Start date"
          title="From date"
          className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
        />
        <span className="text-xs text-slate-400 font-medium select-none">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          placeholder="End date"
          title="To date"
          className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
        />

        {hasActiveRange && (
          <button
            type="button"
            onClick={() => onChange('', '')}
            className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer ml-1"
            title="Clear date range filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Presets Buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPreset('season2024')}
          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer uppercase ${
            startDate === '2024-01-01' && endDate === '2024-12-31'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Filter for Season 2024 (Jan 1, 2024 - Dec 31, 2024)"
        >
          SEASON 2024
        </button>

        <button
          type="button"
          onClick={() => setPreset('last30Days')}
          className="px-2 py-1 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer uppercase hidden sm:inline-block"
        >
          LAST 30 DAYS
        </button>

        <button
          type="button"
          onClick={() => setPreset('all')}
          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer uppercase ${
            !hasActiveRange
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Reset to all dates"
        >
          ALL TIME
        </button>
      </div>
    </div>
  );
};
