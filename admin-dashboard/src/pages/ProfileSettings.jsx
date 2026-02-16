import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, MapPin, Calendar, Camera, Save, 
  Mail, Phone, Shield, Bell, Search, Info
} from 'lucide-react'; 
import { design } from '../styles/design'; 
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import Notification from '../components/Notification';
import { useUser } from '../context/UserContext';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [adminUser, setAdminUser] = useState(null);
  const [formData, setFormData] = useState({
    gender: '',
    birthday: '',
    address: ''
  });
  const [notify, setNotify] = useState({ show: false, msg: '', type: 'success' });

  const { layout: l, userManagement: u } = design;

  // Helper to format date safely without timezone shifting
  // ✅ Helper to format date safely without timezone shifting
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  // This creates a date object and extracts only the YYYY-MM-DD part based on local date
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

useEffect(() => {
  const init = async () => {
    const userData = await authService.verifyToken();
    if (!userData) { navigate("/login"); return; }
    
    setAdminUser(userData);
    setUser(userData); 
    
    setFormData({
      gender: userData.gender || '',
      // ✅ Use the safe formatter here
      birthday: formatDateForInput(userData.birthday),
      address: userData.address || ''
    });
  };
  init();
}, [navigate, setUser]);

const handleUpdate = async (e) => {
  e.preventDefault();
  try {
    // 1. Get the most current data from state
    const updatePayload = {
      ...adminUser,      // Spread existing user (ID, current pic, etc.)
      ...formData,       // Spread the editable fields (gender, birthday, address)
      // Ensure these are explicitly mapped to backend names
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      contact_number: adminUser.contact_number
    };

    const result = await userService.updateUser(adminUser.user_id, updatePayload);

    if (result) {
      // 2. Update the Context and Local Storage immediately
      setUser(result); 
      setAdminUser(result);
      localStorage.setItem("userProfile", JSON.stringify(result));
      
      setNotify({ show: true, msg: "Profile synced across roles!", type: 'success' });
    }
  } catch (err) {
    setNotify({ show: true, msg: "Save failed", type: 'error' });
  }
};

const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: Check file size (e.g., limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
        setNotify({ show: true, msg: "File too large (Max 2MB)", type: 'error' });
        return;
    }

    const uploadData = new FormData();
    uploadData.append('profile_image', file); // This key MUST match upload.single('profile_image')

    try {
        const res = await userService.uploadAvatar(uploadData);
        if (res.profile_picture) {
            setNotify({ show: true, msg: "Photo updated successfully!", type: 'success' });
            
            // Refresh local state
            const userData = await authService.verifyToken();
            if (userData) {
                setAdminUser(userData);
                setUser(userData);
                localStorage.setItem("userProfile", JSON.stringify(userData));
            }
        }
    } catch (err) {
        console.error("Upload Error:", err);
        setNotify({ show: true, msg: err.message || "Upload failed", type: 'error' });
    }
};

  return (
    <div className="h-full bg-[#f0fdf4] overflow-y-auto relative font-sans">
      <header className={l.header}>
        <div className="relative w-full max-w-2xl"> 
          <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
          <input type="text" placeholder="Profile settings" className={l.searchBox} disabled />
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700"><Bell size={24} /></button>
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-800 leading-tight">
                {adminUser?.first_name} {adminUser?.last_name}
              </p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{adminUser?.role}</p>
            </div>
            <div className={l.profileCircle}>
              {adminUser?.profile_picture ? (
                <img src={`http://localhost:5000${adminUser.profile_picture}`} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUser?.first_name || 'Admin'}`} alt="Admin" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="p-8">
        <div className={u.titleSection} >
          <h2 className="text-2xl font-bold text-[#1B5E20]">Account Settings</h2>
          <p className="text-gray-600 text-sm mt-1">Manage your personal information and profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 pb-10">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center" style={{ borderTop: '5px solid #2B9447' }}>
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-50 shadow-sm bg-gray-50">
                  {adminUser?.profile_picture ? (
                    <img src={`http://localhost:5000${adminUser.profile_picture}`} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUser?.first_name}`} alt="Avatar" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-[#4CAF50] text-white p-2.5 rounded-full cursor-pointer shadow-lg hover:bg-[#43A047] transition-all hover:scale-110">
                  <Camera size={18} />
                  <input type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
                </label>
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-800">{adminUser?.first_name} {adminUser?.last_name}</h3>
              <span className={adminUser?.role === 'Admin' ? u.badgeAdmin : u.badgeCollector}>
                {adminUser?.role}
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Account Identification</h4>
               <InfoItem icon={<Shield size={16} />} label="System ID" value={`#${adminUser?.user_id}`} />
               <InfoItem icon={<Mail size={16} />} label="Email Address" value={adminUser?.email} />
               <InfoItem 
                icon={<Phone size={16} />} 
                label="Contact Number" 
                value={adminUser?.contact_number || adminUser?.phone || "Number not found in database"} 
              />
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100" style={{ borderTop: '5px solid #2B9447' }}>
            <form onSubmit={handleUpdate} className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-green-600 uppercase tracking-widest flex items-center gap-2"><Info size={14} /> General Info</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DisabledInput label="First Name" value={adminUser?.first_name} />
                  <DisabledInput label="Last Name" value={adminUser?.last_name} />
                </div>
              </div>

              <div className="w-full h-px bg-gray-100"></div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-green-600 uppercase tracking-widest">Personal Details (Editable)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2"><User size={14}/> Gender</label>
                    <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-3.5 rounded-xl outline-none font-bold text-gray-700 text-sm">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2"><Calendar size={14}/> Birthday</label>
                    <input type="date" value={formData.birthday} onChange={(e) => setFormData({...formData, birthday: e.target.value})} className="w-full bg-gray-50 border border-gray-100 p-3.5 rounded-xl font-bold text-gray-700 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-2"><MapPin size={14}/> Address</label>
                  <textarea rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full address..." className="w-full bg-gray-50 border border-gray-100 p-3.5 rounded-xl font-bold text-gray-700 text-sm resize-none" />
                </div>
              </div>
              <button type="submit" className="bg-[#4CAF50] hover:bg-[#43A047] text-white px-8 py-3.5 rounded-xl text-sm font-bold w-full flex items-center justify-center gap-2 shadow-md">
                <Save size={18} /> Update Profile
              </button>
            </form>
          </div>
        </div>
      </main>
      <Notification show={notify.show} message={notify.msg} type={notify.type} onClose={() => setNotify({ ...notify, show: false })} />
    </div>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 group transition-all">
    <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">{icon}</div>
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">{label}</p>
      <p className="text-xs font-bold text-gray-700">{value}</p>
    </div>
  </div>
);

const DisabledInput = ({ label, value }) => (
  <div>
    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">{label}</label>
    <div className="bg-gray-100 border border-gray-200 p-3.5 rounded-xl font-bold text-gray-400 text-sm italic cursor-not-allowed">
      {value || "Not set"}
    </div>
  </div>
);

export default ProfileSettings;