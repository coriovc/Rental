
import { Tenant, Property, Payment } from '../types';

export const DEFAULT_WS_TEMPLATE = "Hola {nombre}! Te enviamos el comprobante del pago de alquiler del mes de {mes}. Monto: ${monto}. Saludos!";

export const INITIAL_TENANTS: Tenant[] = [
  { id: '1', name: 'Julian Alvarez', email: 'julian@example.com', phone: '+54911223344', propertyId: 'p1', monthlyRent: 1200, startDate: '2023-01-15', status: 'active' },
  { id: '2', name: 'Marta Gomez', email: 'marta@example.com', phone: '+54911334455', propertyId: 'p2', monthlyRent: 950, startDate: '2023-05-10', status: 'late' },
  { id: '3', name: 'Sofia Vergara', email: 'sofia@example.com', phone: '+54911445566', propertyId: 'p3', monthlyRent: 1500, startDate: '2024-02-01', status: 'active' },
];

export const INITIAL_PROPERTIES: Property[] = [
  { 
    id: 'p1', 
    name: 'Loft Palermo', 
    address: 'Av. Santa Fe 1234', 
    type: 'Apartment', 
    price: 1200, 
    isOccupied: true,
    description: 'Hermoso loft moderno en el corazón de Palermo Soho. Techos altos y mucha luz natural.',
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800'],
    specs: { sqft: 65, bedrooms: 1, bathrooms: 1, parking: true }
  },
  { 
    id: 'p2', 
    name: 'Nordelta House', 
    address: 'Los Alisos 45', 
    type: 'House', 
    price: 2500, 
    isOccupied: true,
    description: 'Espaciosa casa familiar con jardín y piscina. Seguridad 24hs.',
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'],
    specs: { sqft: 220, bedrooms: 4, bathrooms: 3, parking: true }
  },
  { 
    id: 'p3', 
    name: 'Puerto Madero Office', 
    address: 'M. de Justo 500', 
    type: 'Office', 
    price: 1500, 
    isOccupied: true,
    description: 'Oficina premium con vista al río. Lista para entrar.',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800'],
    specs: { sqft: 90, bathrooms: 2, parking: false }
  },
  { 
    id: 'p4', 
    name: 'Recoleta Studio', 
    address: 'Callao 10', 
    type: 'Apartment', 
    price: 800, 
    isOccupied: false,
    description: 'Monoambiente dividido, excelente ubicación y bajas expensas.',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'],
    specs: { sqft: 35, bedrooms: 0, bathrooms: 1, parking: false }
  },
];

export const INITIAL_PAYMENTS: Payment[] = [
  { id: 'pay1', tenantId: '1', amount: 1200, date: '2024-03-01', month: 'March', status: 'paid' },
  { id: 'pay2', tenantId: '2', amount: 950, date: '2024-03-05', month: 'March', status: 'pending' },
];

export const storage = {
  get: <T,>(key: string, initial: T): T => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : initial;
  },
  set: <T,>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
