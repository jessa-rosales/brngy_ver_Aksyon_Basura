import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AddUserModal from '../components/AddUserModal'; 
import { 
  Search, Bell, Edit, Trash2, UserPlus, ChevronDown, X, Users, 
  ShieldCheck, Truck, HardHat, UserCircle, Eye, Mail, Phone, 
  Fingerprint, Calendar, Shield, BadgeCheck, MapPin, User, Cake 
} from 'lucide-react'; 
import { design } from '../styles/design'; 
import Notification from '../components/Notification';
import { userService } from '../services/userService';

// CONTEXT
import { useUser } from '../context/UserContext';

const UserManagement = () => {
  const navigate = useNavigate();
  const { user: adminUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All Types');
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); 
  
  // NEW STATE FOR VIEWING USER
  const [viewUser, setViewUser] = useState(null); 
  
  const [notify, setNotify] = useState({ show: false, msg: '', type: 'success' });

  const { layout: l, userManagement: u } = design;

  const triggerNotify = (msg, type = 'success') => {
    setNotify({ show: true, msg, type });
  };

  useEffect(() => {
    if (!adminUser) {
      navigate("/login");
      return;
    }
    loadUsers();
  }, [adminUser, navigate]);

  const loadUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error("Component: Failed to load users");
    }
  };

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'Admin' && u.status === 'Active').length,
    driver: users.filter(u => u.role === 'Driver' && u.status === 'Active').length,
    collector: users.filter(u => u.role === 'Collector' && u.status === 'Active').length,
    citizen: users.filter(u => u.role === 'Citizen' && u.status === 'Active').length,
  };

  const handleSaveUser = async (userData) => {
    try {
      let response;
      if (selectedUser) {
        response = await userService.updateUser(selectedUser.user_id, userData);
      } else {
        response = await userService.addUser(userData);
      }

      if (response && response.message) {
        const errors = ["Number already been use", "Gmail already been use", "This full name already exists."];
        if (errors.includes(response.message)) {
          triggerNotify(response.message, "error");
          return; 
        }
      }

      triggerNotify(selectedUser ? "User updated successfully!" : "User added successfully!", "success");
      loadUsers();
      closeModal();
    } catch (err) {
      triggerNotify("Connection error.", "error");
    }
  };

  const openEditModal = (user, e) => {
    e.stopPropagation(); 
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = async (id, e) => {
    e.stopPropagation(); 
    if (window.confirm("Are you sure you want to delete this user?")) {
      const success = await userService.deleteUser(id);
      if (success) {
        loadUsers();
        triggerNotify("User deleted successfully.", "error");
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All Types' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (!adminUser) return null;

  return (
    <div className="h-full bg-[#f0fdf4] overflow-y-auto relative">     
      <header className={l.header}>
        <div className="relative w-full max-w-2xl"> 
          <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
          <input 
            type="text" placeholder="Search..." className={l.searchBox}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-red-500">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700"><Bell size={24} /></button>
          
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">{adminUser.first_name} {adminUser.last_name}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{adminUser.role}</p>
            </div>
            
            <div className={`${l.profileCircle} cursor-pointer hover:ring-4 hover:ring-green-100 transition-all overflow-hidden border border-gray-100`} onClick={() => navigate("/profile-settings")}>
              {adminUser.profile_picture ? (
                <img src={`http://localhost:5000${adminUser.profile_picture}`} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adminUser.first_name}`} alt="Admin" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="p-8">
        <div className={u.titleSection} >
          <h2 className="text-2xl font-bold text-[#1B5E20]">User Management</h2>
          <p className="text-gray-600 text-sm mt-1">Manage collectors, officers, and citizen accounts</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total Users" value={stats.total} icon={<Users className="text-blue-600" />} bgColor="bg-blue-50" />
          <StatCard title="Admins" value={stats.admin} icon={<ShieldCheck className="text-purple-600" />} bgColor="bg-purple-50" />
          <StatCard title="Drivers" value={stats.driver} icon={<Truck className="text-orange-600" />} bgColor="bg-orange-50" />
          <StatCard title="Collectors" value={stats.collector} icon={<HardHat className="text-green-600" />} bgColor="bg-green-50" />
          <StatCard title="Citizens" value={stats.citizen} icon={<UserCircle className="text-teal-600" />} bgColor="bg-teal-50" />
        </div>

        <div className={u.tableControls}>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative">
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={u.filterSelect}>
                <option>All Types</option>
                <option>Admin</option>
                <option>Collector</option>
                <option>Driver</option>
                <option>Citizen</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 text-gray-500 pointer-events-none" size={16} />
            </div>
          </div>

          <button onClick={() => { setSelectedUser(null); setIsModalOpen(true); }} className="bg-[#4CAF50] hover:bg-[#43A047] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
            <UserPlus size={18} /> Add User
          </button>
        </div>

        <div className={u.tableContainer}>
          <div className="overflow-x-auto">
            <table className={u.table}>
              <thead className={u.tableHead}>
                <tr>
                  <th className={u.tableHeadCell}>User ID</th>
                  <th className={u.tableHeadCell}>Full Name</th>
                  <th className={u.tableHeadCell}>Contact</th>
                  <th className={u.tableHeadCell}>Email</th>
                  <th className={u.tableHeadCell}>Role</th>
                  <th className={u.tableHeadCell}>Status</th>
                  <th className={`${u.tableHeadCell} text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.user_id} 
                    className={`${u.tableRow} cursor-pointer hover:bg-green-50/50 transition-colors`}
                    onClick={() => setViewUser(user)} 
                  >
                    <td className={`${u.tableCell} font-medium`}>#{user.user_id}</td>
                    <td className={`${u.tableCell} font-bold text-gray-800`}>{user.first_name} {user.last_name}</td>
                    <td className={u.tableCell}>{user.contact_number}</td>
                    <td className={u.tableCell}>{user.email}</td>
                    <td className={u.tableCell}>
                      <span className={user.role === 'Admin' ? u.badgeAdmin : user.role === 'Collector' ? u.badgeCollector : user.role === 'Driver' ? u.badgeDriver : u.badgeCitizen}>
                        {user.role}
                      </span>
                    </td>
                    <td className={u.tableCell}>
                      <span className={user.status === 'Active' ? u.statusActive : u.statusInactive}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className={`${u.tableCell} text-center`}>
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setViewUser(user); }} className="text-gray-400 hover:text-green-600" title="View"><Eye size={18} /></button>
                        <button onClick={(e) => openEditModal(user, e)} className="text-blue-500 hover:text-blue-700" title="Edit"><Edit size={18} /></button>
                        <button onClick={(e) => handleDeleteUser(user.user_id, e)} className="text-red-500 hover:text-red-700" title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Notification 
        key={notify.msg} show={notify.show} message={notify.msg} type={notify.type} 
        onClose={() => setNotify({ ...notify, show: false })} 
      />

      <AddUserModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onAddUser={handleSaveUser} 
        editData={selectedUser} 
      />

      {/* RENDER THE UPDATED VIEW MODAL */}
      <ViewUserModal 
        user={viewUser} 
        onClose={() => setViewUser(null)} 
      />
    </div>
  );
};

/* VIEW ONLY MODAL COMPONENT (UPDATED WITH GENDER, ADDRESS, BIRTHDATE) */
const ViewUserModal = ({ user, onClose }) => {
  if (!user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const roleStyles = {
    Admin: 'text-purple-600 bg-purple-50',
    Collector: 'text-green-600 bg-green-50',
    Driver: 'text-orange-600 bg-orange-50',
    Citizen: 'text-blue-600 bg-blue-50',
  };

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px] p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/20">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-72 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center">
          <div className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-white mb-4">
            <img src={user.profile_picture ? `http://localhost:5000${user.profile_picture}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} className="w-full h-full object-cover" alt="Profile" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 text-center leading-tight">{user.first_name} {user.last_name}</h3>
          <span className={`mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${roleStyles[user.role] || 'bg-slate-100'}`}>
            {user.role}
          </span>
          <button onClick={onClose} className="w-full mt-8 py-3 bg-slate-800 text-white text-xs font-bold rounded-xl transition-all">
            Back to List
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-8 bg-white relative">
          <button onClick={onClose} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"><X size={20} /></button>
          <div className="mb-8">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Core Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <DataField icon={<Mail size={16}/>} label="Email Address" value={user.email} />
              <DataField icon={<Phone size={16}/>} label="Contact Number" value={user.contact_number} />
              <DataField icon={<User size={16}/>} label="Gender" value={user.gender} />
              <DataField icon={<Cake size={16}/>} label="Birth Date" value={formatDate(user.birthday)} />
            </div>
          </div>
          <div className="pt-8 border-t border-slate-50">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Location Details</h4>
            <div className="flex gap-4 items-start bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><MapPin size={18}/></div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Residential Address</p>
                 <p className="text-sm text-slate-700 font-medium leading-relaxed">{user.address || 'No registered address.'}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="mt-1 text-slate-300 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-700 truncate">{value || 'N/A'}</p>
    </div>
  </div>
);

const StatCard = ({ title, value, icon, bgColor }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-l-[5px] border-l-[#2B9447]">
    <div className={`p-3 rounded-xl ${bgColor}`}>{icon}</div>
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase">{title}</p>
      <h3 className="text-xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

export default UserManagement;