import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from './ModalPortal';
import { 
  Receipt, 
  Search, 
  Filter, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer, 
  MessageSquare, 
  Plus, 
  Edit2, 
  Trash2, 
  User, 
  Home, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  X, 
  Send,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { GlassCard } from './GlassCard';
import { Tenant, Property, Payment, PdfConfig } from '../types';
import { generateReceiptPDF, getWhatsAppConfirmationLink, getWhatsAppReminderLink } from '../services/pdfService';

interface PaymentsHistoryProps {
  payments: Payment[];
  tenants: Tenant[];
  properties: Property[];
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
  onUpdatePayment: (payment: Payment) => void;
  onDeletePayment?: (paymentId: string) => void;
  onMarkPaid: (paymentId: string) => void;
  bcvRate?: number;
  wsReminderTemplate?: string;
  wsConfirmationTemplate?: string;
  pdfConfig?: PdfConfig;
}

export const PaymentsHistory: React.FC<PaymentsHistoryProps> = ({
  payments,
  tenants,
  properties,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onMarkPaid,
  bcvRate = 52.50,
  wsReminderTemplate,
  wsConfirmationTemplate,
  pdfConfig
}) => {
  // Navegación interna de la sección
  const [activeTab, setActiveTab] = useState<'all-payments' | 'punctuality-stats'>('all-payments');

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');

  // Modales de Cobro
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State para Cobro
  const [formTenantId, setFormTenantId] = useState<string>('');
  const [formMonth, setFormMonth] = useState<string>('Noviembre');
  const [formAmountUSD, setFormAmountUSD] = useState<number>(0);
  const [formExchangeRate, setFormExchangeRate] = useState<number>(bcvRate);
  const [formAmountBs, setFormAmountBs] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<'paid' | 'pending'>('paid');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const monthsList = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Métricas Generales
  const totalPaidUSD = useMemo(() => 
    payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );
  const totalPaidBs = useMemo(() => 
    payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amountBs || (p.amount * (p.exchangeRate || bcvRate))), 0),
    [payments, bcvRate]
  );
  const totalPendingUSD = useMemo(() => 
    payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );
  const totalPendingBs = useMemo(() => 
    payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amountBs || (p.amount * (p.exchangeRate || bcvRate))), 0),
    [payments, bcvRate]
  );

  // Estadísticas de Puntualidad por Inquilino
  const tenantStats = useMemo(() => {
    return tenants.map(tenant => {
      const tPayments = payments.filter(p => p.tenantId === tenant.id);
      const paidCount = tPayments.filter(p => p.status === 'paid').length;
      const pendingCount = tPayments.filter(p => p.status === 'pending').length;
      const totalCount = tPayments.length;
      const totalPaidAmount = tPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const pendingPayment = tPayments.find(p => p.status === 'pending');
      const prop = properties.find(pr => pr.id === tenant.propertyId);

      // Determinación de puntualidad
      let punctualityStatus: 'puntual' | 'atrasado' | 'al-dia' = 'puntual';
      let score = 100;

      if (pendingCount > 0 || tenant.status === 'late') {
        punctualityStatus = 'atrasado';
        score = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
      } else if (paidCount > 0) {
        punctualityStatus = 'puntual';
        score = 100;
      }

      return {
        tenant,
        property: prop,
        paidCount,
        pendingCount,
        totalCount,
        totalPaidAmount,
        pendingPayment,
        punctualityStatus,
        score
      };
    }).sort((a, b) => b.pendingCount - a.pendingCount || a.score - b.score);
  }, [tenants, payments, properties]);

  // Totales de puntualidad
  const punctualTenantsCount = tenantStats.filter(t => t.pendingCount === 0 && t.tenant.status !== 'late').length;
  const lateTenantsCount = tenantStats.filter(t => t.pendingCount > 0 || t.tenant.status === 'late').length;
  const punctualityRate = tenants.length > 0 ? Math.round((punctualTenantsCount / tenants.length) * 100) : 100;

  // Gráfico por meses: Pagado vs Pendiente
  const monthlyChartData = useMemo(() => {
    const monthMap: Record<string, { month: string; paid: number; pending: number }> = {};
    
    // Inicializar los últimos 6 meses
    monthsList.forEach(m => {
      monthMap[m] = { month: m.substring(0, 3), paid: 0, pending: 0 };
    });

    payments.forEach(p => {
      const m = p.month || 'Noviembre';
      if (!monthMap[m]) {
        monthMap[m] = { month: m.substring(0, 3), paid: 0, pending: 0 };
      }
      if (p.status === 'paid') {
        monthMap[m].paid += p.amount;
      } else {
        monthMap[m].pending += p.amount;
      }
    });

    // Retornar solo meses con actividad o los 6 principales
    return Object.values(monthMap).filter(item => item.paid > 0 || item.pending > 0);
  }, [payments]);

  // Gráfico de pastel para proporción de puntualidad
  const pieData = [
    { name: 'Pagos al Día / Puntuales', value: punctualTenantsCount, color: '#10b981' },
    { name: 'Atrasados / En Mora', value: lateTenantsCount, color: '#f43f5e' },
  ];

  // Filtrado de la lista de pagos
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const tenant = tenants.find(t => t.id === p.tenantId);
      const prop = properties.find(pr => pr.id === tenant?.propertyId);

      const matchesSearch = 
        (tenant?.name && tenant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tenant?.idNumber && tenant.idNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (prop?.name && prop.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.amount.toString().includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesProperty = selectedPropertyFilter === 'all' || tenant?.propertyId === selectedPropertyFilter;

      return matchesSearch && matchesStatus && matchesProperty;
    });
  }, [payments, tenants, properties, searchTerm, statusFilter, selectedPropertyFilter]);

  // Manejo de cambio en el monto USD para auto-calcular Bolívares
  const handleAmountUSDChange = (val: number) => {
    setFormAmountUSD(val);
    const calculatedBs = Math.round((val * formExchangeRate) * 100) / 100;
    setFormAmountBs(calculatedBs);
  };

  // Abrir modal de nuevo o editar pago
  const handleOpenPaymentModal = (paymentToEdit?: Payment) => {
    if (paymentToEdit) {
      setEditingPayment(paymentToEdit);
      setFormTenantId(paymentToEdit.tenantId);
      setFormMonth(paymentToEdit.month);
      setFormAmountUSD(paymentToEdit.amount);
      const rate = paymentToEdit.exchangeRate || bcvRate;
      setFormExchangeRate(rate);
      setFormAmountBs(paymentToEdit.amountBs || Math.round(paymentToEdit.amount * rate * 100) / 100);
      setFormStatus(paymentToEdit.status);
      setFormDate(paymentToEdit.date);
    } else {
      setEditingPayment(null);
      const firstTenant = tenants[0];
      setFormTenantId(firstTenant ? firstTenant.id : '');
      const rent = firstTenant ? firstTenant.monthlyRent : 0;
      setFormAmountUSD(rent);
      setFormExchangeRate(bcvRate);
      setFormAmountBs(Math.round(rent * bcvRate * 100) / 100);
      const curMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date());
      setFormMonth(curMonth.charAt(0).toUpperCase() + curMonth.slice(1));
      setFormStatus('paid');
      setFormDate(new Date().toISOString().split('T')[0]);
    }
    setShowPaymentModal(true);
  };

  // Manejo de guardado del cobro
  const handleSavePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTenantId) return;

    if (editingPayment) {
      onUpdatePayment({
        ...editingPayment,
        tenantId: formTenantId,
        amount: formAmountUSD,
        amountBs: formAmountBs,
        exchangeRate: formExchangeRate,
        month: formMonth,
        status: formStatus,
        date: formDate
      });
    } else {
      onAddPayment({
        tenantId: formTenantId,
        amount: formAmountUSD,
        amountBs: formAmountBs,
        exchangeRate: formExchangeRate,
        month: formMonth,
        status: formStatus,
        date: formDate
      });
    }
    setShowPaymentModal(false);
    setEditingPayment(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20 md:pb-8">
      {/* Cabecera */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-950/60">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Historial de Pagos y Cobranzas</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Control integral de ingresos en USD y Bs, recibos oficiales y seguimiento de morosidad.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de pestañas */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('all-payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'all-payments'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Listado de Pagos
            </button>
            <button
              onClick={() => setActiveTab('punctuality-stats')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'punctuality-stats'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <TrendingUp size={14} />
              <span>Estadísticas de Puntualidad</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenPaymentModal()}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 whitespace-nowrap"
          >
            <Plus size={18} />
            <span>Registrar Cobro</span>
          </button>
        </div>
      </header>

      {/* Tarjetas de Métricas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cobrado */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg">
              Recaudado
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Cobrado</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-0.5">${totalPaidUSD.toLocaleString()} USD</h3>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            ≈ Bs. {totalPaidBs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </GlassCard>

        {/* Total Pendiente */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg">
              Por Cobrar
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pendiente / Mora</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-0.5">${totalPendingUSD.toLocaleString()} USD</h3>
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
            ≈ Bs. {totalPendingBs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </GlassCard>

        {/* Tasa de Puntualidad */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg">
              Índice
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Puntualidad Global</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-0.5">{punctualityRate}%</h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            {punctualTenantsCount} de {tenants.length} inquilinos al día
          </p>
        </GlassCard>

        {/* Inquilinos en Mora */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${lateTenantsCount > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'}`}>
              {lateTenantsCount > 0 ? `${lateTenantsCount} con retraso` : 'Sin retrasos'}
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tasa BCV Aplicada</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-0.5">{Number(bcvRate || 52.50).toFixed(2)} Bs/$</h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Tasa oficial del día
          </p>
        </GlassCard>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: LISTADO DE TODOS LOS PAGOS */}
      {/* ========================================================================= */}
      {activeTab === 'all-payments' && (
        <div className="space-y-6">
          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por inquilino, cédula, propiedad o mes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs md:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Filtro de Estado */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-4 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs md:text-sm text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="paid">Solo Pagados</option>
                <option value="pending">Solo Pendientes / En Mora</option>
              </select>

              <select
                value={selectedPropertyFilter}
                onChange={e => setSelectedPropertyFilter(e.target.value)}
                className="px-4 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs md:text-sm text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="all">Todas las Propiedades</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla / Tarjetas de Pagos */}
          <GlassCard className="p-4 md:p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[750px]">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/80 dark:border-slate-800">
                    <th className="pb-4 pl-3">Inquilino</th>
                    <th className="pb-4">Propiedad</th>
                    <th className="pb-4">Mes / Fecha</th>
                    <th className="pb-4">Monto ($ USD)</th>
                    <th className="pb-4">Monto en Bolívares (Bs.)</th>
                    <th className="pb-4">Estado</th>
                    <th className="pb-4 text-right pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPayments.map(p => {
                    const tenant = tenants.find(t => t.id === p.tenantId);
                    const prop = properties.find(pr => pr.id === tenant?.propertyId);
                    const rateUsed = Number(p.exchangeRate || bcvRate || 52.50);
                    const bsAmount = Number(p.amountBs || (p.amount * rateUsed));

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                        {/* Inquilino */}
                        <td className="py-4 pl-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/60 dark:to-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shadow-sm">
                              {tenant?.name ? tenant.name[0] : 'I'}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{tenant?.name || 'Inquilino desconocido'}</p>
                              {tenant?.idNumber && (
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">CI: {tenant.idNumber}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Propiedad */}
                        <td className="py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {prop?.name || 'No asignada'}
                        </td>

                        {/* Mes / Fecha */}
                        <td className="py-4">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{p.month}</span>
                          <span className="text-[10px] text-slate-400">{p.date}</span>
                        </td>

                        {/* Monto USD */}
                        <td className="py-4">
                          <span className="text-sm font-black text-slate-900 dark:text-white">${p.amount.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 block">USD</span>
                        </td>

                        {/* Monto Bs */}
                        <td className="py-4">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                            Bs. {bsAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400">({rateUsed.toFixed(2)} Bs/$)</span>
                        </td>

                        {/* Estado */}
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1.5 ${
                            p.status === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60'
                          }`}>
                            {p.status === 'paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{p.status === 'paid' ? 'Pagado' : 'Pendiente'}</span>
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-4 text-right pr-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Marcar pagado si está pendiente */}
                            {p.status === 'pending' && (
                              <button
                                onClick={() => onMarkPaid(p.id)}
                                className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                title="Marcar como cobrado"
                              >
                                <Check size={14} />
                              </button>
                            )}

                            {/* Generar PDF oficial */}
                            {tenant && (
                              <button
                                onClick={() => generateReceiptPDF(tenant, p, prop, pdfConfig)}
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all shadow-sm"
                                title="Descargar Recibo Digital en PDF (USD y Bs)"
                              >
                                <Printer size={14} />
                              </button>
                            )}

                            {/* Enviar WhatsApp */}
                            {tenant && (
                              <a
                                href={
                                  p.status === 'paid'
                                    ? getWhatsAppConfirmationLink(tenant, p, wsConfirmationTemplate, bcvRate)
                                    : getWhatsAppReminderLink(tenant, p, wsReminderTemplate, bcvRate)
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 rounded-xl text-white transition-all shadow-sm ${
                                  p.status === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-teal-600 hover:bg-teal-700'
                                }`}
                                title={p.status === 'paid' ? 'Enviar Comprobante por WhatsApp' : 'Enviar Recordatorio por WhatsApp'}
                              >
                                <MessageSquare size={14} />
                              </a>
                            )}

                            {/* Editar Pago */}
                            <button
                              onClick={() => handleOpenPaymentModal(p)}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
                              title="Modificar Cobro"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Eliminar Pago */}
                            {onDeletePayment && (
                              <button
                                onClick={() => {
                                  if (confirm('¿Eliminar este registro de cobro?')) {
                                    onDeletePayment(p.id);
                                  }
                                }}
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                                title="Eliminar Registro"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Clock className="mx-auto mb-2 opacity-40" size={32} />
                        <p className="text-xs font-bold uppercase tracking-wider">No se encontraron cobros registrados</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: ESTADÍSTICAS DE PUNTUALIDAD Y MOROSIDAD */}
      {/* ========================================================================= */}
      {activeTab === 'punctuality-stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Mensual de Recaudación vs Pendiente */}
            <GlassCard className="lg:col-span-2 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ingresos Cobrados vs Pendientes por Mes</h3>
                  <p className="text-xs text-slate-400">Comparativa mensual de cumplimiento de pago ($ USD)</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Cobrado
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Pendiente
                  </span>
                </div>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1rem', 
                        border: 'none', 
                        backgroundColor: '#1e293b', 
                        color: '#fff',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)' 
                      }} 
                    />
                    <Bar dataKey="paid" name="Cobrado ($)" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pending" name="Pendiente ($)" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Proporción de Inquilinos Puntuales vs Con Atraso */}
            <GlassCard className="p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Puntualidad de Inquilinos</h3>
                <p className="text-xs text-slate-400 mb-4">Relación entre quienes pagan a tiempo y morosos</p>
                
                <div className="h-[180px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold">
                    <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                    Inquilinos Puntuales (Al día)
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{punctualTenantsCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold">
                    <span className="w-3 h-3 rounded-md bg-rose-500"></span>
                    Inquilinos con Atraso / Mora
                  </span>
                  <span className="font-black text-rose-600 dark:text-rose-400">{lateTenantsCount}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Ranking Detallado: Quién se atrasa y quién paga a tiempo */}
          <GlassCard className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Comportamiento Individual por Inquilino</h3>
                <p className="text-xs text-slate-400">Identifica claramente quién cumple sus fechas y a quién se le debe cobrar con recordatorio</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-xl">
                {tenants.length} Inquilinos Evaluados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenantStats.map(item => {
                const isLate = item.pendingCount > 0 || item.tenant.status === 'late';
                return (
                  <div
                    key={item.tenant.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      isLate
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                        : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                    }`}
                  >
                    {/* Encabezado del inquilino */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${
                          isLate
                            ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300'
                        }`}>
                          {item.tenant.name[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{item.tenant.name}</h4>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                            {item.tenant.idNumber ? `CI: ${item.tenant.idNumber}` : item.tenant.phone}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                        isLate
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 border-rose-200 dark:border-rose-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {isLate ? 'Con Atraso' : 'Puntual'}
                      </span>
                    </div>

                    {/* Inmueble y canon */}
                    <div className="mb-3 p-2.5 bg-white/70 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Inmueble:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{item.property?.name || 'Asignado'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Renta Mensual:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">${item.tenant.monthlyRent} USD</span>
                      </div>
                    </div>

                    {/* Desglose de Pagos */}
                    <div className="grid grid-cols-2 gap-2 text-center mb-4">
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase">Pagados a tiempo</p>
                        <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{item.paidCount}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-rose-600 font-bold uppercase">Pendientes / Mora</p>
                        <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{item.pendingCount}</p>
                      </div>
                    </div>

                    {/* Botón de acción */}
                    {isLate ? (
                      <a
                        href={getWhatsAppReminderLink(item.tenant, item.pendingPayment, wsReminderTemplate, bcvRate)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Send size={13} />
                        <span>Avisar Cobro por WhatsApp</span>
                      </a>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 py-1.5">
                        <CheckCircle2 size={15} />
                        <span>Historial Impecable</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Modal de Registro / Edición de Cobro con Liquid Glass */}
      <ModalPortal>
        <AnimatePresence>
          {showPaymentModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="fixed inset-0 bg-slate-950/50 dark:bg-black/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl max-h-[92vh] bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] md:rounded-[3rem] relative z-10 flex flex-col overflow-hidden"
            >
              {/* Barra superior con Liquid Glass */}
              <div className="px-6 md:px-10 py-4 border-b border-slate-200/50 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                      {editingPayment ? 'Modificar Registro de Cobro' : 'Nuevo Registro de Cobro'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Calcula automáticamente en Bolívares (Bs.) según la tasa oficial BCV y guarda el registro
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                >
                  <X size={16} />
                  <span>Cerrar</span>
                </button>
              </div>

              {/* Contenido scrolleable y centrado */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-2xl mx-auto w-full">
                  <form onSubmit={handleSavePaymentSubmit} className="space-y-5">
                {/* Selector de Inquilino */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Inquilino *</label>
                  <select
                    required
                    value={formTenantId}
                    onChange={e => {
                      const tId = e.target.value;
                      setFormTenantId(tId);
                      const t = tenants.find(item => item.id === tId);
                      if (t) {
                        handleAmountUSDChange(t.monthlyRent);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5 text-xs md:text-sm text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 outline-none"
                  >
                    <option value="">Seleccione Inquilino...</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.idNumber || 'Sin CI'}) - Renta: ${t.monthlyRent}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Mes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mes Correspondiente *</label>
                    <select
                      value={formMonth}
                      onChange={e => setFormMonth(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5 text-xs md:text-sm text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 outline-none"
                    >
                      {monthsList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha de Pago */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fecha de Pago *</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 outline-none"
                    />
                  </div>
                </div>

                {/* Importe en USD */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Importe en Dólares ($ USD) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formAmountUSD || ''}
                      onChange={e => handleAmountUSDChange(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Tasa BCV */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Cambio Oficial BCV (Bs. / USD)</label>
                    <span className="text-[10px] font-bold text-indigo-600">Oficial BCV</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formExchangeRate}
                    onChange={e => {
                      const newRate = Number(e.target.value);
                      setFormExchangeRate(newRate);
                      setFormAmountBs(Math.round(formAmountUSD * newRate * 100) / 100);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5 text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 outline-none"
                  />
                </div>

                {/* Monto en Bolívares (Editable) */}
                <div className="space-y-1 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Equivalente en Bolívares (Bs.) *</label>
                    <span className="text-[10px] font-bold text-emerald-600 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md">Editable</span>
                  </div>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formAmountBs || ''}
                    onChange={e => setFormAmountBs(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 text-sm font-black text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 outline-none"
                  />
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                    Calculado automáticamente: ${formAmountUSD} × {Number(formExchangeRate || 52.50).toFixed(2)} = Bs. {Number(formAmountBs || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                  </p>
                </div>

                {/* Estado del Pago */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Estado del Cobro *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormStatus('paid')}
                      className={`py-3.5 rounded-2xl font-bold text-xs transition-all border-2 ${
                        formStatus === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'
                      }`}
                    >
                      Pagado (Emitir Recibo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('pending')}
                      className={`py-3.5 rounded-2xl font-bold text-xs transition-all border-2 ${
                        formStatus === 'pending'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-300'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'
                      }`}
                    >
                      Pendiente / En Mora
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  {editingPayment ? 'Guardar Cambios del Cobro' : 'Confirmar y Guardar Cobro'}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </motion.div>
  );
};
