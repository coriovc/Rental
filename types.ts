export interface Tenant {
  id: string;
  name: string;
  idNumber?: string;
  email?: string;
  phone: string;
  propertyId: string;
  monthlyRent: number;
  includeInternet?: boolean;
  startDate: string;
  contractDuration?: number; // 6, 12, 18, 24 meses
  status: 'active' | 'late' | 'inactive';
  contractUrl?: string;
}

export type PropertyType = 'Apartment' | 'House' | 'Warehouse' | 'Annex';

export interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  price: number;
  isOccupied: boolean;
  description?: string;
  images?: string[];
  specs?: {
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    parking?: boolean;
  };
}

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  amountBs?: number;
  exchangeRate?: number;
  date: string;
  month: string;
  status: 'paid' | 'pending';
}

export type ExpenseCategory = 
  | 'Mantenimiento' 
  | 'Reparaciones' 
  | 'Servicios' 
  | 'Condominio' 
  | 'Pintura' 
  | 'Plomería' 
  | 'Electricidad' 
  | 'Limpieza' 
  | 'Impuestos' 
  | 'Otros';

export interface Expense {
  id: string;
  propertyId?: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  amountBs?: number;
  exchangeRate?: number;
  date: string;
  month: string;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface PdfConfig {
  companyName?: string;
  companyRif?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  notes?: string;
}

export interface AppSettings {
  ws_reminder_template?: string;
  ws_confirmation_template?: string;
  bcv_rate?: number;
  pdf_config?: PdfConfig;
  theme?: 'light' | 'dark';
  [key: string]: any;
}

export type View = 'dashboard' | 'tenants' | 'properties' | 'payments' | 'expenses' | 'settings';

