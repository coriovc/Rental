import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from './ModalPortal';
import { 
  TrendingDown, 
  Wallet, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  FileDown, 
  Home, 
  Trash2, 
  Edit2, 
  PieChart as PieIcon, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Tag, 
  Receipt,
  Building,
  Check,
  CreditCard,
  Percent
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
import { Expense, ExpenseCategory, Payment, Property, PdfConfig } from '../types';
import { generateMonthlyExpensesReportPDF } from '../services/pdfService';

interface ExpensesProps {
  expenses: Expense[];
  payments: Payment[];
  properties: Property[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  bcvRate?: number;
  pdfConfig?: PdfConfig;
}

const CATEGORIES: { name: ExpenseCategory; color: string; bg: string }[] = [
  { name: 'Mantenimiento', color: '#6366f1', bg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' },
  { name: 'Reparaciones', color: '#f43f5e', bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' },
  { name: 'Servicios', color: '#0ea5e9', bg: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300' },
  { name: 'Condominio', color: '#8b5cf6', bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' },
  { name: 'Pintura', color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
  { name: 'Plomería', color: '#06b6d4', bg: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300' },
  { name: 'Electricidad', color: '#eab308', bg: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300' },
  { name: 'Limpieza', color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
  { name: 'Impuestos', color: '#64748b', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  { name: 'Otros', color: '#ec4899', bg: 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300' },
];

const MONTHS_LIST = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const PAYMENT_METHODS = [
  'Transferencia',
  'Pago Móvil',
  'Efectivo USD',
  'Efectivo Bs',
  'Zelle',
  'Tarjeta de Débito/Crédito',
  'Otro'
];

export const Expenses: React.FC<ExpensesProps> = ({
  expenses,
  payments,
  properties,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  bcvRate = 52.50,
  pdfConfig
}) => {
  // Mes actual en español
  const currentMonthName = useMemo(() => {
    const raw = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date());
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const currentYearVal = new Date().getFullYear();

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearVal);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [analysisTab, setAnalysisTab] = useState<'category' | 'comparison' | 'properties'>('category');

  // Modales
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Mantenimiento');
  const [formPropertyId, setFormPropertyId] = useState<string>('');
  const [formAmountUSD, setFormAmountUSD] = useState<number>(0);
  const [formExchangeRate, setFormExchangeRate] = useState<number>(bcvRate);
  const [formAmountBs, setFormAmountBs] = useState<number>(0);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMonth, setFormMonth] = useState<string>(currentMonthName);
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('Transferencia');
  const [formReceiptNumber, setFormReceiptNumber] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Años disponibles en base a los registros
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYearVal);
    expenses.forEach(e => {
      if (e.date) {
        const y = parseInt(e.date.split('-')[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    payments.forEach(p => {
      if (p.date) {
        const y = parseInt(p.date.split('-')[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses, payments, currentYearVal]);

  // Manejador de cambio de monto USD en el formulario
  const handleAmountChange = (val: number) => {
    setFormAmountUSD(val);
    const calculatedBs = Math.round((val * formExchangeRate) * 100) / 100;
    setFormAmountBs(calculatedBs);
  };

  const handleRateChange = (rateVal: number) => {
    setFormExchangeRate(rateVal);
    const calculatedBs = Math.round((formAmountUSD * rateVal) * 100) / 100;
    setFormAmountBs(calculatedBs);
  };

  // Abrir Modal Crear / Editar
  const handleOpenModal = (expenseToEdit?: Expense) => {
    if (expenseToEdit) {
      setEditingExpense(expenseToEdit);
      setFormTitle(expenseToEdit.title);
      setFormCategory(expenseToEdit.category);
      setFormPropertyId(expenseToEdit.propertyId || '');
      setFormAmountUSD(expenseToEdit.amount);
      const rate = expenseToEdit.exchangeRate || bcvRate;
      setFormExchangeRate(rate);
      setFormAmountBs(expenseToEdit.amountBs || Math.round(expenseToEdit.amount * rate * 100) / 100);
      setFormDate(expenseToEdit.date);
      setFormMonth(expenseToEdit.month || currentMonthName);
      setFormPaymentMethod(expenseToEdit.paymentMethod || 'Transferencia');
      setFormReceiptNumber(expenseToEdit.receiptNumber || '');
      setFormNotes(expenseToEdit.notes || '');
    } else {
      setEditingExpense(null);
      setFormTitle('');
      setFormCategory('Mantenimiento');
      setFormPropertyId(properties[0]?.id || '');
      setFormAmountUSD(0);
      setFormExchangeRate(bcvRate);
      setFormAmountBs(0);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormMonth(selectedMonth !== 'all' ? selectedMonth : currentMonthName);
      setFormPaymentMethod('Transferencia');
      setFormReceiptNumber('');
      setFormNotes('');
    }
    setShowModal(true);
  };

  // Guardar Gasto
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmountUSD <= 0) return;

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        title: formTitle.trim(),
        category: formCategory,
        propertyId: formPropertyId || undefined,
        amount: Number(formAmountUSD),
        amountBs: Number(formAmountBs),
        exchangeRate: Number(formExchangeRate),
        date: formDate,
        month: formMonth,
        paymentMethod: formPaymentMethod,
        receiptNumber: formReceiptNumber.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      onAddExpense({
        title: formTitle.trim(),
        category: formCategory,
        propertyId: formPropertyId || undefined,
        amount: Number(formAmountUSD),
        amountBs: Number(formAmountBs),
        exchangeRate: Number(formExchangeRate),
        date: formDate,
        month: formMonth,
        paymentMethod: formPaymentMethod,
        receiptNumber: formReceiptNumber.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    }

    setShowModal(false);
  };

  // --- CÁLCULOS DEL PERÍODO SELECCIONADO ---
  const periodData = useMemo(() => {
    // 1. Filtrar cobros de alquileres del mes/año seleccionado
    const periodPayments = payments.filter(p => {
      const matchesYear = !p.date || p.date.startsWith(String(selectedYear));
      const matchesMonth = selectedMonth === 'all' || 
        (p.month && p.month.toLowerCase().trim().startsWith(selectedMonth.toLowerCase().trim().substring(0, 3)));
      return matchesYear && matchesMonth;
    });

    const incomePaidUSD = periodPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const incomePendingUSD = periodPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const incomePaidBs = periodPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amountBs) || (Number(p.amount) * (p.exchangeRate || bcvRate))), 0);

    // 2. Filtrar gastos del mes/año seleccionado
    const periodExpenses = expenses.filter(e => {
      const matchesYear = !e.date || e.date.startsWith(String(selectedYear));
      const matchesMonth = selectedMonth === 'all' || 
        (e.month && e.month.toLowerCase().trim().startsWith(selectedMonth.toLowerCase().trim().substring(0, 3)));
      return matchesYear && matchesMonth;
    });

    const totalExpenseUSD = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalExpenseBs = periodExpenses.reduce((sum, e) => sum + (Number(e.amountBs) || (Number(e.amount) * (e.exchangeRate || bcvRate))), 0);

    // 3. Balance Neto / Saldo que queda
    const netBalanceUSD = incomePaidUSD - totalExpenseUSD;
    const netBalanceBs = incomePaidBs - totalExpenseBs;
    const retentionRate = incomePaidUSD > 0 ? Math.round((netBalanceUSD / incomePaidUSD) * 100) : 0;

    return {
      incomePaidUSD,
      incomePendingUSD,
      incomePaidBs,
      totalExpenseUSD,
      totalExpenseBs,
      netBalanceUSD,
      netBalanceBs,
      retentionRate,
      expensesCount: periodExpenses.length,
      periodPayments,
      periodExpenses
    };
  }, [payments, expenses, selectedMonth, selectedYear, bcvRate]);

  // Lista de gastos filtrada para la tabla
  const filteredExpenses = useMemo(() => {
    return periodData.periodExpenses.filter(e => {
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      const matchesProperty = selectedProperty === 'all' || 
        (selectedProperty === 'general' ? !e.propertyId : e.propertyId === selectedProperty);

      const prop = properties.find(p => p.id === e.propertyId);
      const propName = prop ? prop.name.toLowerCase() : 'general';

      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        e.title.toLowerCase().includes(query) ||
        (e.notes && e.notes.toLowerCase().includes(query)) ||
        (e.receiptNumber && e.receiptNumber.toLowerCase().includes(query)) ||
        propName.includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.amount.toString().includes(query);

      return matchesCategory && matchesProperty && matchesSearch;
    });
  }, [periodData.periodExpenses, selectedCategory, selectedProperty, searchTerm, properties]);

  // Datos para gráfico de pastel: Desglose por Categoría
  const pieCategoryData = useMemo(() => {
    const catTotals: Record<string, number> = {};
    periodData.periodExpenses.forEach(e => {
      const cat = e.category || 'Otros';
      catTotals[cat] = (catTotals[cat] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(catTotals).map(([name, value]) => {
      const catConfig = CATEGORIES.find(c => c.name === name);
      return {
        name,
        value,
        color: catConfig ? catConfig.color : '#6366f1',
        percentage: periodData.totalExpenseUSD > 0 ? Math.round((value / periodData.totalExpenseUSD) * 100) : 0
      };
    }).sort((a, b) => b.value - a.value);
  }, [periodData.periodExpenses, periodData.totalExpenseUSD]);

  // Datos para gráfico comparativo mensual (Ingresos vs Gastos vs Saldo Neto)
  const monthlyComparisonData = useMemo(() => {
    return MONTHS_LIST.map((m) => {
      const shortName = m.substring(0, 3);

      // Cobrado en ese mes
      const mIncome = payments
        .filter(p => {
          const isYear = !p.date || p.date.startsWith(String(selectedYear));
          const isMonth = p.month && p.month.toLowerCase().trim().startsWith(shortName.toLowerCase());
          return isYear && isMonth && p.status === 'paid';
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Gastado en ese mes
      const mExpense = expenses
        .filter(e => {
          const isYear = !e.date || e.date.startsWith(String(selectedYear));
          const isMonth = e.month && e.month.toLowerCase().trim().startsWith(shortName.toLowerCase());
          return isYear && isMonth;
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const net = mIncome - mExpense;

      return {
        month: shortName,
        fullName: m,
        ingresos: mIncome,
        gastos: mExpense,
        saldo: net
      };
    });
  }, [payments, expenses, selectedYear]);

  // Gastos por Propiedad
  const expensesByProperty = useMemo(() => {
    const propMap: Record<string, { name: string; type: string; totalUSD: number; count: number; incomeUSD: number }> = {};
    
    // Inicializar propiedades
    properties.forEach(p => {
      propMap[p.id] = { name: p.name, type: p.type, totalUSD: 0, count: 0, incomeUSD: 0 };
    });
    propMap['general'] = { name: 'Gastos Generales / Adm.', type: 'Administrativo', totalUSD: 0, count: 0, incomeUSD: 0 };

    periodData.periodExpenses.forEach(e => {
      const key = e.propertyId && propMap[e.propertyId] ? e.propertyId : 'general';
      propMap[key].totalUSD += (Number(e.amount) || 0);
      propMap[key].count += 1;
    });

    periodData.periodPayments.filter(p => p.status === 'paid').forEach(p => {
      const propId = p.tenantId ? (properties.find(pr => pr.id === p.tenantId)?.id || '') : '';
      if (propId && propMap[propId]) {
        propMap[propId].incomeUSD += (Number(p.amount) || 0);
      }
    });

    return Object.entries(propMap)
      .map(([id, val]) => ({ id, ...val, net: val.incomeUSD - val.totalUSD }))
      .filter(item => item.totalUSD > 0 || item.incomeUSD > 0)
      .sort((a, b) => b.totalUSD - a.totalUSD);
  }, [properties, periodData.periodExpenses, periodData.periodPayments]);

  // Generar Reporte Mensual PDF
  const handleExportPDF = () => {
    const targetMonth = selectedMonth === 'all' ? currentMonthName : selectedMonth;
    generateMonthlyExpensesReportPDF(
      targetMonth,
      selectedYear,
      expenses,
      payments,
      properties,
      bcvRate,
      pdfConfig
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Control de Gastos y Flujo de Caja
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              Egresos
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registra en qué se invierte el dinero del alquiler, monitorea el dinero restante y descarga reportes mensuales oficiales.
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl text-xs font-bold shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700/80 active:scale-95 transition-all"
            title="Descargar reporte contable en PDF para el mes seleccionado"
          >
            <FileDown size={16} />
            <span>Reporte Mensual (PDF)</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </header>

      {/* Barra de Filtros de Período y Búsqueda */}
      <GlassCard className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Selectores de Período (Mes y Año) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-1">
              <Calendar size={15} className="text-indigo-500" />
              <span>Período:</span>
            </div>

            {/* Selector de Mes */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">📅 Todo el Año ({selectedYear})</option>
              {MONTHS_LIST.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Selector de Año */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Búsqueda y Filtros de Categoría / Propiedad */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar gasto, concepto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtro por Categoría */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Filtro por Propiedad */}
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todas las propiedades</option>
              <option value="general">Gastos Generales</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* TARJETAS DE BALANCE FINANCIERO (Cuanto Hay, Cuanto se Gastó y Cuanto Queda) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {/* 1. Ingresos Cobrados */}
        <GlassCard className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Wallet size={19} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight size={11} /> Cobrado
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Ingresos por Alquiler
          </p>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
            ${periodData.incomePaidUSD.toLocaleString()}
          </h3>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
            ≈ Bs. {periodData.incomePaidBs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </GlassCard>

        {/* 2. Gastos Totales */}
        <GlassCard className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <TrendingDown size={19} />
            </div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowDownRight size={11} /> Egresos
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Gastos Incurridos
          </p>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
            ${periodData.totalExpenseUSD.toLocaleString()}
          </h3>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
            ≈ Bs. {periodData.totalExpenseBs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </GlassCard>

        {/* 3. Dinero que Queda (Balance Neto) */}
        <GlassCard className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
              periodData.netBalanceUSD >= 0 
                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' 
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}>
              <DollarSign size={19} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              periodData.netBalanceUSD >= 0 
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' 
                : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
            }`}>
              {periodData.netBalanceUSD >= 0 ? 'Saldo a Favor' : 'Déficit'}
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Dinero que Queda (Neto)
          </p>
          <h3 className={`text-xl md:text-2xl font-black mt-1 ${
            periodData.netBalanceUSD >= 0 
              ? 'text-indigo-600 dark:text-indigo-400' 
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {periodData.netBalanceUSD >= 0 ? '+' : ''}${periodData.netBalanceUSD.toLocaleString()}
          </h3>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
            ≈ Bs. {periodData.netBalanceBs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </GlassCard>

        {/* 4. Retención y Rendimiento */}
        <GlassCard className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Percent size={19} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {periodData.expensesCount} {periodData.expensesCount === 1 ? 'gasto' : 'gastos'}
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Retención de Renta
          </p>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-1">
            {periodData.retentionRate}%
          </h3>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
            {periodData.retentionRate >= 70 ? 'Rentabilidad óptima' : 'Gastos elevados en período'}
          </p>
        </GlassCard>
      </div>

      {/* SECCIÓN DE ANÁLISIS GRÁFICO (En qué se gasta) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gráfico Principal */}
        <GlassCard className="xl:col-span-2 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">
                {analysisTab === 'category' && 'Distribución de Gastos por Categoría'}
                {analysisTab === 'comparison' && `Flujo de Caja Anual (${selectedYear}): Ingresos vs Gastos`}
                {analysisTab === 'properties' && 'Gastos por Inmueble / Casa'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {analysisTab === 'category' && 'Identifica los rubros de mayor impacto en el presupuesto'}
                {analysisTab === 'comparison' && 'Comparativa mensual de ingresos cobrados frente a los gastos realizados'}
                {analysisTab === 'properties' && 'Visualiza cuáles propiedades consumen más presupuesto de mantenimiento'}
              </p>
            </div>

            {/* Selector de Pestaña de Análisis */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <button
                onClick={() => setAnalysisTab('category')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  analysisTab === 'category'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <PieIcon size={14} />
                <span>Categorías</span>
              </button>
              <button
                onClick={() => setAnalysisTab('comparison')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  analysisTab === 'comparison'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 size={14} />
                <span>Flujo Anual</span>
              </button>
              <button
                onClick={() => setAnalysisTab('properties')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  analysisTab === 'properties'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Home size={14} />
                <span>Por Casa</span>
              </button>
            </div>
          </div>

          {/* Gráfico 1: Categorías (PieChart y lista) */}
          {analysisTab === 'category' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-[240px] w-full">
                {pieCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Gasto']}
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderRadius: '1rem', 
                          border: 'none', 
                          color: '#fff', 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <PieIcon size={40} className="mb-2 stroke-1" />
                    <p className="text-xs font-semibold">Sin gastos en este período</p>
                  </div>
                )}
              </div>

              {/* Leyenda y Desglose de Categorías */}
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto scrollbar-hide pr-1">
                {pieCategoryData.length > 0 ? pieCategoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-white">${item.value.toLocaleString()}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    Registra tu primer gasto para ver el gráfico de distribución por categorías.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Gráfico 2: Comparativa de Flujo Anual (BarChart) */}
          {analysisTab === 'comparison' && (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`$${Number(val).toLocaleString()}`, name === 'ingresos' ? 'Ingresos' : (name === 'gastos' ? 'Gastos' : 'Saldo Neto')]}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '1rem', 
                      border: 'none', 
                      color: '#fff', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#4f46e5]" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Ingresos Cobrados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#f43f5e]" />
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Gastos Totales</span>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico 3: Gastos por Inmueble */}
          {analysisTab === 'properties' && (
            <div className="space-y-3 max-h-[260px] overflow-y-auto scrollbar-hide">
              {expensesByProperty.length > 0 ? expensesByProperty.map(item => {
                const pct = periodData.totalExpenseUSD > 0 ? Math.round((item.totalUSD / periodData.totalExpenseUSD) * 100) : 0;
                return (
                  <div key={item.id} className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Building size={16} className="text-indigo-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-white">{item.name}</span>
                        <span className="text-[10px] text-slate-400">({item.type})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">${item.totalUSD.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({pct}%)</span>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(pct, 100)}%` }} 
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-10 opacity-50">
                  <Home size={32} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-xs text-slate-500">No hay gastos asignados a inmuebles en este período.</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Resumen Lateral: Recomendaciones y Mayor Gasto */}
        <GlassCard className="p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">
                Diagnóstico de Caja
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                periodData.netBalanceUSD >= 0 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600' 
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
              }`}>
                {selectedMonth !== 'all' ? selectedMonth : 'Año'}
              </span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40">
                <p className="font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                  💵 Dinero Restante Limpio
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  De los <span className="font-bold text-slate-800 dark:text-white">${periodData.incomePaidUSD.toLocaleString()}</span> cobrados en alquileres, 
                  has destinado <span className="font-bold text-rose-600">${periodData.totalExpenseUSD.toLocaleString()}</span> a gastos operativos. 
                  Te quedan <span className="font-extrabold text-emerald-600 dark:text-emerald-400">${periodData.netBalanceUSD.toLocaleString()}</span> en caja.
                </p>
              </div>

              {pieCategoryData[0] && (
                <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Mayor rubro de gasto
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-white">{pieCategoryData[0].name}</span>
                    <span className="font-extrabold text-rose-600">${pieCategoryData[0].value.toLocaleString()} ({pieCategoryData[0].percentage}%)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={handleExportPDF}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileDown size={14} />
              <span>Descargar Reporte PDF del Mes</span>
            </button>
          </div>
        </GlassCard>
      </div>

      {/* TABLA DE GASTOS DETALLADOS */}
      <GlassCard className="p-4 md:p-8 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 px-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">
              Historial de Gastos Registrados
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mostrando {filteredExpenses.length} {filteredExpenses.length === 1 ? 'gasto registrado' : 'gastos registrados'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenModal()}
              className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Plus size={14} />
              <span>Añadir Gasto</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 pl-3">Fecha</th>
                <th className="pb-4">Concepto / Detalle</th>
                <th className="pb-4">Inmueble</th>
                <th className="pb-4">Categoría</th>
                <th className="pb-4">Método</th>
                <th className="pb-4 text-right">Monto ($ / Bs)</th>
                <th className="pb-4 text-right pr-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.length > 0 ? filteredExpenses.map((exp) => {
                const prop = properties.find(p => p.id === exp.propertyId);
                const catConfig = CATEGORIES.find(c => c.name === exp.category);
                const bsVal = exp.amountBs || (exp.amount * (exp.exchangeRate || bcvRate));

                return (
                  <tr key={exp.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Fecha */}
                    <td className="py-4 pl-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {exp.date}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">{exp.month}</span>
                    </td>

                    {/* Concepto y Comprobante */}
                    <td className="py-4 max-w-[220px]">
                      <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                        {exp.title}
                      </span>
                      {exp.receiptNumber && (
                        <span className="text-[10px] text-indigo-500 font-semibold block">
                          Doc: {exp.receiptNumber}
                        </span>
                      )}
                      {exp.notes && (
                        <span className="text-[10px] text-slate-400 truncate block">
                          {exp.notes}
                        </span>
                      )}
                    </td>

                    {/* Inmueble */}
                    <td className="py-4">
                      {prop ? (
                        <div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                            {prop.name}
                          </span>
                          <span className="text-[10px] text-slate-400">{prop.address}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic">
                          Gasto General
                        </span>
                      )}
                    </td>

                    {/* Categoría */}
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-block ${catConfig?.bg || 'bg-slate-100 text-slate-700'}`}>
                        {exp.category}
                      </span>
                    </td>

                    {/* Método de Pago */}
                    <td className="py-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {exp.paymentMethod || 'Transferencia'}
                    </td>

                    {/* Monto ($ y Bs) */}
                    <td className="py-4 text-right">
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                        -${exp.amount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        ≈ Bs. {bsVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-4 text-right pr-3">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(exp)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700/80 rounded-lg transition-all"
                          title="Editar gasto"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(exp.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700/80 rounded-lg transition-all"
                          title="Eliminar gasto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Receipt size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      No se encontraron gastos en este período con los filtros aplicados.
                    </p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Registrar Primer Gasto</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* MODAL CREAR / EDITAR GASTO */}
      <ModalPortal>
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      {editingExpense ? 'Modificar Gasto' : 'Registrar Nuevo Gasto'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Asocia el egreso a un inmueble o catálogo general con conversión BCV automática.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSubmit} className="space-y-4">
                {/* Concepto / Título */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Concepto o Motivo del Gasto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Reparación de cerradura, pintura fachada, bombillos..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Categoría e Inmueble */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Categoría *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Inmueble / Casa Asignada
                    </label>
                    <select
                      value={formPropertyId}
                      onChange={(e) => setFormPropertyId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Gasto General / Administrativo</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.address})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Monto USD, Tasa y Bolívares */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/40 border border-indigo-100/60 dark:border-slate-700/60">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Monto (USD $) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formAmountUSD || ''}
                        onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Tasa BCV (Bs/$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formExchangeRate || ''}
                      onChange={(e) => handleRateChange(parseFloat(e.target.value) || bcvRate)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Equivalente en Bs.
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formAmountBs || ''}
                      onChange={(e) => setFormAmountBs(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Fecha y Mes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Fecha del Gasto *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => {
                        setFormDate(e.target.value);
                        // Auto-asociar mes si es posible
                        if (e.target.value) {
                          const parts = e.target.value.split('-');
                          if (parts.length >= 2) {
                            const mIdx = parseInt(parts[1], 10) - 1;
                            if (mIdx >= 0 && mIdx < 12) setFormMonth(MONTHS_LIST[mIdx]);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Mes Contable *
                    </label>
                    <select
                      value={formMonth}
                      onChange={(e) => setFormMonth(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {MONTHS_LIST.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Método de Pago y N° Comprobante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      N° Factura / Comprobante (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. FAC-00124, REC-992..."
                      value={formReceiptNumber}
                      onChange={(e) => setFormReceiptNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Notas / Observaciones */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Notas u Observaciones (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre el proveedor, garantía o materiales comprados..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Botones de acción del Modal */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 active:scale-95 transition-all"
                  >
                    {editingExpense ? 'Actualizar Gasto' : 'Guardar Gasto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      <ModalPortal>
        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-3xl p-6 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                ¿Eliminar este gasto?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Esta acción descontará el gasto y actualizará inmediatamente el balance de caja disponible.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteExpense(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-200 dark:shadow-rose-950/50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </motion.div>
  );
};
