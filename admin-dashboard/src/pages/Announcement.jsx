import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, Plus, Megaphone, Calendar, 
  User, Trash2, X, ChevronDown, Clock, RefreshCcw,
  ShieldAlert, Wrench, Info, FileText, XCircle, CheckCircle,
  Archive // ✅ Added Archive Icon
} from 'lucide-react'; 
import { design } from '../styles/design'; 

// SERVICES & CONTEXT
import { announcementService } from '../services/announcementService';
import { useUser } from '../context/UserContext';

// COMPONENTS
import Notification from '../components/Notification';
import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import AnnouncementDetailsModal from '../components/AnnouncementDetailsModal';
import ConfirmDialog from '../components/ConfirmDialog'; // ✅ Added ConfirmDialog

const Announcement = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  
  // UI & MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [notify, setNotify] = useState({ show: false, msg: '', type: 'success' });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null); 

  // ✅ NEW ARCHIVE STATES
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToArchive, setItemToArchive] = useState(null);

  const { layout: l, userManagement: u } = design;

  /* ==========================================
      INITIALIZATION
     ========================================== */
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadAnnouncements();
  }, [user, navigate]);

  useEffect(() => {
    const handleOutsideClick = () => setActiveFilter(null);
    if (activeFilter) window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeFilter]);

  const loadAnnouncements = async () => {
    try {
      const data = await announcementService.getAnnouncements();
      // Only keep non-archived items (failsafe in case backend doesn't filter)
      setAnnouncements(data ? data.filter(a => !a.is_archived) : []);
    } catch (err) { console.error(err); }
  };

  /* ==========================================
      DATA CONFIG FOR CUSTOM DROPDOWNS
     ========================================== */
  const categoryOptions = [
    { label: 'All Types', icon: Megaphone, color: 'text-gray-400' },
    { label: 'Schedule', icon: Calendar, color: 'text-blue-500' },
    { label: 'Emergency', icon: ShieldAlert, color: 'text-red-500' },
    { label: 'Maintenance', icon: Wrench, color: 'text-orange-500' },
    { label: 'Information', icon: Info, color: 'text-green-500' },
  ];

  const statusOptions = [
    { label: 'All Status', icon: FileText, color: 'text-gray-400' },
    { label: 'Published', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Draft', icon: FileText, color: 'text-orange-500' },
    { label: 'Archived', icon: XCircle, color: 'text-red-600' },
  ];

  /* ==========================================
      ACTIONS
     ========================================== */
  const triggerNotify = (msg, type = 'success') => setNotify({ show: true, msg, type });

  const handleCardClick = (ann) => {
    setSelectedAnn(ann);
    setIsDetailsOpen(true);
  };

  const handleEditClick = (ann) => {
    setSelectedAnn(ann);
    setIsDetailsOpen(false); 
    setIsEditMode(true);    
    setIsModalOpen(true);    
  };

  const handleCloseForm = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedAnn(null);
  };

  const handleAnnouncementSubmit = async (formData) => {
    try {
      let result;
      if (isEditMode && selectedAnn) {
        result = await announcementService.updateAnnouncement(selectedAnn.announcement_id, {
            ...formData,
            last_edited_by: user?.user_id 
        });
        
        if (result) triggerNotify("Announcement updated!", "success");
      } else {
        result = await announcementService.createAnnouncement({
          ...formData,
          author_id: user?.user_id 
        });
        if (result) triggerNotify("Announcement published successfully!", "success");
      }

      if (result) {
        loadAnnouncements();
        handleCloseForm();
      }
    } catch (err) { 
      console.error(err);
      triggerNotify(err.message || "Operation failed", "error"); 
    }
  };

  // ✅ UPDATED ARCHIVE LOGIC (Trigger Modal)
  const triggerArchive = (id) => {
    setItemToArchive(id);
    setIsConfirmOpen(true);
  };

  // ✅ EXECUTING THE ARCHIVE (Soft Delete)
  const handleConfirmArchive = async () => {
    try {
      const success = await announcementService.deleteAnnouncement(itemToArchive);
      
      if (!success) throw new Error("Server rejected archive request");
      
      loadAnnouncements();
      setIsDetailsOpen(false);
      setIsConfirmOpen(false);
      triggerNotify("Moved to Archive Center", "warning");
    } catch (err) {
      triggerNotify("Failed to archive announcement", "error");
    }
  };

  /* ==========================================
      FILTERING LOGIC
     ========================================== */
  const filteredAnnouncements = announcements.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All Types' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = [
    { label: 'Total Announcement', value: announcements.length, color: 'text-gray-800' },
    { label: 'Published', value: announcements.filter(a => a.status === 'Published').length, color: 'text-green-600' },
    { label: 'Draft', value: announcements.filter(a => a.status === 'Draft').length, color: 'text-orange-600' },
    { label: 'Archived', value: announcements.filter(a => a.status === 'Archived').length, color: 'text-red-600' },
  ];

  if (!user) return null;

  return (
    <div className="h-full bg-[#f0fdf4] overflow-y-auto relative font-sans">
      
      {/* HEADER */}
      <header className={l.header}>
        <div className="relative w-full max-w-2xl"> 
          <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
          <input type="text" placeholder="Search..." className={l.searchBox} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-red-500"><X size={18} /></button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700"><Bell size={24} /></button>
          
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
            
            <div className={`${l.profileCircle} cursor-pointer hover:ring-4 hover:ring-green-100 transition-all overflow-hidden border border-gray-100`} onClick={() => navigate("/profile-settings")}>
              {user.profile_picture ? (
                <img src={`http://localhost:5000${user.profile_picture}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} alt="Avatar" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8">
        
        {/* ✅ ADDED ARCHIVE BUTTON TO TITLE SECTION */}
        <div className="flex justify-between items-end">
          <div className={u.titleSection}>
            <h2 className="text-2xl font-bold text-[#1B5E20]">Announcement</h2>
            <p className="text-gray-600 text-sm mt-1">Create and manage public announcements for citizens</p>
          </div>
          
          <button 
            onClick={() => navigate("/archive-center")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
          >
            <Archive size={14} /> View Archives
          </button>
        </div>

        {/* STATS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-600 flex flex-col justify-center min-h-25">
              <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-tight">{stat.label}</p>
              <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className={u.tableControls}>
          {/* CATEGORY & STATUS FILTERS */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative">
              <div onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === 'category' ? null : 'category'); }} className={`${u.filterSelect} flex items-center justify-between cursor-pointer min-w-[40] bg-white`}>
                <span className="flex items-center gap-2 truncate">
                  {(() => {
                    const opt = categoryOptions.find(o => o.label === categoryFilter);
                    return <><opt.icon size={14} className={opt.color} /> {opt.label}</>;
                  })()}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeFilter === 'category' ? 'rotate-180' : ''}`} />
              </div>
              
              {activeFilter === 'category' && (
                <div className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 animate-in slide-in-from-top-2 duration-200">
                  {categoryOptions.map((opt) => (
                    <div key={opt.label} onClick={() => setCategoryFilter(opt.label)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 cursor-pointer text-xs font-bold text-gray-600">
                      <opt.icon size={14} className={opt.color} /> {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === 'status' ? null : 'status'); }} className={`${u.filterSelect} flex items-center justify-between cursor-pointer min-w-[40] bg-white`}>
                <span className="flex items-center gap-2 truncate">
                  {(() => {
                    const opt = statusOptions.find(o => o.label === statusFilter);
                    return <><opt.icon size={14} className={opt.color} /> {opt.label}</>;
                  })()}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeFilter === 'status' ? 'rotate-180' : ''}`} />
              </div>

              {activeFilter === 'status' && (
                <div className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 animate-in slide-in-from-top-2 duration-200">
                  {statusOptions.map((opt) => (
                    <div key={opt.label} onClick={() => setStatusFilter(opt.label)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 cursor-pointer text-xs font-bold text-gray-600">
                      <opt.icon size={14} className={opt.color} /> {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => { setIsEditMode(false); setIsModalOpen(true); }} className="bg-[#98EE99] hover:bg-[#86d987] text-gray-800 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm border border-green-200 active:scale-95">
            <Plus size={16} className="bg-green-800 text-white rounded-full p-0.5" /> 
            Create Announcement
          </button>
        </div>

        {/* ANNOUNCEMENT LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((item) => (
              <div key={item.announcement_id} onClick={() => handleCardClick(item)} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col group cursor-pointer hover:shadow-md transition-all border border-gray-50">
                <div className="aspect-video bg-gray-200 w-full relative overflow-hidden shrink-0">
                  {item.ann_photo ? (
                    <img src={`http://localhost:5000${item.ann_photo}`} alt="ann" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                       <Megaphone size={40} className="mb-2 opacity-20" />
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">{item.category}</span>
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${item.priority === 'Urgent' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{item.priority}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${item.status === 'Published' ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>{item.status}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-700 transition-colors line-clamp-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed">{item.content}</p>
                  
                  <div className="mt-auto pt-4 border-t border-gray-50 space-y-2">
                    <div className="flex items-center text-gray-400 text-[11px] font-medium gap-4">
                      <div className="flex items-center gap-1.5"><Clock size={14} className="text-green-600" /> {new Date(item.date_published).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1.5"><User size={14} className="text-green-600" /> {item.author_first ? `${item.author_first} ${item.author_last}` : "Admin Officer"}</div>
                    </div>

                    {item.date_updated && (
                      <div className="flex items-center gap-2 text-[10px] text-orange-600 font-bold bg-orange-50/40 p-2 rounded-lg">
                        <RefreshCcw size={12} className="animate-spin-slow" />
                        {item.author_id !== item.last_edited_by ? (
                          <span>Edited by {item.editor_first} • {new Date(item.date_updated).toLocaleString()}</span>
                        ) : (
                          <span>Updated {new Date(item.date_updated).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <Megaphone size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">No announcements found matching your filters.</p>
            </div>
          )}
        </div>
      </main>

      <CreateAnnouncementModal isOpen={isModalOpen} onClose={handleCloseForm} onCreate={handleAnnouncementSubmit} editData={isEditMode ? selectedAnn : null} />
      
      {/* ✅ UPDATED MODAL: Replaced onDelete with onArchive */}
      <AnnouncementDetailsModal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        announcement={selectedAnn} 
        onArchive={triggerArchive} 
        onEdit={handleEditClick} 
      />

      {/* ✅ ADDED CONFIRM DIALOG */}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Announcement?"
        message="This announcement will be removed from public view and moved to the system archives."
        confirmText="Archive Now"
        type="warning"
      />

      <Notification key={notify.msg} show={notify.show} message={notify.msg} type={notify.type} onClose={() => setNotify({ ...notify, show: false })} />
    </div>
  );
};

export default Announcement;