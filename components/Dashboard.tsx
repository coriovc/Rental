import React, { useState, useMemo, useEffect } from 'react';
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
import { Users, Home, Wallet, Clock, CheckCircle2, CreditCard, MessageSquare } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Tenant, Property, Payment } from '../types';
import { getWhatsAppReminderLink } from '../services/pdfService';

interface DashboardProps {
  tenants: Tenant[];
  properties: Property[];
  payments: Payment[];
  onMarkPaid: (paymentId: string) => void;
  bcvRate?: number;
  wsReminderTemplate?: string;
  onNavigate?: (view: any) => void;
}

const MONTH_NAMES_SPANISH = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  bcvRate: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, bcvRate }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const hasIncome = (data.income || 0) > 0;
    const hasPending = (data.pending || 0) > 0;
    const total = (data.income || 0) + (data.pending || 0);

    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl min-w-[190px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 gap-2">
          <span className="text-xs font-bold text-slate-200 tracking-wider uppercase">
            {data.fullName}
          </span>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-400 font-semibold">
            {data.count} {data.count === 1 ? 'cobro' : 'cobros'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              Cobrado:
            </span>
            <div className="text-right">
              <span className="font-bold text-white">${data.income.toLocaleString()}</span>
              {hasIncome && bcvRate > 0 && (
                <span className="block text-[10px] text-indigo-300/80">
                  ≈ Bs. {(data.income * bcvRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Pendiente:
            </span>
            <div className="text-right">
              <span className="font-bold text-white">${data.pending.toLocaleString()}</span>
              {hasPending && bcvRate > 0 && (
                <span className="block text-[10px] text-rose-300/80">
                  ≈ Bs. {(data.pending * bcvRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>
        </div>

        {(hasIncome || hasPending) && (
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Total facturado:</span>
            <span className="font-extrabold text-emerald-400">
              ${total.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  tenants, 
  properties, 
  payments, 
  onMarkPaid,
  bcvRate = 52.50,
  wsReminderTemplate,
  onNavigate 
}) => {
  const [chartView, setChartView] = useState<'year' | 'last6'>('year');

  const totalIncome = useMemo(() => 
    payments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
    [payments]
  );
  const pendingIncome = useMemo(() => 
    payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
    [payments]
  );

  // Años disponibles en el historial de pagos
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach(p => {
      if (p.date) {
        const yr = parseInt(p.date.split('-')[0], 10);
        if (!isNaN(yr)) years.add(yr);
      }
    });
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears[0] || new Date().getFullYear();
  });

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Datos reales del gráfico de ingresos por mes
  const chartData = useMemo(() => {
    const monthlyStats = MONTH_NAMES_SPANISH.map((fullName, idx) => ({
      name: MONTH_NAMES_SHORT[idx],
      fullName,
      monthIndex: idx,
      income: 0,
      pending: 0,
      total: 0,
      incomeBs: 0,
      pendingBs: 0,
      count: 0
    }));

    payments.forEach(p => {
      // Filtrar por año si el pago tiene fecha con año
      if (p.date) {
        const paymentYear = parseInt(p.date.split('-')[0], 10);
        if (!isNaN(paymentYear) && paymentYear !== selectedYear) {
          return;
        }
      }

      let mIdx = -1;
      // 1. Coincidencia por nombre de mes
      if (p.month) {
        const clean = p.month.trim().toLowerCase();
        mIdx = MONTH_NAMES_SPANISH.findIndex((m, idx) => 
          m.toLowerCase() === clean || 
          clean.startsWith(MONTH_NAMES_SHORT[idx].toLowerCase()) ||
          m.toLowerCase().startsWith(clean)
        );
      }
      // 2. Coincidencia por fecha YYYY-MM-DD
      if (mIdx === -1 && p.date) {
        const parts = p.date.split('-');
        if (parts.length >= 2) {
          const parsed = parseInt(parts[1], 10) - 1;
          if (parsed >= 0 && parsed <= 11) mIdx = parsed;
        }
      }

      if (mIdx >= 0 && mIdx < 12) {
        const amountUSD = Number(p.amount) || 0;
        const exchange = p.exchangeRate || bcvRate || 52.50;
        const amountBs = Number(p.amountBs) || (amountUSD * exchange);

        monthlyStats[mIdx].count += 1;
        monthlyStats[mIdx].total += amountUSD;

        if (p.status === 'paid') {
          monthlyStats[mIdx].income += amountUSD;
          monthlyStats[mIdx].incomeBs += amountBs;
        } else {
          monthlyStats[mIdx].pending += amountUSD;
          monthlyStats[mIdx].pendingBs += amountBs;
        }
      }
    });

    if (chartView === 'last6') {
      const currentMonthIndex = new Date().getMonth();
      const start = Math.max(0, currentMonthIndex - 5);
      return monthlyStats.slice(start, currentMonthIndex + 1);
    }

    return monthlyStats;
  }, [payments, selectedYear, bcvRate, chartView]);

  const periodTotalPaid = useMemo(() => 
    chartData.reduce((acc, curr) => acc + curr.income, 0),
    [chartData]
  );
  const periodTotalPending = useMemo(() => 
    chartData.reduce((acc, curr) => acc + curr.pending, 0),
    [chartData]
  );

  const stats = [
    { 
      label: 'Ingresos Cobrados', 
      value: `$${totalIncome.toLocaleString()}`, 
      subValue: `≈ Bs. ${(totalIncome * bcvRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: Wallet, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'bg-emerald-100 dark:bg-emerald-950/50' 
    },
    { 
      label: 'Inquilinos Activos', 
      value: tenants.length, 
      subValue: `${tenants.filter(t => t.status === 'active').length} al día`,
      icon: Users, 
      color: 'text-indigo-600 dark:text-indigo-400', 
      bg: 'bg-indigo-100 dark:bg-indigo-950/50' 
    },
    { 
      label: 'Propiedades / Galpones', 
      value: properties.length, 
      subValue: `${properties.filter(p => !p.isOccupied).length} disponibles`,
      icon: Home, 
      color: 'text-amber-600 dark:text-amber-400', 
      bg: 'bg-amber-100 dark:bg-amber-950/50' 
    },
    { 
      label: 'Pendiente por Cobrar', 
      value: `$${pendingIncome.toLocaleString()}`, 
      subValue: `≈ Bs. ${(pendingIncome * bcvRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: Clock, 
      color: 'text-rose-600 dark:text-rose-400', 
      bg: 'bg-rose-100 dark:bg-rose-950/50' 
    },
  ];

  const debtors = tenants.filter(t => t.status === 'late' || payments.some(p => p.tenantId === t.id && p.status === 'pending'));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Resumen General</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Estado actual de tus rentas y cobros (Tasa BCV: {Number(bcvRate || 52.50).toFixed(2)} Bs/$).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onNavigate && (
            <>
              <button 
                onClick={() => onNavigate('payments')} 
                className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl text-xs font-bold shadow-sm transition-transform active:scale-95 hover:bg-indigo-600 hover:text-white"
              >
                Historial de Pagos
              </button>
              <button 
                onClick={() => onNavigate('tenants')} 
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 transition-transform active:scale-95 hover:bg-indigo-700"
              >
                Nuevo Registro
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tarjetas de Estadísticas con conversión a Bs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-4 md:p-6">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3 md:mb-4`}>
              <stat.icon size={18} />
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white mt-1">{stat.value}</h3>
            {stat.subValue && (
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{stat.subValue}</p>
            )}
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gráfico de Ingresos con Datos Reales */}
        <GlassCard className="xl:col-span-2 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">
                  Gráfico de Ingresos
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  Datos Reales
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {chartView === 'year' ? `Ingresos calculados para el año ${selectedYear}` : 'Últimos 6 meses'} 
                {periodTotalPaid > 0 && ` • Cobrado: $${periodTotalPaid.toLocaleString()}`}
                {periodTotalPending > 0 && ` • Pendiente: $${periodTotalPending.toLocaleString()}`}
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {/* Selector de Año si hay más de 1 año */}
              {availableYears.length > 1 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  {availableYears.map(yr => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        selectedYear === yr 
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}

              {/* Selector de Vista: Año Completo vs Últimos 6 Meses */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <button
                  onClick={() => setChartView('year')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    chartView === 'year' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Año
                </button>
                <button
                  onClick={() => setChartView('last6')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    chartView === 'last6' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  6 Meses
                </button>
              </div>

              {/* Leyenda visual */}
              <div className="flex items-center gap-3 text-xs pl-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold text-[11px]">Cobrado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold text-[11px]">Pendiente</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[220px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.20}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip bcvRate={bcvRate} />} />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Cobrado" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  fill="url(#colorIncome)"
                  activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pending" 
                  name="Pendiente" 
                  stroke="#f43f5e" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  fill="url(#colorPending)"
                  activeDot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Deudores */}
        <GlassCard className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Deudores</h3>
            <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2 py-1 rounded-lg">AVISO</span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[300px] scrollbar-hide">
            {debtors.length > 0 ? debtors.map((debtor) => {
              const payment = payments.find(p => p.tenantId === debtor.id && p.status === 'pending');
              return (
                <div key={debtor.id} className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/40">
                  <div className="w-10 h-10 rounded-xl bg-rose-200 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center font-bold">{debtor.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{debtor.name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase">{payment?.month || 'Mora'} • ${debtor.monthlyRent}</p>
                  </div>
                  <button onClick={() => payment && onMarkPaid(payment.id)} className="p-2 text-indigo-600 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform" title="Marcar como pagado"><CreditCard size={14}/></button>
                </div>
              );
            }) : (
              <div className="text-center py-10 opacity-30"><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={32} /><p className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">Todo en orden</p></div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Cobros Próximos */}
      <GlassCard className="p-4 md:p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Cobros Próximos</h3>
          {onNavigate && (
            <button 
              onClick={() => onNavigate('payments')} 
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Ver Todos los Pagos</span>
              <span>→</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 pl-2">Inquilino</th>
                <th className="pb-4">Mes</th>
                <th className="pb-4">Monto ($ / Bs)</th>
                <th className="pb-4">Estado</th>
                <th className="pb-4 text-right pr-2">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...payments]
                .sort((a, b) => (a.status === 'pending' && b.status !== 'pending' ? -1 : a.status !== 'pending' && b.status === 'pending' ? 1 : 0))
                .slice(0, 5)
                .map((pay) => {
                const tenant = tenants.find(t => t.id === pay.tenantId);
                const bsVal = pay.amountBs || (pay.amount * bcvRate);
                return (
                  <tr key={pay.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center">
                          {tenant?.name[0]}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{tenant?.name}</span>
                          {tenant?.idNumber && <span className="text-[9px] text-slate-400">{tenant.idNumber}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-slate-500 dark:text-slate-400">{pay.month}</td>
                    <td className="py-4">
                      <span className="text-xs font-black text-slate-800 dark:text-white">${pay.amount}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                        ≈ Bs. {bsVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${
                        pay.status === 'paid' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                      }`}>
                        {pay.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <AnimatePresence mode="wait">
                        {pay.status === 'pending' ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            {tenant && (
                              <a
                                href={getWhatsAppReminderLink(tenant, pay, wsReminderTemplate, bcvRate)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/50 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                title={`Enviar recordatorio por WhatsApp ($${pay.amount} pendiente)`}
                              >
                                <MessageSquare size={13} />
                                <span>Recordar</span>
                              </a>
                            )}
                            <motion.button 
                              key="btn-pay"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={() => onMarkPaid(pay.id)} 
                              className="p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                              title="Marcar como cobrado"
                            >
                              <CreditCard size={14} />
                            </motion.button>
                          </div>
                        ) : (
                          <div className="text-emerald-500 inline-block pr-2">
                            <CheckCircle2 size={18} />
                          </div>
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
