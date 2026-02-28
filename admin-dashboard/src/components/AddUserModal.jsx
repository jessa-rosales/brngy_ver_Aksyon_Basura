import React, { useState, useEffect } from 'react';
import { 
  X, Eye, EyeOff, AlertCircle, User, Mail, Phone, 
  ShieldCheck, Activity, Lock, ChevronDown, Check,
  HardHat, Truck, UserCircle, Shield 
} from 'lucide-react';

// ✅ ADDED `isProcessing` PROP
const AddUserModal = ({ isOpen, onClose, onAddUser, editData, isProcessing }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    status: 'Active'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    setValidationError('');
    if (editData && isOpen) {
      setFormData({
        firstName: editData.first_name || '',
        lastName: editData.last_name || '',
        email: editData.email || '',
        phone: editData.contact_number || '',
        role: editData.role || '',
        status: editData.status || 'Active',
        password: '' 
      });
    } else if (isOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        status: 'Active'
      });
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setValidationError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setValidationError("Invalid number. Must start with 09 and be exactly 11 digits.");
      return;
    }
    onAddUser(formData);
  };

  const roles = [
    { id: 'Admin', label: 'System Administrator', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'Collector', label: 'Waste Collector', icon: HardHat, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'Driver', label: 'Vehicle Driver', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'Citizen', label: 'Registered Citizen', icon: UserCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  const statuses = [
    { id: 'Active', label: 'Active / Enabled', dot: 'bg-green-500' },
    { id: 'Inactive', label: 'Inactive / Suspended', dot: 'bg-red-500' },
  ];

  const dropdownLabelStyle = "block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5 ml-1";
  
  // ✅ Base style updated to handle disabled state styling
  const dropdownBaseStyle = `w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all ${
    isProcessing 
      ? 'opacity-60 cursor-not-allowed' 
      : 'cursor-pointer hover:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50'
  }`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* ✅ Prevent closing modal by clicking backdrop if processing */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in duration-300" 
        onClick={() => !isProcessing && onClose()} 
      />
      
      <div className="bg-white rounded-4xl shadow-2xl w-full max-w-xl relative overflow-hidden transform animate-in zoom-in-95 duration-200 border border-slate-100">
        
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {editData ? 'Modify Account' : 'Create Account'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">User Management System</p>
          </div>
          <button 
            onClick={() => !isProcessing && onClose()} 
            disabled={isProcessing}
            className={`p-2 bg-white rounded-xl transition-all border border-slate-100 ${
              isProcessing ? 'opacity-50 cursor-not-allowed text-slate-300' : 'text-slate-400 hover:text-slate-600 hover:shadow-md'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {validationError && (
          <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0" />
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><User size={12} /> Personal Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" disabled={isProcessing} />
              <FormInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" disabled={isProcessing} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput icon={<Mail size={16}/>} label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" disabled={isProcessing} />
              <FormInput icon={<Phone size={16}/>} label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="09123456789" disabled={isProcessing} />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Lock size={12} /> Security & Access</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* PROFESSIONAL ROLE DROPDOWN */}
              <div className="relative">
                <label className={dropdownLabelStyle}>Access Level</label>
                <div 
                  onClick={(e) => { 
                    if (isProcessing) return; // Prevent interaction
                    e.stopPropagation(); 
                    setActiveDropdown(activeDropdown === 'role' ? null : 'role'); 
                  }}
                  className={`${dropdownBaseStyle} ${activeDropdown === 'role' ? 'ring-4 ring-emerald-50 border-emerald-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="absolute left-4 text-slate-400" size={18} />
                    <span className="text-sm font-bold text-slate-700">
                      {formData.role || "Select Role"}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${activeDropdown === 'role' ? 'rotate-180' : ''}`} />
                </div>
                {activeDropdown === 'role' && !isProcessing && (
                  <div className="absolute top-[110%] left-0 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in slide-in-from-top-2">
                    {roles.map((r) => (
                      <div 
                        key={r.id} 
                        onClick={() => setFormData({...formData, role: r.id})}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${r.bg}`}><r.icon size={16} className={r.color} /></div>
                          <span className={`text-sm font-semibold ${formData.role === r.id ? 'text-emerald-600' : 'text-slate-600'}`}>{r.label}</span>
                        </div>
                        {formData.role === r.id && <Check size={16} className="text-emerald-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PROFESSIONAL STATUS DROPDOWN */}
              <div className="relative">
                <label className={dropdownLabelStyle}>Account Status</label>
                <div 
                  onClick={(e) => { 
                    if (isProcessing) return; // Prevent interaction
                    e.stopPropagation(); 
                    setActiveDropdown(activeDropdown === 'status' ? null : 'status'); 
                  }}
                  className={`${dropdownBaseStyle} ${activeDropdown === 'status' ? 'ring-4 ring-emerald-50 border-emerald-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="absolute left-4 text-slate-400" size={18} />
                    <div className="flex items-center gap-2 ml-1">
                      <div className={`w-2 h-2 rounded-full ${formData.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-bold text-slate-700">{formData.status}</span>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
                </div>
                {activeDropdown === 'status' && !isProcessing && (
                  <div className="absolute top-[110%] left-0 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in slide-in-from-top-2">
                    {statuses.map((s) => (
                      <div 
                        key={s.id} 
                        onClick={() => setFormData({...formData, status: s.id})}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                          <span className={`text-sm font-semibold ${formData.status === s.id ? 'text-emerald-600' : 'text-slate-600'}`}>{s.label}</span>
                        </div>
                        {formData.status === s.id && <Check size={16} className="text-emerald-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="relative">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5 ml-1">
                {editData ? 'New Password (Leave blank to keep current)' : 'Account Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  required={!editData} 
                  placeholder={editData ? "••••••••" : "Create a secure password"} 
                  disabled={isProcessing} // ✅ Disable input
                  className={`w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm placeholder:text-slate-300 ${
                    isProcessing ? 'opacity-60 cursor-not-allowed' : 'focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500'
                  }`}
                  value={formData.password} 
                  onChange={handleChange} 
                />
                <button 
                  type="button" 
                  disabled={isProcessing}
                  onClick={() => setShowPassword(!showPassword)} 
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isProcessing ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-50">
            <button 
              type="button" 
              onClick={() => !isProcessing && onClose()} 
              disabled={isProcessing}
              className={`flex-1 py-4 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all ${
                isProcessing ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95'
              }`}
            >
              Cancel
            </button>
            
            {/* ✅ PROCESSING STATE ON BUTTON */}
            <button 
              type="submit" 
              disabled={isProcessing}
              className={`flex-[1.5] py-4 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-2 ${
                isProcessing 
                  ? 'bg-emerald-400 cursor-not-allowed shadow-none' 
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-200'
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                editData ? 'Update' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ✅ FormInput now takes disabled prop
const FormInput = ({ label, icon, disabled, ...props }) => (
  <div className="w-full">
    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5 ml-1">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
      <input 
        required
        disabled={disabled}
        {...props}
        className={`w-full ${icon ? 'pl-11' : 'px-5'} py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm placeholder:text-slate-300 ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500'
        }`}
      />
    </div>
  </div>
);

export default AddUserModal;