import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlobalSkeletonLoaderProps {
  type?: 'dashboard' | 'table' | 'cards' | 'default';
  message?: string;
}

export const GlobalSkeletonLoader: React.FC<GlobalSkeletonLoaderProps> = ({
  type = 'default',
  message = 'Loading data...',
}) => {
  return (
    <div className="w-full py-8 px-4 flex flex-col items-center justify-center animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</span>
      </div>

      {type === 'dashboard' ? (
        <div className="w-full space-y-4 max-w-6xl">
          {/* Top cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60"
              />
            ))}
          </div>
          {/* Main table skeleton */}
          <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-4 space-y-3">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6" />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
        </div>
      )}
    </div>
  );
};

export const SkeletonLoader = GlobalSkeletonLoader;
