import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Tenants } from './components/Tenants';
import { Properties } from './components/Properties';
import { Settings } from './components/Settings';
import { LocalDesktopDownloadModal } from './components/LocalDesktopDownloadModal';
import { 
  INITIAL_TENANTS, 
  INITIAL_PROPERTIES, 
  INITIAL_PAYMENTS, 
  storage 
} from './data/mockData';
import { Tenant, Property, Payment, View } from './types';

const App: React.FC = () => {
  const [currentView, setView] = useState<View>('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>(() => storage.get('tenants', INITIAL_TENANTS));
  const [properties, setProperties] = useState<Property[]>(() => storage.get('properties', INITIAL_PROPERTIES));
  const [payments, setPayments] = useState<Payment[]>(() => storage.get('payments', INITIAL_PAYMENTS));
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => storage.set('tenants', tenants), [tenants]);
  useEffect(() => storage.set('properties', properties), [properties]);
  useEffect(() => storage.set('payments', payments), [payments]);

  const handleMarkPaid = (paymentId: string) => {
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, status: 'paid', date: new Date().toISOString().split('T')[0] } : p
    ));
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setTenants(prev => prev.map(t => 
        t.id === payment.tenantId ? { ...t, status: 'active' } : t
      ));
    }
  };

  const handleAddPayment = (newPayment: Omit<Payment, 'id'>) => {
    const id = `pay-${Date.now()}`;
    const paymentWithId = { ...newPayment, id };
    setPayments(prev => [...prev, paymentWithId]);
    if (newPayment.status === 'paid') {
      setTenants(prev => prev.map(t => 
        t.id === newPayment.tenantId ? { ...t, status: 'active' } : t
      ));
    }
  };

  const handleAddTenant = (newTenant: Omit<Tenant, 'id'>) => {
    const id = `tenant-${Date.now()}`;
    const tenantWithId = { ...newTenant, id };
    setTenants(prev => [...prev, tenantWithId]);
    setProperties(prev => prev.map(p => 
      p.id === newTenant.propertyId ? { ...p, isOccupied: true } : p
    ));
  };

  const handleUpdateTenant = (updatedTenant: Tenant) => {
    setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
  };

  const handleDeleteTenant = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setProperties(prev => prev.map(p => 
        p.id === tenant.propertyId ? { ...p, isOccupied: false } : p
      ));
    }
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    setPayments(prev => prev.filter(p => p.tenantId !== tenantId));
  };

  const handleAddProperty = (newProperty: Omit<Property, 'id' | 'isOccupied'>) => {
    const id = `p-${Date.now()}`;
    const propertyWithId: Property = { ...newProperty, id, isOccupied: false };
    setProperties(prev => [...prev, propertyWithId]);
  };

  const handleUpdateProperty = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const handleDeleteProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    // Also cleanup any tenants in that property
    const tenant = tenants.find(t => t.propertyId === propertyId);
    if (tenant) {
      setTenants(prev => prev.filter(t => t.id !== tenant.id));
      setPayments(prev => prev.filter(p => p.tenantId !== tenant.id));
    }
  };

  const handleImportData = (data: { tenants: Tenant[]; properties: Property[]; payments: Payment[]; template?: string }) => {
    setTenants(data.tenants);
    setProperties(data.properties);
    setPayments(data.payments);
  };

  const handleResetData = () => {
    setTenants(INITIAL_TENANTS);
    setProperties(INITIAL_PROPERTIES);
    setPayments(INITIAL_PAYMENTS);
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
            onOpenDownloadModal={() => setShowDownloadModal(true)}
            onNavigateToTenants={() => setView('tenants')}
          />
        );
      case 'tenants':
        return (
          <Tenants 
            tenants={tenants} 
            payments={payments} 
            properties={properties} 
            onAddPayment={handleAddPayment} 
            onAddTenant={handleAddTenant}
            onUpdateTenant={handleUpdateTenant}
            onDeleteTenant={handleDeleteTenant}
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
      case 'settings':
        return (
          <Settings 
            tenants={tenants} 
            properties={properties} 
            payments={payments}
            onImportData={handleImportData}
            onResetData={handleResetData}
          />
        );
      default:
        return (
          <Dashboard 
            tenants={tenants} 
            properties={properties} 
            payments={payments} 
            onMarkPaid={handleMarkPaid}
            onOpenDownloadModal={() => setShowDownloadModal(true)}
            onNavigateToTenants={() => setView('tenants')}
          />
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#f0f4f8]">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />
      
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        onOpenDownloadModal={() => setShowDownloadModal(true)} 
      />
      
      <main className="flex-1 relative overflow-hidden flex flex-col p-2 md:p-8 mb-20 md:mb-0">
        <div className="w-full h-full bg-white/30 backdrop-blur-3xl border border-white/50 rounded-[2.5rem] md:rounded-[3.5rem] p-4 md:p-8 shadow-2xl shadow-indigo-100/20 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Desktop Download & Local Folder Modal */}
      <LocalDesktopDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        tenants={tenants}
        properties={properties}
        payments={payments}
      />
    </div>
  );
};

export default App;
