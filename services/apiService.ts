import { Tenant, Property, Payment, Expense, AppSettings } from '../types';

const API_URL = './api.php';

export const apiService = {
  async fetchAll(): Promise<{
    properties: Property[];
    tenants: Tenant[];
    payments: Payment[];
    expenses: Expense[];
    settings: AppSettings;
  }> {
    try {
      const res = await fetch(`${API_URL}?action=get_all`);
      const data = await res.json();
      if (data.success) {
        let pdfCfg = data.settings?.pdf_config;
        if (typeof pdfCfg === 'string') {
          try { pdfCfg = JSON.parse(pdfCfg); } catch {}
        }
        return {
          properties: data.properties || [],
          tenants: data.tenants || [],
          payments: data.payments || [],
          expenses: data.expenses || [],
          settings: {
            ...data.settings,
            pdf_config: pdfCfg,
            bcv_rate: data.settings?.bcv_rate ? parseFloat(data.settings.bcv_rate) : 52.50
          }
        };
      }
      throw new Error(data.error || 'Error al obtener datos');
    } catch (err) {
      console.warn('Fallo al conectar con la API de PHP, usando datos locales:', err);
      throw err;
    }
  },

  async saveTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    const res = await fetch(`${API_URL}?action=save_tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant),
    });
    const data = await res.json();
    if (data.success && data.tenant) {
      return data.tenant;
    }
    throw new Error(data.error || 'Error al guardar inquilino');
  },

  async deleteTenant(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=delete_tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return !!data.success;
  },

  async saveProperty(property: Partial<Property>): Promise<Property> {
    const res = await fetch(`${API_URL}?action=save_property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property),
    });
    const data = await res.json();
    if (data.success && data.property) {
      return data.property;
    }
    throw new Error(data.error || 'Error al guardar propiedad');
  },

  async deleteProperty(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=delete_property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return !!data.success;
  },

  async savePayment(payment: Partial<Payment>): Promise<Payment> {
    const res = await fetch(`${API_URL}?action=save_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    const data = await res.json();
    if (data.success && data.payment) {
      return data.payment;
    }
    throw new Error(data.error || 'Error al guardar pago');
  },

  async addPayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
    return this.savePayment(payment);
  },

  async markPaid(paymentId: string): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=mark_paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: paymentId }),
    });
    const data = await res.json();
    return !!data.success;
  },

  async deletePayment(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=delete_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return !!data.success;
  },

  async saveExpense(expense: Partial<Expense>): Promise<Expense> {
    const res = await fetch(`${API_URL}?action=save_expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    const data = await res.json();
    if (data.success && data.expense) {
      return data.expense;
    }
    throw new Error(data.error || 'Error al guardar gasto');
  },

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    return this.saveExpense(expense);
  },

  async deleteExpense(id: string): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=delete_expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return !!data.success;
  },

  async saveSettings(settings: Record<string, any>): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=save_settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return !!data.success;
  },

  async getBcvRate(force: boolean = false): Promise<number> {
    try {
      const res = await fetch(`${API_URL}?action=get_bcv${force ? '&force=1' : ''}`);
      const data = await res.json();
      if (data.success && data.rate) {
        return parseFloat(data.rate);
      }
    } catch (e) {
      console.warn('No se pudo consultar API de BCV:', e);
    }
    return 52.50;
  },

  async resetData(): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=reset_data`, {
      method: 'POST'
    });
    const data = await res.json();
    return !!data.success;
  },

  async importData(backupData: Record<string, any>): Promise<boolean> {
    const res = await fetch(`${API_URL}?action=import_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al importar la copia de seguridad');
    }
    return true;
  }
};
