import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, RotateCcw, Search, MessageSquare, 
  ClipboardList, Map, Megaphone, Users, Trash2,
  RefreshCw, Bell, ArrowUp, Binoculars // ✅ Added icon for bin records
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { design } from '../styles/design';
import { useUser } from '../context/UserContext';
import { archiveService } from '../services/archiveService';
import Notification from '../components/Notification';

const ArchiveCenter = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { layout: l, ui } = design;
  const scrollContainerRef = useRef(null);

  // STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState('reports'); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notify, setNotify] = useState({ show: false, msg: '', type: 'success' });
  const [showBackToTop, setShowBackToTop] = useState(false);

  // ✅ ADDED 'bins' TO THE TABS LIST
  const tabs = [
    { id: 'reports', label: 'Citizen Reports', icon: MessageSquare },
    { id: 'tasks', label: 'Assigned Tasks', icon: ClipboardList },
    { id: 'bins', label: 'Collection Records', icon: Trash2 }, // Added this line
    { id: 'zones', label: 'Zones', icon: Map },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'users', label: 'Users', icon: Users },
  ];

  const triggerNotify = (msg, type = 'success') => setNotify({ show: true, msg, type });

  const loadArchiveData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await archiveService.getArchives(activeTab);
      setData(response || []);
    } catch (err) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveData();
  }, [activeTab, user]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const handleScroll = () => { if (container) setShowBackToTop(container.scrollTop > 400); };
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleRestore = async (id) => {
    try {
      await archiveService.restoreItem(activeTab, id);
      setData(prev => prev.filter(item => item.id !== id));
      triggerNotify(`${activeTab.slice(0, -1)} restored successfully!`, "success");
    } catch (err) {
      triggerNotify("Failed to restore item", "error");
    }
  };

  const filteredData = data.filter(item => {
    const name = (item.name || item.title || item.binName || item.first_name || "").toLowerCase();
    const idStr = (item.id || item.binId || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || idStr.includes(searchTerm.toLowerCase());
  });

  if (!user) return null;

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto relative bg-[#f0fdf4] font-sans">
      
      {/* HEADER SECTION */}
      <header className={l.header}>
        <div className="relative w-full max-w-2xl group flex items-center gap-3"> 
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder={`Search archived ${activeTab}...`} 
              className={l.searchBox} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700" onClick={loadArchiveData}>
            <RefreshCw size={22} className={loading ? "animate-spin text-green-600" : ""} />
          </button>
          
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className={`${l.profileCircle} overflow-hidden border border-gray-100 cursor-pointer`} onClick={() => navigate("/profile-settings")}>
              <img 
                src={user.profile_picture ? `http://localhost:5000${user.profile_picture}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} 
                alt="Admin" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8 animate-in fade-in duration-700">
        
        <div className="flex items-center gap-5">
            <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all border border-slate-100">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-3xl font-bold text-[#1B5E20]">System Archive Center</h2>
              <p className="text-gray-600 text-sm mt-1 uppercase tracking-widest font-bold text-[10px]">Restoration & System Cleanup</p>
            </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-[24px] w-fit border border-emerald-100/50 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {/* DATA LIST */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
               <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
          ) : filteredData.length > 0 ? (
            filteredData.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-emerald-50 flex items-center justify-between group hover:border-emerald-200 hover:shadow-md transition-all">
                <div className="flex items-center gap-6">
                  {/* Photo Thumbnail for Bins/Reports, or Icon for others */}
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 overflow-hidden">
                    {(activeTab === 'bins' || activeTab === 'reports') && item.photoUrl ? (
                        <img src={item.photoUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0" alt="archived evidence" />
                    ) : (
                        activeTab === 'users' ? <Users size={24}/> : <Trash2 size={24}/>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800">
                        {item.binName || item.name || item.title || item.first_name || 'Unnamed Item'}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md uppercase border border-rose-100">Archived</span>
                        <p className="text-[11px] font-bold text-slate-400">
                           {activeTab === 'bins' ? `Record ID: ${item.id}` : `Logged on: ${new Date(item.timestamp || item.created_at).toLocaleDateString()}`}
                        </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleRestore(item.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                  <RotateCcw size={14} /> Restore Data
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border-2 border-dashed border-emerald-200">
              <Trash2 size={48} className="text-emerald-200 mb-4" />
              <p className="text-emerald-800 font-black uppercase tracking-widest text-xs">No archived {activeTab} records found</p>
            </div>
          )}
        </div>
      </main>

      {/* UI EXTRAS */}
      {showBackToTop && (
        <button onClick={scrollToTop} className={`${ui.backToTop} flex items-center justify-center animate-bounce z-[2000]`}>
          <ArrowUp size={24} />
        </button>
      )}

      <Notification 
          key={notify.msg}
          show={notify.show} 
          message={notify.msg} 
          type={notify.type} 
          onClose={() => setNotify({ ...notify, show: false })} 
      />
    </div>
  );
};

export default ArchiveCenter;