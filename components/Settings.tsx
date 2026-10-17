import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Upload, 
  Shield, 
  Bell, 
  Palette, 
  Database, 
  MessageSquare, 
  Info, 
  Save, 
  CheckCircle, 
  FolderDown, 
  FileCode, 
  Archive, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Tenant, Property, Payment } from '../types';
import { storage, DEFAULT_WS_TEMPLATE, INITIAL_TENANTS, INITIAL_PROPERTIES, INITIAL_PAYMENTS } from '../data/mockData';
import { downloadStandaloneHtmlFile, downloadCompleteDesktopZip, triggerConfetti } from '../services/downloadPackageService';

interface SettingsProps {
  tenants: Tenant[];
  properties: Property[];
  payments: Payment[];
  onImportData?: (data: { tenants: Tenant[]; properties: Property[]; payments: Payment[]; template?: string }) => void;
  onResetData?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  tenants, 
  properties, 
  payments,
  onImportData,
  onResetData
}) => {
  const [wsTemplate, setWsTemplate] = useState(storage.get('ws_template', DEFAULT_WS_TEMPLATE));
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
      tenants,
      properties,
      payments,
      config: {
        ws_template: wsTemplate
      },
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RentFlow_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    a.click();
    triggerConfetti();
    setActionSuccess('Copia de seguridad JSON descargada');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.tenants && json.properties && json.payments) {
          if (onImportData) {
            onImportData({
              tenants: json.tenants,
              properties: json.properties,
              payments: json.payments,
              template: json.config?.ws_template || json.wsTemplate
            });
          }
          if (json.config?.ws_template) {
            setWsTemplate(json.config.ws_template);
            storage.set('ws_template', json.config.ws_template);
          }
          setActionSuccess('¡Datos importados con éxito!');
          triggerConfetti();
          setTimeout(() => setActionSuccess(null), 4000);
        } else {
          alert('El archivo no contiene el formato de datos esperado de RentFlow.');
        }
      } catch (err) {
        alert('Error al procesar el archivo JSON: formato inválido.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleDownloadHtml = () => {
    downloadStandaloneHtmlFile(tenants, properties, payments, wsTemplate);
    setActionSuccess('Descargando RentFlow-Portable.html');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      await downloadCompleteDesktopZip(tenants, properties, payments, wsTemplate);
      setActionSuccess('Descargando RentFlow-Carpeta-Local.zip');
      setTimeout(() => setActionSuccess(null), 4000);
    } finally {
      setDownloadingZip(false);
    }
  };

  const saveTemplate = () => {
    setIsSaving(true);
    storage.set('ws_template', wsTemplate);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 600);
  };

  const handleConfirmReset = () => {
    if (onResetData) {
      onResetData();
    } else {
      storage.set('tenants', INITIAL_TENANTS);
      storage.set('properties', INITIAL_PROPERTIES);
      storage.set('payments', INITIAL_PAYMENTS);
      window.location.reload();
    }
    setShowResetConfirm(false);
    setActionSuccess('Se han restablecido los datos iniciales de fábrica.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const sections = [
    { icon: Palette, label: 'Apariencia', desc: 'Tema Liquid Glass con desenfoque dinámico.', color: 'text-pink-500' },
    { icon: Bell, label: 'Alertas de Pago', desc: 'Detección automática de deudores y moras.', color: 'text-amber-500' },
    { icon: Shield, label: 'Seguridad Local', desc: 'Los datos nunca salen de tu equipo ni navegan a servidores.', color: 'text-indigo-500' },
    { icon: Database, label: 'Base de Datos', desc: 'Sincronización en tiempo real con LocalStorage.', color: 'text-emerald-500' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Ajustes & Portabilidad</h2>
          <p className="text-slate-500 mt-1">Descarga local, plantillas de mensajes y copias de seguridad.</p>
        </div>
      </header>

      {actionSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-semibold shadow-sm"
        >
          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
          <span>{actionSuccess}</span>
        </motion.div>
      )}

      {/* NEW: Local Folder & Desktop Download Hub */}
      <GlassCard className="p-8 border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white/80 to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <FolderDown size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Ejecución en Carpeta Local (Escritorio)</h3>
              <p className="text-sm text-slate-500">Descarga la aplicación completa para ejecutarla desde cualquier carpeta sin conexión.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-indigo-600">
                <FileCode size={20} />
                <h4 className="font-bold text-sm text-slate-800">Archivo HTML Autónomo</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Un solo archivo <code>RentFlow-Portable.html</code> con toda la app, base de datos y visor. Haz doble clic y se abre en cualquier navegador.
              </p>
            </div>
            <button
              onClick={handleDownloadHtml}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <FileCode size={16} />
              <span>Descargar .HTML Autónomo</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-emerald-600">
                <Archive size={20} />
                <h4 className="font-bold text-sm text-slate-800">Paquete Completo (ZIP)</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Carpeta completa con scripts de 1 clic para Windows (<code>.bat</code>) y Mac (<code>.command</code>), manual y respaldo inicial.
              </p>
            </div>
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {downloadingZip ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Archive size={16} />
                  <span>Descargar Paquete (.ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* WhatsApp Template Editor */}
      <GlassCard className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Mensaje de WhatsApp</h3>
            <p className="text-sm text-slate-500">Configura la plantilla de envío para comprobantes de inquilinos.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={wsTemplate}
              onChange={(e) => setWsTemplate(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none transition-all"
            />
            <AnimatePresence>
              {showSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-4 right-4 flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg"
                >
                  <CheckCircle size={12} /> Guardado con éxito
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 pt-1">Placeholders:</span>
            {['{nombre}', '{mes}', '{monto}'].map(tag => (
              <button 
                key={tag}
                type="button"
                onClick={() => setWsTemplate(prev => prev + ' ' + tag)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <Info className="text-blue-500 mt-0.5 shrink-0" size={16} />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Utiliza los placeholders para personalizar el mensaje. Al presionar el botón de WhatsApp en la ficha de un inquilino, se reemplazan automáticamente los campos con los datos reales.
            </p>
          </div>

          <button 
            type="button"
            onClick={saveTemplate}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Save size={20} />}
            <span>Guardar Plantilla</span>
          </button>
        </div>
      </GlassCard>

      {/* Backup & JSON Import/Export */}
      <GlassCard className="p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Copia de Seguridad de Datos</h3>
            <p className="text-slate-500 mt-1">Exporta o importa tus inquilinos, cobros y propiedades en formato JSON.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".json" 
              onChange={handleImportFile} 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload size={18} />
              <span>Importar JSON</span>
            </button>
            <button 
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              <Download size={18} />
              <span>Exportar Todo</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, i) => (
          <GlassCard key={i} className="p-8 group" hoverEffect>
            <div className="flex items-start gap-5">
              <div className={`p-4 rounded-3xl bg-slate-100 group-hover:bg-white group-hover:shadow-md transition-all ${section.color}`}>
                <section.icon size={26} />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-800 tracking-tight">{section.label}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{section.desc}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Danger Zone */}
      <GlassCard className="p-8 bg-rose-50/40 border-rose-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-rose-600">Restablecer Datos</h3>
            <p className="text-slate-500 mt-1 text-sm">Restaura la información a los datos iniciales de fábrica.</p>
          </div>
          <button 
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full sm:w-auto px-6 py-3 bg-rose-600 rounded-2xl font-bold text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 active:scale-95 text-sm"
          >
            Restablecer Todo
          </button>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-6 p-5 bg-white border border-rose-200 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3 text-rose-600 mb-2 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>¿Estás seguro de restablecer los datos?</span>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Se recargarán los inquilinos y propiedades iniciales de ejemplo. Recuerda que puedes hacer clic en &quot;Exportar Todo&quot; antes de continuar.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md"
                >
                  Sí, restablecer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
};
