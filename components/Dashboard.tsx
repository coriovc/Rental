
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Users, Home, Wallet, Clock, CheckCircle2, CreditCard, FolderDown, Plus } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Tenant, Property, Payment } from '../types';

interface DashboardProps {
  tenants: Tenant[];
  properties: Property[];
  payments: Payment[];
  onMarkPaid: (paymentId: string) => void;
  onOpenDownloadModal?: () => void;
  onNavigateToTenants?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  tenants, 
  properties, 
  payments, 
  onMarkPaid,
  onOpenDownloadModal,
  onNavigateToTenants 
}) => {
  const totalIncome = payments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingIncome = payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  
  const chartData = [
    { name: 'Ene', income: 4000 },
    { name: 'Feb', income: 4500 },
    { name: 'Mar', income: totalIncome || 3800 },
  ];

  const stats = [
    { label: 'Ingresos', value: `$${totalIncome.toLocaleString()}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Inquilinos', value: tenants.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Propiedades', value: properties.length, icon: Home, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Pendientes', value: `$${pendingIncome.toLocaleString()}`, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  const debtors = tenants.filter(t => t.status === 'late' || payments.some(p => p.tenantId === t.id && p.status === 'pending'));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Resumen General</h2>
          <p className="text-sm text-slate-500">Estado actual de tus rentas y cobranzas.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {onOpenDownloadModal && (
            <button 
              onClick={onOpenDownloadModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-2xl text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <FolderDown size={16} />
              <span>Descargar para Carpeta Local</span>
            </button>
          )}
          {onNavigateToTenants && (
            <button 
              onClick={onNavigateToTenants}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 transition-transform active:scale-95 hover:bg-indigo-700"
            >
              <Plus size={16} />
              <span>Nuevo Cobro / Inquilino</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-4 md:p-6">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3 md:mb-4`}>
              <stat.icon size={18} />
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-lg md:text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <GlassCard className="xl:col-span-2 p-6 md:p-8">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Gráfico de Ingresos</h3>
          <div className="h-[200px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
                <Area type="monotone" dataKey="income" stroke="#4f46e5" strokeWidth={3} fill="url(#colorIncome)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Deudores</h3>
            <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-1 rounded-lg">AVISO</span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[300px] scrollbar-hide">
            {debtors.length > 0 ? debtors.map((debtor) => {
              const payment = payments.find(p => p.tenantId === debtor.id && p.status === 'pending');
              return (
                <div key={debtor.id} className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/40 border border-rose-100/50">
                  <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-600 flex items-center justify-center font-bold">{debtor.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{debtor.name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase">{payment?.month || 'Mora'}</p>
                  </div>
                  <button onClick={() => payment && onMarkPaid(payment.id)} className="p-2 text-indigo-600 bg-white rounded-lg shadow-sm"><CreditCard size={14}/></button>
                </div>
              );
            }) : (
              <div className="text-center py-10 opacity-30"><CheckCircle2 className="mx-auto mb-2" size={32} /><p className="text-[10px] font-bold uppercase">Todo en orden</p></div>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4 md:p-8 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 px-2">Cobros Próximos</h3>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="pb-4 pl-2">Inquilino</th>
                <th className="pb-4">Mes</th>
                <th className="pb-4">Monto</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4 text-right pr-2">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.slice(0, 5).map((pay) => {
                const tenant = tenants.find(t => t.id === pay.tenantId);
                return (
                  <tr key={pay.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2"><div className="flex items-center gap-3"><div className="w-7 h-7 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 flex items-center justify-center">{tenant?.name[0]}</div><span className="text-xs font-bold text-slate-700">{tenant?.name}</span></div></td>
                    <td className="py-4 text-xs text-slate-500">{pay.month}</td>
                    <td className="py-4 text-xs font-black text-slate-800">${pay.amount}</td>
                    <td className="py-4">
                      <motion.span 
                        layout
                        initial={false}
                        animate={{ 
                          scale: pay.status === 'paid' ? [1, 1.1, 1] : 1,
                          backgroundColor: pay.status === 'paid' ? '#ecfdf5' : '#fff1f2',
                          color: pay.status === 'paid' ? '#059669' : '#e11d48'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block`}
                      >
                        {pay.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </motion.span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <AnimatePresence mode="wait">
                        {pay.status === 'pending' ? (
                          <motion.button 
                            key="btn-pay"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => onMarkPaid(pay.id)} 
                            className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            <CreditCard size={14} />
                          </motion.button>
                        ) : (
                          <motion.div
                            key="icon-done"
                            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            className="text-emerald-500 inline-block pr-2"
                          >
                            <CheckCircle2 size={18} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
};
