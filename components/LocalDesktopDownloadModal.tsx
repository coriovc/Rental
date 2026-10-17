import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderDown, 
  FileCode, 
  Archive, 
  Monitor, 
  X, 
  CheckCircle, 
  Sparkles, 
  ArrowRight, 
  HelpCircle,
  HardDrive,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Tenant, Property, Payment } from '../types';
import { downloadStandaloneHtmlFile, downloadCompleteDesktopZip } from '../services/downloadPackageService';
import { storage, DEFAULT_WS_TEMPLATE } from '../data/mockData';

interface LocalDesktopDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  properties: Property[];
  payments: Payment[];
}

export const LocalDesktopDownloadModal: React.FC<LocalDesktopDownloadModalProps> = ({
  isOpen,
  onClose,
  tenants,
  properties,
  payments
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstallPwa(false);
      }
      setDeferredPrompt(null);
    } else {
      alert("Para instalar en tu escritorio: En Chrome o Edge, haz clic en el icono de instalación (pantalla con flecha) en la barra de direcciones o en el menú ⋮ > 'Instalar RentFlow'.");
    }
  };

  const handleDownloadHtml = () => {
    setDownloadingHtml(true);
    const template = storage.get('ws_template', DEFAULT_WS_TEMPLATE);
    setTimeout(() => {
      downloadStandaloneHtmlFile(tenants, properties, payments, template);
      setDownloadingHtml(false);
      setDownloadSuccess('¡Archivo HTML descargado con éxito! Guárdalo en cualquier carpeta y haz doble clic.');
      setTimeout(() => setDownloadSuccess(null), 5000);
    }, 400);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    const template = storage.get('ws_template', DEFAULT_WS_TEMPLATE);
    try {
      await downloadCompleteDesktopZip(tenants, properties, payments, template);
      setDownloadSuccess('¡Paquete ZIP descargado! Descomprímelo en una carpeta y ejecuta el archivo .bat');
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" 
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/80 p-6 md:p-10 max-h-[90vh] overflow-y-auto scrollbar-hide z-10"
      >
        <button 
          onClick={onClose} 
          className="absolute right-6 top-6 p-2.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
            <FolderDown size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Ejecutar en Carpeta Local</h3>
            <p className="text-xs text-slate-500">Descarga RentFlow para usarlo en tu computadora sin depender de internet.</p>
          </div>
        </div>

        {downloadSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-semibold"
          >
            <CheckCircle className="text-emerald-600 shrink-0" size={20} />
            <span>{downloadSuccess}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
          {/* Card 1: Single file HTML */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 to-white border border-indigo-100 flex flex-col justify-between hover:shadow-lg transition-all group">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileCode size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-full">
                  Recomendado
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-800">Archivo HTML Autónomo</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Un único archivo <strong>RentFlow-Portable.html</strong> con toda la aplicación integrada. Cópialo a cualquier carpeta, dale doble clic y funciona al instante en Chrome, Edge o Safari.
              </p>
              <ul className="text-[11px] text-slate-600 mt-3 space-y-1">
                <li className="flex items-center gap-1.5">✓ Guarda tus datos automáticamente en el navegador</li>
                <li className="flex items-center gap-1.5">✓ No requiere Node.js, terminal ni servidores</li>
                <li className="flex items-center gap-1.5">✓ Genera recibos PDF y enlaces de WhatsApp</li>
              </ul>
            </div>

            <button
              onClick={handleDownloadHtml}
              disabled={downloadingHtml}
              className="mt-6 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {downloadingHtml ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FileCode size={16} />
                  <span>Descargar RentFlow-Portable.html</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: ZIP Package */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100 flex flex-col justify-between hover:shadow-lg transition-all group">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Archive size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-full">
                  Carpeta Completa
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-800">Paquete ZIP de Escritorio</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Descarga una carpeta comprimida lista para descomprimir. Incluye lanzadores automáticos de 1 clic para Windows y Mac.
              </p>
              <ul className="text-[11px] text-slate-600 mt-3 space-y-1">
                <li className="flex items-center gap-1.5">✓ Incluye <code className="bg-emerald-100/50 px-1 rounded">Iniciar-RentFlow-Windows.bat</code></li>
                <li className="flex items-center gap-1.5">✓ Incluye <code className="bg-emerald-100/50 px-1 rounded">Iniciar-RentFlow-Mac.command</code></li>
                <li className="flex items-center gap-1.5">✓ Incluye copia de respaldo inicial en JSON y manual</li>
              </ul>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="mt-6 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50"
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

        {/* PWA Section */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Monitor size={20} />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-sm">Instalar como Aplicación Nativa (PWA)</h5>
              <p className="text-[11px] text-slate-500">Agrega un icono de RentFlow directamente a tu barra de tareas o escritorio.</p>
            </div>
          </div>
          <button
            onClick={handleInstallPwa}
            className="px-5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl text-xs whitespace-nowrap shadow-sm hover:shadow transition-all"
          >
            Instalar App
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-blue-900 text-xs">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-blue-600" />
            ¿Cómo ejecutarlo en tu computadora?
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-blue-800">
            <li>Haz clic en <strong>Descargar RentFlow-Portable.html</strong> o <strong>Descargar Paquete (.ZIP)</strong>.</li>
            <li>Si descargaste el ZIP, descomprímelo en una carpeta de tu preferencia (ej: en Documentos o Escritorio).</li>
            <li>Haz doble clic sobre <strong>RentFlow-Portable.html</strong> (o en <strong>Iniciar-RentFlow-Windows.bat</strong> en Windows).</li>
            <li>Se abrirá en tu navegador favorito y podrás gestionar tus cobros, inquilinos e imprimir comprobantes al instante.</li>
          </ol>
        </div>
      </motion.div>
    </div>
  );
};
