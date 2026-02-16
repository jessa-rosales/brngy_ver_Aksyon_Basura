import React from 'react';
import { 
  X, MapPin, Clock, Phone, User, 
  CheckCircle, AlertTriangle, ShieldCheck, Users
} from 'lucide-react';

const ReportDetailsModal = ({ isOpen, onClose, report, zone, onAssign, onResolve }) => {
  if (!isOpen || !report) return null;

  // Formatting date for real backend timestamp
  const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const displayIssue = report.issue_type === 'Other' ? report.issue_type_other : report.issue_type;

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Slide-over Panel */}
      <div className="bg-white h-full w-full max-w-xl shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="bg-[#1B5E20] p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-white">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                <ShieldCheck size={20} />
             </div>
             <div>
                <h3 className="font-black text-lg leading-none uppercase tracking-tight">Report Review</h3>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Report ID #{report.report_id}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white group">
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Status & Attention Signals */}
          <div className="flex gap-3">
             <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                report.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
             }`}>
                {report.status}
             </span>
             
             {parseInt(report.attention_count) > 0 && (
               <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1">
                 <AlertTriangle size={10} /> {report.attention_count} Attention Signals
               </span>
             )}
          </div>

          {/* Evidence Image */}
          <div className="aspect-video bg-slate-100 rounded-[32px] overflow-hidden border border-slate-100 relative group">
              {report.photo_evidence_url ? (
                <img 
                  src={`http://localhost:5000${report.photo_evidence_url}`} 
                  alt="Evidence" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <AlertTriangle size={48} className="opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2">No Photo Provided</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-6">
                <p className="text-white text-[10px] font-black uppercase tracking-widest">Citizen Uploaded Evidence</p>
              </div>
          </div>

          {/* Main Info */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <MapPin size={16} /> {report.location_address}
             </div>
              <div className="flex items-center gap-2">
                {zone ? (
                  <div 
                    className="px-3 py-1.5 rounded-full flex items-center gap-2.5 border shadow-sm transition-all"
                    style={{ 
                      // Background is a very faint version of the zone color
                      backgroundColor: `${zone.zone_color}10`, 
                      // Border is a semi-transparent version of the zone color
                      borderColor: `${zone.zone_color}40` 
                    }}
                  >
                    {/* The Pulse Dot remains the actual zone color */}
                    <div 
                      className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.1)]" 
                      style={{ backgroundColor: zone.zone_color }}
                    />
                    
                    {/* Text is now a constant Dark Slate for maximum readability */}
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                      Zone: {zone.zone_name}
                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-full flex items-center gap-2.5 border border-slate-200 bg-slate-50 shadow-inner">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Unassigned Territory
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-black text-slate-800 leading-tight">{displayIssue}</h2>
              <p className="text-slate-500 font-medium leading-relaxed text-base">
                  {report.description || "No description provided."}
              </p>
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* Reporter & Contact Details */}
          <div className="bg-slate-50/50 p-6 rounded-[28px] border border-slate-100 space-y-5">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Citizen Details</h4>
             
             {/* Reporter Name */}
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm overflow-hidden">
                    {report.profile_picture ? (
                      <img 
                        src={`http://localhost:5000${report.profile_picture}`} 
                        className="w-full h-full object-cover" 
                        alt="Profile" 
                      />
                    ) : (
                      <User size={20} />
                    )}
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Full Name</p>
                   <p className="text-sm font-black text-slate-800">{report.reporter_name}</p>
                </div>
             </div>

             {/* Contact Number (Fetched directly from users table via JOIN) */}
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-sm">
                   <Phone size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Contact Number</p>
                   <p className="text-sm font-black text-slate-800">
                     {report.contact_number || "Not Available"}
                   </p>
                </div>
             </div>
             
             {/* Timestamp */}
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                   <Clock size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Date Submitted</p>
                   <p className="text-sm font-black text-slate-800">{formattedDate}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-50 flex gap-4 bg-white shrink-0">
           <button 
             onClick={() => onAssign(report)}
             className="flex-1 py-4 bg-white border border-emerald-200 text-emerald-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
           >
             <Users size={16} /> Assign Team
           </button>
           <button 
             onClick={() => onResolve(report.report_id)}
             className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
           >
             <CheckCircle size={18} /> Mark as Resolved
           </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;