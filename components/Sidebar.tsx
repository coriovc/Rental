import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  Settings, 
  CreditCard,
  FolderDown
} from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  onOpenDownloadModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onOpenDownloadModal }) => {
  const navItems: { id: View; icon: any; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Panel' },
    { id: 'tenants', icon: Users, label: 'Inquilinos' },
    { id: 'properties', icon: Home, label: 'Propiedades' },
    { id: 'settings', icon: Settings, label: 'Ajustes' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-full py-8 px-4 flex-col border-r border-white/20 bg-white/10 backdrop-blur-md">
        <div className="mb-8 px-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500">
              RentFlow
            </h1>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Sistema Local</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`
                relative w-full flex items-center gap-4 px-4 py-3.5 rounded-3xl transition-all duration-300 group
                ${currentView === item.id 
                  ? 'text-indigo-600 font-semibold' 
                  : 'text-slate-400 hover:text-slate-600'
                }
              `}
            >
              {currentView === item.id && (
                <motion.div
                  layoutId="nav-pill-desktop"
                  className="absolute inset-0 bg-white/80 shadow-sm border border-white/60 rounded-3xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Local Folder / Desktop Download Action in Sidebar */}
        <div className="mt-auto px-2 space-y-3">
          {onOpenDownloadModal && (
            <button
              onClick={onOpenDownloadModal}
              className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold transition-all shadow-sm border border-indigo-100 active:scale-95 group"
            >
              <FolderDown size={18} className="text-indigo-600 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
              <div className="text-left">
                <span className="block leading-tight">Descargar App</span>
                <span className="text-[10px] text-indigo-500 font-normal">Para carpeta local</span>
              </div>
            </button>
          )}

          <div className="p-3 bg-white/40 border border-white/60 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Datos</span>
            <span className="text-xs font-black text-emerald-600">✓ 100% Offline Ready</span>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-[#f0f4f8] via-[#f0f4f8]/90 to-transparent">
        <nav className="flex items-center justify-around bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-2 shadow-2xl shadow-indigo-100/50">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`
                relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300
                ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}
              `}
            >
              {currentView === item.id && (
                <motion.div
                  layoutId="nav-pill-mobile"
                  className="absolute inset-0 bg-indigo-50/50 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
          {onOpenDownloadModal && (
            <button
              onClick={onOpenDownloadModal}
              className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl text-indigo-600 transition-all duration-300"
              title="Descargar para Carpeta Local"
            >
              <FolderDown size={20} strokeWidth={2.5} />
              <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Bajar</span>
            </button>
          )}
        </nav>
      </div>
    </>
  );
};
