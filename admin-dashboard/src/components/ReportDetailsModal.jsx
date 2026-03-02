import React, { useState } from 'react';
import { 
  X, MapPin, Clock, Phone, User, 
  CheckCircle, AlertTriangle, ShieldCheck, Users, Archive, Truck, Camera 
} from 'lucide-react';

const ReportDetailsModal = ({ isOpen, onClose, report, zone, onAssign, onResolve, onArchive }) => {
  // ✅ NEW: State for full-screen image viewing
  const [selectedImage, setSelectedImage] = useState(null);

  if (!isOpen || !report) return null;

  // Formatting dates
  const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const formattedResolvedDate = report.resolved_at ? new Date(report.resolved_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Pending Sync';

  const displayIssue = report.issue_type === 'Other' ? report.issue_type_other : report.issue_type;
  
  // Check if resolved to handle conditional UI and button states
  const isResolved = report.status === 'Resolved';

  return (
    <>
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
                  isResolved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
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
                    // ✅ FIXED: Added cursor-pointer and onClick handler
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                    onClick={() => setSelectedImage(`http://localhost:5000${report.photo_evidence_url}`)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <AlertTriangle size={48} className="opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2">No Photo Provided</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-6 pointer-events-none">
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
                        backgroundColor: `${zone.zone_color}10`, 
                        borderColor: `${zone.zone_color}40` 
                      }}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.1)]" 
                        style={{ backgroundColor: zone.zone_color }}
                      />
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

            {/* ASSIGNED TEAM SECTION */}
            <div className={`p-6 rounded-[28px] border space-y-4 ${report.assigned_driver_name ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200 border-dashed'}`}>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${report.assigned_driver_name ? 'text-emerald-600' : 'text-slate-400'}`}>
                Deployment Details
              </h4>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-white border flex items-center justify-center shadow-sm ${report.assigned_driver_name ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-slate-300'}`}>
                  <Truck size={22} />
                </div>
                <div>
                  <p className={`text-[10px] font-bold uppercase leading-none mb-1 ${report.assigned_driver_name ? 'text-emerald-600/60' : 'text-slate-400'}`}>
                    Assigned Driver
                  </p>
                  <p className={`text-sm font-black ${report.assigned_driver_name ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {report.assigned_driver_name || "Pending Assignment"}
                  </p>
                </div>
              </div>
            </div>

            {/* RESOLUTION DETAILS SECTION (Only visible if Resolved) */}
            {(isResolved || report.resolved_photo_url) && (
              <div className="bg-emerald-50/30 p-6 rounded-[28px] border border-emerald-100 space-y-5">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Resolution Evidence</h4>
                
                {/* Collector Details */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600/60 uppercase leading-none mb-1">Cleared By (Collector)</p>
                    <p className="text-sm font-black text-slate-800">
                      {report.collector_name || (report.photo_uploaded_by ? `Collector ID #${report.photo_uploaded_by}` : 'Pending Data')}
                    </p>
                  </div>
                </div>

                {/* Completion Timestamp */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600/60 uppercase leading-none mb-1">Time Completed</p>
                    <p className="text-sm font-black text-slate-800">{formattedResolvedDate}</p>
                  </div>
                </div>

                {/* Post-Cleanup Evidence Photo */}
                {report.resolved_photo_url && (
                  <div className="mt-4 aspect-video bg-white rounded-[24px] overflow-hidden border border-emerald-100 relative group shadow-sm">
                    <img 
                      src={`http://localhost:5000${report.resolved_photo_url}`} 
                      alt="Resolution Evidence" 
                      // ✅ FIXED: Added cursor-pointer and onClick handler
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                      onClick={() => setSelectedImage(`http://localhost:5000${report.resolved_photo_url}`)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/60 to-transparent flex items-end p-5 pointer-events-none">
                      <p className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Camera size={14} /> Collector Uploaded Evidence
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reporter & Contact Details */}
            <div className="bg-slate-50/50 p-6 rounded-[28px] border border-slate-100 space-y-5">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Citizen Details</h4>
               
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
          <div className="p-8 border-t border-slate-50 flex flex-col gap-4 bg-white shrink-0">
              <div className="flex gap-4">
                <button 
                  onClick={() => onAssign(report)}
                  disabled={isResolved}
                  className={`flex-1 py-4 border rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isResolved 
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Users size={16} /> {report.status === 'In Progress' && !isResolved ? 'Reassign Team' : 'Assign Team'}
                </button>

                <button 
                  onClick={() => onResolve(report.report_id)}
                  disabled={report.status === 'Pending' || isResolved}
                  className={`flex-[2] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isResolved 
                      ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed border border-emerald-200 shadow-inner'
                      : report.status === 'Pending' 
                        ? 'bg-emerald-600/50 text-white cursor-not-allowed' 
                        : 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700'
                  }`}
                >
                  <CheckCircle size={18} /> {isResolved ? 'Resolved' : 'Mark as Resolved'}
                </button>
              </div>
              
              <button 
                onClick={() => onArchive(report.report_id)}
                className="w-full py-3 bg-rose-50 text-rose-500 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all border border-rose-100 flex items-center justify-center gap-2"
              >
                <Archive size={14} /> Move to system archives
              </button>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Full Screen Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={32} />
          </button>
          
          {/* Exact/Full Size Image */}
          <img 
            src={selectedImage} 
            alt="Full Size Zoom" 
            className="max-w-[95vw] max-h-[95vh] object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevents clicking the image from closing the modal
          />
        </div>
      )}
    </>
  );
};

export default ReportDetailsModal;