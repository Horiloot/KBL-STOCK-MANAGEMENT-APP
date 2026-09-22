import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { NavigationTab } from '../../types';
import {
  Palette,
  Search,
  PlusCircle,
  Truck,
  User as UserIcon,
  Menu,
  RotateCcw,
  CheckCircle2,
  X,
  FileText,
  Package,
  BarChart3,
  ArrowRight,
  Building2,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { ThemeModal } from '../common/ThemeModal';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenThemeModal?: () => void;
  onOpenProfileModal?: () => void;
}

interface ReportDefinition {
  id: string;
  tab: NavigationTab;
  title: string;
  description: string;
  keywords: string[];
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'rep-stock-in',
    tab: 'reports-stock-in',
    title: 'STOCK IN ALL RECORDS',
    description: 'Complete inbound stock receipts, challans, gate passes & cold storage allocations',
    keywords: ['stock in', 'inbound', 'receipt', 'all records', 'kbl challan', 'sr', 'potato'],
  },
  {
    id: 'rep-stock-out',
    tab: 'reports-stock-out',
    title: 'STOCK OUT ALL RECORDS',
    description: 'Complete outbound dispatches, delivery orders, client receivers & transport records',
    keywords: ['stock out', 'delivery', 'dispatch', 'all records', 'client', 'truck'],
  },
  {
    id: 'rep-closing-stock',
    tab: 'reports-closing-stock',
    title: 'ALL ITEM CLOSING STOCK',
    description: 'Item-wise closing stock balance across all cold storages, varieties and grades',
    keywords: ['closing stock', 'balance', 'all items', 'inventory', 'grade', 'variety'],
  },
  {
    id: 'rep-in-out-all-records',
    tab: 'reports-in-out-all-records',
    title: 'IN, OUT & STOCK ALL RECORDS',
    description: 'Chronological transaction movement ledger tracking receipts, dispatches & running balance',
    keywords: ['in out all records', 'movements', 'ledger', 'all transactions', 'running balance', 'receipts'],
  },
  {
    id: 'rep-challan',
    tab: 'reports-challan-wise',
    title: 'KBL DELIVERY CHALLAN WISE REPORT',
    description: 'Consignor delivery challan cross-reference, gate audit logs & vehicle tracking',
    keywords: ['challan', 'kbl delivery challan', 'cross reference', 'audit', 'truck'],
  },
  {
    id: 'rep-sr',
    tab: 'reports-sr-wise',
    title: 'STORE SR WISE REPORT',
    description: 'Serial receipt lot registry, farmer batches, remaining balance & seed grade breakdown',
    keywords: ['sr', 'store sr', 'serial receipt', 'lot', 'grower', 'batch', 'farmer'],
  },
  {
    id: 'rep-stock-combined',
    tab: 'reports-stock-combined',
    title: 'IN, OUT & STOCK COMBINED REPORT',
    description: 'Consolidated reconciliation ledger comparing inbound, outbound & closing balance',
    keywords: ['combined', 'in out', 'reconciliation', 'ledger', 'stock turnover', 'summary'],
  },
  {
    id: 'rep-storage',
    tab: 'reports-storage',
    title: 'Storage Occupancy Report',
    description: 'Cold storage chamber capacity, utilization metrics & live room occupancy',
    keywords: ['storage', 'occupancy', 'capacity', 'chamber', 'room', 'cold storage', 'utilization'],
  },
  {
    id: 'rep-dimensions',
    tab: 'reports-dimensions',
    title: 'Variety & Grade Analysis',
    description: 'Multi-dimensional seed variety, grade, and seed class distribution analysis',
    keywords: ['dimension', 'variety', 'grade', 'class', 'analysis', 'distribution', 'matrix'],
  },
];

type SearchCategory = 'all' | 'stock' | 'delivery' | 'reports';

interface UnifiedSearchResult {
  id: string;
  type: 'stock' | 'delivery' | 'report';
  primaryTitle: string;
  secondaryTitle: string;
  subtitle: string;
  badge: string;
  badgeClass: string;
  date?: string;
  onSelect: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    currentUser,
    companySettings,
    users,
    switchUser,
    hasPermission,
    setIsStockModalOpen,
    setIsDeliveryModalOpen,
    setIsProfileModalOpen,
    resetAllData,
    stockTransactions,
    deliveryTransactions,
    coldStorages,
    varieties,
    setActiveTab,
    setFilters,
    addToast,
  } = useApp();

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcut: '/' or 'Cmd+K' / 'Ctrl+K'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute Search Results across Stock Entries, Delivery Records, and Reports
  const searchResults = useMemo<UnifiedSearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: UnifiedSearchResult[] = [];

    // 1. Match Stock Entries
    stockTransactions.forEach((s) => {
      const variety = varieties.find((v) => v.id === s.varietyId)?.name || '';
      const storage = coldStorages.find((c) => c.id === s.coldStorageId)?.name || '';
      const challanMatch = s.kblChallanNo?.toLowerCase().includes(q);
      const srMatch = s.srNo?.toLowerCase().includes(q);
      const trxMatch = s.transactionNo?.toLowerCase().includes(q);
      const entryMatch = s.entryNo?.toLowerCase().includes(q);
      const remarksMatch = s.remarks?.toLowerCase().includes(q);
      const varietyMatch = variety.toLowerCase().includes(q);
      const storageMatch = storage.toLowerCase().includes(q);

      if (
        challanMatch ||
        srMatch ||
        trxMatch ||
        entryMatch ||
        remarksMatch ||
        varietyMatch ||
        storageMatch
      ) {
        results.push({
          id: `stock-${s.id}`,
          type: 'stock',
          primaryTitle: s.kblChallanNo,
          secondaryTitle: `SR: ${s.srNo}`,
          subtitle: `${s.sackQuantity.toLocaleString()} Bags (${s.totalMt} MT) • ${variety || 'Potato Seed'} • ${storage || 'Chamber'}`,
          badge: 'Stock Entry',
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          date: s.date,
          onSelect: () => {
            setFilters((prev) => ({ ...prev, searchQuery: s.kblChallanNo }));
            setActiveTab('stock-register');
            setIsSearchOpen(false);
            setSearchQuery('');
            if (addToast) {
              addToast(`Loaded Stock Entry: ${s.kblChallanNo} (SR: ${s.srNo})`, 'info');
            }
          },
        });
      }
    });

    // 2. Match Delivery Records (Search by ID or Client Name)
    deliveryTransactions.forEach((d) => {
      const variety = varieties.find((v) => v.id === d.varietyId)?.name || '';
      const storage = coldStorages.find((c) => c.id === d.coldStorageId)?.name || '';
      const deliveryNoMatch = d.deliveryNo?.toLowerCase().includes(q);
      const clientMatch = d.customerReceiver?.toLowerCase().includes(q);
      const refMatch = d.deliveryReference?.toLowerCase().includes(q);
      const vehicleMatch = d.vehicleNo?.toLowerCase().includes(q);
      const driverMatch = d.driverName?.toLowerCase().includes(q);
      const remarksMatch = d.remarks?.toLowerCase().includes(q);
      const varietyMatch = variety.toLowerCase().includes(q);
      const storageMatch = storage.toLowerCase().includes(q);

      if (
        deliveryNoMatch ||
        clientMatch ||
        refMatch ||
        vehicleMatch ||
        driverMatch ||
        remarksMatch ||
        varietyMatch ||
        storageMatch
      ) {
        results.push({
          id: `delivery-${d.id}`,
          type: 'delivery',
          primaryTitle: d.deliveryNo,
          secondaryTitle: `Client: ${d.customerReceiver}`,
          subtitle: `${d.sackQuantity.toLocaleString()} Bags (${d.totalMt} MT) • ${variety || 'Seed'} • ${storage || 'Storage'}`,
          badge: 'Delivery Record',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          date: d.date,
          onSelect: () => {
            setFilters((prev) => ({ ...prev, searchQuery: d.deliveryNo }));
            setActiveTab('delivery-register');
            setIsSearchOpen(false);
            setSearchQuery('');
            if (addToast) {
              addToast(`Loaded Delivery Record: ${d.deliveryNo} (${d.customerReceiver})`, 'info');
            }
          },
        });
      }
    });

    // 3. Match Reports by ID, Title, Description, or Keywords
    REPORT_DEFINITIONS.forEach((rep) => {
      const titleMatch = rep.title.toLowerCase().includes(q);
      const descMatch = rep.description.toLowerCase().includes(q);
      const tabMatch = rep.tab.toLowerCase().includes(q);
      const keywordMatch = rep.keywords.some((k) => k.includes(q));

      if (titleMatch || descMatch || tabMatch || keywordMatch) {
        results.push({
          id: `rep-${rep.id}`,
          type: 'report',
          primaryTitle: rep.title,
          secondaryTitle: 'Report',
          subtitle: rep.description,
          badge: 'Report',
          badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          onSelect: () => {
            setActiveTab(rep.tab);
            setIsSearchOpen(false);
            setSearchQuery('');
            if (addToast) {
              addToast(`Navigated to ${rep.title}`, 'info');
            }
          },
        });
      }
    });

    return results;
  }, [searchQuery, stockTransactions, deliveryTransactions, coldStorages, varieties, setActiveTab, setFilters, addToast]);

  // Filtered by Category
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return searchResults;
    if (activeCategory === 'stock') return searchResults.filter((r) => r.type === 'stock');
    if (activeCategory === 'delivery') return searchResults.filter((r) => r.type === 'delivery');
    if (activeCategory === 'reports') return searchResults.filter((r) => r.type === 'report');
    return searchResults;
  }, [searchResults, activeCategory]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredResults.length, activeCategory]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[highlightedIndex]) {
        filteredResults[highlightedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const countStock = searchResults.filter((r) => r.type === 'stock').length;
  const countDelivery = searchResults.filter((r) => r.type === 'delivery').length;
  const countReports = searchResults.filter((r) => r.type === 'report').length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs no-print">
      {/* Left side: Hamburger + Global Search */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-2xl">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div ref={searchContainerRef} className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder=""
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-9 pr-14 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-xs"
            />

            {/* Clear button or Keyboard Shortcut badge */}
            <div className="absolute right-2.5 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-700/60 rounded border border-slate-300 dark:border-slate-600">
                  <span className="text-[11px]">⌘</span>K
                </kbd>
              )}
            </div>
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
              {searchQuery.trim() ? (
                <>
                  {/* Category Filter Pills Bar */}
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50/90 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[11px] overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setActiveCategory('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeCategory === 'all'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-750'
                      }`}
                    >
                      All ({searchResults.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategory('stock')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeCategory === 'stock'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Package className="w-3 h-3" />
                      Stock ({countStock})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategory('delivery')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeCategory === 'delivery'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Truck className="w-3 h-3" />
                      Delivery ({countDelivery})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategory('reports')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeCategory === 'reports'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-750'
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      Reports ({countReports})
                    </button>
                  </div>

                  {/* Results List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((item, idx) => {
                        const isHighlighted = idx === highlightedIndex;
                        return (
                          <div
                            key={item.id}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onClick={item.onSelect}
                            className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                              isHighlighted
                                ? 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {item.type === 'stock' && <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                {item.type === 'delivery' && <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                                {item.type === 'report' && <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {item.primaryTitle}
                                  </span>
                                  {item.secondaryTitle && (
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                      • {item.secondaryTitle}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${item.badgeClass}`}>
                                    {item.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.date && (
                                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                                  {item.date}
                                </span>
                              )}
                              <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isHighlighted ? 'translate-x-0.5 text-sky-500' : 'text-slate-300 dark:text-slate-600'}`} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No matching records or reports found for <span className="font-semibold text-slate-700 dark:text-slate-200">"{searchQuery}"</span>
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                          Try searching by Challan (e.g. KBL-2024), Client Name (e.g. Apex, Agro), or Report (e.g. Stock, Delivery, SR)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Keyboard instructions footer */}
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Use ↑↓ to navigate • ↵ to select • ESC to close</span>
                    <span>{filteredResults.length} result{filteredResults.length === 1 ? '' : 's'}</span>
                  </div>
                </>
              ) : (
                /* Quick Suggestions when input is focused but empty */
                <div className="p-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Navigation & Reports</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('stock-register');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">Potato Send to Cold Storage Details</div>
                        <div className="text-[10px] text-slate-400">View gate entries & storage allotments</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('delivery-register');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">Stock Out from Cold Storage</div>
                        <div className="text-[10px] text-slate-400">Client dispatches & gate passes</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('reports-storage');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">Storage Occupancy</div>
                        <div className="text-[10px] text-slate-400">Cold storage chamber utilization</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('reports-sr');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">SR-Wise Lot Register</div>
                        <div className="text-[10px] text-slate-400">Serial receipts & farmer lots</div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between px-2">
                    <span>💡 Tip: Type any Challan ID, SR No, Delivery No, or Client Name</span>
                    <kbd className="px-1.5 py-0.5 font-mono text-[9px] bg-slate-100 dark:bg-slate-800 rounded">ESC to dismiss</kbd>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Quick Action Buttons, Theme, User Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Action: Stock In Entry */}
        {hasPermission('add_stock') && (
          <button
            onClick={() => setIsStockModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 rounded-lg shadow-xs transition-colors cursor-pointer uppercase"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>COLD STORAGE STOCK IN</span>
          </button>
        )}

        {/* Quick Action: Stock Out Entry */}
        {hasPermission('add_delivery') && (
          <button
            onClick={() => setIsDeliveryModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer uppercase"
          >
            <Truck className="w-3.5 h-3.5 text-amber-500" />
            <span>COLD STORAGE STOCK OUT</span>
          </button>
        )}

        {/* Theme Modal Trigger */}
        <button
          onClick={() => setIsThemeModalOpen(true)}
          title="Themes & Appearance"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* User Switcher / Profile */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-xs overflow-hidden border border-slate-200 dark:border-slate-700">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
              ) : (
                currentUser.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
              )}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 uppercase">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">
                {currentUser.roleName}
              </div>
            </div>
          </button>

          {/* User Menu Dropdown with instant Switcher */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-xs font-semibold text-slate-900 dark:text-white uppercase">
                  {currentUser.fullName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentUser.email}
                </div>
                <span className="inline-block mt-1 text-[10px] font-semibold bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full uppercase">
                  {currentUser.roleName}
                </span>
              </div>

              {/* Instant Multi-User Role Switcher */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  SWITCH ACTIVE ROLE
                </div>
                <div className="space-y-1 mt-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        u.id === currentUser.id
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="uppercase">{u.fullName}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{u.roleName}</div>
                      </div>
                      {u.id === currentUser.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="p-1">
                <button
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer uppercase font-semibold"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  EDIT PROFILE
                </button>
                <button
                  onClick={() => {
                    resetAllData();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg flex items-center gap-2 cursor-pointer uppercase font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  RESTORE 2024 SEED DATA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Theme Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </header>
  );
};
