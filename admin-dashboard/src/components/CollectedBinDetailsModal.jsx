import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, MapPin, User, Clock, CheckCircle, 
  AlertTriangle, Camera, Map, Hash, Calendar, Archive 
} from 'lucide-react';

const CollectedBinDetailsModal = ({ isOpen, onClose, bin, onArchive }) => {
  // Prevent scrolling on the background when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !bin) return null;

  const dateObj = bin.timestamp ? new Date(bin.timestamp) : null;
  const formattedDate = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
  const formattedTime = dateObj ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Unknown Time';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 sm:p-6">
      
      {/* Modal Container */}
      <div className="bg-white w-full max-w-6xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* =========================================
            LEFT SIDE: PHOTO EVIDENCE (1536x2048 & Landscape)
            ========================================= */}
        <div className="w-full md:w-1/2 relative bg-slate-900 shrink-0 flex items-center justify-center overflow-hidden">
          {bin.photoUrl ? (
            <>
              {/* Blurred Background for Aspect Ratio Gaps */}
              <img 
                src={bin.photoUrl} 
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110" 
                alt=""
              />
              {/* Main Image - Preserves original resolution without cropping */}
              <img 
                src={bin.photoUrl} 
                alt={`Evidence for ${bin.binId}`} 
                className="relative z-10 w-full h-full object-contain p-2"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <Camera size={64} className="mb-4 opacity-20" />
              <p className="font-black text-xs tracking-widest uppercase opacity-40">No photo provided</p>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-8 left-8 z-20">
            <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl border ${
              bin.status === 'Collected' ? 'bg-emerald-500/90 text-white border-emerald-400' : 
              'bg-rose-500/90 text-white border-rose-400 animate-pulse'
            }`}>
              {bin.status === 'Collected' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {bin.status}
            </span>
          </div>
        </div>

        {/* =========================================
            RIGHT SIDE: DETAILS
            ========================================= */}
        <div className="w-full md:w-1/2 p-10 sm:p-14 overflow-y-auto bg-white flex flex-col relative">
          
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 z-20 p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-full transition-all border border-slate-100"
          >
            <X size={20} strokeWidth={3} />
          </button>

          <div className="mb-10 border-b border-slate-100 pb-8 mt-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl uppercase tracking-[0.1em] border border-emerald-100">
                {bin.binId}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.1em]">
                Reference #{bin.id.split('-')[1]}
              </span>
            </div>
            <h2 className="text-4xl font-black text-slate-800 leading-[1.1] tracking-tight">
              {bin.binName || 'General Collection Point'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10 mb-10 flex-1">
            <DataField icon={<Map size={20} className="text-indigo-500"/>} label="Assigned Zone" value={bin.zone} />
            <DataField icon={<User size={20} className="text-blue-500"/>} label="Verified Collector" value={bin.collectorName} />
            <DataField icon={<Calendar size={20} className="text-slate-400"/>} label="Collection Date" value={formattedDate} />
            <DataField icon={<Clock size={20} className="text-amber-500"/>} label="Log Timestamp" value={formattedTime} />
          </div>

          <div className="pt-8 border-t border-slate-100 mt-auto">
            <div className="flex gap-5 items-start bg-slate-50/80 p-6 rounded-[28px] border border-slate-100">
               <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-500 shrink-0">
                 <MapPin size={24}/>
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Collection Address</p>
                 <p className="text-base text-slate-700 font-bold leading-relaxed">
                   {bin.binAddress || 'Street address not recorded.'}
                 </p>
               </div>
            </div>
          </div>

          {/* BUTTON ACTIONS */}
          <div className="mt-10 flex items-center justify-end gap-4">
            <button 
              onClick={() => onArchive(bin.id)}
              className="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              <Archive size={16} strokeWidth={2.5} /> Archive Record
            </button>

            <button 
              onClick={onClose}
              className="flex items-center gap-3 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <X size={16} strokeWidth={3} /> Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

const DataField = ({ icon, label, value }) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-base font-bold text-slate-700 leading-tight">{value || 'N/A'}</p>
  </div>
);

export default CollectedBinDetailsModal;