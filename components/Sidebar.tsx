import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  Settings, 
  ReceiptText,
  TrendingDown,
  CreditCard,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, theme, onToggleTheme }) => {
  const navItems: { id: View; icon: any; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Panel' },
    { id: 'tenants', icon: Users, label: 'Inquilinos' },
    { id: 'properties', icon: Home, label: 'Propiedades' },
    { id: 'payments', icon: ReceiptText, label: 'Pagos' },
    { id: 'expenses', icon: TrendingDown, label: 'Gastos' },
    { id: 'settings', icon: Settings, label: 'Ajustes' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-full py-8 px-4 flex-col border-r border-slate-200/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="mb-10 px-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/60">
              <CreditCard size={20} />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-300">
              RentFlow
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`
                relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-sm
                ${currentView === item.id 
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                }
              `}
            >
              {currentView === item.id && (
                <motion.div
                  layoutId="nav-pill-desktop"
                  className="absolute inset-0 bg-white dark:bg-slate-800 shadow-md shadow-indigo-100/50 dark:shadow-black/50 border border-slate-200/70 dark:border-slate-700/80 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                />
              )}
              <item.icon size={21} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-2 space-y-1.5 pt-4 border-t border-slate-200/50 dark:border-slate-800/80">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-4 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all duration-300 w-full text-sm font-medium group shadow-xs cursor-pointer"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-amber-400 transition-transform group-hover:rotate-45" />
              ) : (
                <Moon size={20} className="text-indigo-600 transition-transform group-hover:-rotate-12" />
              )}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
          )}

          <button className="flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-red-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all duration-300 w-full rounded-2xl text-sm font-medium cursor-pointer">
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-5 pt-2 bg-gradient-to-t from-[#f0f4f8] dark:from-[#0a0e17] via-[#f0f4f8]/95 dark:via-[#0a0e17]/95 to-transparent">
        <nav className="flex items-center justify-around bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-1.5 shadow-2xl shadow-indigo-100/50 dark:shadow-black/70">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`
                relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all duration-300
                ${currentView === item.id ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
              `}
            >
              {currentView === item.id && (
                <motion.div
                  layoutId="nav-pill-mobile"
                  className="absolute inset-0 bg-indigo-50 dark:bg-slate-800 rounded-2xl -z-10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[9px] font-bold mt-0.5 tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};
