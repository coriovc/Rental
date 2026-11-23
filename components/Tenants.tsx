import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from './ModalPortal';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Phone, 
  Mail, 
  FileText, 
  Calendar,
  X,
  Printer,
  MessageSquare,
  DollarSign,
  User,
  Users,
  Upload,
  Home,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle,
  Wifi,
  IdCard,
  Send,
  Eye,
  Check,
  TrendingUp,
  FileCheck,
  Download,
  ExternalLink
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Tenant, Payment, Property, PdfConfig } from '../types';
import { generateReceiptPDF, getWhatsAppReminderLink, getWhatsAppConfirmationLink } from '../services/pdfService';
import { storage } from '../data/mockData';

interface TenantsProps {
  tenants: Tenant[];
  payments: Payment[];
  properties: Property[];
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
  onUpdatePayment?: (payment: Payment) => void;
  onMarkPaid?: (paymentId: string) => void;
  onAddTenant: (tenant: Omit<Tenant, 'id'>) => void;
  onUpdateTenant: (tenant: Tenant) => void;
  onDeleteTenant: (tenantId: string) => void;
  bcvRate?: number;
  wsReminderTemplate?: string;
  wsConfirmationTemplate?: string;
  pdfConfig?: PdfConfig;
}

export const Tenants: React.FC<TenantsProps> = ({ 
  tenants, 
  payments, 
  properties, 
  onAddPayment, 
  onUpdatePayment,
  onMarkPaid,
  onAddTenant, 
  onUpdateTenant, 
  onDeleteTenant,
  bcvRate = 52.50,
  wsReminderTemplate,
  wsConfirmationTemplate,
  pdfConfig
}) => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  
  // States para Edición/Eliminación de Inquilino y Contrato
  const [isEditing, setIsEditing] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); 
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [showContractViewerModal, setShowContractViewerModal] = useState(false);
  const [isDraggingEditPdf, setIsDraggingEditPdf] = useState(false);
  const editPdfInputRef = useRef<HTMLInputElement>(null);

  // States para el formulario de Cobro (USD y Bs)
  const [amountUSD, setAmountUSD] = useState<number>(0);
  const [amountBs, setAmountBs] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(bcvRate);
  const [month, setMonth] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');

  const pdfInputRef = useRef<HTMLInputElement>(null);

  // State para nuevo inquilino
  const [newTenant, setNewTenant] = useState({
    name: '',
    idNumber: '',
    email: '',
    phone: '',
    propertyId: '',
    baseRent: 0,
    includeInternet: false,
    startDate: new Date().toISOString().split('T')[0],
    contractDuration: 12,
    contractUrl: '',
    contractFileName: ''
  });

  // State para modificación COMPLETA del inquilino (con todas las opciones de creación)
  const [editForm, setEditForm] = useState({
    name: '',
    idNumber: '',
    email: '',
    phone: '',
    propertyId: '',
    baseRent: 0,
    includeInternet: false,
    startDate: new Date().toISOString().split('T')[0],
    contractDuration: 12,
    contractUrl: '',
    contractFileName: '',
    status: 'active' as 'active' | 'late' | 'inactive'
  });

  // Sincronizar editForm cada vez que se selecciona un inquilino o se activa el modo de edición
  useEffect(() => {
    if (selectedTenant) {
      const isInet = !!selectedTenant.includeInternet;
      const baseRentCalc = selectedTenant.monthlyRent - (isInet ? 10 : 0);
      setEditForm({
        name: selectedTenant.name || '',
        idNumber: selectedTenant.idNumber || '',
        email: selectedTenant.email || '',
        phone: selectedTenant.phone || '',
        propertyId: selectedTenant.propertyId || '',
        baseRent: baseRentCalc > 0 ? baseRentCalc : selectedTenant.monthlyRent,
        includeInternet: isInet,
        startDate: selectedTenant.startDate || new Date().toISOString().split('T')[0],
        contractDuration: selectedTenant.contractDuration || 12,
        contractUrl: selectedTenant.contractUrl || '',
        contractFileName: selectedTenant.contractUrl ? 'contrato_arrendamiento.pdf' : '',
        status: selectedTenant.status || 'active'
      });
    }
  }, [selectedTenant, isEditing]);

  // Al cambiar la tasa prop, sincronizar
  useEffect(() => {
    setExchangeRate(bcvRate);
  }, [bcvRate]);

  // Al cambiar el monto en USD, auto-calcular el equivalente en Bs
  const handleAmountUSDChange = (val: number) => {
    setAmountUSD(val);
    const calculatedBs = Math.round((val * exchangeRate) * 100) / 100;
    setAmountBs(calculatedBs);
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.idNumber && t.idNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    t.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTenantPayments = (id: string) => payments.filter(p => p.tenantId === id);

  const getTenantBalance = (id: string) => {
    const pendingPayments = payments.filter(p => p.tenantId === id && p.status === 'pending');
    const amount = Math.round(pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100) / 100;
    return { amount, pendingPayments };
  };

  useEffect(() => {
    if (selectedTenant) {
      const fresh = tenants.find(t => t.id === selectedTenant.id);
      if (fresh) {
        setSelectedTenant(fresh);
      }
    }
  }, [tenants]);

  const handleOpenPaymentForm = (existingPayment?: Payment) => {
    if (selectedTenant) {
      if (existingPayment) {
        setEditingPayment(existingPayment);
        setAmountUSD(existingPayment.amount);
        setExchangeRate(existingPayment.exchangeRate || bcvRate);
        setAmountBs(existingPayment.amountBs || Math.round(existingPayment.amount * (existingPayment.exchangeRate || bcvRate) * 100) / 100);
        setMonth(existingPayment.month);
        setPaymentStatus(existingPayment.status);
      } else {
        setEditingPayment(null);
        const balance = getTenantBalance(selectedTenant.id);
        const rent = balance.amount > 0 ? balance.amount : selectedTenant.monthlyRent;
        setAmountUSD(rent);
        setExchangeRate(bcvRate);
        setAmountBs(Math.round(rent * bcvRate * 100) / 100);
        const nextMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date());
        setMonth(nextMonth.charAt(0).toUpperCase() + nextMonth.slice(1));
        setPaymentStatus('paid');
      }
      setShowPaymentForm(true);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTenant) {
      if (editingPayment && onUpdatePayment) {
        onUpdatePayment({
          ...editingPayment,
          amount: amountUSD,
          amountBs: amountBs,
          exchangeRate: exchangeRate,
          month: month,
          status: paymentStatus
        });
      } else {
        onAddPayment({ 
          tenantId: selectedTenant.id, 
          amount: amountUSD, 
          amountBs: amountBs,
          exchangeRate: exchangeRate,
          month, 
          status: paymentStatus, 
          date: new Date().toISOString().split('T')[0] 
        });
      }
      setShowPaymentForm(false);
      setEditingPayment(null);
    }
  };

  // Manejo de carga de contrato PDF (Drag & Drop)
  const processPdfFile = (file: File) => {
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setNewTenant(prev => ({
          ...prev,
          contractUrl: base64,
          contractFileName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPdf(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMonthlyRent = Number(newTenant.baseRent) + (newTenant.includeInternet ? 10 : 0);
    onAddTenant({ 
      name: newTenant.name,
      idNumber: newTenant.idNumber,
      email: newTenant.email || undefined,
      phone: newTenant.phone,
      propertyId: newTenant.propertyId,
      monthlyRent: finalMonthlyRent,
      includeInternet: newTenant.includeInternet,
      startDate: newTenant.startDate,
      contractDuration: Number(newTenant.contractDuration),
      contractUrl: newTenant.contractUrl || undefined,
      status: 'active' 
    });
    setShowNewTenantModal(false);
    setNewTenant({
      name: '', idNumber: '', email: '', phone: '', propertyId: '',
      baseRent: 0, includeInternet: false, startDate: new Date().toISOString().split('T')[0],
      contractDuration: 12, contractUrl: '', contractFileName: ''
    });
  };

  const processEditPdfFile = (file: File) => {
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setEditForm(prev => ({
          ...prev,
          contractUrl: base64,
          contractFileName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditPdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingEditPdf(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processEditPdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpdateTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTenant) {
      const finalMonthlyRent = Number(editForm.baseRent) + (editForm.includeInternet ? 10 : 0);
      const updatedTenant: Tenant = {
        ...selectedTenant,
        name: editForm.name,
        idNumber: editForm.idNumber,
        email: editForm.email || undefined,
        phone: editForm.phone,
        propertyId: editForm.propertyId,
        monthlyRent: finalMonthlyRent,
        includeInternet: editForm.includeInternet,
        startDate: editForm.startDate,
        contractDuration: Number(editForm.contractDuration),
        contractUrl: editForm.contractUrl || undefined,
        status: editForm.status
      };
      onUpdateTenant(updatedTenant);
      setSelectedTenant(updatedTenant);
      setIsEditing(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedTenant && deleteStep === 2) {
      onDeleteTenant(selectedTenant.id);
      setSelectedTenant(null);
      setDeleteStep(0);
    } else {
      setDeleteStep(prev => prev + 1);
    }
  };

  const resetModals = () => {
    if (!showPaymentForm) {
      setShowNewTenantModal(false);
      setSelectedTenant(null);
      setIsEditing(false);
      setDeleteStep(0);
    }
  };

  const monthsList = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const availableProperties = properties.filter(p => !p.isOccupied || (selectedTenant && p.id === selectedTenant.propertyId));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 md:pb-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Inquilinos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de contratos, identificación y cobros en USD / Bs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, cédula o teléfono..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-full text-sm text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setShowNewTenantModal(true)} 
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl font-bold text-white text-sm shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 whitespace-nowrap active:scale-95 transition-transform hover:bg-indigo-700"
          >
            <Plus size={20} />
            <span>Nuevo Inquilino</span>
          </button>
        </div>
      </header>

      {/* Grid de Inquilinos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => {
          const prop = properties.find(p => p.id === tenant.propertyId);
          const balance = getTenantBalance(tenant.id);
          return (
            <GlassCard key={tenant.id} className="p-6" onClick={() => setSelectedTenant(tenant)} hoverEffect>
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
                    {tenant.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-base line-clamp-1 tracking-tight">{tenant.name}</h4>
                    {tenant.idNumber && (
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                        CI: {tenant.idNumber}
                      </span>
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-widest block mt-0.5 ${tenant.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tenant.status === 'active' ? 'Al día' : 'En mora'}
                    </span>
                  </div>
                </div>
                <button className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition-all" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Inmueble Asignado */}
              <div className="mb-4 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <Home size={15} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  {prop?.name || 'Propiedad no asignada'}
                </span>
              </div>
              
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Phone size={13} /></div>
                  <span className="text-xs font-medium">{tenant.phone}</span>
                </div>
                {tenant.email && (
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Mail size={13} /></div>
                    <span className="text-xs font-medium truncate">{tenant.email}</span>
                  </div>
                )}
                {tenant.includeInternet && (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold pt-1">
                    <Wifi size={14} />
                    <span>Internet Incluido (+ $10/mes)</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Canon Mensual</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-800 dark:text-white">${tenant.monthlyRent.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ≈ Bs. {(tenant.monthlyRent * bcvRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    {balance.amount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50">
                        Debe: ${balance.amount.toLocaleString()} USD
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                        Al día ($0 pendiente)
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/50 px-3 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">Detalle</span>
              </div>
            </GlassCard>
          );
        })}

        {filteredTenants.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-40">
            <Clock className="mx-auto mb-4 text-slate-300" size={48} />
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No se encontraron inquilinos</p>
          </div>
        )}
      </div>

      {/* Modal Principal (Nuevo Inquilino / Vista Individual con Liquid Glass) */}
      <ModalPortal>
        <AnimatePresence>
          {(showNewTenantModal || selectedTenant) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={resetModals} 
              className="fixed inset-0 bg-slate-950/50 dark:bg-black/70 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 16 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 16 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl h-[92vh] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] md:rounded-[3rem] relative z-10 flex flex-col overflow-hidden"
            >
              {/* Header con Liquid Glass */}
              <div className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-slate-200/50 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-sm">
                    {showNewTenantModal ? <Plus size={20} /> : <Users size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
                      {showNewTenantModal ? 'Nuevo Inquilino' : (selectedTenant?.name || 'Ficha del Inquilino')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {showNewTenantModal ? 'Registro de contrato y ficha técnica' : (selectedTenant?.idNumber || 'Expediente digital')}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={resetModals} 
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer text-xs font-bold border border-slate-200/40 dark:border-slate-700/40"
                  title="Cerrar modal"
                >
                  <X size={18} />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-4xl mx-auto w-full">
                  {showNewTenantModal ? (
                    <div className="pt-2">
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Nuevo Inquilino</h3>
                    <p className="text-xs text-slate-500 mb-6">Completa la ficha técnica para registrar un nuevo contrato de arrendamiento.</p>
                    
                    <form onSubmit={handleAddTenantSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre Completo */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombres y Apellidos *</label>
                          <input 
                            required 
                            placeholder="Ej: Juan Pérez García" 
                            value={newTenant.name} 
                            onChange={e => setNewTenant({...newTenant, name: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          />
                        </div>

                        {/* Cédula de Identidad / N° Identificación */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cédula / Documento de Identidad *</label>
                          <input 
                            required 
                            placeholder="Ej: V-18.452.963" 
                            value={newTenant.idNumber} 
                            onChange={e => setNewTenant({...newTenant, idNumber: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          />
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Teléfono / WhatsApp *</label>
                          <input 
                            required 
                            type="tel" 
                            placeholder="Ej: +58 412 1234567" 
                            value={newTenant.phone} 
                            onChange={e => setNewTenant({...newTenant, phone: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          />
                        </div>

                        {/* Correo Electrónico (OPCIONAL) */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Correo Electrónico (Opcional)</label>
                          <input 
                            type="email" 
                            placeholder="ejemplo@correo.com" 
                            value={newTenant.email} 
                            onChange={e => setNewTenant({...newTenant, email: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          />
                        </div>

                        {/* Selección de Propiedad */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Propiedad a Ocupar *</label>
                          <select 
                            required 
                            value={newTenant.propertyId} 
                            onChange={e => {
                              const pId = e.target.value;
                              const prop = properties.find(p => p.id === pId);
                              setNewTenant({
                                ...newTenant, 
                                propertyId: pId,
                                baseRent: prop ? prop.price : newTenant.baseRent
                              });
                            }} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">Seleccionar Propiedad Disponible...</option>
                            {availableProperties.map(p => (
                              <option key={p.id} value={p.id}>{p.name} - ${p.price}/mes</option>
                            ))}
                          </select>
                        </div>

                        {/* Monto de Renta */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Canon de Alquiler ($ USD) *</label>
                          <input 
                            required 
                            type="number" 
                            placeholder="Monto en dólares" 
                            value={newTenant.baseRent || ''} 
                            onChange={e => setNewTenant({...newTenant, baseRent: Number(e.target.value)})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          />
                        </div>

                        {/* Fecha de Inicio del Contrato */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fecha de Inicio *</label>
                          <input 
                            required 
                            type="date" 
                            value={newTenant.startDate} 
                            onChange={e => setNewTenant({...newTenant, startDate: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                          />
                        </div>

                        {/* Duración del Contrato (6, 12, 18, 24 meses) */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Duración del Contrato *</label>
                          <select 
                            required 
                            value={newTenant.contractDuration} 
                            onChange={e => setNewTenant({...newTenant, contractDuration: Number(e.target.value)})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value={6}>6 Meses</option>
                            <option value={12}>12 Meses (1 Año)</option>
                            <option value={18}>18 Meses (1 Año y Medio)</option>
                            <option value={24}>24 Meses (2 Años)</option>
                          </select>
                        </div>
                      </div>

                      {/* Opción de Incluir Internet (+$10) */}
                      <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between cursor-pointer" onClick={() => setNewTenant(prev => ({...prev, includeInternet: !prev.includeInternet}))}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${newTenant.includeInternet ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                            <Wifi size={18} />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">Incluir Servicio de Internet</h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Suma automáticamente $10 al monto total de la renta mensual.</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={newTenant.includeInternet} 
                          onChange={e => setNewTenant({...newTenant, includeInternet: e.target.checked})} 
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                        />
                      </div>

                      {/* Resumen del Monto Total Mensual */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Renta a Cobrar:</span>
                        <div className="text-right">
                          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                            ${Number(newTenant.baseRent) + (newTenant.includeInternet ? 10 : 0)} USD/mes
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {newTenant.includeInternet ? `($${newTenant.baseRent} base + $10 internet)` : 'Canon base'}
                          </p>
                        </div>
                      </div>

                      {/* Drag & Drop para Contrato PDF */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contrato Digital (PDF)</label>
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingPdf(true); }}
                          onDragLeave={() => setIsDraggingPdf(false)}
                          onDrop={handlePdfDrop}
                          onClick={() => pdfInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer group ${
                            isDraggingPdf 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' 
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-indigo-300'
                          }`}
                        >
                          <input 
                            ref={pdfInputRef} 
                            type="file" 
                            accept="application/pdf" 
                            onChange={(e) => e.target.files && e.target.files[0] && processPdfFile(e.target.files[0])} 
                            className="hidden" 
                          />
                          {newTenant.contractFileName ? (
                            <div className="flex items-center justify-center gap-3">
                              <FileCheck className="text-emerald-500" size={28} />
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs">{newTenant.contractFileName}</p>
                                <p className="text-[10px] text-emerald-600 font-semibold">PDF Cargado con éxito (Clic para cambiar)</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Upload className="mx-auto text-slate-300 dark:text-slate-600 mb-2 group-hover:text-indigo-500 transition-colors" size={32} />
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Arrastra y suelta el contrato PDF aquí o <span className="text-indigo-600 underline">examina archivos</span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">Formato PDF únicamente</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Botón de Alta de Inquilino */}
                      <button 
                        type="submit" 
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-indigo-100 dark:shadow-indigo-950/50 transition-all hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <User size={18} />
                        <span>Agregar Nuevo Inquilino (Dar de Alta)</span>
                      </button>
                    </form>
                  </div>
                ) : selectedTenant && (
                  /* ========================================================================= */
                  /* REQUIREMENT 2: VISTA INDIVIDUAL DEL INQUILINO CON NOTIFICACIÓN WHATSAPP */
                  /* ========================================================================= */
                  <div className="pt-2 flex flex-col h-full">
                    
                    {/* Botones superiores de acción rápida: Ver Contrato Digital y Notificar por WhatsApp */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-teal-500/10 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-950/60 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Gestión del Inquilino</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {selectedTenant.contractUrl ? 'Contrato digital PDF adjunto y disponible' : 'Sin contrato digital adjunto aún'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Botón Ver Contrato */}
                        <button 
                          onClick={() => setShowContractViewerModal(true)}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-100 dark:shadow-indigo-950/50 transition-all active:scale-95"
                          title="Ver o descargar el contrato digital en PDF"
                        >
                          <FileText size={15} />
                          <span>Ver Contrato (PDF)</span>
                        </button>

                        {/* Botón WhatsApp Recordatorio */}
                        <a 
                          href={getWhatsAppReminderLink(
                            selectedTenant, 
                            getTenantPayments(selectedTenant.id).find(p => p.status === 'pending'),
                            wsReminderTemplate,
                            bcvRate
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                          title="Enviar aviso por WhatsApp de pago pendiente"
                        >
                          <Send size={14} />
                          <span>Notificar vía WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* Encabezado del inquilino */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[1.8rem] bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-indigo-950/50">
                          {selectedTenant.name[0]}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{selectedTenant.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {selectedTenant.idNumber && (
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                CI: {selectedTenant.idNumber}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 font-medium">{selectedTenant.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsEditing(!isEditing)} 
                          className={`p-3 rounded-2xl transition-all ${isEditing ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600'}`}
                          title="Editar Inquilino"
                        >
                          <Edit2 size={18} />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={handleDeleteConfirm}
                            className={`p-3 rounded-2xl transition-all ${deleteStep > 0 ? 'bg-rose-600 text-white ring-8 ring-rose-100 dark:ring-rose-950/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600'}`}
                            title="Eliminar Inquilino"
                          >
                            <Trash2 size={18} />
                          </button>
                          
                          <AnimatePresence>
                            {deleteStep > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                                className="absolute right-0 top-14 w-60 bg-white dark:bg-slate-800 border border-rose-100 dark:border-rose-900 shadow-2xl rounded-[2rem] p-5 z-30"
                              >
                                <div className="flex items-center gap-2 text-rose-600 mb-2">
                                  <AlertTriangle size={18} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Advertencia</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                                  {deleteStep === 1 ? '¿Deseas dar de baja a este inquilino?' : 'Se eliminarán sus cobros. ¿Confirmar?'}
                                </p>
                                <div className="flex gap-2">
                                  <button onClick={() => setDeleteStep(0)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-[10px] font-bold rounded-xl">Cancelar</button>
                                  <button onClick={handleDeleteConfirm} className="flex-1 py-2 bg-rose-600 text-white text-[10px] font-bold rounded-xl">{deleteStep === 1 ? 'Continuar' : 'Confirmar'}</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {isEditing ? (
                        <motion.form 
                          key="edit-form"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          onSubmit={handleUpdateTenantSubmit} 
                          className="space-y-5 mb-8"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div>
                              <h4 className="text-base md:text-lg font-bold text-slate-800 dark:text-white">Modificar Ficha del Inquilino</h4>
                              <p className="text-xs text-slate-400">Edita todos los datos del contrato, propiedad asignada y condiciones.</p>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                              Modo Edición
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 1. Nombre Completo */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombres y Apellidos *</label>
                              <input 
                                required 
                                value={editForm.name} 
                                onChange={e => setEditForm({...editForm, name: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                              />
                            </div>

                            {/* 2. Cédula / Documento de Identidad */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cédula / Documento de Identidad *</label>
                              <input 
                                required 
                                value={editForm.idNumber} 
                                onChange={e => setEditForm({...editForm, idNumber: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                              />
                            </div>

                            {/* 3. Teléfono / WhatsApp */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Teléfono / WhatsApp *</label>
                              <input 
                                required 
                                type="tel" 
                                value={editForm.phone} 
                                onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                              />
                            </div>

                            {/* 4. Correo Electrónico (Opcional) */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Correo Electrónico (Opcional)</label>
                              <input 
                                type="email" 
                                value={editForm.email} 
                                onChange={e => setEditForm({...editForm, email: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                              />
                            </div>

                            {/* 5. Selección de Propiedad */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Propiedad Asignada *</label>
                              <select 
                                required 
                                value={editForm.propertyId} 
                                onChange={e => {
                                  const pId = e.target.value;
                                  const prop = properties.find(p => p.id === pId);
                                  setEditForm({
                                    ...editForm, 
                                    propertyId: pId,
                                    baseRent: prop ? prop.price : editForm.baseRent
                                  });
                                }} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                              >
                                {properties.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} - ${p.price}/mes {p.isOccupied && p.id !== selectedTenant.propertyId ? '(Ocupado actualmente)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* 6. Monto de Renta Base */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Canon de Alquiler Base ($ USD) *</label>
                              <input 
                                required 
                                type="number" 
                                value={editForm.baseRent || ''} 
                                onChange={e => setEditForm({...editForm, baseRent: Number(e.target.value)})} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                              />
                            </div>

                            {/* 7. Fecha de Inicio del Contrato */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fecha de Inicio *</label>
                              <input 
                                required 
                                type="date" 
                                value={editForm.startDate} 
                                onChange={e => setEditForm({...editForm, startDate: e.target.value})} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                              />
                            </div>

                            {/* 8. Duración del Contrato */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Duración del Contrato *</label>
                              <select 
                                required 
                                value={editForm.contractDuration} 
                                onChange={e => setEditForm({...editForm, contractDuration: Number(e.target.value)})} 
                                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                              >
                                <option value={6}>6 Meses</option>
                                <option value={12}>12 Meses (1 Año)</option>
                                <option value={18}>18 Meses (1 Año y Medio)</option>
                                <option value={24}>24 Meses (2 Años)</option>
                              </select>
                            </div>
                          </div>

                          {/* 9. Estado del Inquilino */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Estado del Inquilino *</label>
                            <div className="grid grid-cols-3 gap-3">
                              <button
                                type="button"
                                onClick={() => setEditForm({...editForm, status: 'active'})}
                                className={`py-3 rounded-2xl font-bold text-xs transition-all border-2 ${
                                  editForm.status === 'active'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'
                                }`}
                              >
                                Al día / Activo
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditForm({...editForm, status: 'late'})}
                                className={`py-3 rounded-2xl font-bold text-xs transition-all border-2 ${
                                  editForm.status === 'late'
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-300 dark:border-rose-700'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'
                                }`}
                              >
                                En mora / Atrasado
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditForm({...editForm, status: 'inactive'})}
                                className={`py-3 rounded-2xl font-bold text-xs transition-all border-2 ${
                                  editForm.status === 'inactive'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-300 dark:border-amber-700'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'
                                }`}
                              >
                                Inactivo
                              </button>
                            </div>
                          </div>

                          {/* 10. Opción de Incluir Internet (+$10) */}
                          <div 
                            className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between cursor-pointer" 
                            onClick={() => setEditForm(prev => ({...prev, includeInternet: !prev.includeInternet}))}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${editForm.includeInternet ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <Wifi size={18} />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">Incluir Servicio de Internet</h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Suma automáticamente $10 al monto total de la renta mensual.</p>
                              </div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={editForm.includeInternet} 
                              onChange={e => setEditForm({...editForm, includeInternet: e.target.checked})} 
                              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                            />
                          </div>

                          {/* Resumen del Monto Total Mensual */}
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Renta a Cobrar:</span>
                            <div className="text-right">
                              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                ${Number(editForm.baseRent) + (editForm.includeInternet ? 10 : 0)} USD/mes
                              </span>
                              <p className="text-[10px] text-slate-400">
                                {editForm.includeInternet ? `($${editForm.baseRent} base + $10 internet)` : 'Canon base'}
                              </p>
                            </div>
                          </div>

                          {/* 11. Contrato Digital PDF (Drag & Drop y Reemplazo) */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contrato Digital (PDF)</label>
                            <div 
                              onDragOver={(e) => { e.preventDefault(); setIsDraggingEditPdf(true); }}
                              onDragLeave={() => setIsDraggingEditPdf(false)}
                              onDrop={handleEditPdfDrop}
                              onClick={() => editPdfInputRef.current?.click()}
                              className={`border-2 border-dashed rounded-3xl p-5 text-center transition-all cursor-pointer group ${
                                isDraggingEditPdf 
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' 
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-indigo-300'
                              }`}
                            >
                              <input 
                                ref={editPdfInputRef} 
                                type="file" 
                                accept="application/pdf" 
                                onChange={(e) => e.target.files && e.target.files[0] && processEditPdfFile(e.target.files[0])} 
                                className="hidden" 
                              />
                              {editForm.contractUrl ? (
                                <div className="flex items-center justify-between gap-3 px-2">
                                  <div className="flex items-center gap-3">
                                    <FileCheck className="text-emerald-500 shrink-0" size={26} />
                                    <div className="text-left">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs">
                                        {editForm.contractFileName || 'Contrato_Adjunto.pdf'}
                                      </p>
                                      <p className="text-[10px] text-emerald-600 font-semibold">PDF Cargado (Clic para cambiar o reemplazar)</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditForm(prev => ({ ...prev, contractUrl: '', contractFileName: '' }));
                                    }}
                                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-xs font-bold"
                                    title="Quitar contrato PDF"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <Upload className="mx-auto text-slate-300 dark:text-slate-600 mb-2 group-hover:text-indigo-500 transition-colors" size={28} />
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    Arrastra y suelta el contrato PDF aquí o <span className="text-indigo-600 underline">examina archivos</span>
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">Formato PDF únicamente</p>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-3 pt-3">
                            <button 
                              type="button" 
                              onClick={() => setIsEditing(false)} 
                              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                              Cancelar
                            </button>
                            <button 
                              type="submit" 
                              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 dark:shadow-indigo-950/50 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                              Guardar Todos los Cambios
                            </button>
                          </div>
                        </motion.form>
                      ) : (
                        <motion.div key="view-details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                          {/* Saldo Actual del Cliente */}
                          {(() => {
                            const balance = getTenantBalance(selectedTenant.id);
                            const hasDebt = balance.amount > 0;
                            const latestPending = balance.pendingPayments[0];
                            const reminderPayment: Payment = latestPending
                              ? { ...latestPending, amount: balance.amount, amountBs: Math.round(balance.amount * (latestPending.exchangeRate || bcvRate) * 100) / 100 }
                              : {
                                  id: 'saldo',
                                  tenantId: selectedTenant.id,
                                  amount: balance.amount,
                                  amountBs: Math.round(balance.amount * bcvRate * 100) / 100,
                                  exchangeRate: bcvRate,
                                  date: new Date().toISOString().split('T')[0],
                                  month: new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date()),
                                  status: 'pending'
                                };
                            return (
                              <div className={`mb-5 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                hasDebt
                                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                              }`}>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${hasDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      Saldo Actual del Cliente
                                    </p>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      hasDebt
                                        ? selectedTenant.status === 'late'
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-amber-500 text-white'
                                        : 'bg-emerald-600 text-white'
                                    }`}>
                                      {hasDebt ? (selectedTenant.status === 'late' ? 'En mora (+5 días)' : 'Debe / Pendiente') : 'Al día'}
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-2.5 mt-1">
                                    <span className={`text-2xl font-black ${hasDebt ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                      ${balance.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                    </span>
                                    {hasDebt && (
                                      <span className="text-xs font-bold text-rose-600/80 dark:text-rose-400/80">
                                        ≈ Bs. {(balance.amount * bcvRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {hasDebt
                                      ? `${balance.pendingPayments.length} ${balance.pendingPayments.length === 1 ? 'cargo pendiente' : 'cargos pendientes'} acumulados`
                                      : 'Sin saldos pendientes por cobrar'}
                                  </p>
                                </div>
                                {hasDebt && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={getWhatsAppReminderLink(selectedTenant, reminderPayment, wsReminderTemplate, bcvRate)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                                    >
                                      <MessageSquare size={14} />
                                      <span>Recordar</span>
                                    </a>
                                    <button
                                      onClick={() => handleOpenPaymentForm()}
                                      className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm"
                                    >
                                      <DollarSign size={14} />
                                      <span>Abonar / Pagar</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Tarjetas de detalles rápidos */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canon Total</p>
                              <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">${selectedTenant.monthlyRent}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tasa BCV</p>
                              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{Number(bcvRate || 52.50).toFixed(2)} Bs/$</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrato</p>
                              <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">{selectedTenant.contractDuration || 12} Meses</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Internet</p>
                              <p className={`text-xs font-black mt-1 ${selectedTenant.includeInternet ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {selectedTenant.includeInternet ? 'Incluido (+$10)' : 'No incluido'}
                              </p>
                            </div>
                          </div>

                          {/* Historial de Cobros */}
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-[0.2em]">Historial de Cobros</h4>
                            <button 
                              onClick={() => handleOpenPaymentForm()}
                              className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <Plus size={14} /> Nuevo Cobro
                            </button>
                          </div>

                          <div className="space-y-3 mb-24 md:mb-8 pr-1 overflow-y-auto max-h-[300px] scrollbar-hide">
                            {getTenantPayments(selectedTenant.id).map(p => {
                              const prop = properties.find(prop => prop.id === selectedTenant.propertyId);
                              const rateUsed = Number(p.exchangeRate || bcvRate || 52.50);
                              const bsAmount = Number(p.amountBs || (p.amount * rateUsed));
                              return (
                                <motion.div 
                                  layout
                                  key={p.id} 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-800/60 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition-all gap-3 shadow-sm"
                                >
                                  <div>
                                    <div className="flex items-center gap-2.5">
                                      <p className="font-bold text-sm text-slate-800 dark:text-white">{p.month}</p>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                        {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{p.date}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">${p.amount.toLocaleString()} USD</span>
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                        ≈ Bs. {bsAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[9px] text-slate-400">({rateUsed.toFixed(2)} Bs/$)</span>
                                    </div>
                                  </div>
                                  
                                  {/* Botones de acción por cada pago */}
                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    {p.status === 'pending' && onMarkPaid && (
                                      <button
                                        onClick={() => onMarkPaid(p.id)}
                                        className="px-2.5 py-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl hover:bg-indigo-600 hover:text-white border border-indigo-200/60 dark:border-indigo-800/50 transition-all flex items-center gap-1"
                                        title="Marcar este cargo como pagado"
                                      >
                                        <Check size={13} />
                                        <span>Pagar</span>
                                      </button>
                                    )}

                                    {/* Editar Pago */}
                                    <button 
                                      onClick={() => handleOpenPaymentForm(p)} 
                                      className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:text-indigo-600 border border-slate-100 dark:border-slate-700 transition-all"
                                      title="Editar Pago"
                                    >
                                      <Edit2 size={15}/>
                                    </button>

                                    {/* Generar PDF oficial con montos en USD y Bs */}
                                    <button 
                                      onClick={() => generateReceiptPDF(selectedTenant, p, prop, pdfConfig)} 
                                      className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all"
                                      title="Descargar Recibo Digital en PDF (USD y Bs)"
                                    >
                                      <Printer size={15}/>
                                    </button>

                                    {/* Enviar Confirmación o Recordatorio por WhatsApp */}
                                    <a 
                                      href={p.status === 'pending'
                                        ? getWhatsAppReminderLink(selectedTenant, p, wsReminderTemplate, bcvRate)
                                        : getWhatsAppConfirmationLink(selectedTenant, p, wsConfirmationTemplate, bcvRate)
                                      } 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-2.5 text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all"
                                      title={p.status === 'pending' ? 'Enviar Recordatorio por WhatsApp' : 'Enviar Comprobante por WhatsApp'}
                                    >
                                      <MessageSquare size={15}/>
                                    </a>
                                  </div>
                                </motion.div>
                              );
                            })}

                            {getTenantPayments(selectedTenant.id).length === 0 && (
                              <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                <Clock className="mx-auto mb-2 text-slate-300" size={32} />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sin historial de pagos</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Formulario Modal de Cobro (Con cálculo automático en Bs y campo editable) */}
                    <AnimatePresence>
                      {showPaymentForm && (
                        <motion.div 
                          initial={{ x: "100%" }} 
                          animate={{ x: 0 }} 
                          exit={{ x: "100%" }} 
                          transition={{ type: "spring", damping: 25, stiffness: 200 }}
                          className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl z-30 flex flex-col overflow-y-auto rounded-[2.5rem] md:rounded-[3rem]"
                        >
                          <div className="sticky top-0 z-20 px-6 md:px-10 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                                <DollarSign size={20} />
                              </div>
                              <div>
                                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                                  {editingPayment ? 'Modificar Registro de Cobro' : 'Nuevo Registro de Cobro'}
                                </h3>
                                <p className="text-xs text-slate-500">Calcula automáticamente en Bs. con la tasa oficial BCV y permite editarlo libremente.</p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setShowPaymentForm(false)} 
                              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                            >
                              <X size={16}/>
                              <span>Cerrar</span>
                            </button>
                          </div>

                          <div className="p-6 md:p-10 max-w-2xl mx-auto w-full flex-1">
                          {!editingPayment && getTenantBalance(selectedTenant.id).amount > 0 && (
                            <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50 text-xs text-indigo-700 dark:text-indigo-300">
                              <strong>Saldo pendiente actual:</strong> ${getTenantBalance(selectedTenant.id).amount.toLocaleString()} USD. Al registrar un pago como <strong>Pagado</strong>, se descontará automáticamente de este saldo (puedes registrar abonos parciales).
                            </div>
                          )}
                          <form onSubmit={handlePaymentSubmit} className="space-y-6">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mes Correspondiente</label>
                              <select value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 border-none outline-none">
                                {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>

                            {/* Monto en Dólares */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Importe en Dólares ($ USD) *</label>
                              <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                  required 
                                  type="number" 
                                  step="0.01" 
                                  value={amountUSD || ''} 
                                  onChange={e => handleAmountUSDChange(Number(e.target.value))} 
                                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-slate-800 dark:text-slate-100 border-none outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                />
                              </div>
                            </div>

                            {/* Tasa Oficial BCV Aplicada */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center px-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Cambio Oficial BCV (Bs. / USD)</label>
                                <span className="text-[10px] font-bold text-indigo-600">Oficial BCV</span>
                              </div>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={exchangeRate} 
                                onChange={e => {
                                  const newRate = Number(e.target.value);
                                  setExchangeRate(newRate);
                                  setAmountBs(Math.round(amountUSD * newRate * 100) / 100);
                                }} 
                                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-100 border-none outline-none" 
                              />
                            </div>

                            {/* Equivalente en Bolívares (Bs) - CALCULADO Y EDITABLE */}
                            <div className="space-y-1 p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Equivalente en Bolívares (Bs.) *</label>
                                <span className="text-[10px] font-bold text-emerald-600 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md">Editable</span>
                              </div>
                              <input 
                                required 
                                type="number" 
                                step="0.01" 
                                value={amountBs || ''} 
                                onChange={e => setAmountBs(Number(e.target.value))} 
                                className="w-full bg-white dark:bg-slate-800 rounded-xl p-3.5 text-base font-black text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 outline-none" 
                              />
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                                Calculado automáticamente: ${amountUSD} × {Number(exchangeRate || 52.50).toFixed(2)} Bs = Bs. {Number(amountBs || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}. Puedes modificar este valor si es necesario.
                              </p>
                            </div>

                            {/* Estado del Pago */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Estado del Cobro</label>
                              <div className="grid grid-cols-2 gap-4">
                                <button 
                                  type="button" 
                                  onClick={() => setPaymentStatus('paid')} 
                                  className={`py-4 rounded-2xl font-bold text-sm transition-all border-2 ${paymentStatus === 'paid' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'}`}
                                >
                                  Pagado
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setPaymentStatus('pending')} 
                                  className={`py-4 rounded-2xl font-bold text-sm transition-all border-2 ${paymentStatus === 'pending' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'}`}
                                >
                                  Pendiente
                                </button>
                              </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                              {editingPayment ? 'Guardar Cambios del Cobro' : 'Confirmar Registro de Pago'}
                            </button>
                          </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Visualizador de Contrato PDF con Liquid Glass */}
      <ModalPortal>
        <AnimatePresence>
          {showContractViewerModal && selectedTenant && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContractViewerModal(false)}
              className="fixed inset-0 bg-slate-950/70 dark:bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-6xl h-[94vh] bg-slate-900/90 dark:bg-black/90 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative z-10"
            >
              {/* Header del visualizador con Liquid Glass */}
              <div className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-white/10 bg-slate-900/70 dark:bg-black/70 backdrop-blur-xl sticky top-0 z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white">
                      Contrato de Arrendamiento - {selectedTenant.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Vista en Pantalla Completa del Documento Digital en PDF
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTenant.contractUrl && (
                    <>
                      <a
                        href={selectedTenant.contractUrl}
                        download={`Contrato_${selectedTenant.name.replace(/\s+/g, '_')}.pdf`}
                        className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Download size={14} />
                        <span className="hidden sm:inline">Descargar PDF</span>
                      </a>
                      <a
                        href={selectedTenant.contractUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5"
                      >
                        <ExternalLink size={14} />
                        <span className="hidden sm:inline">Abrir en Pestaña</span>
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => setShowContractViewerModal(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 transition-colors cursor-pointer text-xs font-bold"
                  >
                    <X size={18} />
                    <span className="hidden sm:inline">Cerrar</span>
                  </button>
                </div>
              </div>

              {/* Contenedor del PDF a pantalla completa */}
              <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative flex items-center justify-center">
                {selectedTenant.contractUrl ? (
                  <iframe
                    src={selectedTenant.contractUrl}
                    title="Contrato PDF"
                    className="w-full h-full border-none"
                  />
                ) : (
                  <div className="text-center p-8 max-w-md">
                    <FileText className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={54} />
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                      No hay ningún contrato PDF adjunto
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                      Este inquilino no tiene un contrato digital registrado aún. Puedes cargarlo ahora mismo haciendo clic en el botón de abajo.
                    </p>
                    <button
                      onClick={() => {
                        setShowContractViewerModal(false);
                        setIsEditing(true);
                      }}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 transition-all"
                    >
                      Modificar Inquilino y Cargar Contrato
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </motion.div>
  );
};
