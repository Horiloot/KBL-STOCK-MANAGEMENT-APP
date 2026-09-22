import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortableHeaderProps {
  columnKey?: string;
  sortKey?: string;
  currentSortKey?: string | null;
  currentSortDirection?: 'asc' | 'desc';
  currentSortDir?: 'asc' | 'desc';
  onSort: (key: string) => void;
  children?: React.ReactNode;
  label?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  title?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  columnKey,
  sortKey,
  currentSortKey,
  currentSortDirection,
  currentSortDir,
  onSort,
  children,
  label,
  align = 'left',
  className = '',
  title,
}) => {
  const activeColumnKey = (sortKey || columnKey || '') as string;
  const activeDirection = currentSortDir || currentSortDirection || 'asc';
  const content = label !== undefined ? label : children;
  const isSorted = currentSortKey === activeColumnKey;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSort(activeColumnKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(activeColumnKey);
    }
  };

  const alignClass =
    align === 'right'
      ? 'justify-end text-right'
      : align === 'center'
      ? 'justify-center text-center'
      : 'justify-start text-left';

  return (
    <th
      className={`py-2.5 px-3 select-none cursor-pointer transition-colors group ${className} ${
        isSorted ? 'bg-sky-50/70 dark:bg-sky-950/30' : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="columnheader"
      aria-sort={isSorted ? (activeDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      title={title || `Sort by ${typeof content === 'string' ? content : activeColumnKey}`}
    >
      <div className={`inline-flex items-center gap-1.5 w-full ${alignClass}`}>
        <span
          className={`uppercase text-[11px] font-bold tracking-wider transition-colors ${
            isSorted ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-300 group-hover:text-sky-600 dark:group-hover:text-sky-300'
          }`}
        >
          {content}
        </span>
        <span
          className={`inline-flex items-center justify-center transition-all ${
            isSorted
              ? 'text-sky-600 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-900/60 rounded p-0.5'
              : 'text-slate-400/60 dark:text-slate-500 group-hover:text-sky-500'
          }`}
        >
          {isSorted ? (
            activeDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-70 group-hover:opacity-100" />
          )}
        </span>
      </div>
    </th>
  );
};
