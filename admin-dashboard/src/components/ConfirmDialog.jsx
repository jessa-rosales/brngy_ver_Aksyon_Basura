import React from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", type = "danger" }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* Dialog Box */}
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="p-8 flex flex-col items-center text-center">
          
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
            type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
          }`}>
            <AlertTriangle size={32} />
          </div>

          {/* Text */}
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{title}</h3>
          <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-slate-900 hover:bg-emerald-600 shadow-slate-200'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default ConfirmDialog;