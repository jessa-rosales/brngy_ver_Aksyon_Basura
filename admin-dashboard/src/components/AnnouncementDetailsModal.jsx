import React from 'react';
import { X, Archive, Edit, User, Clock, Megaphone, CornerDownRight, RefreshCcw } from 'lucide-react';

// Removed 'onDelete' from props as requested
const AnnouncementDetailsModal = ({ isOpen, onClose, announcement, onArchive, onEdit }) => {
  if (!isOpen || !announcement) return null;

  const priorityColors = {
    Urgent: 'bg-red-500 ring-red-500/20',
    High: 'bg-orange-500 ring-orange-500/20',
    Medium: 'bg-blue-500 ring-blue-500/20',
    Low: 'bg-slate-400 ring-slate-400/20',
  };

  // Helper function for consistent timestamp formatting
  const formatFullTimestamp = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-5000 flex items-center justify-center p-4 sm:p-6">
      {/* 1. Backdrop Animation */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in duration-700" 
        onClick={onClose} 
      />
      
      {/* 2. Modal Container Animation */}
      <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-out fill-mode-both">
        
        {/* --- 1. HERO IMAGE SECTION --- */}
        <div className="relative h-72 shrink-0 overflow-hidden group">
          {announcement.ann_photo ? (
            <div className="animate-in fade-in zoom-in-110 duration-1000">
              <img 
                src={`https://brngy-nzrth.onrender.com${announcement.ann_photo}`} 
                alt={announcement.title} 
                className="w-full h-full object-cover transition-transform duration-2000 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full bg-linear-to-br from-green-800 to-green-600 flex items-center justify-center animate-in fade-in duration-500">
              <Megaphone size={60} className="text-white/10 rotate-12" />
            </div>
          )}

          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/30 text-white backdrop-blur-xl rounded-2xl transition-all border border-white/20 z-10 active:scale-90 group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          
          <div className="absolute bottom-8 left-10 right-10 animate-in slide-in-from-left-8 duration-700 delay-200 fill-mode-both">
             <div className="flex gap-3 mb-3">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ring-2 shadow-lg ${priorityColors[announcement.priority] || priorityColors.Medium} text-white`}>
                    {announcement.priority}
                </div>
                <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                    {announcement.category}
                </div>
             </div>
             <h2 className="text-3xl font-black text-white leading-tight drop-shadow-xl">
                {announcement.title}
             </h2>
          </div>
        </div>

        {/* --- 2. THE INFO RIBBON --- */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-10 py-5 flex items-center justify-between animate-in slide-in-from-right-8 duration-700 delay-300 fill-mode-both">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-green-600 shadow-sm transition-transform hover:scale-110">
                        <User size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Post Authority</p>
                        <p className="text-sm font-black text-slate-700">{announcement.author_first} {announcement.author_last}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-green-600 shadow-sm transition-transform hover:scale-110">
                        <Clock size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time Registered</p>
                        {/* ✅ Original Published Timestamp */}
                        <p className="text-sm font-black text-slate-700">{formatFullTimestamp(announcement.date_published)}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{announcement.status}</span>
            </div>
        </div>

        {/* --- 3. BODY CONTENT --- */}
        <div className="p-10 overflow-y-auto custom-scrollbar bg-white flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
          
          {/* ✅ TIMESTAMP LOGIC: Displays full names and full time for edits */}
          {announcement.date_updated && (
            <div className="flex items-center gap-2 text-[9px] font-black text-orange-600 bg-orange-50 w-fit px-3 py-1.5 rounded-lg uppercase tracking-widest mb-6">
                <RefreshCcw size={10} className="animate-[spin_4s_linear_infinite]" />
                {announcement.author_id !== announcement.last_edited_by ? (
                    <span>Edited By: {announcement.editor_first} {announcement.editor_last} • {formatFullTimestamp(announcement.date_updated)}</span>
                ) : (
                    <span>Revised By: {announcement.author_first} {announcement.author_last} • {formatFullTimestamp(announcement.date_updated)}</span>
                )}
            </div>
          )}

          <div className="flex gap-4 items-start">
             <CornerDownRight className="text-green-600 shrink-0 mt-1" size={20} />
             <article className="max-w-none">
                <p className="text-slate-600 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                    {announcement.content}
                </p>
             </article>
          </div>
        </div>

        {/* --- 4. THE ACTION COMMAND CENTER --- */}
        <div className="p-8 border-t border-slate-50 flex items-center justify-end bg-white shrink-0 animate-in zoom-in-95 duration-500 delay-700 fill-mode-both gap-3">
            {/* The Delete button has been completely removed from here */}
            
            <button 
                onClick={() => onArchive(announcement.announcement_id)} 
                className="px-6 py-3.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white font-black rounded-xl transition-all active:scale-90 text-[10px] uppercase tracking-widest flex items-center gap-2.5 group"
            >
                <Archive size={16} className="group-hover:-translate-y-1 transition-transform" /> Move to Archive
            </button>
            <button 
                onClick={() => onEdit(announcement)} 
                className="relative overflow-hidden px-8 py-3.5 bg-slate-900 text-white font-black rounded-xl flex items-center gap-3 shadow-xl transition-all active:scale-95 hover:bg-black text-[10px] uppercase tracking-widest group"
            >
                <div className="absolute inset-0 w-1/2 h-full bg-white/5 skew-x-[-25deg] -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000" />
                Modify Content <Edit size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailsModal;