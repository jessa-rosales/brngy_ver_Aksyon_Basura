import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Move, X } from 'lucide-react';

const Notification = ({ message, type = 'success', onClose, show }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [startBar, setStartBar] = useState(false);

  useEffect(() => {
    if (show) {
      setIsExiting(false);
      setStartBar(false);

      // Small delay to ensure the browser registers the 100% width before animating to 0%
      const animationDelay = setTimeout(() => setStartBar(true), 10);

      // Start exit animation 500ms before closing
      const exitTimer = setTimeout(() => setIsExiting(true), 4500);

      // Final unmount
      const closeTimer = setTimeout(() => onClose(), 5000);

      return () => {
        clearTimeout(animationDelay);
        clearTimeout(exitTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [show, message, onClose]);

  if (!show) return null;

  const styles = {
    success: { bg: 'bg-white', icon: <CheckCircle2 className="text-green-500" size={20} />, label: 'Success', accent: 'bg-green-500' },
    error: { bg: 'bg-white', icon: <XCircle className="text-red-500" size={20} />, label: 'Error', accent: 'bg-red-500' },
    relocate: { bg: 'bg-white', icon: <Move className="text-blue-500" size={20} />, label: 'Relocated', accent: 'bg-blue-500' }
  };

  const config = styles[type] || styles.success;

  return (
    <div 
      className={`
        fixed bottom-10 right-10 z-9999 
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${isExiting ? 'opacity-0 translate-x-10 scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
    >
      <div className="relative flex items-stretch min-w-85 max-w-md bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
        <div className={`w-1.5 ${config.accent}`} />
        
        <div className="flex-1 p-5 flex items-center gap-4">
          <div className="shrink-0 p-2 bg-gray-50 rounded-xl">{config.icon}</div>
          <div className="grow">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-0.5">{config.label}</p>
            <p className="text-sm font-bold text-gray-800 leading-tight">{message}</p>
          </div>
          <button onClick={() => { setIsExiting(true); setTimeout(onClose, 400); }} className="p-1 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-gray-500 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ✅ BUTTER-SMOOTH PROGRESS BAR */}
        <div className="absolute bottom-0 left-0 h-0.75 w-full bg-gray-100">
          <div 
            className={`h-full ${config.accent} transition-all ease-linear`}
            style={{ 
                width: startBar ? '0%' : '100%',
                transitionDuration: '5000ms' // Match the notification duration exactly
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Notification;