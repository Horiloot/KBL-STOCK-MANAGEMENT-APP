import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import {
  LayoutDashboard,
  Boxes,
  Scale,
  Truck,
  Warehouse,
  Receipt,
  BarChart3,
  TrendingDown,
  Building2,
  FileText,
  Files,
  Grid3X3,
  Sliders,
  Users,
  ShieldCheck,
  History,
  FileSpreadsheet,
  Sprout,
  X,
  ChevronDown,
  ChevronRight,
  FileCheck,
  TrendingUp,
  GitCompare,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenThemeModal?: () => void;
}

interface NavSubItem {
  id: NavigationTab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavItem {
  id?: NavigationTab;
  keyId?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
  subItems?: NavSubItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    hasPermission,
    companySettings,
    setIsImportModalOpen,
    coldStorages,
  } = useApp();

  // Accordion state for sub-menus (both open by default for clear accessibility)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'stock-report': true,
    'challan-sr-report': true,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const navGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'INVENTORY OPERATIONS DETAILS',
      items: [
        {
          id: 'stock-register',
          label: 'Potato Send to Cold Storage Details',
          icon: Boxes,
          permission: 'view_stock',
        },
        {
          id: 'delivery-register',
          label: 'Stock Out from Cold Storage',
          icon: Truck,
          permission: 'view_delivery',
        },
        {
          id: 'stock-balance',
          label: 'Cold Storage Stock Details',
          icon: Scale,
          permission: 'view_stock',
        },
      ],
    },
    {
      title: 'COLD STORAGE & RENT',
      items: [
        {
          id: 'cold-storage',
          label: 'Cold Storages',
          icon: Warehouse,
          permission: 'view_cold_storage',
          badge: `${coldStorages.length}`,
        },
        {
          id: 'rent-management',
          label: 'Rent Management',
          icon: Receipt,
          permission: 'view_reports',
        },
      ],
    },
    {
      title: 'REPORT',
      items: [
        {
          id: 'reports-stock-in',
          label: 'STOCK IN ALL RECORDS',
          icon: Boxes,
          permission: 'view_reports',
        },
        {
          id: 'reports-stock-out',
          label: 'STOCK OUT ALL RECORDS',
          icon: Truck,
          permission: 'view_reports',
        },
        {
          id: 'reports-closing-stock',
          label: 'ALL ITEM CLOSING STOCK',
          icon: Scale,
          permission: 'view_reports',
        },
        {
          id: 'reports-in-out-all-records',
          label: 'IN, OUT & STOCK ALL RECORDS',
          icon: Layers,
          permission: 'view_reports',
        },
        {
          id: 'reports-challan-wise',
          label: 'DELIVERY CHALLAN WISE',
          icon: Files,
          permission: 'view_reports',
        },
        {
          id: 'reports-sr-wise',
          label: 'STORE SR WISE ALL RECORDS',
          icon: FileCheck,
          permission: 'view_reports',
        },
        {
          id: 'reports-stock-combined',
          label: 'IN, OUT & STOCK COMBINED REPORT',
          icon: GitCompare,
          permission: 'view_reports',
        },
      ],
    },
    {
      title: 'ADDITIONAL AUDITS & MATRICES',
      items: [
        {
          id: 'reports-dimensions',
          label: 'Variety / Grade Matrix',
          icon: Grid3X3,
          permission: 'view_reports',
        },
      ],
    },
    {
      title: 'ADMIN & GOVERNANCE',
      items: [
        {
          id: 'master-data',
          label: 'Master Data',
          icon: Sliders,
          permission: 'view_settings',
        },
        {
          id: 'users-roles',
          label: 'Users & Roles',
          icon: Users,
          permission: 'view_users',
        },
        {
          id: 'audit-logs',
          label: 'Audit Trail',
          icon: History,
          permission: 'view_audit_logs',
        },
        {
          id: 'settings',
          label: 'System Settings',
          icon: ShieldCheck,
          permission: 'manage_settings',
        },
      ],
    },
  ];

  const handleSelect = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800 shadow-2xl lg:shadow-none no-print`}
      >
        {/* Company Branding - Clickable Dashboard Link */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800/80 bg-slate-950/40">
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="flex items-center gap-3 hover:opacity-90 transition-all text-left cursor-pointer group"
            title="GO TO DASHBOARD"
          >
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Company Logo"
                className="w-9 h-9 rounded-xl object-contain border border-slate-700 bg-white p-0.5 shadow-md group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Sprout className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight uppercase group-hover:text-sky-400 transition-colors">
                {companySettings.logoText || companySettings.companyName || 'POTATO SEED ERP'}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase">
                COLD STORAGE & STOCK 2024
              </p>
            </div>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation scrollable area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || hasPermission(item.permission as any)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                <div className="px-3 text-[10px] font-bold text-sky-400 dark:text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                  <span>{group.title}</span>
                </div>

                {visibleItems.map((item) => {
                  const Icon = item.icon;

                  // If item has subItems (like in REPORT NAME section)
                  if (item.subItems && item.subItems.length > 0) {
                    const groupKey = item.keyId || item.label;
                    const isGroupExpanded = !!openAccordions[groupKey];
                    const hasActiveChild = item.subItems.some((s) => s.id === activeTab);

                    return (
                      <div key={groupKey} className="space-y-1 my-1">
                        {/* Parent Button */}
                        <button
                          type="button"
                          onClick={() => {
                            toggleAccordion(groupKey);
                            if (!isGroupExpanded && item.subItems && item.subItems.length > 0) {
                              handleSelect(item.subItems[0].id);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer uppercase ${
                            hasActiveChild
                              ? 'bg-slate-800/90 text-sky-400 border border-sky-500/30 shadow-xs'
                              : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-1">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                hasActiveChild ? 'text-sky-400' : 'text-slate-400'
                              }`}
                            />
                            <span className="tracking-wide text-left text-[11px] leading-snug">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isGroupExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Sub-buttons */}
                        {isGroupExpanded && (
                          <div className="pl-3.5 pr-1 py-1 space-y-1 border-l-2 border-slate-800/90 ml-4">
                            {item.subItems.map((sub) => {
                              const SubIcon = sub.icon || FileText;
                              const isSubActive = activeTab === sub.id;

                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => handleSelect(sub.id)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer uppercase ${
                                    isSubActive
                                      ? 'bg-sky-600 text-white shadow-xs font-bold'
                                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 text-left">
                                    <SubIcon
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isSubActive ? 'text-white' : 'text-slate-500'
                                      }`}
                                    />
                                    <span className="truncate tracking-wide">{sub.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Regular item
                  if (!item.id) return null;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id!)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer uppercase ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-sm font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="tracking-wide text-left">{item.label.toUpperCase()}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-sky-700 text-sky-100'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Excel Import CTA Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/50 transition-colors shadow-xs cursor-pointer tracking-wider"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>IMPORT 2024 EXCEL DATA</span>
          </button>
        </div>
      </aside>
    </>
  );
};
