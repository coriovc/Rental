import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from './ModalPortal';
import { 
  Plus, 
  Search, 
  Home, 
  MapPin, 
  Trash2, 
  Edit2, 
  X, 
  Maximize, 
  Bed, 
  Bath, 
  Car, 
  Info, 
  AlertTriangle, 
  Upload, 
  User as UserIcon,
  Image as ImageIcon,
  Building,
  Warehouse as WarehouseIcon
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Property, Tenant, PropertyType } from '../types';

interface PropertiesProps {
  properties: Property[];
  tenants: Tenant[];
  onAddProperty: (property: Omit<Property, 'id' | 'isOccupied'>) => void;
  onUpdateProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
}

export const Properties: React.FC<PropertiesProps> = ({ 
  properties, 
  tenants, 
  onAddProperty, 
  onUpdateProperty, 
  onDeleteProperty 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [newProperty, setNewProperty] = useState<Omit<Property, 'id' | 'isOccupied'>>({
    name: '',
    address: '',
    type: 'Apartment',
    price: 0,
    description: '',
    images: [],
    specs: { sqft: 0, bedrooms: 0, bathrooms: 0, parking: false }
  });

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'Apartment', label: 'Departamento / Apartamento' },
    { value: 'House', label: 'Casa' },
    { value: 'Warehouse', label: 'Galpón' },
    { value: 'Annex', label: 'Anexo' },
  ];

  const typeLabels: Record<string, string> = {
    Apartment: 'Departamento',
    House: 'Casa',
    Warehouse: 'Galpón',
    Annex: 'Anexo'
  };

  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeLabels[p.type] || p.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOccupant = (propertyId: string) => tenants.find(t => t.propertyId === propertyId);

  const resetModals = () => {
    setSelectedProperty(null);
    setIsEditing(false);
    setShowAddModal(false);
    setDeleteStep(0);
    setIsDragging(false);
  };

  // Manejo de carga de imágenes (Drag & Drop y Selector)
  const processImageFiles = (files: FileList | File[], isEdit: boolean = false) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (isEdit && selectedProperty) {
          setSelectedProperty(prev => prev ? { ...prev, images: [...(prev.images || []), base64] } : null);
        } else {
          setNewProperty(prev => ({ ...prev, images: [...(prev.images || []), base64] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, isEdit: boolean = false) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFiles(e.dataTransfer.files, isEdit);
    }
  };

  const removeImage = (index: number, isEdit: boolean = false) => {
    if (isEdit && selectedProperty) {
      setSelectedProperty(prev => prev ? {
        ...prev,
        images: (prev.images || []).filter((_, i) => i !== index)
      } : null);
    } else {
      setNewProperty(prev => ({
        ...prev,
        images: (prev.images || []).filter((_, i) => i !== index)
      }));
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProperty({
      ...newProperty,
      images: newProperty.images && newProperty.images.length > 0 
        ? newProperty.images 
        : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800']
    });
    setShowAddModal(false);
    setNewProperty({
      name: '', address: '', type: 'Apartment', price: 0,
      description: '', images: [], specs: { sqft: 0, bedrooms: 0, bathrooms: 0, parking: false }
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProperty) {
      onUpdateProperty(selectedProperty);
      setIsEditing(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedProperty && deleteStep === 2) {
      onDeleteProperty(selectedProperty.id);
      resetModals();
    } else {
      setDeleteStep(prev => prev + 1);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 md:pb-12">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Propiedades</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de unidades, galpones y anexos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, dirección o tipo..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-full text-sm text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl font-bold text-white text-sm shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 whitespace-nowrap active:scale-95 transition-transform hover:bg-indigo-700"
          >
            <Plus size={20} />
            <span>Nueva Propiedad</span>
          </button>
        </div>
      </header>

      {/* Grid de Propiedades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProperties.map((p) => {
          const occupant = getOccupant(p.id);
          return (
            <GlassCard key={p.id} className="group" onClick={() => setSelectedProperty(p)} hoverEffect>
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'} 
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-slate-900/60 backdrop-blur-md text-white shadow-md border border-white/20">
                    {typeLabels[p.type] || p.type}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-md shadow-lg border border-white/20 ${p.isOccupied ? 'bg-slate-900/40 text-white' : 'bg-emerald-500/80 text-white'}`}>
                    {p.isOccupied ? 'Ocupada' : 'Disponible'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-800 dark:text-white truncate pr-2 tracking-tight text-lg">{p.name}</h4>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg tracking-tight">${p.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 mb-5">
                  <MapPin size={14} />
                  <span className="text-xs font-medium truncate">{p.address}</span>
                </div>
                
                {p.isOccupied && occupant && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-[1.5rem] mb-5 border border-slate-100 dark:border-slate-700/60 shadow-inner">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <UserIcon size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Inquilino</p>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">{occupant.name}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-4 text-slate-400">
                    {p.specs?.sqft !== undefined && p.specs.sqft > 0 && (
                      <span className="text-xs font-bold">{p.specs.sqft} m²</span>
                    )}
                    {p.specs?.bedrooms !== undefined && p.specs.bedrooms > 0 && (
                      <div className="flex items-center gap-1.5"><Bed size={16}/><span className="text-xs font-bold">{p.specs.bedrooms}</span></div>
                    )}
                    {p.specs?.bathrooms !== undefined && p.specs.bathrooms > 0 && (
                      <div className="flex items-center gap-1.5"><Bath size={16}/><span className="text-xs font-bold">{p.specs.bathrooms}</span></div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/40 px-3 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">Ver Más</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Modal Nueva Propiedad / Detalle con Liquid Glass */}
      <ModalPortal>
        <AnimatePresence>
          {(selectedProperty || showAddModal) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetModals} className="fixed inset-0 bg-slate-950/50 dark:bg-black/70 backdrop-blur-xl" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 16 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 16 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl h-[92vh] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] md:rounded-[3rem] relative z-10 flex flex-col overflow-hidden"
            >
              {/* Barra superior con Liquid Glass */}
              <div className="px-6 md:px-10 py-4 border-b border-slate-200/50 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Home size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                      {showAddModal ? 'Nueva Propiedad' : (selectedProperty?.name || 'Detalle de la Propiedad')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {showAddModal ? 'Registra una nueva propiedad en el sistema' : (selectedProperty?.address || 'Información y configuración')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={resetModals} 
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                >
                  <X size={16} />
                  <span>Cerrar</span>
                </button>
              </div>

              {/* Contenido scrolleable a pantalla completa */}
              <div className="flex-1 overflow-y-auto">
                {showAddModal ? (
                  <div className="max-w-4xl mx-auto p-6 md:p-10">
                    <form onSubmit={handleAddSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          required 
                          placeholder="Nombre descriptivo (Ej: Galpón Principal, Anexo A)" 
                          value={newProperty.name} 
                          onChange={e => setNewProperty({...newProperty, name: e.target.value})} 
                          className="col-span-1 md:col-span-2 w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" 
                        />
                        <input 
                          required 
                          placeholder="Ubicación / Dirección exacta" 
                          value={newProperty.address} 
                          onChange={e => setNewProperty({...newProperty, address: e.target.value})} 
                          className="col-span-1 md:col-span-2 w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" 
                        />
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tipo de Propiedad</label>
                          <select 
                            required 
                            value={newProperty.type} 
                            onChange={e => setNewProperty({...newProperty, type: e.target.value as PropertyType})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 appearance-none focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                          >
                            {propertyTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Canon Mensual ($ USD)</label>
                          <input 
                            required 
                            type="number" 
                            placeholder="Monto en dólares" 
                            value={newProperty.price || ''} 
                            onChange={e => setNewProperty({...newProperty, price: Number(e.target.value)})} 
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" 
                          />
                        </div>
                        <textarea 
                          placeholder="Características destacadas, servicios incluidos, condiciones..." 
                          value={newProperty.description} 
                          onChange={e => setNewProperty({...newProperty, description: e.target.value})} 
                          className="col-span-1 md:col-span-2 w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 h-28 resize-none focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Superficie m²</label>
                          <input type="number" placeholder="m²" value={newProperty.specs?.sqft || ''} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, sqft: Number(e.target.value)}})} className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-xl p-3 text-xs outline-none text-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Ambientes / Hab.</label>
                          <input type="number" placeholder="Hab." value={newProperty.specs?.bedrooms || ''} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, bedrooms: Number(e.target.value)}})} className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-xl p-3 text-xs outline-none text-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Baños</label>
                          <input type="number" placeholder="Baños" value={newProperty.specs?.bathrooms || ''} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, bathrooms: Number(e.target.value)}})} className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-xl p-3 text-xs outline-none text-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl self-end mt-1">
                          <input type="checkbox" id="parkingCheck" checked={newProperty.specs?.parking} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, parking: e.target.checked}})} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                          <label htmlFor="parkingCheck" className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">Estacionamiento</label>
                        </div>
                      </div>

                      {/* Drag & Drop para Imágenes */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fotos de la Propiedad</label>
                        <div 
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, false)}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all cursor-pointer group ${
                            isDragging 
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/30' 
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30'
                          }`}
                        >
                          <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={(e) => e.target.files && processImageFiles(e.target.files, false)} 
                            className="hidden" 
                          />
                          <Upload className="mx-auto text-slate-300 dark:text-slate-600 mb-3 group-hover:text-indigo-500 transition-colors" size={36} />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Arrastra y suelta imágenes aquí o <span className="text-indigo-600 dark:text-indigo-400 underline">haz clic para examinar</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Soporta JPG, PNG, WebP (múltiples archivos)</p>
                        </div>

                        {/* Previsualización de imágenes añadidas */}
                        {newProperty.images && newProperty.images.length > 0 && (
                          <div className="flex flex-wrap gap-3 pt-2">
                            {newProperty.images.map((img, idx) => (
                              <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm group">
                                <img src={img} alt="preview" className="w-full h-full object-cover" />
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); removeImage(idx, false); }}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow-md"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-bold shadow-xl shadow-indigo-100 dark:shadow-indigo-950/50 hover:bg-indigo-700 active:scale-[0.98] transition-all">Crear Registro de Propiedad</button>
                    </form>
                  </div>
                ) : selectedProperty && (
                  <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-6">
                    {/* Header Image */}
                    <div className="h-72 md:h-96 w-full relative rounded-3xl overflow-hidden shadow-lg mb-8">
                      <img src={selectedProperty.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-8 left-10 right-10 flex justify-between items-end">
                        <div className="max-w-[70%]">
                          <span className="px-3 py-1 bg-indigo-600 text-[10px] font-black text-white uppercase tracking-[0.2em] rounded-xl mb-3 inline-block shadow-lg">
                            {typeLabels[selectedProperty.type] || selectedProperty.type}
                          </span>
                          <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">{selectedProperty.name}</h3>
                          <div className="flex items-center gap-2 text-white/80 mt-2">
                            <MapPin size={16} />
                            <span className="text-sm font-medium">{selectedProperty.address}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-[11px] font-black uppercase tracking-[0.2em] mb-1">Valor Mensual</p>
                          <p className="text-4xl font-black text-white drop-shadow-sm">${selectedProperty.price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-10">
                      <div className="flex flex-wrap gap-5 mb-10">
                        {selectedProperty.specs?.sqft && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"><Maximize className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{selectedProperty.specs.sqft} m²</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Superficie</p></div>}
                        {selectedProperty.specs?.bedrooms !== undefined && selectedProperty.specs.bedrooms > 0 && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"><Bed className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{selectedProperty.specs.bedrooms} Hab.</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ambientes</p></div>}
                        {selectedProperty.specs?.bathrooms !== undefined && selectedProperty.specs.bathrooms > 0 && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"><Bath className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{selectedProperty.specs.bathrooms} Baños</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sanitarios</p></div>}
                        {selectedProperty.specs?.parking && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"><Car className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Cochera</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Estacionamiento</p></div>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                        <div className="md:col-span-2">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 border-l-2 border-indigo-600 pl-4">Descripción General</h4>
                          <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed font-medium">{selectedProperty.description || "Esta propiedad no cuenta con una descripción detallada en este momento."}</p>
                          
                          {/* Galería adicional si existe */}
                          {selectedProperty.images && selectedProperty.images.length > 1 && (
                            <div className="mt-8">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Galería ({selectedProperty.images.length} fotos)</h5>
                              <div className="grid grid-cols-3 gap-3">
                                {selectedProperty.images.map((img, idx) => (
                                  <img key={idx} src={img} alt="galería" className="w-full h-24 object-cover rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5">Estado de Unidad</h4>
                          <div className={`p-6 rounded-[2.5rem] border ${selectedProperty.isOccupied ? 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800'}`}>
                            <div className="flex items-center gap-4 mb-6">
                              <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-sm ${selectedProperty.isOccupied ? 'bg-slate-200 text-slate-500' : 'bg-emerald-200 text-emerald-600'}`}>
                                <Info size={24} />
                              </div>
                              <span className={`font-black text-base uppercase tracking-widest ${selectedProperty.isOccupied ? 'text-slate-500' : 'text-emerald-600'}`}>
                                {selectedProperty.isOccupied ? 'Ocupada' : 'Disponible'}
                              </span>
                            </div>
                            {selectedProperty.isOccupied && getOccupant(selectedProperty.id) && (
                              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Habitado por:</p>
                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black">
                                    {getOccupant(selectedProperty.id)?.name[0]}
                                  </div>
                                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{getOccupant(selectedProperty.id)?.name}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => setIsEditing(true)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-[1.8rem] font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:shadow-md active:scale-95">
                          <Edit2 size={20} /> Editar Información
                        </button>
                        <div className="relative flex-1">
                          <button onClick={handleDeleteConfirm} className={`w-full py-5 rounded-[1.8rem] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${deleteStep > 0 ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-100 shadow-transparent'}`}>
                            <Trash2 size={20} /> {deleteStep === 0 ? 'Dar de Baja' : deleteStep === 1 ? '¿Seguro?' : 'ELIMINAR YA'}
                          </button>
                          {deleteStep > 0 && (
                            <button onClick={() => setDeleteStep(0)} className="absolute -top-14 right-0 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">Cancelar</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Edit Form Overlay */}
                    <AnimatePresence>
                      {isEditing && (
                        <motion.div 
                          initial={{ x: "100%" }} 
                          animate={{ x: 0 }} 
                          exit={{ x: "100%" }} 
                          transition={{ type: "spring", damping: 25, stiffness: 200 }}
                          className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col overflow-hidden"
                        >
                          <div className="sticky top-0 z-20 px-6 md:px-10 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Edit2 size={20} />
                              </div>
                              <div>
                                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white tracking-tight">Modificar Propiedad</h3>
                                <p className="text-xs text-slate-400">{selectedProperty.name}</p>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setIsEditing(false)} 
                              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                            >
                              <X size={16}/>
                              <span>Cerrar</span>
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 md:p-10">
                            <div className="max-w-4xl mx-auto w-full">
                              <form onSubmit={handleUpdateSubmit} className="space-y-8 pb-10">
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Nombre</label>
                                <input value={selectedProperty.name} onChange={e => setSelectedProperty({...selectedProperty, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-sm text-slate-800 dark:text-slate-100 border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Ubicación</label>
                                <input value={selectedProperty.address} onChange={e => setSelectedProperty({...selectedProperty, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-sm text-slate-800 dark:text-slate-100 border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Tipo</label>
                                  <select value={selectedProperty.type} onChange={e => setSelectedProperty({...selectedProperty, type: e.target.value as PropertyType})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-sm text-slate-800 dark:text-slate-100 border-none outline-none appearance-none">
                                    {propertyTypes.map(t => (
                                      <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Canon ($ USD)</label>
                                  <input type="number" value={selectedProperty.price} onChange={e => setSelectedProperty({...selectedProperty, price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-sm text-slate-800 dark:text-slate-100 border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Descripción</label>
                                <textarea value={selectedProperty.description || ''} onChange={e => setSelectedProperty({...selectedProperty, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-sm text-slate-800 dark:text-slate-100 border-none outline-none focus:ring-4 focus:ring-indigo-500/5 h-28 resize-none transition-all" />
                              </div>

                              {/* Drag and Drop en edición */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Agregar / Modificar Fotos</label>
                                <div 
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, true)}
                                  onClick={() => editFileInputRef.current?.click()}
                                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  <input 
                                    ref={editFileInputRef} 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    onChange={(e) => e.target.files && processImageFiles(e.target.files, true)} 
                                    className="hidden" 
                                  />
                                  <Upload className="mx-auto text-slate-400 mb-2" size={28} />
                                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">Arrastra imágenes aquí o haz clic para subir</p>
                                </div>
                                {selectedProperty.images && selectedProperty.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {selectedProperty.images.map((img, idx) => (
                                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                                        <img src={img} alt="thumb" className="w-full h-full object-cover" />
                                        <button 
                                          type="button" 
                                          onClick={() => removeImage(idx, true)}
                                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow-md"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4 pt-6">
                              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold">Cancelar</button>
                              <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100">Guardar Cambios</button>
                            </div>
                          </form>
                            </div>
                          </div>
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
      </ModalPortal>
    </motion.div>
  );
};
