import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/ToastContainer';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Modals
import { ThemeModal } from './components/common/ThemeModal';
import { ProfileModal } from './components/common/ProfileModal';
import { ExcelImportModal } from './components/common/ExcelImportModal';
import { StockTransactionModal } from './components/inventory/StockTransactionModal';
import { DeliveryTransactionModal } from './components/inventory/DeliveryTransactionModal';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { ColdStorageListView } from './components/coldStorage/ColdStorageListView';
import { RentManagementView } from './components/coldStorage/RentManagementView';
import { StockRegisterView } from './components/inventory/StockRegisterView';
import { DeliveryRegisterView } from './components/inventory/DeliveryRegisterView';
import { StockBalanceView } from './components/inventory/StockBalanceView';
import { StockInAllRecordsView } from './components/reports/StockInAllRecordsView';
import { StockOutAllRecordsView } from './components/reports/StockOutAllRecordsView';
import { AllItemClosingStockView } from './components/reports/AllItemClosingStockView';
import { InOutCombinedReportView } from './components/reports/InOutCombinedReportView';
import { KblDeliveryChallanWiseReportView } from './components/reports/KblDeliveryChallanWiseReportView';
import { StoreSRWiseReportView } from './components/reports/StoreSRWiseReportView';
import { StockReportView } from './components/reports/StockReportView';
import { DeliveryReportView } from './components/reports/DeliveryReportView';
import { ColdStorageReportView } from './components/reports/ColdStorageReportView';
import { SRWiseReportView } from './components/reports/SRWiseReportView';
import { ChallanWiseReportView } from './components/reports/ChallanWiseReportView';
import { DimensionsMatrixReportView } from './components/reports/DimensionsMatrixReportView';
import { MasterDataView } from './components/masterData/MasterDataView';
import { AuditLogView } from './components/admin/AuditLogView';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    isStockModalOpen,
    setIsStockModalOpen,
    isDeliveryModalOpen,
    setIsDeliveryModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    toasts,
    removeToast,
  } = useApp();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'cold-storage':
        return <ColdStorageListView />;
      case 'rent-management':
        return <RentManagementView />;
      case 'stock-register':
        return <StockRegisterView />;
      case 'delivery-register':
        return <DeliveryRegisterView />;
      case 'stock-balance':
        return <StockBalanceView />;
      case 'reports-stock-in':
        return <StockInAllRecordsView />;
      case 'reports-stock-out':
        return <StockOutAllRecordsView />;
      case 'reports-closing-stock':
        return <AllItemClosingStockView />;
      case 'reports-stock-combined':
        return <InOutCombinedReportView />;
      case 'reports-challan-wise':
      case 'reports-challan':
        return <KblDeliveryChallanWiseReportView />;
      case 'reports-sr-wise':
      case 'reports-sr':
        return <StoreSRWiseReportView />;
      case 'reports-stock':
        return <StockReportView />;
      case 'reports-delivery':
        return <DeliveryReportView />;
      case 'reports-cold-storage':
      case 'reports-storage':
        return <ColdStorageReportView />;
      case 'reports-dimensions':
        return <DimensionsMatrixReportView />;
      case 'master-data':
        return <MasterDataView defaultTab="varieties" />;
      case 'users-roles':
        return <MasterDataView defaultTab="users" />;
      case 'settings':
        return <MasterDataView defaultTab="company" />;
      case 'audit-logs':
        return <AuditLogView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1 min-w-0">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary>{renderActiveView()}</ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="mt-auto py-3 px-4 sm:px-6 border-t border-slate-200/80 dark:border-slate-800 text-center select-none bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs no-print">
          <a
            href="https://kisanbotanix.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-all uppercase tracking-wider cursor-pointer"
            title="VISIT KISAN BOTANIX LTD."
          >
            <span>ALL RIGHTS & RESERVED @ KBL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </footer>
      </div>

      {/* Modals & Dialogs */}
      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <ExcelImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <StockTransactionModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
      />
      <DeliveryTransactionModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      {/* Global Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ThemeProvider>
  );
}
