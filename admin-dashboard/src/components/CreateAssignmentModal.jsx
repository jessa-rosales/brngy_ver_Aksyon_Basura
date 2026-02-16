import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Truck, Users, MapPin, Calendar, Clock, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck, Save, Edit3, } from 'lucide-react';

// ✅ CUSTOM DROPDOWN (SNAPPY & FORMATTED)
const CustomDropdown = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  placeholder,
  isUserType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(
    (opt) => String(isUserType ? opt.user_id : opt.vehicle_id || opt.zone_id) === String(value)
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]" >
        <Icon size={14} /> {label}
      </label>
      
      <motion.div 
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between
          ${isOpen ? 'border-emerald-500 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:border-emerald-400'}`}>
        <div 
          className="flex flex-col items-start overflow-hidden pr-2"
        >
          {selectedOption ? (
            <>
              <span 
                className="text-sm font-bold text-slate-700 truncate w-full"
              >
                {isUserType 
                  ? `${selectedOption.first_name} ${selectedOption.last_name}` 
                  : (selectedOption.vehicle_name || selectedOption.zone_name)}
              </span>
              {isUserType && (
                <span 
                  className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter"
                >
                  ID: #{selectedOption.user_id}
                </span>
              )}
            </>
          ) : (
            <span 
              className="text-sm font-bold text-slate-400"
            >
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          size={18} 
        />
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 5 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[7000] w-full mt-1 bg-white border border-slate-100 rounded-[24px] shadow-xl overflow-hidden p-2"
          >
            <div 
              className="max-h-[220px] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-0.5"
            >
              <div 
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                None / Unassigned
              </div>
              {options.map((opt) => {
                const optId = isUserType ? opt.user_id : (opt.vehicle_id || opt.zone_id);
                const isSelected = String(value) === String(optId);
                return (
                  <div 
                    key={optId} 
                    onClick={() => { onChange(optId); setIsOpen(false); }} 
                    className={`px-4 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors duration-100
                      ${isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'}`}
                  >
                    <div 
                      className="flex flex-col min-w-0 pr-4"
                    >
                      <span 
                        className="text-sm font-bold truncate"
                      >
                        {isUserType ? `${opt.first_name} ${opt.last_name}` : (opt.vehicle_name || opt.zone_name)}
                      </span>
                      {isUserType && (
                        <span 
                          className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`}
                        >
                          ID: #{opt.user_id}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 
                        size={14} 
                        className="flex-shrink-0" 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CreateAssignmentModal = ({ 
  isOpen, 
  onClose, 
  onCreate, 
  dataOptions, 
  editingData 
}) => {
  const [formData, setFormData] = useState({
    driver_id: '',
    collector_ids: [],
    vehicle_id: '',
    zone_id: '',
    work_days: [],
    start_time: '',
    end_time: '',
    start_date: '',
    end_date: '',
  });

  // ✅ CREW PAGINATION STATE
  const [crewPage, setCrewPage] = useState(0);
  const crewPerPage = 6; // 2 rows * 3 columns
  const totalCrewPages = Math.ceil((dataOptions?.collectors?.length || 0) / crewPerPage);

  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const modalVars = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: { 
      opacity: 1, scale: 1, y: 0,
      transition: { 
        type: "spring", damping: 25, stiffness: 300, 
        staggerChildren: 0.05, delayChildren: 0.05 
      }
    },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.15 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
  };

  useEffect(() => {
    if (editingData && isOpen) {
      setFormData({
        ...editingData,
        collector_ids: Array.isArray(editingData.collector_ids) ? editingData.collector_ids : [],
        work_days: Array.isArray(editingData.work_days) ? editingData.work_days : []
      });
    } else if (isOpen) {
      setFormData({ driver_id: '', collector_ids: [], vehicle_id: '', zone_id: '', work_days: [], start_time: '', end_time: '', start_date: '', end_date: '' });
      setCrewPage(0); // Reset page on open
    }
  }, [editingData, isOpen]);

  const toggleDay = (day) => {
    setFormData(prev => ({ 
      ...prev, 
      work_days: prev.work_days.includes(day) ? prev.work_days.filter(d => d !== day) : [...prev.work_days, day] 
    }));
  };

  const handleCollectorToggle = (id) => {
    if (formData.collector_ids.length >= 3 && !formData.collector_ids.includes(id)) return;
    setFormData(prev => ({ 
      ...prev, 
      collector_ids: prev.collector_ids.includes(id) ? prev.collector_ids.filter(cid => cid !== id) : [...prev.collector_ids, id] 
    }));
  };

  const labelStyle = "flex items-center gap-2 text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]";
  const inputStyle = "w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all duration-150 text-sm font-bold text-slate-700 appearance-none";

  // PAGINATION LOGIC
  const currentCrew = dataOptions?.collectors?.slice(crewPage * crewPerPage, (crewPage + 1) * crewPerPage) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[6000] flex items-center justify-center p-4 overflow-hidden"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]" 
          />
          
          <motion.div 
            variants={modalVars} 
            initial="hidden" 
            animate="visible" 
            exit="hidden" 
            className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* HEADER */}
            <div 
              className={`px-10 py-8 border-b border-slate-50 flex justify-between items-center ${editingData ? 'bg-slate-800' : 'bg-green-600'} text-white shrink-0`}
            >
              <div 
                className="flex items-center gap-5"
              >
                <motion.div 
                  initial={{ rotate: -15, scale: 0.5 }} 
                  animate={{ rotate: 0, scale: 1 }} 
                  className="w-12 h-12 bg-white/20 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg"
                >
                  {editingData ? <Edit3 size={24} /> : <ShieldCheck size={24} />}
                </motion.div>
                <div>
                  <h3 
                    className="font-black text-xl tracking-tight"
                  >
                    {editingData ? 'Update Team' : 'Create Team'}
                  </h3>
                  <p 
                    className="text-white/70 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Resource Allocation Protocol
                  </p>
                </div>
              </div>
              <motion.button 
                whileHover={{ rotate: 90, scale: 1.1 }} 
                whileTap={{ scale: 0.9 }} 
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={24} />
              </motion.button>
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); onCreate(formData); }} 
              className="p-10 overflow-y-auto custom-scrollbar space-y-8"
              ref={dropdownRef}
            >
              {/* Row 1: Fleet & Driver Dropdowns */}
              <motion.div 
                variants={itemVars} 
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <CustomDropdown 
                  label="Fleet Asset" 
                  icon={Truck} 
                  options={dataOptions?.vehicles || []} 
                  value={formData.vehicle_id} 
                  onChange={(v) => setFormData({...formData, vehicle_id: v})} 
                  placeholder="Assign a vehicle" 
                  isUserType={false} 
                />
                <CustomDropdown 
                  label="Lead Driver" 
                  icon={User} 
                  options={dataOptions?.drivers || []} 
                  value={formData.driver_id} 
                  onChange={(v) => setFormData({...formData, driver_id: v})} 
                  placeholder="Assign lead driver" 
                  isUserType={true} 
                />
              </motion.div>

              {/* ✅ UPDATED CREW SELECTION WITH PAGINATION */}
              <motion.div 
                variants={itemVars}
              >
                <div 
                  className="flex justify-between items-center mb-4"
                >
                  <label 
                    className={labelStyle}
                  >
                    <Users size={14} /> Crew Selection (Max 3)
                  </label>
                  <div 
                    className="flex items-center gap-3"
                  >
                    {/* Pagination Controls */}
                    <div 
                      className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200"
                    >
                      <button 
                        type="button"
                        disabled={crewPage === 0}
                        onClick={() => setCrewPage(prev => prev - 1)}
                        className="p-1 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span 
                        className="text-[9px] font-black px-2 text-slate-500 uppercase"
                      >
                        Page {crewPage + 1} of {totalCrewPages || 1}
                      </span>
                      <button 
                        type="button"
                        disabled={crewPage >= totalCrewPages - 1}
                        onClick={() => setCrewPage(prev => prev + 1)}
                        className="p-1 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    <span 
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${formData.collector_ids.length === 3 ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {formData.collector_ids.length} / 3 Selected
                    </span>
                  </div>
                </div>
                
                {/* Crew Grid */}
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                >
                  <AnimatePresence mode="wait">
                    {currentCrew.map((c) => {
                      const isSelected = formData.collector_ids.includes(c.user_id);
                      return (
                        <motion.div 
                          key={c.user_id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.1 }}
                          whileHover={{ y: -2, transition: { duration: 0.1 } }} 
                          whileTap={{ scale: 0.98 }} 
                          onClick={() => handleCollectorToggle(c.user_id)} 
                          className={`p-4 rounded-[24px] border transition-all duration-150 cursor-pointer relative ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'bg-white border-slate-100 hover:border-emerald-300'}`}
                        >
                          <div 
                            className="flex items-center gap-3 overflow-hidden"
                          >
                            <div 
                              className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                              {c.first_name?.charAt(0)}
                            </div>
                            <div 
                              className="truncate min-w-0"
                            >
                              <p 
                                className="text-sm font-bold text-slate-700 truncate"
                              >
                                {c.first_name} {c.last_name}
                              </p>
                              <p 
                                className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`}
                              >
                                ID: #{c.user_id}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <motion.div 
                              layoutId="check-icon" 
                              className="absolute top-2 right-2 text-emerald-600"
                            >
                              <CheckCircle2 size={14} />
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Row 3: Zone & Days */}
              <motion.div 
                variants={itemVars} 
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                <CustomDropdown 
                  label="Service Zone" 
                  icon={MapPin} 
                  options={dataOptions?.zones || []} 
                  value={formData.zone_id} 
                  onChange={(v) => setFormData({...formData, zone_id: v})} 
                  placeholder="Select area" 
                  isUserType={false} 
                />
                <div>
                  <label 
                    className={labelStyle}
                  >
                    <Calendar size={14} /> Operation Days
                  </label>
                  <div 
                    className="flex flex-wrap gap-2"
                  >
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <motion.button 
                        key={day} 
                        type="button" 
                        whileHover={{ scale: 1.05, transition: { duration: 0.1 } }} 
                        whileTap={{ scale: 0.95 }} 
                        onClick={() => toggleDay(day)} 
                        className={`flex-1 min-w-[45px] py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all duration-150 ${formData.work_days.includes(day) ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      >
                        {day.substring(0, 1)}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Row 4: Timeline Sections (OLD DESIGN RESTORED) */}
              <motion.div 
                variants={itemVars} 
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div 
                  className="space-y-6 bg-slate-50/50 p-6 rounded-[30px] border border-slate-100 group focus-within:bg-white focus-within:border-emerald-200 transition-all duration-200"
                >
                  <p 
                    className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4"
                  >
                    Commencement
                  </p>
                  <div>
                    <label 
                      className={labelStyle}
                    >
                      <Clock size={12} /> Start Time
                    </label>
                    <input 
                      type="time" 
                      className={inputStyle} 
                      value={formData.start_time} 
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label 
                      className={labelStyle}
                    >
                      <Calendar size={12} /> Start Date
                    </label>
                    <input 
                      type="date" 
                      className={inputStyle} 
                      value={formData.start_date} 
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})} 
                    />
                  </div>
                </div>

                <div 
                  className="space-y-6 bg-slate-50/50 p-6 rounded-[30px] border border-slate-100 group focus-within:bg-white focus-within:border-rose-200 transition-all duration-200"
                >
                  <p 
                    className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4"
                  >
                    Termination
                  </p>
                  <div>
                    <label 
                      className={labelStyle}
                    >
                      <Clock size={12} /> End Time
                    </label>
                    <input 
                      type="time" 
                      className={inputStyle} 
                      value={formData.end_time} 
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label 
                      className={labelStyle}
                    >
                      <Calendar size={12} /> End Date
                    </label>
                    <input 
                      type="date" 
                      className={inputStyle} 
                      value={formData.end_date} 
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
                    />
                  </div>
                </div>
              </motion.div>

              {/* Form Actions */}
              <motion.div 
                variants={itemVars} 
                className="flex gap-4 pt-6"
              >
                <motion.button 
                  type="button" 
                  whileHover={{ scale: 1.02 }} 
                  onClick={onClose} 
                  className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-3xl hover:bg-rose-50 hover:text-rose-500 transition-all duration-150"
                >
                  Discard
                </motion.button>
                <motion.button 
                  type="submit" 
                  whileHover={{ scale: 1.02, y: -2, boxShadow: '0 20px 25px -5px rgb(16 185 129 / 0.2)' }} 
                  whileTap={{ scale: 0.98 }} 
                  className={`flex-[2] py-4 ${editingData ? 'bg-slate-800' : 'bg-emerald-600'} text-white font-black rounded-3xl shadow-xl hover:opacity-90 transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3`}
                >
                  {editingData ? <Save size={18} /> : <CheckCircle2 size={18} />}
                  {editingData ? 'Save Changes' : 'Create Team'}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateAssignmentModal;