import React from 'react';
import { X, ClipboardList, Calendar, Clock, Users, Trash2, CheckCircle2 } from 'lucide-react';

const DutyLogModal = ({ isOpen, onClose, vehicleTitle, scheduleRef, logHistory, movementState }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className="p-8 bg-[#1B5E20] text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <ClipboardList className="text-emerald-300" size={28} />
              <h3 className="text-2xl font-black tracking-tight">Duty Performance History</h3>
            </div>
            <p className="text-emerald-100/80 font-medium">
              Logs for vehicle: <span className="text-white font-bold">{vehicleTitle}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="relative z-10 p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-95"
          >
            <X size={28} />
          </button>
        </div>

        {/* Modal Body (Logs List) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="space-y-6">
            {logHistory && logHistory.length > 0 ? (
              logHistory.map((log, index) => (
                <div key={index} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Date & Actual Times (24hr + AM/PM) */}
                    <div className="space-y-3 min-w-[220px]">
                      <div className="flex items-center gap-3 text-[#1B5E20]">
                        <Calendar size={20} className="bg-emerald-50 p-1 rounded-lg" />
                        <span className="font-black text-lg">{log.date}</span>
                      </div>
                      <div className="space-y-1.5 pl-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <Clock size={14} className="text-blue-400" /> Duty Duration (24h)
                        </div>
                        {/* Displays 14:30 PM style */}
                        <p className="text-sm font-black text-slate-700">{log.start} — {log.end}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">
                            SCHED: {scheduleRef}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Personnel Section (Driver + Team) */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Users size={14} className="text-indigo-400" /> Personnel Deployment
                      </div>
                      
                      {/* Driver Display */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-black uppercase">Driver</span>
                        <span className="text-sm font-bold text-slate-700">{log.driverName || 'N/A'}</span>
                      </div>

                      {/* Collectors Display */}
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 mt-1">Collectors:</span>
                        {log.collectors?.map((name, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 group-hover:bg-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-700 transition-colors">
                            {name}
                          </span>
                        ))}
                        {(!log.collectors || log.collectors.length === 0) && (
                          <span className="text-xs text-slate-400 italic">No collectors logged</span>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="flex gap-3">
                       <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center min-w-[100px]">
                         <p className="text-[10px] text-emerald-600 font-black uppercase mb-1">Bins</p>
                         <div className="flex items-center gap-1.5">
                            <Trash2 size={14} className="text-emerald-500" />
                            <p className="text-lg font-black text-emerald-900 leading-none">{log.bins}</p>
                         </div>
                       </div>
                       <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 flex flex-col items-center justify-center min-w-[100px]">
                         <p className="text-[10px] text-blue-600 font-black uppercase mb-1">Reports</p>
                         <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-blue-500" />
                            <p className="text-lg font-black text-blue-900 leading-none">{log.reports}</p>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="bg-slate-100 p-6 rounded-full mb-4">
                  <ClipboardList size={48} className="opacity-20" />
                </div>
                <p className="text-lg font-bold">No Records Found</p>
                <p className="text-sm">There are no historical duty logs available for this vehicle yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-white border-t border-slate-200 flex justify-between items-center">
          <div className="text-xs text-slate-400 font-medium italic">
            * Performance data calculated per task assignment ID
          </div>
          <div className="flex items-center gap-4">
             {movementState && (
                <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
                    <div className={`w-2 h-2 rounded-full ${movementState === 'Running' ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Status: {movementState}</span>
                </div>
             )}
            <button 
              onClick={onClose} 
              className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-200 hover:bg-black hover:shadow-xl transition-all active:scale-95"
            >
              Close History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DutyLogModal;