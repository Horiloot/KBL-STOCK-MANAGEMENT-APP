import React, { createContext, useContext, useState, useEffect, useReducer, useRef } from 'react';
import {
  User,
  Role,
  PermissionKey,
  ColdStorage,
  Variety,
  SeedClass,
  Grade,
  ProductionBlock,
  PotatoType,
  StockTransaction,
  DeliveryTransaction,
  RentPayment,
  AuditLog,
  NotificationItem,
  CompanySettings,
  FilterState,
  NavigationTab,
} from '../types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_COLD_STORAGES,
  INITIAL_VARIETIES,
  INITIAL_CLASSES,
  INITIAL_GRADES,
  INITIAL_PRODUCTION_BLOCKS,
  INITIAL_POTATO_TYPES,
  INITIAL_KG_PER_BAG_OPTIONS,
  INITIAL_STOCK_TRANSACTIONS,
  INITIAL_DELIVERY_TRANSACTIONS,
  INITIAL_RENT_PAYMENTS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';

export interface InventoryState {
  stockTransactions: StockTransaction[];
  deliveryTransactions: DeliveryTransaction[];
}

export type InventoryAction =
  | { type: 'ADD_STOCK'; payload: StockTransaction }
  | { type: 'UPDATE_STOCK'; id: string; updates: Partial<StockTransaction> }
  | { type: 'DELETE_STOCK'; id: string }
  | { type: 'SET_STOCK'; payload: StockTransaction[] }
  | { type: 'ADD_DELIVERY'; payload: DeliveryTransaction }
  | { type: 'UPDATE_DELIVERY'; id: string; updates: Partial<DeliveryTransaction> }
  | { type: 'DELETE_DELIVERY'; id: string }
  | { type: 'SET_DELIVERY'; payload: DeliveryTransaction[] }
  | {
      type: 'RESET_INVENTORY';
      payload: {
        stockTransactions: StockTransaction[];
        deliveryTransactions: DeliveryTransaction[];
      };
    };

export function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case 'ADD_STOCK': {
      if (state.stockTransactions.some((s) => s.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        stockTransactions: [action.payload, ...state.stockTransactions],
      };
    }
    case 'UPDATE_STOCK': {
      return {
        ...state,
        stockTransactions: state.stockTransactions.map((s) =>
          s.id === action.id ? { ...s, ...action.updates, updatedAt: new Date().toISOString() } : s
        ),
      };
    }
    case 'DELETE_STOCK': {
      return {
        ...state,
        stockTransactions: state.stockTransactions.filter((s) => s.id !== action.id),
      };
    }
    case 'SET_STOCK': {
      return {
        ...state,
        stockTransactions: action.payload,
      };
    }
    case 'ADD_DELIVERY': {
      if (state.deliveryTransactions.some((d) => d.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        deliveryTransactions: [action.payload, ...state.deliveryTransactions],
      };
    }
    case 'UPDATE_DELIVERY': {
      return {
        ...state,
        deliveryTransactions: state.deliveryTransactions.map((d) =>
          d.id === action.id ? { ...d, ...action.updates } : d
        ),
      };
    }
    case 'DELETE_DELIVERY': {
      return {
        ...state,
        deliveryTransactions: state.deliveryTransactions.filter((d) => d.id !== action.id),
      };
    }
    case 'SET_DELIVERY': {
      return {
        ...state,
        deliveryTransactions: action.payload,
      };
    }
    case 'RESET_INVENTORY': {
      return {
        stockTransactions: action.payload.stockTransactions,
        deliveryTransactions: action.payload.deliveryTransactions,
      };
    }
    default:
      return state;
  }
}

interface AppContextType {
  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;

  // Auth & RBAC
  currentUser: User;
  users: User[];
  roles: Role[];
  hasPermission: (permission: PermissionKey) => boolean;
  switchUser: (userId: string) => void;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  updateRolePermissions: (roleId: string, permissions: PermissionKey[]) => void;

  // Cold Storage
  coldStorages: ColdStorage[];
  addColdStorage: (storage: Omit<ColdStorage, 'id'>) => void;
  updateColdStorage: (id: string, storage: Partial<ColdStorage>) => void;
  deleteColdStorage: (id: string) => void;

  // Master Data
  varieties: Variety[];
  addVariety: (v: Omit<Variety, 'id'>) => void;
  updateVariety: (id: string, v: Partial<Variety>) => void;
  deleteVariety: (id: string) => void;

  seedClasses: SeedClass[];
  addSeedClass: (c: Omit<SeedClass, 'id'>) => void;
  updateSeedClass: (id: string, c: Partial<SeedClass>) => void;
  deleteSeedClass: (id: string) => void;
  addClass: (c: Omit<SeedClass, 'id'>) => void;
  updateClass: (id: string, c: Partial<SeedClass>) => void;
  deleteClass: (id: string) => void;

  grades: Grade[];
  addGrade: (g: Omit<Grade, 'id'>) => void;
  updateGrade: (id: string, g: Partial<Grade>) => void;
  deleteGrade: (id: string) => void;

  productionBlocks: ProductionBlock[];
  addProductionBlock: (b: Omit<ProductionBlock, 'id'>) => void;
  updateProductionBlock: (id: string, b: Partial<ProductionBlock>) => void;
  deleteProductionBlock: (id: string) => void;

  potatoTypes: PotatoType[];
  addPotatoType: (t: Omit<PotatoType, 'id'>) => void;
  updatePotatoType: (id: string, t: Partial<PotatoType>) => void;
  deletePotatoType: (id: string) => void;

  kgPerBagOptions: number[];
  addKgOption: (kg: number) => void;
  addKgPerBagOption: (kg: number) => void;
  deleteKgPerBagOption: (kg: number) => void;

  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;

  // Stock Transactions
  stockTransactions: StockTransaction[];
  addStockTransaction: (
    trx: Omit<StockTransaction, 'id' | 'transactionNo' | 'createdAt' | 'createdBy'>
  ) => { success: boolean; message: string; id?: string };
  updateStockTransaction: (id: string, trx: Partial<StockTransaction>) => void;
  deleteStockTransaction: (id: string) => void;

  // Delivery Transactions
  deliveryTransactions: DeliveryTransaction[];
  addDeliveryTransaction: (
    trx: Omit<DeliveryTransaction, 'id' | 'createdAt' | 'createdBy'> & { deliveryNo?: string }
  ) => { success: boolean; message: string; id?: string };
  updateDeliveryTransaction: (id: string, trx: Partial<DeliveryTransaction>) => void;
  deleteDeliveryTransaction: (id: string) => void;

  // Rent Payments
  rentPayments: RentPayment[];
  addRentPayment: (
    payment: Omit<RentPayment, 'id' | 'createdAt' | 'createdBy'>
  ) => void;
  deleteRentPayment: (id: string) => void;

  // Global Filters
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;

  // Notifications
  notifications: NotificationItem[];
  toasts: NotificationItem[];
  addNotification: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  markNotificationRead: (id: string) => void;
  removeToast: (id: string) => void;
  clearNotifications: () => void;

  // Stock Refresh & Loading
  isLoadingStock: boolean;
  refreshStockData: () => Promise<void> | void;

  // Audit Logs
  auditLogs: AuditLog[];

  // Modal State Controls
  isStockModalOpen: boolean;
  setIsStockModalOpen: (open: boolean) => void;
  isDeliveryModalOpen: boolean;
  setIsDeliveryModalOpen: (open: boolean) => void;
  isRentModalOpen: boolean;
  setIsRentModalOpen: (open: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;

  // Database Backup & Reset
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonString: string) => boolean;
  resetToDemoData: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Load from local storage or initial defaults
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('potato_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem('potato_current_user_id');
    const matched = savedId ? users.find((u) => u.id === savedId) : null;
    return matched || users[0] || INITIAL_USERS[0];
  });

  const [roles, setRoles] = useState<Role[]>(() => {
    const saved = localStorage.getItem('potato_roles');
    return saved ? JSON.parse(saved) : INITIAL_ROLES;
  });

  const [coldStorages, setColdStorages] = useState<ColdStorage[]>(() => {
    const saved = localStorage.getItem('potato_storages');
    return saved ? JSON.parse(saved) : INITIAL_COLD_STORAGES;
  });

  const [varieties, setVarieties] = useState<Variety[]>(() => {
    const saved = localStorage.getItem('potato_varieties');
    const list: Variety[] = saved ? JSON.parse(saved) : INITIAL_VARIETIES;
    const missing = INITIAL_VARIETIES.filter(
      (iv) => !list.some((v) => v.id === iv.id || v.name.toLowerCase() === iv.name.toLowerCase())
    );
    return missing.length > 0 ? [...list, ...missing] : list;
  });

  const [seedClasses, setSeedClasses] = useState<SeedClass[]>(() => {
    const saved = localStorage.getItem('potato_classes');
    const list: SeedClass[] = saved ? JSON.parse(saved) : INITIAL_CLASSES;
    const missing = INITIAL_CLASSES.filter(
      (ic) => !list.some((c) => c.id === ic.id || c.name.toLowerCase() === ic.name.toLowerCase())
    );
    return missing.length > 0 ? [...list, ...missing] : list;
  });

  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem('potato_grades');
    return saved ? JSON.parse(saved) : INITIAL_GRADES;
  });

  const [productionBlocks, setProductionBlocks] = useState<ProductionBlock[]>(() => {
    const saved = localStorage.getItem('potato_blocks');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTION_BLOCKS;
  });

  const [potatoTypes, setPotatoTypes] = useState<PotatoType[]>(() => {
    const saved = localStorage.getItem('potato_types');
    return saved ? JSON.parse(saved) : INITIAL_POTATO_TYPES;
  });

  const [kgPerBagOptions, setKgPerBagOptions] = useState<number[]>(() => {
    const saved = localStorage.getItem('potato_kg_options');
    return saved ? JSON.parse(saved) : INITIAL_KG_PER_BAG_OPTIONS;
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('potato_company_settings');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_SETTINGS;
  });

  // --- INVENTORY REDUCER STATE ---
  const [inventory, dispatchInventory] = useReducer(inventoryReducer, undefined, () => {
    const savedStock = localStorage.getItem('potato_stock_txns');
    const savedDelivery = localStorage.getItem('potato_delivery_txns');
    let stockTransactions: StockTransaction[] = savedStock ? JSON.parse(savedStock) : INITIAL_STOCK_TRANSACTIONS;
    if (savedStock) {
      const missing = INITIAL_STOCK_TRANSACTIONS.filter(
        (ist) => !stockTransactions.some((st) => st.id === ist.id)
      );
      if (missing.length > 0) {
        stockTransactions = [...stockTransactions, ...missing];
      }
    }
    return {
      stockTransactions,
      deliveryTransactions: savedDelivery ? JSON.parse(savedDelivery) : INITIAL_DELIVERY_TRANSACTIONS,
    };
  });

  const inventoryRef = useRef<InventoryState>(inventory);
  inventoryRef.current = inventory;

  const lastStockSubmissionTimeRef = useRef<number>(0);
  const lastDeliverySubmissionTimeRef = useRef<number>(0);

  const [rentPayments, setRentPayments] = useState<RentPayment[]>(() => {
    try {
      const saved = localStorage.getItem('potato_rent_payments');
      const list: RentPayment[] = saved ? JSON.parse(saved) : INITIAL_RENT_PAYMENTS;
      return list.map((p) => {
        const amt = p.amount ?? p.amountPaid ?? 0;
        const mode = p.paymentMode || (p.paymentMethod === 'cheque' ? 'Cheque' : p.paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer');
        const method = p.paymentMethod || (mode === 'Cheque' ? 'cheque' : mode === 'Cash' ? 'cash' : 'bank_transfer');
        const ref = p.referenceNo || p.paymentRef || `TXN-${p.id}`;
        return {
          ...p,
          amount: amt,
          amountPaid: amt,
          paymentMode: mode,
          paymentMethod: method,
          referenceNo: ref,
          paymentRef: ref,
          voucherNo: p.voucherNo || ref,
          bankName: p.bankName || (method !== 'cash' ? 'Commercial Bank' : undefined),
        };
      });
    } catch {
      return INITIAL_RENT_PAYMENTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('potato_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Global filters
  const [filters, setFilters] = useState<FilterState>({});

  // Modal controls
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Stock loading & refresh
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const refreshStockData = async () => {
    setIsLoadingStock(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      addNotification('Data Refreshed', 'Latest inventory records synchronized.', 'success');
    } finally {
      setIsLoadingStock(false);
    }
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('potato_users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem('potato_roles', JSON.stringify(roles));
  }, [roles]);
  useEffect(() => {
    localStorage.setItem('potato_storages', JSON.stringify(coldStorages));
  }, [coldStorages]);
  useEffect(() => {
    localStorage.setItem('potato_varieties', JSON.stringify(varieties));
  }, [varieties]);
  useEffect(() => {
    localStorage.setItem('potato_classes', JSON.stringify(seedClasses));
  }, [seedClasses]);
  useEffect(() => {
    localStorage.setItem('potato_grades', JSON.stringify(grades));
  }, [grades]);
  useEffect(() => {
    localStorage.setItem('potato_blocks', JSON.stringify(productionBlocks));
  }, [productionBlocks]);
  useEffect(() => {
    localStorage.setItem('potato_types', JSON.stringify(potatoTypes));
  }, [potatoTypes]);
  useEffect(() => {
    localStorage.setItem('potato_stock_txns', JSON.stringify(inventory.stockTransactions));
  }, [inventory.stockTransactions]);
  useEffect(() => {
    localStorage.setItem('potato_delivery_txns', JSON.stringify(inventory.deliveryTransactions));
  }, [inventory.deliveryTransactions]);
  useEffect(() => {
    localStorage.setItem('potato_rent_payments', JSON.stringify(rentPayments));
  }, [rentPayments]);
  useEffect(() => {
    localStorage.setItem('potato_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem('potato_company_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  const addNotification = (
    title: string,
    message: string,
    type: 'success' | 'warning' | 'error' | 'info'
  ) => {
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now() + Math.random().toString(36).substring(2, 7),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
  };

  const addToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    addNotification('System Notification', message, type);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const logAction = (
    action: string,
    module: string,
    details: string,
    recordId?: string,
    prevVal?: string,
    newVal?: string
  ) => {
    const entry: AuditLog = {
      id: 'audit-' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userEmail: currentUser.email,
      action,
      module,
      entity: module,
      recordId,
      entityId: recordId,
      previousValue: prevVal,
      newValue: newVal,
      timestamp: new Date().toISOString(),
      details,
    };
    setAuditLogs((prev) => [entry, ...prev.slice(0, 499)]);
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    const role = roles.find((r) => r.id === currentUser.roleId || r.roleName === currentUser.roleName);
    if (!role) return false;
    if (role.roleName === 'Super Admin') return true;
    return role.permissions.includes(permission);
  };

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      localStorage.setItem('potato_current_user_id', target.id);
      logAction('LOGIN', 'AUTH', `Switched active session to user ${target.fullName}`);
      addNotification('User Switched', `Logged in as ${target.fullName} (${target.roleName})`, 'info');
    }
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: 'user-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    logAction('CREATE', 'USER', `Created new user account ${newUser.fullName} (${newUser.roleName})`, newUser.id);
    addNotification('User Created', `User ${newUser.fullName} added successfully.`, 'success');
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...updates }));
    }
    logAction('UPDATE', 'USER', `Updated user details for ${userId}`, userId);
    addNotification('User Updated', 'User profile updated successfully.', 'success');
  };

  const deleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      addNotification('Error', 'Cannot delete currently active user.', 'error');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    logAction('DELETE', 'USER', `Deleted user account ${userId}`, userId);
    addNotification('User Removed', 'User account deleted.', 'info');
  };

  const updateRolePermissions = (roleId: string, permissions: PermissionKey[]) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, permissions } : r))
    );
    logAction('UPDATE', 'SETTINGS', `Updated permissions for role ${roleId}`);
    addNotification('Permissions Updated', 'Role permissions saved.', 'success');
  };

  const addColdStorage = (storageData: Omit<ColdStorage, 'id'>) => {
    const newStorage: ColdStorage = {
      ...storageData,
      id: 'cs-' + Date.now(),
    };
    setColdStorages((prev) => [...prev, newStorage]);
    logAction('CREATE', 'COLD_STORAGE', `Added cold storage facility: ${newStorage.name}`, newStorage.id);
    addNotification('Facility Added', `Cold storage ${newStorage.name} registered.`, 'success');
  };

  const updateColdStorage = (id: string, updates: Partial<ColdStorage>) => {
    setColdStorages((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    logAction('UPDATE', 'COLD_STORAGE', `Updated cold storage ${id}`, id);
    addNotification('Facility Updated', 'Cold storage record updated.', 'success');
  };

  const deleteColdStorage = (id: string) => {
    setColdStorages((prev) => prev.filter((c) => c.id !== id));
    logAction('DELETE', 'COLD_STORAGE', `Removed cold storage ${id}`, id);
    addNotification('Facility Removed', 'Cold storage facility deleted.', 'info');
  };

  const addVariety = (v: Omit<Variety, 'id'>) => {
    const item: Variety = { ...v, id: 'var-' + Date.now() };
    setVarieties((prev) => [...prev, item]);
    logAction('CREATE', 'SETTINGS', `Added potato variety: ${item.name}`, item.id);
    addNotification('Variety Added', `${item.name} added to master varieties.`, 'success');
  };

  const updateVariety = (id: string, v: Partial<Variety>) => {
    setVarieties((prev) => prev.map((item) => (item.id === id ? { ...item, ...v } : item)));
    logAction('UPDATE', 'SETTINGS', `Updated variety ${id}`, id);
  };

  const deleteVariety = (id: string) => {
    setVarieties((prev) => prev.filter((item) => item.id !== id));
    logAction('DELETE', 'SETTINGS', `Deleted variety ${id}`, id);
  };

  const addSeedClass = (c: Omit<SeedClass, 'id'>) => {
    const item: SeedClass = { ...c, id: 'class-' + Date.now() };
    setSeedClasses((prev) => [...prev, item]);
    logAction('CREATE', 'SETTINGS', `Added seed class: ${item.name}`, item.id);
  };

  const updateSeedClass = (id: string, c: Partial<SeedClass>) => {
    setSeedClasses((prev) => prev.map((item) => (item.id === id ? { ...item, ...c } : item)));
  };

  const deleteSeedClass = (id: string) => {
    setSeedClasses((prev) => prev.filter((item) => item.id !== id));
  };

  const addGrade = (g: Omit<Grade, 'id'>) => {
    const item: Grade = { ...g, id: 'grade-' + Date.now() };
    setGrades((prev) => [...prev, item]);
    logAction('CREATE', 'SETTINGS', `Added potato grade: ${item.name}`, item.id);
  };

  const updateGrade = (id: string, g: Partial<Grade>) => {
    setGrades((prev) => prev.map((item) => (item.id === id ? { ...item, ...g } : item)));
  };

  const deleteGrade = (id: string) => {
    setGrades((prev) => prev.filter((item) => item.id !== id));
  };

  const addProductionBlock = (b: Omit<ProductionBlock, 'id'>) => {
    const item: ProductionBlock = { ...b, id: 'block-' + Date.now() };
    setProductionBlocks((prev) => [...prev, item]);
    logAction('CREATE', 'SETTINGS', `Added production block: ${item.name}`, item.id);
  };

  const updateProductionBlock = (id: string, b: Partial<ProductionBlock>) => {
    setProductionBlocks((prev) => prev.map((item) => (item.id === id ? { ...item, ...b } : item)));
  };

  const deleteProductionBlock = (id: string) => {
    setProductionBlocks((prev) => prev.filter((item) => item.id !== id));
  };

  const addPotatoType = (t: Omit<PotatoType, 'id'>) => {
    const item: PotatoType = { ...t, id: 'type-' + Date.now() };
    setPotatoTypes((prev) => [...prev, item]);
    logAction('CREATE', 'SETTINGS', `Added potato type: ${item.name}`, item.id);
  };

  const updatePotatoType = (id: string, t: Partial<PotatoType>) => {
    setPotatoTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...t } : item)));
  };

  const deletePotatoType = (id: string) => {
    setPotatoTypes((prev) => prev.filter((item) => item.id !== id));
  };

  const addKgOption = (kg: number) => {
    if (!kgPerBagOptions.includes(kg) && kg > 0) {
      setKgPerBagOptions((prev) => [...prev, kg].sort((a, b) => a - b));
    }
  };

  const addKgPerBagOption = (kg: number) => {
    addKgOption(kg);
  };

  const deleteKgPerBagOption = (kg: number) => {
    setKgPerBagOptions((prev) => prev.filter((item) => item !== kg));
  };

  const addClass = addSeedClass;
  const updateClass = updateSeedClass;
  const deleteClass = deleteSeedClass;

  const updateCompanySettings = (settings: Partial<CompanySettings>) => {
    setCompanySettings((prev) => ({ ...prev, ...settings }));
    logAction('UPDATE', 'SETTINGS', 'Updated company profile settings');
    addNotification('Settings Saved', 'Company configurations updated.', 'success');
  };

  const addStockTransaction = (
    trxData: Omit<StockTransaction, 'id' | 'transactionNo' | 'createdAt' | 'createdBy'>
  ): { success: boolean; message: string; id?: string } => {
    const now = Date.now();
    if (now - lastStockSubmissionTimeRef.current < 250) {
      const recent = inventoryRef.current.stockTransactions[0];
      if (
        recent &&
        recent.kblChallanNo.toLowerCase() === trxData.kblChallanNo.toLowerCase() &&
        recent.srNo.toLowerCase() === trxData.srNo.toLowerCase()
      ) {
        return { success: false, message: 'Duplicate submission prevented.' };
      }
    }
    lastStockSubmissionTimeRef.current = now;

    if (!trxData.kblChallanNo || !trxData.srNo) {
      return { success: false, message: 'Challan No and SR No are required.' };
    }
    if (trxData.sackQuantity <= 0) {
      return { success: false, message: 'Sack Quantity must be greater than zero.' };
    }

    const duplicate = inventoryRef.current.stockTransactions.find(
      (s) =>
        s.kblChallanNo.toLowerCase() === trxData.kblChallanNo.toLowerCase() &&
        s.srNo.toLowerCase() === trxData.srNo.toLowerCase() &&
        s.coldStorageId === trxData.coldStorageId
    );
    if (duplicate) {
      addNotification(
        'Warning: Existing Challan & SR',
        `A record with Challan ${trxData.kblChallanNo} and SR ${trxData.srNo} already exists in this facility.`,
        'warning'
      );
    }

    const nextIdx = inventoryRef.current.stockTransactions.length + 1;
    const trxNo = `TRX-2024-${String(nextIdx).padStart(3, '0')}`;
    const newTrx: StockTransaction = {
      ...trxData,
      id: 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      transactionNo: trxNo,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.fullName,
    };

    inventoryRef.current = {
      ...inventoryRef.current,
      stockTransactions: [newTrx, ...inventoryRef.current.stockTransactions],
    };

    dispatchInventory({ type: 'ADD_STOCK', payload: newTrx });
    logAction(
      'CREATE',
      'STOCK',
      `Stock entry: ${newTrx.kblChallanNo} (SR: ${newTrx.srNo}) - ${newTrx.sackQuantity} bags (${newTrx.totalMt} MT)`,
      newTrx.id
    );
    addNotification(
      'Stock Received',
      `Challan ${newTrx.kblChallanNo} (${newTrx.sackQuantity} bags) saved successfully.`,
      'success'
    );
    return { success: true, message: 'Stock received successfully', id: newTrx.id };
  };

  const updateStockTransaction = (id: string, trx: Partial<StockTransaction>) => {
    dispatchInventory({ type: 'UPDATE_STOCK', id, updates: trx });
    inventoryRef.current = {
      ...inventoryRef.current,
      stockTransactions: inventoryRef.current.stockTransactions.map((s) =>
        s.id === id ? { ...s, ...trx, updatedAt: new Date().toISOString() } : s
      ),
    };
    logAction('UPDATE', 'STOCK', `Updated stock receiving record ${id}`, id);
    addNotification('Stock Updated', 'Stock transaction modified.', 'success');
  };

  const deleteStockTransaction = (id: string) => {
    dispatchInventory({ type: 'DELETE_STOCK', id });
    inventoryRef.current = {
      ...inventoryRef.current,
      stockTransactions: inventoryRef.current.stockTransactions.filter((s) => s.id !== id),
    };
    logAction('DELETE', 'STOCK', `Deleted stock receiving record ${id}`, id);
    addNotification('Stock Deleted', 'Stock transaction removed.', 'info');
  };

  const addDeliveryTransaction = (
    trxData: Omit<DeliveryTransaction, 'id' | 'createdAt' | 'createdBy'> & { deliveryNo?: string }
  ): { success: boolean; message: string; id?: string } => {
    const now = Date.now();
    if (now - lastDeliverySubmissionTimeRef.current < 250) {
      const recent = inventoryRef.current.deliveryTransactions[0];
      if (
        recent &&
        recent.coldStorageId === trxData.coldStorageId &&
        recent.varietyId === trxData.varietyId &&
        recent.customerReceiver === trxData.customerReceiver
      ) {
        return { success: false, message: 'Duplicate submission prevented.' };
      }
    }
    lastDeliverySubmissionTimeRef.current = now;

    if (trxData.sackQuantity <= 0) {
      return { success: false, message: 'Delivery sack quantity must be greater than zero.' };
    }

    const totalMatchingStock = inventoryRef.current.stockTransactions
      .filter(
        (s) =>
          s.status === 'approved' &&
          s.coldStorageId === trxData.coldStorageId &&
          s.varietyId === trxData.varietyId &&
          s.classId === trxData.classId &&
          s.gradeId === trxData.gradeId
      )
      .reduce((acc, s) => acc + s.sackQuantity, 0);

    const totalPriorDelivered = inventoryRef.current.deliveryTransactions
      .filter(
        (d) =>
          d.status === 'approved' &&
          d.coldStorageId === trxData.coldStorageId &&
          d.varietyId === trxData.varietyId &&
          d.classId === trxData.classId &&
          d.gradeId === trxData.gradeId
      )
      .reduce((acc, d) => acc + d.sackQuantity, 0);

    const availableBags = totalMatchingStock - totalPriorDelivered;

    if (trxData.sackQuantity > availableBags) {
      addNotification(
        'Delivery Exceeds Stock',
        `Cannot deliver ${trxData.sackQuantity} bags. Only ${availableBags} bags available in this variety/class/grade batch.`,
        'error'
      );
      return {
        success: false,
        message: `Requested quantity (${trxData.sackQuantity} bags) exceeds available stock (${availableBags} bags).`,
      };
    }

    const nextIdx = inventoryRef.current.deliveryTransactions.length + 1;
    const deliveryNo = trxData.deliveryNo || `DEL-2024-${String(nextIdx).padStart(3, '0')}`;
    const newDel: DeliveryTransaction = {
      ...trxData,
      id: 'del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      deliveryNo,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.fullName,
    };

    inventoryRef.current = {
      ...inventoryRef.current,
      deliveryTransactions: [newDel, ...inventoryRef.current.deliveryTransactions],
    };

    dispatchInventory({ type: 'ADD_DELIVERY', payload: newDel });
    logAction(
      'CREATE',
      'DELIVERY',
      `Stock delivery: ${newDel.deliveryNo} - ${newDel.sackQuantity} bags to ${newDel.customerReceiver}`,
      newDel.id
    );
    addNotification(
      'Stock Delivered',
      `Dispatched ${newDel.sackQuantity} bags via ${newDel.deliveryNo} to ${newDel.customerReceiver}.`,
      'success'
    );
    return { success: true, message: 'Delivery recorded successfully', id: newDel.id };
  };

  const updateDeliveryTransaction = (id: string, trx: Partial<DeliveryTransaction>) => {
    dispatchInventory({ type: 'UPDATE_DELIVERY', id, updates: trx });
    inventoryRef.current = {
      ...inventoryRef.current,
      deliveryTransactions: inventoryRef.current.deliveryTransactions.map((d) =>
        d.id === id ? { ...d, ...trx } : d
      ),
    };
    logAction('UPDATE', 'DELIVERY', `Updated delivery record ${id}`, id);
    addNotification('Delivery Updated', 'Delivery transaction modified.', 'success');
  };

  const deleteDeliveryTransaction = (id: string) => {
    dispatchInventory({ type: 'DELETE_DELIVERY', id });
    inventoryRef.current = {
      ...inventoryRef.current,
      deliveryTransactions: inventoryRef.current.deliveryTransactions.filter((d) => d.id !== id),
    };
    logAction('DELETE', 'DELIVERY', `Deleted delivery record ${id}`, id);
    addNotification('Delivery Deleted', 'Delivery transaction removed.', 'info');
  };

  const addRentPayment = (paymentData: Omit<RentPayment, 'id' | 'createdAt' | 'createdBy'>) => {
    const amt = paymentData.amount ?? paymentData.amountPaid ?? 0;
    const mode = paymentData.paymentMode || (paymentData.paymentMethod === 'cheque' ? 'Cheque' : paymentData.paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer');
    const method = paymentData.paymentMethod || (mode === 'Cheque' ? 'cheque' : mode === 'Cash' ? 'cash' : 'bank_transfer');
    const ref = paymentData.referenceNo || paymentData.paymentRef || `TXN-${Date.now().toString().slice(-6)}`;
    const newPayment: RentPayment = {
      ...paymentData,
      id: 'rent-' + Date.now(),
      amount: amt,
      amountPaid: amt,
      paymentMode: mode,
      paymentMethod: method,
      referenceNo: ref,
      paymentRef: ref,
      voucherNo: paymentData.voucherNo || ref,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.fullName,
    };
    setRentPayments((prev) => [newPayment, ...prev]);
    logAction(
      'RENT_PAYMENT',
      'RENT',
      `Processed rent payment of ${newPayment.amountPaid.toLocaleString()} ${companySettings.currency} for storage ${newPayment.coldStorageId}`,
      newPayment.id
    );
    addNotification(
      'Rent Payment Logged',
      `Payment of ${newPayment.amountPaid.toLocaleString()} ${companySettings.currency} recorded.`,
      'success'
    );
  };

  const deleteRentPayment = (id: string) => {
    setRentPayments((prev) => prev.filter((p) => p.id !== id));
    logAction('DELETE', 'RENT', `Deleted rent payment ${id}`, id);
    addNotification('Payment Deleted', 'Rent payment record removed.', 'info');
  };

  const resetFilters = () => {
    setFilters({});
  };

  const exportDatabaseJson = (): string => {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      users,
      roles,
      coldStorages,
      varieties,
      seedClasses,
      grades,
      productionBlocks,
      potatoTypes,
      kgPerBagOptions,
      stockTransactions: inventory.stockTransactions,
      deliveryTransactions: inventory.deliveryTransactions,
      rentPayments,
      auditLogs,
      companySettings,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') return false;
      if (Array.isArray(data.users)) setUsers(data.users);
      if (Array.isArray(data.roles)) setRoles(data.roles);
      if (Array.isArray(data.coldStorages)) setColdStorages(data.coldStorages);
      if (Array.isArray(data.varieties)) setVarieties(data.varieties);
      if (Array.isArray(data.seedClasses)) setSeedClasses(data.seedClasses);
      if (Array.isArray(data.grades)) setGrades(data.grades);
      if (Array.isArray(data.productionBlocks)) setProductionBlocks(data.productionBlocks);
      if (Array.isArray(data.potatoTypes)) setPotatoTypes(data.potatoTypes);
      if (Array.isArray(data.kgPerBagOptions)) setKgPerBagOptions(data.kgPerBagOptions);
      if (Array.isArray(data.stockTransactions) && Array.isArray(data.deliveryTransactions)) {
        dispatchInventory({
          type: 'RESET_INVENTORY',
          payload: {
            stockTransactions: data.stockTransactions,
            deliveryTransactions: data.deliveryTransactions,
          },
        });
        inventoryRef.current = {
          stockTransactions: data.stockTransactions,
          deliveryTransactions: data.deliveryTransactions,
        };
      }
      if (Array.isArray(data.rentPayments)) setRentPayments(data.rentPayments);
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      if (data.companySettings) setCompanySettings(data.companySettings);

      addNotification('Data Restored', 'System database successfully loaded from backup.', 'success');
      return true;
    } catch {
      return false;
    }
  };

  const resetAllData = () => {
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setRoles(INITIAL_ROLES);
    setColdStorages(INITIAL_COLD_STORAGES);
    setVarieties(INITIAL_VARIETIES);
    setSeedClasses(INITIAL_CLASSES);
    setGrades(INITIAL_GRADES);
    setProductionBlocks(INITIAL_PRODUCTION_BLOCKS);
    setPotatoTypes(INITIAL_POTATO_TYPES);
    setKgPerBagOptions(INITIAL_KG_PER_BAG_OPTIONS);
    dispatchInventory({
      type: 'RESET_INVENTORY',
      payload: {
        stockTransactions: INITIAL_STOCK_TRANSACTIONS,
        deliveryTransactions: INITIAL_DELIVERY_TRANSACTIONS,
      },
    });
    inventoryRef.current = {
      stockTransactions: INITIAL_STOCK_TRANSACTIONS,
      deliveryTransactions: INITIAL_DELIVERY_TRANSACTIONS,
    };
    setRentPayments(INITIAL_RENT_PAYMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCompanySettings(INITIAL_COMPANY_SETTINGS);
    setFilters({});
    localStorage.clear();
    addNotification('Data Reset', 'Restored 2024 seed harvest reference dataset.', 'info');
  };

  const resetToDemoData = resetAllData;

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        users,
        roles,
        hasPermission,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        updateRolePermissions,
        coldStorages,
        addColdStorage,
        updateColdStorage,
        deleteColdStorage,
        varieties,
        addVariety,
        updateVariety,
        deleteVariety,
        seedClasses,
        addSeedClass,
        updateSeedClass,
        deleteSeedClass,
        addClass,
        updateClass,
        deleteClass,
        grades,
        addGrade,
        updateGrade,
        deleteGrade,
        productionBlocks,
        addProductionBlock,
        updateProductionBlock,
        deleteProductionBlock,
        potatoTypes,
        addPotatoType,
        updatePotatoType,
        deletePotatoType,
        kgPerBagOptions,
        addKgOption,
        addKgPerBagOption,
        deleteKgPerBagOption,
        companySettings,
        updateCompanySettings,
        stockTransactions: inventory.stockTransactions,
        addStockTransaction,
        updateStockTransaction,
        deleteStockTransaction,
        deliveryTransactions: inventory.deliveryTransactions,
        addDeliveryTransaction,
        updateDeliveryTransaction,
        deleteDeliveryTransaction,
        rentPayments,
        addRentPayment,
        deleteRentPayment,
        filters,
        setFilters,
        resetFilters,
        notifications,
        toasts: notifications,
        addNotification,
        addToast,
        markNotificationRead,
        removeToast: markNotificationRead,
        clearNotifications,
        auditLogs,
        isLoadingStock,
        refreshStockData,
        isStockModalOpen,
        setIsStockModalOpen,
        isDeliveryModalOpen,
        setIsDeliveryModalOpen,
        isRentModalOpen,
        setIsRentModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        isThemeModalOpen,
        setIsThemeModalOpen,
        exportDatabaseJson,
        importDatabaseJson,
        resetToDemoData,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
