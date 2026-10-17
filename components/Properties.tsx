
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  User as UserIcon
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Property, Tenant } from '../types';

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

  const [newProperty, setNewProperty] = useState<Omit<Property, 'id' | 'isOccupied'>>({
    name: '',
    address: '',
    type: 'Apartment',
    price: 0,
    description: '',
    images: [],
    specs: { sqft: 0, bedrooms: 0, bathrooms: 0, parking: false }
  });

  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOccupant = (propertyId: string) => tenants.find(t => t.propertyId === propertyId);

  const resetModals = () => {
    setSelectedProperty(null);
    setIsEditing(false);
    setShowAddModal(false);
    setDeleteStep(0);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProperty(newProperty);
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
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Propiedades</h2>
          <p className="text-sm text-slate-500">Gestión de unidades y disponibilidad.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Buscar dirección o nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-full text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-2xl font-bold text-white text-sm shadow-lg shadow-indigo-100 whitespace-nowrap active:scale-95 transition-transform hover:bg-indigo-700">
            <Plus size={20} />
            <span>Nueva Propiedad</span>
          </button>
        </div>
      </header>

      {/* Grid sin scroll interno para evitar el efecto de recorte */}
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
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-md shadow-lg border border-white/20 ${p.isOccupied ? 'bg-slate-900/40 text-white' : 'bg-emerald-500/80 text-white'}`}>
                    {p.isOccupied ? 'Ocupada' : 'Disponible'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-800 truncate pr-2 tracking-tight text-lg">{p.name}</h4>
                  <span className="text-indigo-600 font-black text-lg tracking-tight">${p.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 mb-5">
                  <MapPin size={14} />
                  <span className="text-xs font-medium truncate">{p.address}</span>
                </div>
                
                {p.isOccupied && occupant && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-[1.5rem] mb-5 border border-slate-100 shadow-inner">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <UserIcon size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Inquilino</p>
                      <span className="text-xs font-bold text-slate-700 truncate block">{occupant.name}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <div className="flex gap-4 text-slate-400">
                    {p.specs?.bedrooms !== undefined && <div className="flex items-center gap-1.5"><Bed size={16}/><span className="text-xs font-bold">{p.specs.bedrooms}</span></div>}
                    {p.specs?.bathrooms !== undefined && <div className="flex items-center gap-1.5"><Bath size={16}/><span className="text-xs font-bold">{p.specs.bathrooms}</span></div>}
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">Ver Más</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <AnimatePresence>
        {(selectedProperty || showAddModal) && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetModals} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }} 
              className="w-full max-w-3xl bg-white rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden h-[90vh] md:h-[85vh]"
            >
              <div className="h-full overflow-y-auto scrollbar-hide">
                <button onClick={resetModals} className="absolute right-6 top-6 p-2 rounded-full bg-slate-100 text-slate-400 z-30 hover:bg-slate-200 transition-colors"><X size={20} /></button>

                {showAddModal ? (
                  <div className="p-8 pt-12">
                    <h3 className="text-2xl font-bold text-slate-800 mb-8 tracking-tight">Nueva Propiedad</h3>
                    <form onSubmit={handleAddSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required placeholder="Nombre descriptivo de la unidad" value={newProperty.name} onChange={e => setNewProperty({...newProperty, name: e.target.value})} className="col-span-1 md:col-span-2 w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                        <input required placeholder="Ubicación / Dirección exacta" value={newProperty.address} onChange={e => setNewProperty({...newProperty, address: e.target.value})} className="col-span-1 md:col-span-2 w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                        <select required value={newProperty.type} onChange={e => setNewProperty({...newProperty, type: e.target.value as any})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm appearance-none focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all">
                          <option value="Apartment">Departamento</option>
                          <option value="House">Casa</option>
                          <option value="Office">Oficina</option>
                        </select>
                        <input required type="number" placeholder="Canon Mensual ($)" value={newProperty.price || ''} onChange={e => setNewProperty({...newProperty, price: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                        <textarea placeholder="Características destacadas, servicios incluidos..." value={newProperty.description} onChange={e => setNewProperty({...newProperty, description: e.target.value})} className="col-span-1 md:col-span-2 w-full bg-slate-50 border-none rounded-2xl p-4 text-sm h-32 resize-none focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Superficie m²</label>
                          <input type="number" placeholder="m²" value={newProperty.specs?.sqft || ''} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, sqft: Number(e.target.value)}})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Ambientes</label>
                          <input type="number" placeholder="Hab." value={newProperty.specs?.bedrooms || ''} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, bedrooms: Number(e.target.value)}})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Baños</label>
                          <input type="number" placeholder="Baños" value={newProperty.specs?.bathrooms || ''} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, bathrooms: Number(e.target.value)}})} className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs outline-none" />
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl self-end mt-1">
                          <input type="checkbox" checked={newProperty.specs?.parking} onChange={e => setNewProperty({...newProperty, specs: {...newProperty.specs, parking: e.target.checked}})} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cochera</span>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-slate-100 rounded-[2rem] p-10 text-center bg-slate-50/50 hover:bg-indigo-50 transition-all cursor-pointer group">
                        <Upload className="mx-auto text-slate-300 mb-4 group-hover:text-indigo-400 transition-colors" size={40} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-indigo-500">Cargar Galería de Imágenes</p>
                      </div>

                      <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all">Crear Registro de Propiedad</button>
                    </form>
                  </div>
                ) : selectedProperty && (
                  <div className="relative">
                    {/* Header Image */}
                    <div className="h-72 md:h-96 w-full relative">
                      <img src={selectedProperty.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-8 left-10 right-10 flex justify-between items-end">
                        <div className="max-w-[70%]">
                          <span className="px-3 py-1 bg-indigo-600 text-[10px] font-black text-white uppercase tracking-[0.2em] rounded-xl mb-3 inline-block shadow-lg">
                            {selectedProperty.type === 'Apartment' ? 'Departamento' : selectedProperty.type === 'House' ? 'Casa' : 'Oficina'}
                          </span>
                          <h3 className="text-4xl font-black text-white leading-tight tracking-tight drop-shadow-sm">{selectedProperty.name}</h3>
                          <div className="flex items-center gap-2 text-white/80 mt-3">
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

                    {/* Content Area con scroll interno solo para el modal */}
                    <div className="p-10">
                      <div className="flex flex-wrap gap-5 mb-10">
                        {selectedProperty.specs?.sqft && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col items-center group hover:bg-white hover:shadow-md transition-all"><Maximize className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 tracking-tight">{selectedProperty.specs.sqft} m²</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Superficie</p></div>}
                        {selectedProperty.specs?.bedrooms !== undefined && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col items-center group hover:bg-white hover:shadow-md transition-all"><Bed className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 tracking-tight">{selectedProperty.specs.bedrooms} Hab.</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ambientes</p></div>}
                        {selectedProperty.specs?.bathrooms !== undefined && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col items-center group hover:bg-white hover:shadow-md transition-all"><Bath className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 tracking-tight">{selectedProperty.specs.bathrooms} Baños</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sanitarios</p></div>}
                        {selectedProperty.specs?.parking && <div className="flex-1 min-w-[120px] p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col items-center group hover:bg-white hover:shadow-md transition-all"><Car className="text-indigo-600 mb-3" size={24}/><span className="text-sm font-black text-slate-800 tracking-tight">Cochera</span><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Servicio</p></div>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                        <div className="md:col-span-2">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 border-l-2 border-indigo-600 pl-4">Descripción General</h4>
                          <p className="text-slate-600 text-base leading-relaxed font-medium">{selectedProperty.description || "Esta propiedad no cuenta con una descripción detallada en este momento."}</p>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5">Estado de Unidad</h4>
                          <div className={`p-6 rounded-[2.5rem] border ${selectedProperty.isOccupied ? 'bg-slate-50/50 border-slate-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                            <div className="flex items-center gap-4 mb-6">
                              <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-sm ${selectedProperty.isOccupied ? 'bg-slate-200 text-slate-500' : 'bg-emerald-200 text-emerald-600'}`}>
                                <Info size={24} />
                              </div>
                              <span className={`font-black text-base uppercase tracking-widest ${selectedProperty.isOccupied ? 'text-slate-500' : 'text-emerald-600'}`}>
                                {selectedProperty.isOccupied ? 'Ocupada' : 'Disponible'}
                              </span>
                            </div>
                            {selectedProperty.isOccupied && getOccupant(selectedProperty.id) && (
                              <div className="pt-6 border-t border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Habitado por:</p>
                                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black">
                                    {getOccupant(selectedProperty.id)?.name[0]}
                                  </div>
                                  <span className="text-sm font-bold text-slate-800">{getOccupant(selectedProperty.id)?.name}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-4 pt-8 border-t border-slate-100">
                        <button onClick={() => setIsEditing(true)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[1.8rem] font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all hover:shadow-md active:scale-95">
                          <Edit2 size={20} /> Editar Información
                        </button>
                        <div className="relative flex-1">
                          <button onClick={handleDeleteConfirm} className={`w-full py-5 rounded-[1.8rem] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${deleteStep > 0 ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-transparent'}`}>
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
                          className="absolute inset-0 bg-white z-40 p-10 flex flex-col"
                        >
                          <button onClick={() => setIsEditing(false)} className="self-start mb-10 p-3 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"><X size={24}/></button>
                          <h3 className="text-2xl font-bold text-slate-800 mb-10 tracking-tight">Modificar Propiedad</h3>
                          <form onSubmit={handleUpdateSubmit} className="space-y-8 flex-1 overflow-y-auto pr-2 scrollbar-hide pb-10">
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Nombre</label>
                                <input value={selectedProperty.name} onChange={e => setSelectedProperty({...selectedProperty, name: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-5 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Ubicación</label>
                                <input value={selectedProperty.address} onChange={e => setSelectedProperty({...selectedProperty, address: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-5 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Tipo</label>
                                  <select value={selectedProperty.type} onChange={e => setSelectedProperty({...selectedProperty, type: e.target.value as any})} className="w-full bg-slate-50 rounded-2xl p-5 text-sm border-none outline-none appearance-none">
                                    <option value="Apartment">Departamento</option>
                                    <option value="House">Casa</option>
                                    <option value="Office">Oficina</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Precio ($)</label>
                                  <input type="number" value={selectedProperty.price} onChange={e => setSelectedProperty({...selectedProperty, price: Number(e.target.value)})} className="w-full bg-slate-50 rounded-2xl p-5 text-sm border-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Descripción Detallada</label>
                                <textarea value={selectedProperty.description} onChange={e => setSelectedProperty({...selectedProperty, description: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-5 text-sm border-none h-40 resize-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <input type="number" placeholder="m²" value={selectedProperty.specs?.sqft} onChange={e => setSelectedProperty({...selectedProperty, specs: {...selectedProperty.specs, sqft: Number(e.target.value)}})} className="bg-slate-50 rounded-2xl p-4 text-sm" />
                                <input type="number" placeholder="Hab." value={selectedProperty.specs?.bedrooms} onChange={e => setSelectedProperty({...selectedProperty, specs: {...selectedProperty.specs, bedrooms: Number(e.target.value)}})} className="bg-slate-50 rounded-2xl p-4 text-sm" />
                                <input type="number" placeholder="Baños" value={selectedProperty.specs?.bathrooms} onChange={e => setSelectedProperty({...selectedProperty, specs: {...selectedProperty.specs, bathrooms: Number(e.target.value)}})} className="bg-slate-50 rounded-2xl p-4 text-sm" />
                              </div>
                            </div>
                            <button type="submit" className="w-full py-5 mt-10 bg-indigo-600 text-white rounded-[1.8rem] font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all">Actualizar Información de Propiedad</button>
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
