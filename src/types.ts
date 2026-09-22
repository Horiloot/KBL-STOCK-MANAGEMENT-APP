export type TableDensity = 'compact' | 'normal' | 'comfortable';

export type UserRole =
  | 'admin'
  | 'manager'
  | 'operator'
  | 'super_admin'
  | 'store_officer'
  | 'accounts_officer'
  | 'viewer';

export type PermissionKey =
  | 'view_stock'
  | 'add_stock'
  | 'edit_stock'
  | 'delete_stock'
  | 'view_delivery'
  | 'add_delivery'
  | 'edit_delivery'
  | 'delete_delivery'
  | 'view_cold_storage'
  | 'manage_cold_storage'
  | 'manage_rent'
  | 'view_reports'
  | 'export_data'
  | 'manage_settings'
  | 'view_settings'
  | 'manage_users'
  | 'view_users'
  | 'view_audit_logs';

export interface Role {
  id: string;
  roleName: string;
  role: UserRole;
  description: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  department?: string;
  role: UserRole;
  roleId?: string;
  roleName: string;
  permissions?: string[];
  isActive: boolean;
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface ColdStorage {
  id: string;
  code: string;
  name: string;
  location: string;
  district?: string;
  capacity: number;
  capacityMt?: number;
  rentPerBag: number;
  contactPerson?: string;
  contactPhone?: string;
  phone?: string;
  status?: string;
  isActive: boolean;
}

export interface Variety {
  id: string;
  name: string;
  code: string;
  type?: string;
  description?: string;
}

export type PotatoVariety = Variety;

export interface SeedClass {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Grade {
  id: string;
  name: string;
  code: string;
  sizeRange?: string;
  description?: string;
}

export type SizeGrade = Grade;

export interface ProductionBlock {
  id: string;
  name: string;
  code: string;
  location?: string;
  description?: string;
}

export interface PotatoType {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface StockTransaction {
  id: string;
  transactionNo: string;
  entryNo?: string;
  kblChallanNo: string;
  challanNo?: string;
  srNo: string;
  date: string;
  coldStorageId: string;
  varietyId: string;
  classId: string;
  gradeId: string;
  productionBlockId?: string;
  blockId?: string;
  farmBlock?: string;
  potatoTypeId?: string;
  typeId?: string;
  sackQuantity: number;
  kgPerBag: number;
  totalKg: number;
  totalMt: number;
  truckNo?: string;
  driverName?: string;
  driverContact?: string;
  growerFarmerName?: string;
  status: 'approved' | 'pending' | 'rejected';
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryTransaction {
  id: string;
  deliveryNo: string;
  srNo?: string;
  doNumber?: string;
  deliveryReference?: string;
  date: string;
  customerReceiver: string;
  clientReceiver?: string;
  destination?: string;
  coldStorageId: string;
  varietyId: string;
  classId: string;
  gradeId: string;
  productionBlockId?: string;
  potatoTypeId?: string;
  sackQuantity: number;
  kgPerBag: number;
  totalKg: number;
  totalMt: number;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  remarks?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RentPayment {
  id: string;
  coldStorageId: string;
  date: string;
  amount: number;
  amountPaid: number;
  paymentMode?: string;
  paymentMethod?: 'bank_transfer' | 'cheque' | 'cash';
  referenceNo?: string;
  paymentRef?: string;
  voucherNo?: string;
  bankName?: string;
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  action: string;
  module?: string;
  entity?: string;
  recordId?: string;
  entityId?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  details: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
  read: boolean;
}

export interface CompanySettings {
  companyName: string;
  name?: string;
  companyTagline?: string;
  tagline?: string;
  subtitle?: string;
  season?: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  fiscalYear: string;
  logoText?: string;
  logoUrl?: string;
}

export interface FilterState {
  coldStorageId?: string;
  varietyId?: string;
  classId?: string;
  gradeId?: string;
  productionBlockId?: string;
  potatoTypeId?: string;
  challanNo?: string;
  srNo?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type NavigationTab =
  | 'dashboard'
  | 'stock-entry'
  | 'stock-register'
  | 'stock-balance'
  | 'delivery-register'
  | 'cold-storage'
  | 'rent-management'
  | 'reports-stock-in'
  | 'reports-stock-out'
  | 'reports-closing-stock'
  | 'reports-in-out-all-records'
  | 'reports-stock-combined'
  | 'reports-stock'
  | 'reports-delivery'
  | 'reports-storage'
  | 'reports-cold-storage'
  | 'reports-sr'
  | 'reports-sr-wise'
  | 'reports-challan'
  | 'reports-challan-wise'
  | 'reports-dimensions'
  | 'master-data'
  | 'users-roles'
  | 'audit-logs'
  | 'settings';

export type ThemeName =
  | 'corporate-light'
  | 'corporate-dark'
  | 'ocean-blue'
  | 'emerald-green'
  | 'royal-purple'
  | 'slate-gray'
  | 'modern-teal'
  | 'executive-navy'
  | 'warm-sand'
  | 'high-contrast';

export type ThemeMode = 'light' | 'dark' | 'system';
