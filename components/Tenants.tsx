
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
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
  Upload,
  Home,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Tenant, Payment, Property } from '../types';
import { generateReceiptPDF, getWhatsAppLink } from '../services/pdfService';
import { storage, DEFAULT_WS_TEMPLATE } from '../data/mockData';

interface TenantsProps {
  tenants: Tenant[];
  payments: Payment[];
  properties: Property[];
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
  onAddTenant: (tenant: Omit<Tenant, 'id'>) => void;
  onUpdateTenant: (tenant: Tenant) => void;
  onDeleteTenant: (tenantId: string) => void;
}

export const Tenants: React.FC<TenantsProps> = ({ 
  tenants, 
  payments, 
  properties, 
  onAddPayment, 
  onAddTenant,
  onUpdateTenant,
  onDeleteTenant
}) => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  
  // States for Edit/Delete
  const [isEditing, setIsEditing] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); 

  const [amount, setAmount] = useState<number>(0);
  const [month, setMonth] = useState<string>("");
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');

  const [newTenant, setNewTenant] = useState({
    name: '', email: '', phone: '', propertyId: '', monthlyRent: 0,
    startDate: new Date().toISOString().split('T')[0],
  });

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTenantPayments = (id: string) => payments.filter(p => p.tenantId === id);

  // Get current WhatsApp template
  const wsTemplate = storage.get('ws_template', DEFAULT_WS_TEMPLATE);

  const handleOpenPaymentForm = () => {
    if (selectedTenant) {
      setAmount(selectedTenant.monthlyRent);
      const nextMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date());
      setMonth(nextMonth.charAt(0).toUpperCase() + nextMonth.slice(1));
      setStatus('paid');
      setShowPaymentForm(true);
    }
  };

  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTenant) {
      onAddPayment({ tenantId: selectedTenant.id, amount, month, status, date: new Date().toISOString().split('T')[0] });
      setShowPaymentForm(false);
    }
  };

  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTenant({ ...newTenant, status: 'active' });
    setShowNewTenantModal(false);
    setNewTenant({ name: '', email: '', phone: '', propertyId: '', monthlyRent: 0, startDate: new Date().toISOString().split('T')[0] });
  };

  const handleUpdateTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTenant) {
      onUpdateTenant(selectedTenant);
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

  const monthsList = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const availableProperties = properties.filter(p => !p.isOccupied || (selectedTenant && p.id === selectedTenant.propertyId));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 md:pb-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Inquilinos</h2>
          <p className="text-sm text-slate-500">Gestión de contratos y pagos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-full text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
          <button onClick={() => setShowNewTenantModal(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl font-bold text-white text-sm shadow-lg shadow-indigo-100 whitespace-nowrap active:scale-95 transition-transform hover:bg-indigo-700">
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Inquilino</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </header>

      {/* Grid sin overflow-y-auto ni altura fija para evitar el 'recuadro' */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <GlassCard key={tenant.id} className="p-6" onClick={() => setSelectedTenant(tenant)} hoverEffect>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl shadow-sm border border-indigo-200/50">{tenant.name[0]}</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base line-clamp-1 tracking-tight">{tenant.name}</h4>
                  <motion.span 
                    animate={{ 
                      color: tenant.status === 'active' ? '#10b981' : '#f43f5e',
                    }}
                    className={`text-[10px] font-black uppercase tracking-widest block mt-0.5`}
                  >
                    {tenant.status}
                  </motion.span>
                </div>
              </div>
              <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all" onClick={(e) => e.stopPropagation()}><MoreVertical size={20} /></button>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={14} /></div>
                <span className="text-xs font-medium truncate">{tenant.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={14} /></div>
                <span className="text-xs font-medium">{tenant.phone}</span>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Renta Mensual</p>
                <span className="text-xl font-black text-slate-800">${tenant.monthlyRent.toLocaleString()}</span>
              </div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">Detalle</span>
            </div>
          </GlassCard>
        ))}
        {filteredTenants.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-40">
            <Clock className="mx-auto mb-4 text-slate-300" size={48} />
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No se encontraron inquilinos</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(showNewTenantModal || selectedTenant) && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetModals} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl bg-white rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden h-[90vh] md:h-[85vh]"
            >
              <div className="p-6 md:p-8 h-full overflow-y-auto scrollbar-hide">
                <button onClick={resetModals} className="absolute right-6 top-6 p-2 rounded-full bg-slate-100 text-slate-400 z-20 hover:bg-slate-200 transition-colors"><X size={20} /></button>

                {showNewTenantModal ? (
                  <div className="pt-4">
                    <h3 className="text-2xl font-bold text-slate-800 mb-8 tracking-tight">Nuevo Inquilino</h3>
                    <form onSubmit={handleAddTenantSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required placeholder="Nombre Completo" value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10" />
                        <input required type="email" placeholder="Correo Electrónico" value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10" />
                        <input required type="tel" placeholder="Teléfono" value={newTenant.phone} onChange={e => setNewTenant({...newTenant, phone: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10" />
                        <select required value={newTenant.propertyId} onChange={e => setNewTenant({...newTenant, propertyId: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500/10">
                          <option value="">Seleccionar Propiedad...</option>
                          {availableProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input required type="number" placeholder="Monto de Renta ($)" value={newTenant.monthlyRent || ''} onChange={e => setNewTenant({...newTenant, monthlyRent: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10" />
                        <input required type="date" value={newTenant.startDate} onChange={e => setNewTenant({...newTenant, startDate: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10" />
                      </div>
                      <div className="border-2 border-dashed border-slate-100 rounded-3xl p-8 text-center bg-slate-50 group hover:border-indigo-200 transition-colors cursor-pointer">
                        <Upload className="mx-auto text-slate-300 mb-2 group-hover:text-indigo-400 transition-colors" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir Contrato Digital (PDF)</p>
                      </div>
                      <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95">Dar de Alta Inquilino</button>
                    </form>
                  </div>
                ) : selectedTenant && (
                  <div className="pt-4 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-200">{selectedTenant.name[0]}</div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedTenant.name}</h3>
                          <p className="text-sm text-slate-500 font-medium">{selectedTenant.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsEditing(!isEditing)} 
                          className={`p-3 rounded-2xl transition-all ${isEditing ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          <Edit2 size={20} />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={handleDeleteConfirm}
                            className={`p-3 rounded-2xl transition-all ${deleteStep > 0 ? 'bg-rose-600 text-white ring-8 ring-rose-100' : 'bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                          >
                            <Trash2 size={20} />
                          </button>
                          
                          <AnimatePresence>
                            {deleteStep > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                                className="absolute right-0 top-14 w-60 bg-white border border-rose-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] p-5 z-30"
                              >
                                <div className="flex items-center gap-2 text-rose-600 mb-3">
                                  <AlertTriangle size={18} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Advertencia</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                                  {deleteStep === 1 ? '¿Deseas eliminar permanentemente a este inquilino?' : 'Esta acción no se puede deshacer. ¿Seguro?'}
                                </p>
                                <div className="flex gap-2">
                                  <button onClick={() => setDeleteStep(0)} className="flex-1 py-2.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-xl hover:bg-slate-200 transition-colors">No, cancelar</button>
                                  <button onClick={handleDeleteConfirm} className="flex-1 py-2.5 bg-rose-600 text-white text-[10px] font-bold rounded-xl shadow-lg shadow-rose-100">{deleteStep === 1 ? 'Continuar' : 'Confirmar'}</button>
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
                          className="space-y-6 mb-8"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                              <input value={selectedTenant.name} onChange={e => setSelectedTenant({...selectedTenant, name: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                              <input value={selectedTenant.email} onChange={e => setSelectedTenant({...selectedTenant, email: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Teléfono</label>
                              <input value={selectedTenant.phone} onChange={e => setSelectedTenant({...selectedTenant, phone: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Renta ($)</label>
                              <input type="number" value={selectedTenant.monthlyRent} onChange={e => setSelectedTenant({...selectedTenant, monthlyRent: Number(e.target.value)})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm transition-all hover:bg-slate-200">Cancelar</button>
                            <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700">Guardar Cambios</button>
                          </div>
                        </motion.form>
                      ) : (
                        <motion.div 
                          key="view-details"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col h-full"
                        >
                          <div className="flex gap-3 mb-10">
                            <a href={`tel:${selectedTenant.phone}`} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-emerald-100 active:scale-95"><Phone size={18}/> Llamar</a>
                            <a href={getWhatsAppLink(selectedTenant, getTenantPayments(selectedTenant.id)[0] || { month: 'Mes Actual', amount: selectedTenant.monthlyRent } as Payment, wsTemplate)} target="_blank" className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-indigo-100 active:scale-95"><MessageSquare size={18}/> WhatsApp</a>
                          </div>

                          <h4 className="font-black text-slate-800 mb-5 text-xs uppercase tracking-[0.2em]">Historial de Cobros</h4>
                          <div className="space-y-4 mb-24 md:mb-8 pr-1">
                            {getTenantPayments(selectedTenant.id).map(p => (
                              <motion.div 
                                layout
                                key={p.id} 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex justify-between items-center p-5 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all group shadow-sm hover:shadow-md"
                              >
                                <div>
                                  <div className="flex items-center gap-3">
                                    <p className="font-bold text-base text-slate-800">{p.month}</p>
                                    <motion.span 
                                      animate={{ 
                                        backgroundColor: p.status === 'paid' ? '#ecfdf5' : '#fff1f2',
                                        color: p.status === 'paid' ? '#10b981' : '#f43f5e'
                                      }}
                                      className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-current opacity-70"
                                    >
                                      {p.status}
                                    </motion.span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-tight">{new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <span className="font-black text-base text-slate-800 mr-2">${p.amount.toLocaleString()}</span>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => generateReceiptPDF(selectedTenant, p)} 
                                      className="p-3 text-slate-400 bg-white rounded-2xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all active:scale-90 border border-slate-100"
                                      title="Imprimir Recibo"
                                    >
                                      <Printer size={18}/>
                                    </button>
                                    <a 
                                      href={getWhatsAppLink(selectedTenant, p, wsTemplate)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-3 text-slate-400 bg-white rounded-2xl shadow-sm hover:bg-emerald-600 hover:text-white transition-all active:scale-90 border border-slate-100"
                                      title="Enviar por WhatsApp"
                                    >
                                      <MessageSquare size={18}/>
                                    </a>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                            {getTenantPayments(selectedTenant.id).length === 0 && (
                              <div className="text-center py-16 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                                <Clock className="mx-auto mb-3 text-slate-300 opacity-50" size={40} />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sin historial de pagos</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isEditing && (
                      <div className="mt-auto pt-4 md:static absolute bottom-6 left-8 right-8 flex gap-3 bg-white/80 backdrop-blur-md">
                        <button onClick={handleOpenPaymentForm} className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-bold shadow-xl shadow-indigo-100 active:scale-95 transition-all hover:bg-indigo-700">Registrar Nuevo Cobro</button>
                      </div>
                    )}

                    <AnimatePresence>
                      {showPaymentForm && (
                        <motion.div 
                          initial={{ x: "100%" }} 
                          animate={{ x: 0 }} 
                          exit={{ x: "100%" }} 
                          transition={{ type: "spring", damping: 25, stiffness: 200 }}
                          className="absolute inset-0 bg-white z-30 p-8 flex flex-col"
                        >
                          <button onClick={() => setShowPaymentForm(false)} className="self-start mb-8 p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"><X size={20}/></button>
                          <h3 className="text-2xl font-bold text-slate-800 mb-8 tracking-tight">Nuevo Registro de Cobro</h3>
                          <form onSubmit={handleAddPaymentSubmit} className="space-y-8 flex-1">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mes correspondiente</label>
                              <select value={month} onChange={e => setMonth(e.target.value)} className="w-full bg-slate-50 rounded-2xl p-5 text-sm border-none appearance-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all">
                                {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Importe cobrado ($)</label>
                              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full bg-slate-50 rounded-2xl p-5 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Estado de la transacción</label>
                              <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setStatus('paid')} className={`py-4 rounded-2xl font-bold text-sm transition-all border-2 ${status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent'}`}>Pagado</button>
                                <button type="button" onClick={() => setStatus('pending')} className={`py-4 rounded-2xl font-bold text-sm transition-all border-2 ${status === 'pending' ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent'}`}>Pendiente</button>
                              </div>
                            </div>
                            <button type="submit" className="w-full py-5 mt-auto bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 active:scale-95 transition-all hover:bg-indigo-700">Confirmar Registro</button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
