import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Tenants } from './components/Tenants';
import { Properties } from './components/Properties';
import { PaymentsHistory } from './components/PaymentsHistory';
import { Expenses } from './components/Expenses';
import { Settings } from './components/Settings';
import { 
  INITIAL_TENANTS, 
  INITIAL_PROPERTIES, 
  INITIAL_PAYMENTS, 
  INITIAL_EXPENSES,
  DEFAULT_WS_REMINDER_TEMPLATE,
  DEFAULT_WS_CONFIRMATION_TEMPLATE,
  DEFAULT_PDF_CONFIG,
  storage 
} from './data/mockData';
import { Tenant, Property, Payment, Expense, View, PdfConfig, AppSettings } from './types';
import { apiService } from './services/apiService';
import { repairTemplateEmojis } from './services/pdfService';

const App: React.FC = () => {
  // Persistir la vista activa para que al refrescar la página permanezca en la misma sección
  const [currentView, setView] = useState<View>(() => {
    const saved = storage.get<string>('current_view', 'dashboard');
    const validViews: View[] = ['dashboard', 'tenants', 'properties', 'payments', 'expenses', 'settings'];
    return validViews.includes(saved as View) ? (saved as View) : 'dashboard';
  });

  const [tenants, setTenants] = useState<Tenant[]>(() => storage.get('tenants', INITIAL_TENANTS));
  const [properties, setProperties] = useState<Property[]>(() => storage.get('properties', INITIAL_PROPERTIES));
  const [payments, setPayments] = useState<Payment[]>(() => storage.get('payments', INITIAL_PAYMENTS));
  const [expenses, setExpenses] = useState<Expense[]>(() => storage.get('expenses', INITIAL_EXPENSES));

  // Ajustes del sistema (Tasa BCV, Plantillas, Recibo PDF, Tema)
  const [bcvRate, setBcvRate] = useState<number>(() => storage.get('bcv_rate', 52.50));
  const [wsReminderTemplate, setWsReminderTemplate] = useState<string>(
    () => repairTemplateEmojis(storage.get('ws_reminder_template', DEFAULT_WS_REMINDER_TEMPLATE))
  );
  const [wsConfirmationTemplate, setWsConfirmationTemplate] = useState<string>(
    () => repairTemplateEmojis(storage.get('ws_confirmation_template', DEFAULT_WS_CONFIRMATION_TEMPLATE))
  );
  const [pdfConfig, setPdfConfig] = useState<PdfConfig>(
    () => storage.get('pdf_config', DEFAULT_PDF_CONFIG)
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => storage.get('theme', 'light'));

  // Guardar la vista activa en localStorage
  useEffect(() => {
    storage.set('current_view', currentView);
  }, [currentView]);

  // Aplicar tema claro/oscuro en el DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    storage.set('theme', theme);
  }, [theme]);

  // Actualización automática de la tasa BCV oficial en segundo plano sin pulsar ningún botón
  useEffect(() => {
    const autoUpdateBcvRate = async () => {
      try {
        const liveRate = await apiService.getBcvRate();
        if (liveRate && liveRate > 0) {
          setBcvRate(liveRate);
          storage.set('bcv_rate', liveRate);
        }
      } catch (e) {
        console.warn('Actualización automática de tasa BCV en segundo plano:', e);
      }
    };

    autoUpdateBcvRate();
    // Refrescar automáticamente cada 15 minutos en segundo plano
    const bcvTimer = setInterval(autoUpdateBcvRate, 15 * 60 * 1000);
    return () => clearInterval(bcvTimer);
  }, []);

  // Cargar datos reales desde la base de datos MySQL (PHP) al iniciar
  useEffect(() => {
    apiService.fetchAll().then(data => {
      if (data.tenants && data.tenants.length > 0) setTenants(data.tenants);
      if (data.properties && data.properties.length > 0) setProperties(data.properties);
      if (data.payments && data.payments.length > 0) setPayments(data.payments);
      if (data.expenses && data.expenses.length > 0) setExpenses(data.expenses);
      
      if (data.settings) {
        if (data.settings.bcv_rate) {
          const rateVal = Number(data.settings.bcv_rate);
          setBcvRate(rateVal);
          storage.set('bcv_rate', rateVal);
        }
        if (data.settings.ws_reminder_template) {
          const repaired = repairTemplateEmojis(data.settings.ws_reminder_template);
          setWsReminderTemplate(repaired);
          storage.set('ws_reminder_template', repaired);
        }
        if (data.settings.ws_confirmation_template) {
          const repaired = repairTemplateEmojis(data.settings.ws_confirmation_template);
          setWsConfirmationTemplate(repaired);
          storage.set('ws_confirmation_template', repaired);
        }
        if (data.settings.pdf_config) {
          setPdfConfig(data.settings.pdf_config);
          storage.set('pdf_config', data.settings.pdf_config);
        }
        if (data.settings.theme) {
          setTheme(data.settings.theme as 'light' | 'dark');
        }
      }
    }).catch(err => {
      console.warn('Conexión inicial a la base de datos PHP:', err);
    });
  }, []);

  // Mantener sincronizado localStorage como copia de seguridad
  useEffect(() => storage.set('tenants', tenants), [tenants]);
  useEffect(() => storage.set('properties', properties), [properties]);
  useEffect(() => storage.set('payments', payments), [payments]);
  useEffect(() => storage.set('expenses', expenses), [expenses]);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    apiService.saveSettings({ theme: next }).catch(console.error);
  };

  const handleUpdateBcvRate = (newRate: number) => {
    setBcvRate(newRate);
    storage.set('bcv_rate', newRate);
  };

  const handleSettingsSaved = (settings: AppSettings) => {
    if (settings.bcv_rate) setBcvRate(Number(settings.bcv_rate));
    if (settings.ws_reminder_template) {
      const rep = repairTemplateEmojis(settings.ws_reminder_template);
      setWsReminderTemplate(rep);
      storage.set('ws_reminder_template', rep);
    }
    if (settings.ws_confirmation_template) {
      const rep = repairTemplateEmojis(settings.ws_confirmation_template);
      setWsConfirmationTemplate(rep);
      storage.set('ws_confirmation_template', rep);
    }
    if (settings.pdf_config) setPdfConfig(settings.pdf_config);
    if (settings.theme) setTheme(settings.theme);
  };

  const handleMarkPaid = async (paymentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, status: 'paid', date: today } : p
    ));
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setTenants(prev => prev.map(t => 
        t.id === payment.tenantId ? { ...t, status: 'active' } : t
      ));
    }

    try {
      await apiService.markPaid(paymentId);
    } catch (e) {
      console.error('Error al registrar pago en base de datos:', e);
    }
  };

  const handleAddPayment = async (newPayment: Omit<Payment, 'id'>) => {
    const tempId = `pay-${Date.now()}`;
    const paymentWithId: Payment = { ...newPayment, id: tempId };
    setPayments(prev => [paymentWithId, ...prev]);
    if (newPayment.status === 'paid') {
      setTenants(prev => prev.map(t => 
        t.id === newPayment.tenantId ? { ...t, status: 'active' } : t
      ));
    }

    try {
      const saved = await apiService.addPayment(newPayment);
      if (saved && saved.id) {
        setPayments(prev => prev.map(p => p.id === tempId ? saved : p));
      }
    } catch (e) {
      console.error('Error al guardar pago en base de datos:', e);
    }
  };

  const handleUpdatePayment = async (updatedPayment: Payment) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
    if (updatedPayment.status === 'paid') {
      setTenants(prev => prev.map(t => 
        t.id === updatedPayment.tenantId ? { ...t, status: 'active' } : t
      ));
    }

    try {
      await apiService.savePayment(updatedPayment);
    } catch (e) {
      console.error('Error al modificar pago en base de datos:', e);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
    try {
      await apiService.deletePayment(paymentId);
    } catch (e) {
      console.error('Error al eliminar pago en base de datos:', e);
    }
  };

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    const tempId = `exp-${Date.now()}`;
    const expenseWithId: Expense = { ...newExpense, id: tempId };
    setExpenses(prev => [expenseWithId, ...prev]);

    try {
      const saved = await apiService.addExpense(newExpense);
      if (saved && saved.id) {
        setExpenses(prev => prev.map(e => e.id === tempId ? saved : e));
      }
    } catch (e) {
      console.error('Error al registrar gasto en base de datos:', e);
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
    try {
      await apiService.saveExpense(updatedExpense);
    } catch (e) {
      console.error('Error al modificar gasto en base de datos:', e);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    try {
      await apiService.deleteExpense(expenseId);
    } catch (e) {
      console.error('Error al eliminar gasto de la base de datos:', e);
    }
  };

  const handleAddTenant = async (newTenant: Omit<Tenant, 'id'>) => {
    const tempId = `tenant-${Date.now()}`;
    const tenantWithId: Tenant = { ...newTenant, id: tempId };
    setTenants(prev => [tenantWithId, ...prev]);
    setProperties(prev => prev.map(p => 
      p.id === newTenant.propertyId ? { ...p, isOccupied: true } : p
    ));

    try {
      const saved = await apiService.saveTenant(newTenant);
      if (saved && saved.id) {
        setTenants(prev => prev.map(t => t.id === tempId ? saved : t));
      }
    } catch (e) {
      console.error('Error al agregar inquilino a la base de datos:', e);
    }
  };

  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    const oldTenant = tenants.find(t => t.id === updatedTenant.id);
    if (oldTenant && oldTenant.propertyId !== updatedTenant.propertyId) {
      setProperties(prev => prev.map(p => {
        if (p.id === oldTenant.propertyId) return { ...p, isOccupied: false };
        if (p.id === updatedTenant.propertyId) return { ...p, isOccupied: true };
        return p;
      }));
    }
    setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
    try {
      await apiService.saveTenant(updatedTenant);
    } catch (e) {
      console.error('Error al actualizar inquilino en base de datos:', e);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setProperties(prev => prev.map(p => 
        p.id === tenant.propertyId ? { ...p, isOccupied: false } : p
      ));
    }
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    setPayments(prev => prev.filter(p => p.tenantId !== tenantId));

    try {
      await apiService.deleteTenant(tenantId);
    } catch (e) {
      console.error('Error al eliminar inquilino de la base de datos:', e);
    }
  };

  const handleAddProperty = async (newProperty: Omit<Property, 'id' | 'isOccupied'>) => {
    const tempId = `p-${Date.now()}`;
    const propertyWithId: Property = { ...newProperty, id: tempId, isOccupied: false };
    setProperties(prev => [propertyWithId, ...prev]);

    try {
      const saved = await apiService.saveProperty(newProperty);
      if (saved && saved.id) {
        setProperties(prev => prev.map(p => p.id === tempId ? saved : p));
      }
    } catch (e) {
      console.error('Error al agregar propiedad a la base de datos:', e);
    }
  };

  const handleUpdateProperty = async (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    try {
      await apiService.saveProperty(updatedProperty);
    } catch (e) {
      console.error('Error al actualizar propiedad en base de datos:', e);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    const tenant = tenants.find(t => t.propertyId === propertyId);
    if (tenant) {
      setTenants(prev => prev.filter(t => t.id !== tenant.id));
      setPayments(prev => prev.filter(p => p.tenantId !== tenant.id));
    }

    try {
      await apiService.deleteProperty(propertyId);
    } catch (e) {
      console.error('Error al eliminar propiedad de la base de datos:', e);
    }
  };

  const reloadAllFromServer = async () => {
    const freshData = await apiService.fetchAll();
    setTenants(freshData.tenants);
    setProperties(freshData.properties);
    setPayments(freshData.payments);
    if (freshData.expenses) {
      setExpenses(freshData.expenses);
    }
    if (freshData.settings) {
      handleSettingsSaved(freshData.settings);
    }
  };

  const handleResetAll = async () => {
    try {
      await apiService.resetData();
      await reloadAllFromServer();
    } catch (e) {
      console.error('Error al reiniciar base de datos:', e);
    }
  };

  const handleImportBackup = async (backupData: Record<string, any>) => {
    await apiService.importData(backupData);
    await reloadAllFromServer();
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            tenants={tenants} 
            properties={properties} 
            payments={payments} 
            onMarkPaid={handleMarkPaid} 
            bcvRate={bcvRate}
            onNavigate={(view) => setView(view)}
          />
        );
      case 'tenants':
        return (
          <Tenants 
            tenants={tenants} 
            payments={payments} 
            properties={properties} 
            onAddPayment={handleAddPayment} 
            onUpdatePayment={handleUpdatePayment} 
            onAddTenant={handleAddTenant} 
            onUpdateTenant={handleUpdateTenant} 
            onDeleteTenant={handleDeleteTenant}
            bcvRate={bcvRate}
            wsReminderTemplate={wsReminderTemplate}
            wsConfirmationTemplate={wsConfirmationTemplate}
            pdfConfig={pdfConfig}
          />
        );
      case 'properties':
        return (
          <Properties 
            properties={properties} 
            tenants={tenants} 
            onAddProperty={handleAddProperty}
            onUpdateProperty={handleUpdateProperty}
            onDeleteProperty={handleDeleteProperty}
          />
        );
      case 'payments':
        return (
          <PaymentsHistory 
            payments={payments} 
            tenants={tenants} 
            properties={properties} 
            onAddPayment={handleAddPayment} 
            onUpdatePayment={handleUpdatePayment} 
            onDeletePayment={handleDeletePayment} 
            onMarkPaid={handleMarkPaid} 
            bcvRate={bcvRate} 
            wsReminderTemplate={wsReminderTemplate} 
            wsConfirmationTemplate={wsConfirmationTemplate} 
            pdfConfig={pdfConfig} 
          />
        );
      case 'expenses':
        return (
          <Expenses 
            expenses={expenses}
            payments={payments}
            properties={properties}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            bcvRate={bcvRate}
            pdfConfig={pdfConfig}
          />
        );
      case 'settings':
        return (
          <Settings 
            tenants={tenants} 
            properties={properties} 
            payments={payments} 
            expenses={expenses}
            onResetAll={handleResetAll} 
            onImportData={handleImportBackup}
            bcvRate={bcvRate}
            onUpdateBcvRate={handleUpdateBcvRate}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onSettingsSaved={handleSettingsSaved}
          />
        );
      default:
        return (
          <Dashboard 
            tenants={tenants} 
            properties={properties} 
            payments={payments} 
            onMarkPaid={handleMarkPaid} 
            bcvRate={bcvRate}
            onNavigate={(view) => setView(view)}
          />
        );
    }
  };

  return (
    <div className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0a0e17] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'
    }`}>
      {/* Luces difusas de fondo */}
      <div className={`absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[130px] pointer-events-none transition-colors duration-700 ${
        theme === 'dark' ? 'bg-indigo-950/40' : 'bg-indigo-200/50'
      }`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[130px] pointer-events-none transition-colors duration-700 ${
        theme === 'dark' ? 'bg-blue-950/30' : 'bg-blue-200/40'
      }`} />
      
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      
      <main className="flex-1 relative overflow-hidden flex flex-col p-2 md:p-8 mb-20 md:mb-0">
        <div className={`w-full h-full backdrop-blur-2xl border rounded-[1.5rem] p-4 md:p-8 shadow-2xl overflow-y-auto overflow-x-hidden transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-slate-900/60 border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)]' 
            : 'bg-white/70 border-white/80 shadow-[0_20px_50px_rgba(79,70,229,0.06)]'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
