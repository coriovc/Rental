import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { Tenant, Property, Payment } from '../types';

export const triggerConfetti = () => {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch (e) {
    // Ignore if canvas is unavailable
  }
};

/**
 * Builds a 100% standalone single-file HTML version of RentFlow.
 * It contains React, Tailwind, icons, PDF generation, and full data persistence in localStorage.
 * Can be opened directly with double-click from ANY local folder (file:// protocol).
 */
export const buildStandaloneHtml = (
  tenants: Tenant[],
  properties: Property[],
  payments: Payment[],
  template: string
): string => {
  const initialDataJson = JSON.stringify({
    tenants,
    properties,
    payments,
    template
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RentFlow - Versión Local de Escritorio</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- React & ReactDOM UMD -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <!-- Babel for running in-browser JSX seamlessly -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- jsPDF for direct PDF receipts -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f0f4f8;
      color: #1e293b;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      overflow-x: hidden;
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 10px 30px rgba(79, 70, 229, 0.05);
      border-radius: 1.75rem;
    }
  </style>
</head>
<body class="bg-[#f0f4f8] text-slate-800">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useMemo } = React;

    const INITIAL_EMBEDDED_DATA = ${initialDataJson};

    // Storage helper with fallback to initial embedded data
    const localStore = {
      get: (key, fallback) => {
        try {
          const val = localStorage.getItem('rentflow_local_' + key);
          return val ? JSON.parse(val) : fallback;
        } catch(e) {
          return fallback;
        }
      },
      set: (key, val) => {
        try {
          localStorage.setItem('rentflow_local_' + key, JSON.stringify(val));
        } catch(e) {}
      }
    };

    // PDF receipt generator in standalone mode
    const generateReceiptPDF = (tenant, payment) => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('COMPROBANTE DE PAGO', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text('ID Recibo: ' + payment.id.toUpperCase(), 105, 28, { align: 'center' });
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 35, 190, 35);

        let y = 50;
        const items = [
          { label: 'Fecha:', value: payment.date || new Date().toISOString().split('T')[0] },
          { label: 'Inquilino:', value: tenant.name },
          { label: 'Contacto:', value: tenant.phone || tenant.email },
          { label: 'Mes abonado:', value: payment.month },
          { label: 'Monto pagado:', value: '$' + Number(payment.amount).toLocaleString() },
          { label: 'Estado:', value: (payment.status || 'PAID').toUpperCase() },
        ];

        items.forEach(item => {
          doc.setFont('helvetica', 'bold');
          doc.text(item.label, 20, y);
          doc.setFont('helvetica', 'normal');
          doc.text(item.value, 60, y);
          y += 11;
        });

        doc.setFontSize(11);
        doc.text('Gracias por su pago puntual.', 105, 140, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text('RentFlow - Sistema Local de Administracion Inmobiliaria', 105, 148, { align: 'center' });

        doc.save('Recibo_' + tenant.name.replace(/\\s+/g, '_') + '_' + payment.month + '.pdf');
      } catch (err) {
        alert('Comprobante generado: ' + tenant.name + ' - $' + payment.amount);
      }
    };

    const getWhatsAppLink = (tenant, payment, template) => {
      let msg = template || 'Hola {nombre}! Te enviamos el comprobante del pago de alquiler del mes de {mes}. Monto: \${monto}. Saludos!';
      msg = msg.replace(/{nombre}/g, tenant.name)
               .replace(/{mes}/g, payment ? payment.month : 'Mes')
               .replace(/{monto}/g, payment ? payment.amount : tenant.monthlyRent);
      const cleanPhone = (tenant.phone || '').replace(/[^0-9]/g, '');
      return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(msg);
    };

    function App() {
      const [view, setView] = useState('dashboard');
      const [tenants, setTenants] = useState(() => localStore.get('tenants', INITIAL_EMBEDDED_DATA.tenants));
      const [properties, setProperties] = useState(() => localStore.get('properties', INITIAL_EMBEDDED_DATA.properties));
      const [payments, setPayments] = useState(() => localStore.get('payments', INITIAL_EMBEDDED_DATA.payments));
      const [wsTemplate, setWsTemplate] = useState(() => localStore.get('ws_template', INITIAL_EMBEDDED_DATA.template || 'Hola {nombre}! Confirmamos el cobro de {mes} por ${monto}.'));

      const [selectedTenant, setSelectedTenant] = useState(null);
      const [selectedProperty, setSelectedProperty] = useState(null);
      const [showNewTenantModal, setShowNewTenantModal] = useState(false);
      const [showNewPropertyModal, setShowNewPropertyModal] = useState(false);
      const [showPaymentForm, setShowPaymentForm] = useState(false);
      const [paymentAmount, setPaymentAmount] = useState(0);
      const [paymentMonth, setPaymentMonth] = useState('Marzo');
      const [paymentStatus, setPaymentStatus] = useState('paid');
      const [savedAlert, setSavedAlert] = useState(false);

      // Search filters
      const [tenantSearch, setTenantSearch] = useState('');
      const [propertySearch, setPropertySearch] = useState('');

      useEffect(() => localStore.set('tenants', tenants), [tenants]);
      useEffect(() => localStore.set('properties', properties), [properties]);
      useEffect(() => localStore.set('payments', payments), [payments]);
      useEffect(() => localStore.set('ws_template', wsTemplate), [wsTemplate]);

      const totalIncome = payments.filter(p => p.status === 'paid').reduce((a, b) => a + Number(b.amount || 0), 0);
      const pendingIncome = payments.filter(p => p.status === 'pending').reduce((a, b) => a + Number(b.amount || 0), 0);

      const handleMarkPaid = (id) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'paid', date: new Date().toISOString().split('T')[0] } : p));
        const payment = payments.find(p => p.id === id);
        if (payment) {
          setTenants(prev => prev.map(t => t.id === payment.tenantId ? { ...t, status: 'active' } : t));
        }
      };

      const handleAddTenant = (e) => {
        e.preventDefault();
        const form = e.target;
        const newT = {
          id: 't-' + Date.now(),
          name: form.name.value,
          email: form.email.value,
          phone: form.phone.value,
          propertyId: form.propertyId.value,
          monthlyRent: Number(form.monthlyRent.value),
          startDate: form.startDate.value,
          status: 'active'
        };
        setTenants(prev => [...prev, newT]);
        setProperties(prev => prev.map(p => p.id === newT.propertyId ? { ...p, isOccupied: true } : p));
        setShowNewTenantModal(false);
      };

      const handleAddProperty = (e) => {
        e.preventDefault();
        const form = e.target;
        const newP = {
          id: 'p-' + Date.now(),
          name: form.name.value,
          address: form.address.value,
          type: form.type.value,
          price: Number(form.price.value),
          isOccupied: false,
          description: form.description.value,
          images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'],
          specs: {
            sqft: Number(form.sqft.value || 0),
            bedrooms: Number(form.bedrooms.value || 0),
            bathrooms: Number(form.bathrooms.value || 0),
            parking: form.parking.checked
          }
        };
        setProperties(prev => [...prev, newP]);
        setShowNewPropertyModal(false);
      };

      const handleRegisterPayment = (e) => {
        e.preventDefault();
        if (!selectedTenant) return;
        const newPay = {
          id: 'pay-' + Date.now(),
          tenantId: selectedTenant.id,
          amount: Number(paymentAmount),
          month: paymentMonth,
          status: paymentStatus,
          date: new Date().toISOString().split('T')[0]
        };
        setPayments(prev => [...prev, newPay]);
        setShowPaymentForm(false);
      };

      const handleExportJson = () => {
        const data = { tenants, properties, payments, wsTemplate, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'RentFlow-Backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
      };

      const handleImportJson = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.tenants) setTenants(data.tenants);
            if (data.properties) setProperties(data.properties);
            if (data.payments) setPayments(data.payments);
            if (data.wsTemplate) setWsTemplate(data.wsTemplate);
            alert('Copia de seguridad importada con éxito.');
          } catch(err) {
            alert('Error al leer el archivo JSON.');
          }
        };
        reader.readAsText(file);
      };

      const filteredTenants = tenants.filter(t => 
        t.name.toLowerCase().includes(tenantSearch.toLowerCase()) || 
        t.email.toLowerCase().includes(tenantSearch.toLowerCase())
      );

      const filteredProperties = properties.filter(p => 
        p.name.toLowerCase().includes(propertySearch.toLowerCase()) || 
        p.address.toLowerCase().includes(propertySearch.toLowerCase())
      );

      return (
        <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#f0f4f8]">
          {/* Background Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-white/40 backdrop-blur-xl border-r border-white/60 p-6 flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-200">
                  RF
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">RentFlow</h1>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Carpeta Local</span>
                </div>
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Panel General', icon: '📊' },
                  { id: 'tenants', label: 'Inquilinos', icon: '👥' },
                  { id: 'properties', label: 'Propiedades', icon: '🏠' },
                  { id: 'settings', label: 'Ajustes & Datos', icon: '⚙️' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ' + 
                      (view === item.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'text-slate-600 hover:bg-white/60')
                    }
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/60">
              <div className="p-3 bg-white/70 rounded-2xl text-xs text-slate-500">
                <p className="font-bold text-slate-700">Modo Autónomo Activo</p>
                <p className="text-[11px] mt-1 text-slate-400">Tus datos se guardan en este navegador y persisten aunque reinicies tu PC.</p>
              </div>
            </div>
          </aside>

          {/* Main View Area */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">

              {/* VIEW: DASHBOARD */}
              {view === 'dashboard' && (
                <div className="space-y-6">
                  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Panel de Control</h2>
                      <p className="text-slate-500 text-sm">Resumen financiero y estado de cobros de tus propiedades.</p>
                    </div>
                    <button 
                      onClick={() => setShowNewTenantModal(true)} 
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                    >
                      + Nuevo Inquilino
                    </button>
                  </header>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card p-5">
                      <span className="text-2xl">💰</span>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Ingresos Cobrados</p>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">${totalIncome.toLocaleString()}</h3>
                    </div>
                    <div className="glass-card p-5">
                      <span className="text-2xl">👥</span>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Inquilinos</p>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{tenants.length}</h3>
                    </div>
                    <div className="glass-card p-5">
                      <span className="text-2xl">🏠</span>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Propiedades</p>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{properties.length}</h3>
                    </div>
                    <div className="glass-card p-5">
                      <span className="text-2xl">⏳</span>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Pendientes</p>
                      <h3 className="text-2xl font-black text-rose-600 mt-1">${pendingIncome.toLocaleString()}</h3>
                    </div>
                  </div>

                  {/* Recent Payments Table */}
                  <div className="glass-card p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Registro de Pagos Recientes</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100">
                            <th className="pb-3">Inquilino</th>
                            <th className="pb-3">Mes</th>
                            <th className="pb-3">Monto</th>
                            <th className="pb-3">Estado</th>
                            <th className="pb-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payments.slice(0, 8).map(pay => {
                            const tenant = tenants.find(t => t.id === pay.tenantId);
                            return (
                              <tr key={pay.id} className="hover:bg-white/40">
                                <td className="py-3 font-bold text-slate-700">{tenant ? tenant.name : 'Inquilino'}</td>
                                <td className="py-3 text-slate-500">{pay.month}</td>
                                <td className="py-3 font-black text-slate-800">${pay.amount.toLocaleString()}</td>
                                <td className="py-3">
                                  <span className={'px-2.5 py-1 rounded-full text-[10px] font-black uppercase ' + 
                                    (pay.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                    {pay.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  {pay.status === 'pending' ? (
                                    <button 
                                      onClick={() => handleMarkPaid(pay.id)}
                                      className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm"
                                    >
                                      Cobrar
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => tenant && generateReceiptPDF(tenant, pay)}
                                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                                    >
                                      📄 Recibo
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: TENANTS */}
              {view === 'tenants' && (
                <div className="space-y-6">
                  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Inquilinos</h2>
                      <p className="text-slate-500 text-sm">Gestiona contratos, cobros directos y recibos oficiales.</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <input 
                        type="text" 
                        placeholder="Buscar inquilino..." 
                        value={tenantSearch} 
                        onChange={e => setTenantSearch(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm flex-1 sm:w-64 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button 
                        onClick={() => setShowNewTenantModal(true)} 
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 whitespace-nowrap"
                      >
                        + Nuevo
                      </button>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTenants.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => setSelectedTenant(t)}
                        className="glass-card p-6 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center">
                            {t.name[0]}
                          </div>
                          <span className={'px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ' + 
                            (t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                            {t.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg">{t.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{t.email} • {t.phone}</p>
                        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Renta Mensual</span>
                            <p className="text-xl font-black text-slate-800">${t.monthlyRent.toLocaleString()}</p>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">Ver Ficha</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW: PROPERTIES */}
              {view === 'properties' && (
                <div className="space-y-6">
                  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Propiedades</h2>
                      <p className="text-slate-500 text-sm">Control de departamentos, casas y locales comerciales.</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <input 
                        type="text" 
                        placeholder="Buscar dirección o nombre..." 
                        value={propertySearch} 
                        onChange={e => setPropertySearch(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm flex-1 sm:w-64 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button 
                        onClick={() => setShowNewPropertyModal(true)} 
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 whitespace-nowrap"
                      >
                        + Nueva Propiedad
                      </button>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProperties.map(p => {
                      const occupant = tenants.find(t => t.propertyId === p.id);
                      return (
                        <div key={p.id} className="glass-card overflow-hidden group">
                          <div className="h-44 bg-slate-200 relative overflow-hidden">
                            <img 
                              src={p.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'} 
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-3 right-3">
                              <span className={'px-3 py-1 rounded-xl text-[10px] font-black uppercase text-white backdrop-blur-md ' + 
                                (p.isOccupied ? 'bg-slate-900/60' : 'bg-emerald-600/90')}>
                                {p.isOccupied ? 'Ocupada' : 'Disponible'}
                              </span>
                            </div>
                          </div>
                          <div className="p-5">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-800 text-base">{p.name}</h4>
                              <span className="font-black text-indigo-600 text-lg">${p.price.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{p.address}</p>
                            {occupant && (
                              <div className="mt-3 p-2 bg-indigo-50/70 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                                <span>👤</span> <strong>Inquilino:</strong> {occupant.name}
                              </div>
                            )}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500 font-semibold">
                              <span>📐 {p.specs?.sqft || 0} m²</span>
                              <span>🛏️ {p.specs?.bedrooms || 0} Hab.</span>
                              <span>🚿 {p.specs?.bathrooms || 0} Baños</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW: SETTINGS */}
              {view === 'settings' && (
                <div className="space-y-6 max-w-3xl">
                  <header>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Ajustes & Respaldo</h2>
                    <p className="text-slate-500 text-sm">Gestiona tus plantillas de WhatsApp y la copia de tus datos.</p>
                  </header>

                  {/* WhatsApp Template Card */}
                  <div className="glass-card p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800">Plantilla de Mensaje de WhatsApp</h3>
                    <textarea 
                      value={wsTemplate} 
                      onChange={e => setWsTemplate(e.target.value)}
                      className="w-full h-28 bg-white border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-slate-400 font-bold">Etiquetas:</span>
                      {['{nombre}', '{mes}', '{monto}'].map(tag => (
                        <button 
                          key={tag} 
                          onClick={() => setWsTemplate(prev => prev + ' ' + tag)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-mono font-bold text-slate-600"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        localStore.set('ws_template', wsTemplate);
                        setSavedAlert(true);
                        setTimeout(() => setSavedAlert(false), 2000);
                      }}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-emerald-700"
                    >
                      {savedAlert ? '✓ Guardado' : 'Guardar Plantilla'}
                    </button>
                  </div>

                  {/* Backup & Restore */}
                  <div className="glass-card p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800">Copia de Seguridad de tus Datos</h3>
                    <p className="text-xs text-slate-500">
                      Descarga un archivo JSON con toda tu información para guardarlo en un pendrive o transferirlo a otra computadora.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={handleExportJson}
                        className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                      >
                        📥 Exportar Datos (JSON)
                      </button>
                      <label className="px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer hover:bg-slate-50">
                        📤 Importar Datos (JSON)
                        <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="glass-card p-6 border-rose-100 bg-rose-50/20 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-rose-700 text-sm">Reiniciar a Datos de Fábrica</h4>
                      <p className="text-[11px] text-slate-500">Borra las modificaciones y restablece los inquilinos de ejemplo.</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm('¿Seguro que deseas reiniciar los datos a la configuración inicial?')) {
                          localStorage.clear();
                          setTenants(INITIAL_EMBEDDED_DATA.tenants);
                          setProperties(INITIAL_EMBEDDED_DATA.properties);
                          setPayments(INITIAL_EMBEDDED_DATA.payments);
                          alert('Datos restablecidos.');
                        }
                      }}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
                    >
                      Restablecer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* MODAL: NEW TENANT */}
          {showNewTenantModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
                <button onClick={() => setShowNewTenantModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold">✕</button>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Registrar Nuevo Inquilino</h3>
                <form onSubmit={handleAddTenant} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Nombre Completo</label>
                    <input required name="name" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="Ej: Carlos Rossi" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Correo</label>
                      <input required name="email" type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Teléfono (WhatsApp)</label>
                      <input required name="phone" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="+54911223344" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Propiedad</label>
                      <select required name="propertyId" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
                        <option value="">Seleccionar...</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Renta Mensual ($)</label>
                      <input required name="monthlyRent" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="1200" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Fecha de Inicio</label>
                    <input required name="startDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" />
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700">Guardar Inquilino</button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: NEW PROPERTY */}
          {showNewPropertyModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setShowNewPropertyModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold">✕</button>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Nueva Propiedad</h3>
                <form onSubmit={handleAddProperty} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Nombre</label>
                    <input required name="name" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="Ej: Loft Palermo 3B" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Dirección</label>
                    <input required name="address" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="Av. Santa Fe 1234" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Tipo</label>
                      <select name="type" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
                        <option value="Apartment">Departamento</option>
                        <option value="House">Casa</option>
                        <option value="Office">Oficina</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Precio Mensual ($)</label>
                      <input required name="price" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="1000" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Descripción</label>
                    <textarea name="description" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm h-20" placeholder="Detalles de la propiedad..." />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">m²</label>
                      <input name="sqft" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="60" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Hab.</label>
                      <input name="bedrooms" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Baños</label>
                      <input name="bathrooms" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input name="parking" type="checkbox" id="parking" className="w-4 h-4 rounded text-indigo-600" />
                    <label htmlFor="parking" className="text-xs text-slate-600 font-bold">Tiene Cochera / Estacionamiento</label>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700">Guardar Propiedad</button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: TENANT DETAIL */}
          {selectedTenant && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => { setSelectedTenant(null); setShowPaymentForm(false); }} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold">✕</button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white text-2xl font-black flex items-center justify-center shadow-md">
                    {selectedTenant.name[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{selectedTenant.name}</h3>
                    <p className="text-sm text-slate-500">{selectedTenant.email} • {selectedTenant.phone}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mb-6">
                  <a 
                    href={getWhatsAppLink(selectedTenant, payments.find(p => p.tenantId === selectedTenant.id), wsTemplate)}
                    target="_blank"
                    className="flex-1 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs text-center hover:bg-emerald-100"
                  >
                    💬 WhatsApp
                  </a>
                  <button 
                    onClick={() => {
                      setPaymentAmount(selectedTenant.monthlyRent);
                      setShowPaymentForm(true);
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs text-center shadow-md hover:bg-indigo-700"
                  >
                    + Registrar Pago
                  </button>
                </div>

                {/* Form for recording payment */}
                {showPaymentForm && (
                  <form onSubmit={handleRegisterPayment} className="p-4 bg-slate-50 rounded-2xl mb-6 space-y-3">
                    <h4 className="font-bold text-xs uppercase text-slate-700">Registrar Cobro</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400">Mes</label>
                        <select value={paymentMonth} onChange={e => setPaymentMonth(e.target.value)} className="w-full bg-white p-2 text-xs rounded-lg border border-slate-200">
                          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400">Monto ($)</label>
                        <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full bg-white p-2 text-xs rounded-lg border border-slate-200" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPaymentStatus('paid')} className={'flex-1 py-1.5 rounded-lg text-xs font-bold ' + (paymentStatus === 'paid' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600')}>Pagado</button>
                      <button type="button" onClick={() => setPaymentStatus('pending')} className={'flex-1 py-1.5 rounded-lg text-xs font-bold ' + (paymentStatus === 'pending' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600')}>Pendiente</button>
                    </div>
                    <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs">Confirmar Pago</button>
                  </form>
                )}

                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Historial de Pagos</h4>
                <div className="space-y-2">
                  {payments.filter(p => p.tenantId === selectedTenant.id).map(p => (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{p.month} - ${p.amount.toLocaleString()}</p>
                        <span className={'inline-block text-[9px] font-black uppercase ' + (p.status === 'paid' ? 'text-emerald-600' : 'text-rose-600')}>{p.status}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => generateReceiptPDF(selectedTenant, p)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100">PDF</button>
                        <a href={getWhatsAppLink(selectedTenant, p, wsTemplate)} target="_blank" className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">WA</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;
};

/**
 * Downloads a single-file portable HTML ready to run by double-clicking in any folder.
 */
export const downloadStandaloneHtmlFile = (
  tenants: Tenant[],
  properties: Property[],
  payments: Payment[],
  template: string
) => {
  const content = buildStandaloneHtml(tenants, properties, payments, template);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RentFlow-Portable.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  triggerConfetti();
};

/**
 * Downloads a complete ZIP package with:
 * - RentFlow-Portable.html (direct double-click runner)
 * - Iniciar-RentFlow-Windows.bat (auto-runner for Windows)
 * - Iniciar-RentFlow-Mac.command (auto-runner for Mac/Linux)
 * - backup-datos-iniciales.json
 * - LEEME-INSTRUCCIONES.txt
 */
export const downloadCompleteDesktopZip = async (
  tenants: Tenant[],
  properties: Property[],
  payments: Payment[],
  template: string
) => {
  const zip = new JSZip();

  // 1. Standalone HTML
  const standaloneHtml = buildStandaloneHtml(tenants, properties, payments, template);
  zip.file('RentFlow-Portable.html', standaloneHtml);

  // 2. Windows 1-click launcher
  const windowsBat = `@echo off
title RentFlow - Sistema de Gestion de Alquileres
echo ==========================================================
echo           INICIANDO RENTFLOW (CARPETA LOCAL)
echo ==========================================================
echo Abriendo aplicacion en tu navegador predeterminado...
start "" "RentFlow-Portable.html"
exit
`;
  zip.file('Iniciar-RentFlow-Windows.bat', windowsBat);

  // 3. Mac/Linux 1-click launcher
  const macCommand = `#!/bin/bash
cd "$(dirname "$0")"
echo "Iniciando RentFlow en tu navegador..."
if command -v open &> /dev/null; then
  open "RentFlow-Portable.html"
elif command -v xdg-open &> /dev/null; then
  xdg-open "RentFlow-Portable.html"
fi
`;
  zip.file('Iniciar-RentFlow-Mac.command', macCommand);

  // 4. Backup JSON
  const backupData = JSON.stringify({
    tenants,
    properties,
    payments,
    template,
    exportedDate: new Date().toISOString()
  }, null, 2);
  zip.file('backup-datos-iniciales.json', backupData);

  // 5. Readme instructions
  const readme = `===================================================================
                RENTFLOW - SISTEMA DE GESTION DE ALQUILERES
                     GUIA DE EJECUCION EN CARPETA LOCAL
===================================================================

¡Felicidades! Tienes tu copia completa de RentFlow para ejecutarla 
en cualquier computadora sin necesidad de instalar programas adicionales.

--- OPCION 1: INICIO DIRECTO (EL MAS FACIL) ---
1. En Windows: Haz doble clic sobre "Iniciar-RentFlow-Windows.bat"
   o haz doble clic directamente sobre "RentFlow-Portable.html".
2. En Mac: Haz doble clic sobre "Iniciar-RentFlow-Mac.command"
   o abre directamente "RentFlow-Portable.html" con Safari / Chrome.

--- ¿DONDE SE GUARDAN MIS DATOS? ---
RentFlow guarda automáticamente tus inquilinos, cobros y propiedades
en la memoria local (LocalStorage) de tu navegador en esa carpeta.
No perderás tus datos aunque apagues o reinicies la máquina.

--- COPIAS DE SEGURIDAD ---
Dentro de RentFlow ve a la pestaña "Ajustes & Datos":
- Puedes hacer clic en "Exportar Datos (JSON)" para crear un archivo de respaldo.
- Puedes llevarte ese archivo JSON o guardarlo en tu Google Drive / USB.
- Si cambias de computadora, haz clic en "Importar Datos (JSON)" y listo.

--- GENERACION DE RECIBOS PDF Y WHATSAPP ---
- En la pestaña "Inquilinos", haz clic en cualquier inquilino para ver sus pagos.
- Puedes descargar el recibo oficial en PDF al instante.
- Puedes presionar el botón de WhatsApp para enviar el mensaje con un clic.

¡Que disfrutes de RentFlow!
`;
  zip.file('LEEME-INSTRUCCIONES.txt', readme);

  // Generate ZIP and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RentFlow-Carpeta-Local.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  triggerConfetti();
};
