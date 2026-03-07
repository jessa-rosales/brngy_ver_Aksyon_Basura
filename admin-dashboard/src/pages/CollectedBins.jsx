import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, Trash2, X, ChevronDown, Clock, Calendar as CalendarIcon,
  MapPin, CheckCircle, AlertTriangle, RefreshCw, User, Eye,
  LayoutGrid, List, Archive
} from 'lucide-react'; 
import { design } from '../styles/design'; 

// CONTEXT & SERVICES
import { useUser } from '../context/UserContext';
import { collectionService } from '../services/collectionService';
import { zoneService } from '../services/zoneService';

// COMPONENTS
import CollectedBinDetailsModal from '../components/CollectedBinDetailsModal';
import ConfirmDialog from '../components/ConfirmDialog'; 

const CollectedBins = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { layout: l, userManagement: u } = design;

  // STATE MANAGEMENT
  const [collectedBins, setCollectedBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [zoneFilter, setZoneFilter] = useState('All Zones');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [viewMode, setViewMode] = useState('grid');
  
  // DYNAMIC DROPDOWN STATES
  const [zoneOptions, setZoneOptions] = useState(['All Zones']);
  
  // UI & MODAL STATES
  const [activeFilter, setActiveFilter] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBin, setSelectedBin] = useState(null);

  // MODERN CONFIRMATION & NOTIFICATION STATES
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [binToArchive, setBinToArchive] = useState(null);
  const [notification, setNotification] = useState(null);

  // LIVE DATA FETCHING
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [collectionsData, zonesData] = await Promise.all([
        collectionService.getCollectedBins(),
        zoneService.getZones().catch(() => null)
      ]);
      
      const collections = collectionsData || [];
      setCollectedBins(collections);

      if (zonesData && zonesData.length > 0) {
        const dynamicZones = zonesData.map(z => z.zone_name).filter(Boolean);
        setZoneOptions(['All Zones', ...dynamicZones]);
      } else if (collections.length > 0) {
        const uniqueZones = [...new Set(collections.map(b => b.zone).filter(Boolean))];
        setZoneOptions(['All Zones', ...uniqueZones]);
      } else {
        setZoneOptions(['All Zones']);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      setCollectedBins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // CATCH AUTO-OPEN MODAL FROM DASHBOARD
  useEffect(() => {
    if (!loading && collectedBins.length > 0 && location.state?.autoOpenId) {
      const targetId = String(location.state.autoOpenId).replace('COL-', '');
      
      const binToOpen = collectedBins.find(
        b => String(b.id).replace('COL-', '') === targetId
      );
      
      if (binToOpen) {
        setSelectedBin(binToOpen);
        setIsModalOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [loading, collectedBins, location]);

  // Handle outside click for custom dropdowns
  useEffect(() => {
    const handleOutsideClick = () => setActiveFilter(null);
    if (activeFilter) window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeFilter]);

  // Handle Opening the Modal
  const handleViewDetails = (bin) => {
    setSelectedBin(bin);
    setIsModalOpen(true);
  };

  // TRIGGER THE CUSTOM DIALOG
  const handleArchive = (id) => {
    setBinToArchive(id);
    setIsConfirmOpen(true);
  };

  // ARCHIVE EXECUTION
  const handleConfirmArchive = async () => {
    try {
      setLoading(true);
      await collectionService.archiveRecord(binToArchive);
      
      // Remove from the local list so it vanishes from the UI immediately
      setCollectedBins(prev => prev.filter(item => item.id !== binToArchive));
      
      setIsModalOpen(false); 
      setIsConfirmOpen(false);

      // Show success notification
      setNotification("Record archived successfully.");
      setTimeout(() => setNotification(null), 3000);
      
    } catch (err) {
      console.error("Archive failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { label: 'All Status', icon: Trash2, color: 'text-gray-400' },
    { label: 'Collected', icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Issue Reported', icon: AlertTriangle, color: 'text-rose-600' },
  ];

  const filteredBins = collectedBins.filter(item => {
    const matchesSearch = !searchTerm || 
      item.binId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.binName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.binAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.collectorName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesZone = zoneFilter === 'All Zones' || item.zone === zoneFilter;
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    
    const binDate = new Date(item.timestamp).toLocaleDateString('en-CA'); 
    const matchesDate = !selectedDate || binDate === selectedDate;

    return matchesSearch && matchesZone && matchesStatus && matchesDate;
  });

  const stats = [
    { label: 'Total Scans', value: collectedBins.length, color: 'text-blue-600' },
    { label: 'Collected', value: collectedBins.filter(r => r.status === 'Collected').length, color: 'text-emerald-600' },
    { label: 'Issues Reported', value: collectedBins.filter(r => r.status === 'Issue Reported').length, color: 'text-rose-600' },
    { label: 'Active Collectors', value: [...new Set(collectedBins.map(b => b.collectorName))].length, color: 'text-gray-800' },
  ];

  if (!user) return null;

  return (
    <div className="h-full bg-[#f0fdf4] overflow-y-auto relative font-sans">
      
      {/* SUCCESS NOTIFICATION */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10001] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 p-1 rounded-full"><CheckCircle size={14} /></div>
          <p className="text-xs font-black uppercase tracking-widest">{notification}</p>
        </div>
      )}

      <header className={l.header}>
        <div className="relative w-full max-w-2xl group flex items-center gap-3"> 
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by Bin Name, Location, Collector..." 
              className={l.searchBox} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700" onClick={loadData}>
            <RefreshCw size={22} className={loading ? "animate-spin text-green-600" : ""} />
          </button>
          
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className={`${l.profileCircle} overflow-hidden border border-gray-100`} onClick={() => navigate("/profile-settings")}>
              <img src={user.profile_picture ? `http://localhost:5000${user.profile_picture}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} alt="Admin" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8 animate-in fade-in duration-700">
        <div className={u.titleSection}>
          <h2 className="text-2xl font-bold text-[#1B5E20]">Collected Bins Evidence</h2>
          <p className="text-gray-600 text-sm mt-1">Review photo evidence and details of completed collections</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-600 flex flex-col justify-center min-h-25">
              <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-tight">{stat.label}</p>
              <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* CONTROLS SECTION */}
        <div className={u.tableControls}>
           <div className="flex flex-col md:flex-row gap-4 w-full md:justify-between items-center">
            
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
              <div className="relative w-full md:w-[180px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
                  <CalendarIcon size={16} />
                </div>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                />
                {selectedDate && (
                  <button onClick={() => setSelectedDate('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="relative min-w-[200px] w-full md:w-auto">
                <div onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === 'zone' ? null : 'zone'); }} className={`${u.filterSelect} flex items-center justify-between cursor-pointer bg-white`}>
                  <span className="flex items-center gap-2 truncate text-xs font-bold">{zoneFilter}</span>
                  <ChevronDown size={14} className={`transition-transform ${activeFilter === 'zone' ? 'rotate-180' : ''}`} />
                </div>
                {activeFilter === 'zone' && (
                  <div className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 max-h-60 overflow-y-auto">
                    {zoneOptions.map((opt) => (
                      <div key={opt} onClick={() => setZoneFilter(opt)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 cursor-pointer text-xs font-bold text-gray-600">
                        <MapPin size={14} className="text-emerald-500" /> {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative min-w-[200px] w-full md:w-auto">
                <div onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === 'status' ? null : 'status'); }} className={`${u.filterSelect} flex items-center justify-between cursor-pointer bg-white`}>
                  <span className="text-xs font-bold">{statusFilter}</span>
                  <ChevronDown size={14} className={`transition-transform ${activeFilter === 'status' ? 'rotate-180' : ''}`} />
                </div>
                {activeFilter === 'status' && (
                  <div className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 overflow-hidden">
                    {statusOptions.map((opt) => (
                      <div key={opt.label} onClick={() => setStatusFilter(opt.label)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 cursor-pointer text-xs font-bold text-gray-600 border-b border-gray-50 last:border-0">
                        <opt.icon size={14} className={opt.color} /> {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* VIEW MODE TOGGLE */}
            <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>

          </div>
        </div>

        {/* DATA DISPLAY */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
             <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredBins.length > 0 ? (
          
          viewMode === 'grid' ? (
            /* GRID VIEW  */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
              {filteredBins.map((bin) => (
                <div 
                  key={bin.id} 
                  className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative group overflow-hidden"
                >
                  <div className="w-full h-56 bg-slate-100 relative overflow-hidden">
                    {bin.photoUrl ? (
                      <img 
                        src={bin.photoUrl} 
                        alt={`Evidence for ${bin.binId}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <AlertTriangle size={40} className="text-slate-300 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md ${
                        bin.status === 'Collected' ? 'bg-emerald-500/90 text-white border-emerald-400' : 
                        'bg-rose-500/90 text-white border-rose-400 animate-pulse'
                      }`}>
                        {bin.status === 'Collected' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        {bin.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-5 border-b border-slate-50 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-wider border border-emerald-100">
                          {bin.binId}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-800 leading-tight line-clamp-1">{bin.binName || 'Unknown Bin'}</h3>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-emerald-500 shrink-0">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                          {/* 🔥 FIXED SYNTAX ERROR HERE */}
                          <p className="text-sm font-bold text-slate-700 leading-snug">{bin.binAddress || 'Address not provided'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-blue-500 shrink-0">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Collected By</p>
                          <p className="text-sm font-bold text-slate-700">{bin.collectorName || 'Unknown personnel'}</p>
                        </div>
                      </div>

                      {/* CLOCK / TIME OF COLLECTION */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-amber-500 shrink-0">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Time of Collection</p>
                          <p className="text-sm font-bold text-slate-700">
                            {bin.timestamp ? new Date(bin.timestamp).toLocaleString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric', 
                              hour: 'numeric', minute: '2-digit', hour12: true 
                            }) : 'Time unknown'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-50">
                      <button 
                        onClick={() => handleViewDetails(bin)}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-gray-400 uppercase font-black bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th scope="col" className="px-6 py-5 tracking-wider w-24">Photo</th>
                      <th scope="col" className="px-6 py-5 tracking-wider">Bin Details</th>
                      <th scope="col" className="px-6 py-5 tracking-wider">Location</th>
                      <th scope="col" className="px-6 py-5 tracking-wider">Collector</th>
                      <th scope="col" className="px-6 py-5 tracking-wider">Time</th>
                      <th scope="col" className="px-6 py-5 tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-5 tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBins.map((bin) => (
                      <tr key={bin.id} className="hover:bg-[#f8fafc] transition-colors duration-200 group">
                        <td className="px-6 py-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                            {bin.photoUrl ? (
                              <img src={bin.photoUrl} alt={bin.binId} className="w-full h-full object-cover" />
                            ) : (
                              <AlertTriangle size={20} className="text-slate-300" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 mb-1">{bin.binName || 'Unknown Bin'}</span>
                            <span className="font-mono font-bold text-emerald-600 text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                              {bin.binId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-[200px]">
                          <div className="flex items-start gap-2 text-slate-600">
                            <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-xs font-medium truncate">{bin.binAddress || 'Address not provided'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <User size={14} className="text-blue-500" />
                            <span className="text-xs font-bold">{bin.collectorName || 'Unknown personnel'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-slate-600 text-xs">
                            <span className="font-bold flex items-center gap-1">
                              <Clock size={12} className="text-amber-500" />
                              {bin.timestamp ? new Date(bin.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-4">
                              {bin.timestamp ? new Date(bin.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                              bin.status === 'Collected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                              'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'}`}>
                            {bin.status === 'Collected' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                            {bin.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleViewDetails(bin)}
                            className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-slate-100 hover:border-emerald-600"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
          
        ) : (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[32px] border border-dashed border-slate-200">
            <Trash2 size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-bold">No collected bins found for current filters.</p>
          </div>
        )}
      </main>

      {/* MODAL COMPONENTS */}
      <CollectedBinDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        bin={selectedBin} 
        onArchive={handleArchive} 
      />

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Record?"
        message="This record will be moved to system archives and hidden from active monitoring."
        confirmText="Archive Now"
        type="warning"
      />
    </div>
  );
};

export default CollectedBins;