import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Truck, 
  Hash, 
  CheckCircle2, 
  ShieldPlus, 
  Activity, 
  Edit3, 
  Save, 
  ChevronDown, 
  Wrench, 
  Ban 
} from 'lucide-react';

const RegisterTruckModal = ({ isOpen, onClose, onCreate, editingData }) => {
  const [formData, setFormData] = useState({
    vehicle_name: '',
    plate_number: '',
    status: 'Active'
  });

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { label: 'Active', value: 'Active', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Maintenance', value: 'Maintenance', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Inactive', value: 'Inactive', icon: Ban, color: 'text-rose-500', bg: 'bg-rose-50' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingData && isOpen) {
      setFormData({
        vehicle_name: editingData.vehicle_name || '',
        plate_number: editingData.plate_number || '',
        status: editingData.status || 'Active'
      });
    } else if (isOpen) {
      setFormData({ vehicle_name: '', plate_number: '', status: 'Active' });
    }
  }, [editingData, isOpen]);

  const labelStyle = "flex items-center gap-2 text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]";
  const inputStyle = "w-full px-6 py-4 rounded-[22px] border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all duration-150 text-sm font-bold text-slate-700";

  const modalVars = {
    hidden: { opacity: 0, scale: 0.98, y: 15 },
    visible: { 
      opacity: 1, scale: 1, y: 0,
      transition: { type: "spring", damping: 25, stiffness: 350, staggerChildren: 0.05 }
    },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.15 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]" />
          
          <motion.div 
            variants={modalVars}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative flex flex-col overflow-hidden">
            
            {/* HEADER */}
            <div 
              className={`px-10 py-8 border-b border-slate-50 flex justify-between items-center ${editingData ? 'bg-indigo-900' : 'bg-slate-900'} text-white shrink-0`}>
              <div className="flex items-center gap-5">
                <motion.div 
                  initial={{ rotate: -15, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                  {editingData ? <Edit3 size={24} /> : <ShieldPlus size={24} />}
                </motion.div>
                <div>
                  <h3 className="font-black text-xl tracking-tight">{editingData ? 'Update Vehicle' : 'Register Vehicle'}</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Vehicle Management</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={26} />
              </motion.button>
            </div>

            <form 
              className="p-10 space-y-10" 
              onSubmit={(e) => { e.preventDefault(); onCreate(formData); }}>
              <div className="space-y-8">
                
                {/* VEHICLE NAME */}
                <motion.div variants={itemVars}>
                  <label className={labelStyle}><Truck size={14} /> Vehicle Identifier</label>
                  <input 
                    type="text" 
                    className={inputStyle} 
                    placeholder="e.g. Compactor Truck 01" 
                    value={formData.vehicle_name} 
                    onChange={(e) => setFormData({...formData, vehicle_name: e.target.value})} 
                    required />
                </motion.div>

                {/* PLATE NUMBER */}
                <motion.div variants={itemVars}>
                  <label className={labelStyle}><Hash size={14} /> Plate Number</label>
                  <input 
                    type="text" 
                    className={inputStyle} 
                    placeholder="ABC-1234" 
                    value={formData.plate_number} 
                    onChange={(e) => setFormData({...formData, plate_number: e.target.value})} 
                    required />
                </motion.div>

                {/* ✅ CUSTOM DROPDOWN (OPENS UPWARD TO AVOID OVERFLOW) */}
                <motion.div 
                  variants={itemVars} 
                  className="relative" 
                  ref={dropdownRef}>
                  <label className={labelStyle}><Activity size={14} /> Operational Status</label>
                  <div 
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className={`w-full px-6 py-4 rounded-[22px] border transition-all cursor-pointer flex items-center justify-between ${statusDropdownOpen ? 'border-emerald-500 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:border-emerald-400'}`}>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const current = statusOptions.find(o => o.value === formData.status);
                        const IconComp = current?.icon || Activity;
                        return (
                          <>
                            <IconComp size={18} className={current?.color || 'text-slate-400'} />
                            <span className="text-sm font-bold text-slate-700">{current?.label || 'Select Status'}</span>
                          </>
                        );
                      })()}
                    </div>
                    <ChevronDown className={`text-slate-400 transition-transform duration-300 ${statusDropdownOpen ? 'rotate-180' : ''}`} size={20} />
                  </div>

                  <AnimatePresence>
                    {statusDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: -5 }} // ✅ Moves UP
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute bottom-full z-[8000] w-full mb-2 bg-white border border-slate-100 rounded-[28px] shadow-2xl overflow-hidden p-2">
                        <div className="max-h-[220px] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-1">
                          {statusOptions.map((opt) => {
                            const isSelected = formData.status === opt.value;
                            return (
                              <div 
                                key={opt.value}
                                onClick={() => { setFormData({...formData, status: opt.value}); setStatusDropdownOpen(false); }}
                                className={`px-5 py-4 rounded-xl flex items-center justify-between cursor-pointer transition-colors duration-100 mb-1 ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg ${opt.bg} flex items-center justify-center`}><opt.icon size={16} className={opt.color} /></div>
                                  <span className={`text-sm font-bold ${isSelected ? 'text-slate-800' : ''}`}>{opt.label}</span>
                                </div>
                                {isSelected && <CheckCircle2 size={16} className="text-emerald-500" />}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* ACTIONS */}
              <motion.div 
                variants={itemVars} 
                className="flex gap-4 pt-6 border-t border-slate-50">
                <motion.button 
                  type="button" 
                  whileHover={{ backgroundColor: "#fee2e2", color: "#ef4444" }}
                  onClick={onClose} 
                  className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-3xl transition-all duration-150">
                  Discard
                </motion.button>
                <motion.button 
                  type="submit" 
                  whileHover={{ scale: 1.02, y: -1, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-[2] py-4 ${editingData ? 'bg-indigo-600' : 'bg-slate-900'} text-white font-black rounded-3xl shadow-xl hover:opacity-90 transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3`}>
                  {editingData ? <Save size={18} /> : <CheckCircle2 size={18} />}
                  {editingData ? 'Update Changes' : 'Register Vehicle'}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RegisterTruckModal;