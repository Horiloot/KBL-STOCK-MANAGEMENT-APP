import React from 'react';
import { useTheme, THEMES_LIST } from '../../context/ThemeContext';
import { Modal } from './Modal';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { ThemeMode, ThemeName } from '../../types';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, mode, setMode } = useTheme();

  const handleSelectTheme = (themeId: ThemeName) => {
    setTheme(themeId);
  };

  const handleSelectMode = (m: ThemeMode) => {
    setMode(m);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Theme & Appearance"
      subtitle="Customize the enterprise visual palette and color mode"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Color Mode Selector */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3">
            Display Mode
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light Mode', icon: Sun },
              { id: 'dark', label: 'Dark Mode', icon: Moon },
              { id: 'system', label: 'System Auto', icon: Laptop },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectMode(item.id as ThemeMode)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium ring-2 ring-sky-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1.5" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 10 Theme Palettes Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enterprise Themes (10 Choices)
            </label>
            <span className="text-[11px] text-slate-400">Instant application</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {THEMES_LIST.map((th) => {
              const isSelected = theme === th.id;
              return (
                <div
                  key={th.id}
                  onClick={() => handleSelectTheme(th.id)}
                  className={`cursor-pointer flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 ring-2 ring-sky-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-lg shrink-0 shadow-xs flex items-center justify-center border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: th.primaryColor }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: th.accentColor }}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {th.name}
                        {isSelected && (
                          <span className="text-[10px] bg-sky-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {th.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
