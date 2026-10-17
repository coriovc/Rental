
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  monthlyRent: number;
  startDate: string;
  status: 'active' | 'late' | 'inactive';
  contractUrl?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  type: 'Apartment' | 'House' | 'Office';
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
  date: string;
  month: string;
  status: 'paid' | 'pending';
}

export type View = 'dashboard' | 'tenants' | 'properties' | 'settings';
