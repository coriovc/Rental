import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
  DollarSign,
  TrendingUp,
  Moon,
  Sun,
  Eye,
  RefreshCw,
  Sparkles,
  Check,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Tenant, Property, Payment, Expense, PdfConfig, AppSettings } from '../types';
import { storage, DEFAULT_WS_REMINDER_TEMPLATE, DEFAULT_WS_CONFIRMATION_TEMPLATE, DEFAULT_PDF_CONFIG } from '../data/mockData';
import { apiService } from '../services/apiService';
import { generateReceiptPDF, repairTemplateEmojis, buildWhatsAppApiUrl } from '../services/pdfService';

interface SettingsProps {
  tenants: Tenant[];
  properties: Property[];
  payments: Payment[];
  expenses?: Expense[];
  onResetAll?: () => void;
  onImportData?: (data: Record<string, any>) => Promise<void>;
  bcvRate?: number;
  onUpdateBcvRate?: (newRate: number) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSettingsSaved?: (newSettings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  tenants, 
  properties, 
  payments, 
  expenses = [],
  onResetAll,
  onImportData,
  bcvRate = 52.50,
  onUpdateBcvRate,
  theme = 'light',
  onToggleTheme,
  onSettingsSaved
}) => {
  // Tabs de configuración
  const [activeTab, setActiveTab] = useState<'notifications' | 'pdf' | 'bcv' | 'appearance' | 'backup'>('notifications');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ fileName: string; data: Record<string, any> } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Plantillas de WhatsApp con reparación automática de emojis
  const [reminderTemplate, setReminderTemplate] = useState<string>(() =>
    repairTemplateEmojis(storage.get('ws_reminder_template', DEFAULT_WS_REMINDER_TEMPLATE))
  );
  const [confirmationTemplate, setConfirmationTemplate] = useState<string>(() =>
    repairTemplateEmojis(storage.get('ws_confirmation_template', DEFAULT_WS_CONFIRMATION_TEMPLATE))
  );

  // Alertas
  const [alertSettings, setAlertSettings] = useState({
    autoReminder1st: true,
    lateNotice5days: true,
    instantPaymentConfirm: true
  });

  // Tasa BCV
  const [currentBcvRate, setCurrentBcvRate] = useState<number>(bcvRate);
  const [isFetchingBcv, setIsFetchingBcv] = useState(false);

  // Configuración de Recibo PDF
  const [pdfConfig, setPdfConfig] = useState<PdfConfig>(
    storage.get('pdf_config', DEFAULT_PDF_CONFIG)
  );

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Cargar configuración guardada
  useEffect(() => {
    apiService.fetchAll().then(data => {
      if (data.settings) {
        if (data.settings.ws_reminder_template) {
          setReminderTemplate(repairTemplateEmojis(data.settings.ws_reminder_template));
        }
        if (data.settings.ws_confirmation_template) {
          setConfirmationTemplate(repairTemplateEmojis(data.settings.ws_confirmation_template));
        }
        if (data.settings.bcv_rate) {
          const rateNum = Number(data.settings.bcv_rate);
          setCurrentBcvRate(rateNum);
          if (onUpdateBcvRate) onUpdateBcvRate(rateNum);
        }
        if (data.settings.pdf_config) {
          setPdfConfig(data.settings.pdf_config);
        }
      }
    }).catch(err => console.warn('Cargando ajustes iniciales:', err));
  }, []);

  // Mantener sincronizado si la tasa cambia automáticamente en segundo plano
  useEffect(() => {
    if (bcvRate && bcvRate > 0) {
      setCurrentBcvRate(bcvRate);
    }
  }, [bcvRate]);

  const handleFetchLiveBcv = async () => {
    setIsFetchingBcv(true);
    try {
      const liveRate = await apiService.getBcvRate(true);
      if (liveRate && liveRate > 0) {
        setCurrentBcvRate(liveRate);
        if (onUpdateBcvRate) onUpdateBcvRate(liveRate);
        await apiService.saveSettings({ bcv_rate: liveRate });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingBcv(false);
    }
  };

  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    const repReminder = repairTemplateEmojis(reminderTemplate);
    const repConfirmation = repairTemplateEmojis(confirmationTemplate);
    setReminderTemplate(repReminder);
    setConfirmationTemplate(repConfirmation);

    storage.set('ws_reminder_template', repReminder);
    storage.set('ws_confirmation_template', repConfirmation);
    storage.set('pdf_config', pdfConfig);
    storage.set('bcv_rate', currentBcvRate);

    const payload = {
      ws_reminder_template: repReminder,
      ws_confirmation_template: repConfirmation,
      bcv_rate: currentBcvRate,
      pdf_config: pdfConfig,
      theme: theme
    };

    try {
      await apiService.saveSettings(payload);
      if (onSettingsSaved) onSettingsSaved(payload);
    } catch (err) {
      console.warn('Error guardando en BD:', err);
    }

    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  const handleExport = () => {
    const data = {
      tenants,
      properties,
      payments,
      expenses,
      config: {
        ws_reminder_template: reminderTemplate,
        ws_confirmation_template: confirmationTemplate,
        pdf_config: pdfConfig,
        bcv_rate: currentBcvRate,
        theme
      },
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RentFlow_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        const hasValidArray =
          Array.isArray(parsed?.properties) ||
          Array.isArray(parsed?.tenants) ||
          Array.isArray(parsed?.payments) ||
          Array.isArray(parsed?.expenses);

        if (!parsed || typeof parsed !== 'object' || !hasValidArray) {
          setImportFeedback({
            type: 'error',
            message: 'El archivo seleccionado no es una copia de seguridad válida de RentFlow.'
          });
          setPendingImport(null);
          return;
        }
        setPendingImport({ fileName: file.name, data: parsed });
      } catch {
        setImportFeedback({
          type: 'error',
          message: 'No se pudo leer el archivo JSON. Verifica que no esté dañado.'
        });
        setPendingImport(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImport || !onImportData) return;
    setIsImporting(true);
    setImportFeedback(null);
    try {
      await onImportData(pendingImport.data);
      setPendingImport(null);
      setImportFeedback({
        type: 'success',
        message: 'Copia de seguridad restaurada correctamente en la base de datos.'
      });
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        message: err?.message || 'Error al restaurar la copia de seguridad.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handlePreviewPdf = () => {
    const sampleTenant: Tenant = tenants[0] || {
      id: 'demo',
      name: 'Cliente de Prueba',
      idNumber: 'V-20.123.456',
      phone: '+58 412 1112233',
      propertyId: 'p1',
      monthlyRent: 1200,
      includeInternet: true,
      startDate: '2026-01-01',
      contractDuration: 12,
      status: 'active'
    };
    const samplePayment: Payment = payments[0] || {
      id: 'REC-DEMO-01',
      tenantId: sampleTenant.id,
      amount: sampleTenant.monthlyRent,
      amountBs: sampleTenant.monthlyRent * currentBcvRate,
      exchangeRate: currentBcvRate,
      date: new Date().toISOString().split('T')[0],
      month: 'Marzo',
      status: 'paid'
    };
    const sampleProperty: Property = properties[0] || {
      id: 'p1',
      name: 'Propiedad Demo',
      address: 'Av. Libertador, Caracas',
      type: 'Apartment',
      price: 1200,
      isOccupied: true
    };

    generateReceiptPDF(sampleTenant, samplePayment, sampleProperty, pdfConfig);
  };

  const sampleReminderUrl = buildWhatsAppApiUrl(
    tenants[0]?.phone || '04121234567',
    reminderTemplate
      .replace(/{nombre}/g, tenants[0]?.name || 'Juan Pérez')
      .replace(/{mes}/g, 'Mes Actual')
      .replace(/{monto}/g, '250')
      .replace(/{montoBs}/g, (250 * Number(currentBcvRate || 52.50)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .replace(/{tasa}/g, Number(currentBcvRate || 52.50).toFixed(2))
      .replace(/{dias}/g, '5')
      .replace(/{cedula}/g, tenants[0]?.idNumber || 'V-12.345.678')
  );

  const sampleConfirmationUrl = buildWhatsAppApiUrl(
    tenants[0]?.phone || '04121234567',
    confirmationTemplate
      .replace(/{nombre}/g, tenants[0]?.name || 'Juan Pérez')
      .replace(/{mes}/g, 'Mes Actual')
      .replace(/{monto}/g, '250')
      .replace(/{montoBs}/g, (250 * Number(currentBcvRate || 52.50)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      .replace(/{fecha}/g, new Date().toISOString().split('T')[0])
      .replace(/{tasa}/g, Number(currentBcvRate || 52.50).toFixed(2))
      .replace(/{reciboId}/g, 'REC-001')
      .replace(/{cedula}/g, tenants[0]?.idNumber || 'V-12.345.678')
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-8 pb-16"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Ajustes del Sistema</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configura plantillas de WhatsApp, alertas, recibos PDF, tasas y apariencia.</p>
        </div>
        <button 
          onClick={handleSaveAllSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          <span>Guardar Cambios</span>
        </button>
      </header>

      {/* Notificación flotante de éxito */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl"
          >
            <CheckCircle size={18} />
            <span>Configuración y plantillas guardadas exitosamente en la base de datos MySQL.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Pestañas / Navegación Interna */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60">
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'notifications' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Bell size={16} />
          <span>Notificaciones & WhatsApp</span>
        </button>

        <button 
          onClick={() => setActiveTab('pdf')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'pdf' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <FileText size={16} />
          <span>Configuración Recibo PDF</span>
        </button>

        <button 
          onClick={() => setActiveTab('bcv')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'bcv' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <TrendingUp size={16} />
          <span>Tasa Oficial BCV</span>
        </button>

        <button 
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'appearance' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Palette size={16} />
          <span>Apariencia (Claro / Oscuro)</span>
        </button>

        <button 
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'backup' 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Database size={16} />
          <span>Copia de Seguridad & Reset</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* REQUIREMENT 4: NOTIFICACIONES, SUB-SECCIÓN WHATSAPP TEMPLATES Y ALERTAS */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Sub-sección 1: Plantillas de Mensajes WhatsApp con Emojis */}
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Plantillas de Mensajes de WhatsApp</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Personaliza los mensajes directos con soporte completo para emojis y etiquetas dinámicas.</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Plantilla 1: Recordatorio de Pago (5 días para pagar, 1ro de cada mes) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Plantilla 1</span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Recordatorio de Pago (Envío el 1° de cada mes)</h4>
                    <p className="text-[11px] text-slate-400">Indica al inquilino que dispone de 5 días continuos para realizar el pago del mes.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setReminderTemplate(DEFAULT_WS_REMINDER_TEMPLATE)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold hover:bg-slate-200 transition-colors"
                      title="Restaurar plantilla original con emojis nativos"
                    >
                      <RotateCcw size={12} />
                      <span>Restaurar Predeterminada</span>
                    </button>
                    <a
                      href={sampleReminderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold shadow-sm shadow-emerald-500/20 transition-colors active:scale-95"
                      title="Abrir prueba directa con emojis en WhatsApp Web / Desktop"
                    >
                      <ExternalLink size={12} />
                      <span>Probar en WhatsApp</span>
                    </a>
                  </div>
                </div>

                <textarea
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="w-full h-36 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
                />

                {/* Emojis para Plantilla 1 */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Insertar Emojis:</span>
                  {['📅', '🏠', '💵', '🇻🇪', '✨', '⏳', '🔔', '📌', '⚠️', '❗'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setReminderTemplate(prev => prev + ' ' + emoji)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 hover:scale-125 shadow-xs flex items-center justify-center text-sm transition-transform cursor-pointer"
                      title={`Insertar ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Campos dinámicos Plantilla 1 */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campos dinámicos:</span>
                  {['{nombre}', '{mes}', '{monto}', '{montoBs}', '{tasa}', '{dias}', '{cedula}'].map(tag => (
                    <button 
                      key={tag}
                      type="button"
                      onClick={() => setReminderTemplate(prev => prev + ' ' + tag)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plantilla 2: Confirmación de Pago (Comprobante recibido) */}
              <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Plantilla 2</span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Confirmación de Pago Recibido (Comprobante de factura)</h4>
                    <p className="text-[11px] text-slate-400">Se envía automáticamente tras registrar un cobro para certificar que el canon fue cancelado.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setConfirmationTemplate(DEFAULT_WS_CONFIRMATION_TEMPLATE)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold hover:bg-slate-200 transition-colors"
                      title="Restaurar plantilla original con emojis nativos"
                    >
                      <RotateCcw size={12} />
                      <span>Restaurar Predeterminada</span>
                    </button>
                    <a
                      href={sampleConfirmationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold shadow-sm shadow-emerald-500/20 transition-colors active:scale-95"
                      title="Abrir prueba directa con emojis en WhatsApp Web / Desktop"
                    >
                      <ExternalLink size={12} />
                      <span>Probar en WhatsApp</span>
                    </a>
                  </div>
                </div>

                <textarea
                  value={confirmationTemplate}
                  onChange={(e) => setConfirmationTemplate(e.target.value)}
                  className="w-full h-36 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none transition-all"
                />

                {/* Emojis para Plantilla 2 */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Insertar Emojis:</span>
                  {['✅', '🎉', '🗓', '💵', '🇻🇪', '📅', '📄', '✨', '🧾', '👏'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setConfirmationTemplate(prev => prev + ' ' + emoji)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 hover:scale-125 shadow-xs flex items-center justify-center text-sm transition-transform cursor-pointer"
                      title={`Insertar ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Campos dinámicos Plantilla 2 */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campos dinámicos:</span>
                  {['{nombre}', '{mes}', '{monto}', '{montoBs}', '{fecha}', '{tasa}', '{reciboId}'].map(tag => (
                    <button 
                      key={tag}
                      type="button"
                      onClick={() => setConfirmationTemplate(prev => prev + ' ' + tag)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg text-[10px] font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Sub-sección 2: Gestión de Alertas y Vencimientos */}
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <Bell size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gestión de Alertas y Notificaciones</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configuración de recordatorios de cobro y vencimientos de contrato.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <Calendar className="text-indigo-500 mt-1" size={18} />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white">Recordatorio Automático el 1° de Cada Mes</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Habilita recordatorios listos para enviar a todos los inquilinos activos el primer día del mes.</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={alertSettings.autoReminder1st} 
                  onChange={(e) => setAlertSettings({...alertSettings, autoReminder1st: e.target.checked})} 
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-rose-500 mt-1" size={18} />
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white">Alerta de Morosidad (Tras Vencer los 5 Días de Gracia)</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Marca en rojo a los inquilinos que no hayan reportado pago transcurrido el 5° día del mes.</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={alertSettings.lateNotice5days} 
                  onChange={(e) => setAlertSettings({...alertSettings, lateNotice5days: e.target.checked})} 
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                />
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUIREMENT 5: CONFIGURACIÓN DE DOCUMENTO RECIBO PDF */}
      {/* ========================================================================= */}
      {activeTab === 'pdf' && (
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Configuración del Recibo Digital (PDF)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Personaliza la información fiscal, encabezado y notas legales del comprobante.</p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={handlePreviewPdf} 
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
            >
              <Eye size={15} />
              <span>Ver PDF de Ejemplo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Razón Social / Nombre del Arrendador</label>
              <input 
                value={pdfConfig.companyName || ''} 
                onChange={(e) => setPdfConfig({...pdfConfig, companyName: e.target.value})} 
                placeholder="Ej: RentFlow Inmobiliaria C.A." 
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">RIF / Cédula / Documento Fiscal</label>
              <input 
                value={pdfConfig.companyRif || ''} 
                onChange={(e) => setPdfConfig({...pdfConfig, companyRif: e.target.value})} 
                placeholder="Ej: J-40582914-8" 
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Teléfono de Contacto</label>
              <input 
                value={pdfConfig.companyPhone || ''} 
                onChange={(e) => setPdfConfig({...pdfConfig, companyPhone: e.target.value})} 
                placeholder="Ej: +58 (412) 123-4567" 
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Correo Electrónico de Administración</label>
              <input 
                value={pdfConfig.companyEmail || ''} 
                onChange={(e) => setPdfConfig({...pdfConfig, companyEmail: e.target.value})} 
                placeholder="Ej: pagos@rentflow.com" 
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none" 
              />
            </div>

            <div className="col-span-1 md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Dirección Fiscal / Oficina</label>
              <input 
                value={pdfConfig.companyAddress || ''} 
                onChange={(e) => setPdfConfig({...pdfConfig, companyAddress: e.target.value})} 
                placeholder="Ej: Av. Francisco de Miranda, Edificio Central, Caracas" 
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none" 
              />
            </div>

            <div className="col-span-1 md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Condiciones y Notas al Pie del Recibo</label>
              <textarea 
                value={pdfConfig.notes || ''} 
                onChange={(e) => setPdfConfig({...pdfConfig, notes: e.target.value})} 
                rows={3} 
                placeholder="Términos legales, validez del documento, datos bancarios..." 
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none resize-none" 
              />
            </div>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* TASA OFICIAL BCV (VENEZUELA) */}
      {/* ========================================================================= */}
      {activeTab === 'bcv' && (
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tasa Oficial de Cambio (BCV)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Conversión de dólares a bolívares en cobros y recibos.</p>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl border border-emerald-500/20 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Tasa Vigente Oficial</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Actualización Automática Activa
                </span>
              </div>
              <h4 className="text-3xl font-black text-slate-800 dark:text-white">
                Bs. {Number(currentBcvRate || 52.50).toFixed(2)} <span className="text-sm font-medium text-slate-500">/ USD</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Se sincroniza automáticamente en segundo plano con las fuentes oficiales del BCV.</p>
            </div>

            <button 
              type="button" 
              onClick={handleFetchLiveBcv} 
              disabled={isFetchingBcv}
              className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={isFetchingBcv ? 'animate-spin' : ''} size={16} />
              <span>{isFetchingBcv ? 'Consultando BCV...' : 'Forzar Consulta en Vivo'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ajuste Manual de Tasa (Bs. / USD)</label>
            <input 
              type="number" 
              step="0.01" 
              value={currentBcvRate} 
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentBcvRate(val);
                if (onUpdateBcvRate) onUpdateBcvRate(val);
              }} 
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-base font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none" 
            />
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* REQUIREMENT 4: APARIENCIA (LIGHT / DARK MODE) */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 flex items-center justify-center">
              <Palette size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Apariencia y Tema Visual</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Selecciona entre la estética Liquid Glass clara o la experiencia Dark Glass.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opción Modo Claro */}
            <div 
              onClick={() => { if (theme !== 'light' && onToggleTheme) onToggleTheme(); }}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative ${
                theme === 'light' 
                  ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100' 
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
              }`}
            >
              {theme === 'light' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check size={14} />
                </div>
              )}
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Sun size={24} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Modo Claro (Liquid Glass)</h4>
              <p className="text-xs text-slate-500 mt-1">Efectos de vidrio translúcido con tonos suaves e iluminación limpia.</p>
            </div>

            {/* Opción Modo Oscuro */}
            <div 
              onClick={() => { if (theme !== 'dark' && onToggleTheme) onToggleTheme(); }}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative ${
                theme === 'dark' 
                  ? 'border-indigo-500 bg-slate-900 shadow-xl shadow-black/50' 
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
              }`}
            >
              {theme === 'dark' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                  <Check size={14} />
                </div>
              )}
              <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center mb-4">
                <Moon size={24} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Modo Oscuro (Dark Glass)</h4>
              <p className="text-xs text-slate-500 mt-1">Vidrio líquido oscuro para uso nocturno con alto contraste visual.</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ========================================================================= */}
      {/* COPIA DE SEGURIDAD Y ZONA DE PELIGRO */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <GlassCard className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Copia de Seguridad de Datos</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Descarga o restaura toda la base de datos (inquilinos, propiedades, pagos, gastos y ajustes) en un archivo JSON seguro.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 rounded-2xl font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50"
                >
                  <Download size={18} />
                  <span>Exportar Todo (JSON)</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 rounded-2xl font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-lg shadow-emerald-100 dark:shadow-emerald-950/50"
                >
                  <Upload size={18} />
                  <span>{isImporting ? 'Importando...' : 'Importar Datos (JSON)'}</span>
                </button>
              </div>
            </div>

            {pendingImport && (
              <div className="mt-6 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    ¿Restaurar copia de seguridad "{pendingImport.fileName}"?
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Se reemplazarán los datos actuales por: {pendingImport.data.properties?.length || 0} propiedades, {pendingImport.data.tenants?.length || 0} inquilinos, {pendingImport.data.payments?.length || 0} pagos y {pendingImport.data.expenses?.length || 0} gastos.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPendingImport(null)}
                    disabled={isImporting}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {isImporting ? 'Restaurando...' : 'Confirmar Restauración'}
                  </button>
                </div>
              </div>
            )}

            {importFeedback && (
              <div className={`mt-5 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold ${
                importFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
              }`}>
                {importFeedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{importFeedback.message}</span>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-8 bg-rose-50/30 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-rose-600">Zona de Peligro</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Reiniciar base de datos MySQL a los valores de prueba originales.</p>
              </div>
              {showResetConfirm ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      setShowResetConfirm(false);
                      if (onResetAll) onResetAll();
                    }}
                    className="px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-200 hover:bg-rose-700 transition-colors"
                  >
                    Confirmar Reinicio
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-rose-600 rounded-2xl font-bold text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 active:scale-95"
                >
                  Reiniciar Base de Datos
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </motion.div>
  );
};
