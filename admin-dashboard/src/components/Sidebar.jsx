import React, { useState } from 'react';
import { 
  LayoutDashboard, Trash2, FileText, Truck, ClipboardList, 
  MapPin, Megaphone, Users, LogOut, ChevronLeft, Menu, Archive 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext'; // ✅ 1. Import your User Context

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useUser(); // ✅ 2. Get the setUser function

  // MODAL STATE
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ✅ 3. UPDATED LOGOUT LOGIC
  const handleConfirmLogout = () => {
    // 1. Clear LocalStorage via your service
    authService.logout(); 

    // 2. Clear local lockout data
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutExpiry');
    
    // 3. Close the modal
    setShowLogoutModal(false);
    
    // 4. Force a hard browser redirect. 
    // This bypasses the AdminRoute kicking you to '/'
    window.location.href = '/admin-portal-access';
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Trash2, label: 'Collected Bins', path: '/bins' },
    { icon: FileText, label: 'Citizen Reports', path: '/reports' },
    { icon: Truck, label: 'Vehicle Tracking', path: '/tracking' },
    { icon: ClipboardList, label: 'Assign Task', path: '/assign-task' },
    { icon: MapPin, label: 'Add Zone', path: '/zones' },
    { icon: Megaphone, label: 'Announcement', path: '/announcements' },
    { icon: Users, label: 'User Management', path: '/users' },
    { icon: Archive, label: 'Archive Center', path: '/archive-center' },
  ];

  return (
    <> 
      <div 
        className={`text-white h-screen flex flex-col fixed left-0 top-0 z-[1001] shadow-2xl font-sans transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
        style={{ background: 'linear-gradient(to bottom, #1B8E57, #003A1E)' }}
      >
        
        {/* TOGGLE BUTTON */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-4 top-12 w-8 h-8 bg-white text-[#1B8E57] border-2 border-[#1B8E57] rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:scale-110 hover:bg-green-50 z-[1002] cursor-pointer`}
        >
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* LOGO SECTION */}
        <div className={`pt-6 pb-2 mb-2 flex flex-col items-center justify-center border-b border-white/30 mx-4 overflow-hidden`}>
          <div className={`transition-all duration-300 ${isCollapsed ? 'w-12 h-12' : 'w-20 h-20'} bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm mb-4 border border-white/10`}>
             <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain p-2" />
          </div>
          {!isCollapsed && (
            <h1 className="font-bold text-[20px] text-center leading-tight tracking-wide">
              Waste <br/> Management
            </h1>
          )}
        </div>

        {/* NAVIGATION MENU */}
        <nav className="flex-1 px-3 space-y-2 overflow-y-auto mt-2 custom-scrollbar">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                to={item.path} 
                key={index}
                title={isCollapsed ? item.label : ""}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 group ${
                  isActive ? 'bg-white/20 backdrop-blur-md shadow-md border border-white/10' : 'hover:bg-white/10'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'text-green-50'}`} />
                {!isCollapsed && <span className="text-[13px] font-medium tracking-wide whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT BUTTON */}
        <div className="p-3 border-t border-white/10 mt-auto">
          <button 
            onClick={() => setShowLogoutModal(true)} 
            className={`w-full flex items-center gap-4 px-4 py-3 text-white/90 hover:bg-red-500/80 rounded-xl transition-all cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="text-[15px] font-bold">Logout</span>}
          </button>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-xs w-full mx-4 shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <LogOut size={32} className="text-red-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-1">Logout</h3>
              <p className="text-gray-500 text-sm mb-6">Are you sure you want to logout?</p>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all active:scale-95 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmLogout}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95 text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;