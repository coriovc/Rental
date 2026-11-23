import { Tenant, Property, Payment, Expense, PdfConfig } from '../types';

export const DEFAULT_WS_REMINDER_TEMPLATE = 
`📅 *Recordatorio de Pago de Alquiler* 🏠

Estimado(a) *{nombre}*, le recordamos cordialmente que dispone de *5 días* para realizar el pago de alquiler correspondiente al mes de *{mes}*.

💵 *Canon de Alquiler:* \${monto} USD
🇻🇪 *Total en Bolívares (Tasa BCV {tasa}):* Bs. {montoBs}

Por favor, reporte su pago una vez realizada la transferencia bancaria o pago móvil. ¡Muchas gracias por su puntualidad! ✨`;

export const DEFAULT_WS_CONFIRMATION_TEMPLATE = 
`✅ *Confirmación de Pago Recibido* 🎉

Estimado(a) *{nombre}*, hemos recibido conforme su pago de alquiler.

🗓 *Mes:* {mes}
💵 *Monto:* \${monto} USD
🇻🇪 *Equivalente en Bolívares:* Bs. {montoBs}
📅 *Fecha de Pago:* {fecha}

¡Gracias por su puntualidad! Su comprobante digital ya ha sido emitido y archivado. 📄✨`;

export const DEFAULT_PDF_CONFIG: PdfConfig = {
  companyName: 'RentFlow Inversiones Inmobiliarias C.A.',
  companyRif: 'J-40582914-8',
  companyPhone: '+58 (412) 123-4567',
  companyEmail: 'administracion@rentflow.com',
  companyAddress: 'Av. Francisco de Miranda, Torre Empresarial, Piso 8, Caracas',
  notes: 'Este documento constituye comprobante válido de pago del canon de arrendamiento y servicios estipulados en el contrato vigente.'
};

export const INITIAL_TENANTS: Tenant[] = [
  { id: '1', name: 'Julian Alvarez', idNumber: 'V-19.824.512', email: 'julian@example.com', phone: '+584121234567', propertyId: 'p1', monthlyRent: 1210, includeInternet: true, startDate: '2023-01-15', contractDuration: 12, status: 'active' },
  { id: '2', name: 'Marta Gomez', idNumber: 'V-15.632.140', email: 'marta@example.com', phone: '+584149876543', propertyId: 'p2', monthlyRent: 2500, includeInternet: false, startDate: '2023-05-10', contractDuration: 24, status: 'late' },
  { id: '3', name: 'Sofia Vergara', idNumber: 'V-22.109.845', email: 'sofia@example.com', phone: '+584245551234', propertyId: 'p3', monthlyRent: 1810, includeInternet: true, startDate: '2024-02-01', contractDuration: 18, status: 'active' },
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
    name: 'Galpón Industrial Central', 
    address: 'Zona Industrial II, Parcela 14', 
    type: 'Warehouse', 
    price: 1800, 
    isOccupied: true,
    description: 'Galpón de almacenamiento de 500m² con portón para gandolas y oficinas administrativas.',
    images: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800'],
    specs: { sqft: 500, bathrooms: 2, parking: true }
  },
  { 
    id: 'p4', 
    name: 'Anexo Residencial Las Mercedes', 
    address: 'Calle Los Naranjos, Qta. Villa', 
    type: 'Annex', 
    price: 650, 
    isOccupied: false,
    description: 'Anexo independiente completamente amoblado, con entrada privada y todos los servicios.',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800'],
    specs: { sqft: 45, bedrooms: 1, bathrooms: 1, parking: true }
  },
];

export const INITIAL_PAYMENTS: Payment[] = [
  { id: 'pay1', tenantId: '1', amount: 1210, amountBs: 63525, exchangeRate: 52.50, date: '2026-03-01', month: 'Marzo', status: 'paid' },
  { id: 'pay2', tenantId: '2', amount: 2500, amountBs: 131250, exchangeRate: 52.50, date: '2026-03-05', month: 'Marzo', status: 'pending' },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp1',
    propertyId: 'p1',
    title: 'Reparación de filtración y pintura baño',
    category: 'Reparaciones',
    amount: 140,
    amountBs: 7350,
    exchangeRate: 52.50,
    date: '2026-11-04',
    month: 'Noviembre',
    paymentMethod: 'Pago Móvil',
    receiptNumber: 'REC-084',
    notes: 'Cambio de tubería flexible y sellado con silicón'
  },
  {
    id: 'exp2',
    propertyId: 'p2',
    title: 'Mantenimiento preventivo bomba de agua y jardín',
    category: 'Mantenimiento',
    amount: 90,
    amountBs: 4725,
    exchangeRate: 52.50,
    date: '2026-11-08',
    month: 'Noviembre',
    paymentMethod: 'Transferencia',
    receiptNumber: 'FAC-1029',
    notes: 'Revisión técnica semestral y poda preventiva'
  }
];

export const storage = {
  get: <T,>(key: string, initial: T): T => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : initial;
    } catch {
      return initial;
    }
  },
  set: <T,>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Error saving to localStorage', e);
    }
  }
};
