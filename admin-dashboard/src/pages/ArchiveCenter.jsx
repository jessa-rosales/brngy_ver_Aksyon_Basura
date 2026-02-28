import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, RotateCcw, Search, MessageSquare, 
  ClipboardList, Map, Megaphone, Users, Trash2,
  RefreshCw, Bell, ArrowUp, Truck, Clock, Calendar, 
  MapPin, AlertTriangle, CheckCircle, Trash, LayoutGrid, List, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { design } from '../styles/design';
import { useUser } from '../context/UserContext';
import { archiveService } from '../services/archiveService';
import Notification from '../components/Notification';

const ArchiveCenter = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { layout: l, ui, userManagement: u } = design;
  const scrollContainerRef = useRef(null);

  // STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState('reports'); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notify, setNotify] = useState({ show: false, msg: '', type: 'success' });
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [binViewMode, setBinViewMode] = useState('grid'); // Added for Bin view toggling

  const tabs = [
    { id: 'reports', label: 'Citizen Reports', icon: MessageSquare },
    { id: 'tasks', label: 'Assigned Tasks', icon: ClipboardList },
    { id: 'vehicles', label: 'Fleet Assets', icon: Truck },
    { id: 'bins', label: 'Collection Records', icon: Trash2 }, 
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
    setSearchTerm(''); // Reset search on tab change
  }, [activeTab, user]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const handleScroll = () => { if (container) setShowBackToTop(container.scrollTop > 400); };
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  // ROBUST EXTRACTORS FOR DIFFERENT DATABASE SCHEMAS
  const getItemId = (item) => item.id || item.report_id || item.task_id || item.vehicle_id || item.bin_id || item.zone_id || item.announcement_id || item.user_id;
  const getItemName = (item) => item.title || item.zone_name || item.vehicle_name || item.binName || item.name || (item.first_name ? `${item.first_name} ${item.last_name}` : null) || item.issue_type || item.description || 'Unnamed Item';

  const handleRestore = async (id) => {
    try {
      await archiveService.restoreItem(activeTab, id);
      setData(prev => prev.filter(item => getItemId(item) !== id));
      triggerNotify(`Item restored successfully!`, "success");
    } catch (err) {
      triggerNotify("Failed to restore item", "error");
    }
  };

  const filteredData = data.filter(item => {
    const name = String(getItemName(item)).toLowerCase();
    const idStr = String(getItemId(item)).toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || idStr.includes(searchTerm.toLowerCase());
  });

  /* =========================================================================
     SPECIFIC RENDERERS FOR EACH TAB (MATCHING ACTIVE PAGE LAYOUTS)
  ========================================================================= */

  const renderAnnouncements = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
      {filteredData.map((item) => (
        <div key={item.announcement_id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col group border border-slate-200 opacity-80 hover:opacity-100 transition-opacity relative">
          <div className="absolute inset-0 bg-slate-900/5 z-10 pointer-events-none" /> {/* Archive overlay tint */}
          <div className="aspect-video bg-gray-200 w-full relative overflow-hidden shrink-0">
            {item.ann_photo ? (
              <img src={`http://localhost:5000${item.ann_photo}`} alt="ann" className="w-full h-full object-cover grayscale" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                 <Megaphone size={40} className="mb-2 opacity-20" />
              </div>
            )}
            <div className="absolute top-3 left-3 bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-sm uppercase">Archived</div>
          </div>
          <div className="p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">{item.category}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">{item.priority}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-600 mb-2 line-clamp-1">{item.title}</h3>
            <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">{item.content}</p>
            
            <div className="mt-auto pt-4 border-t border-gray-50">
              <button onClick={() => handleRestore(item.announcement_id)} className="w-full py-3 bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <RotateCcw size={14} /> Restore Announcement
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderReports = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
      {filteredData.map((item) => {
        const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
        return (
          <div key={item.report_id} className="bg-white rounded-[32px] border border-slate-200 flex flex-col shadow-sm opacity-80 hover:opacity-100 transition-opacity overflow-hidden relative">
            <div className="p-5 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 grayscale">
                  <img src={item.profile_picture ? `http://localhost:5000${item.profile_picture}` : `https://api.dicebear.com/7.x/initials/svg?seed=${item.reporter_name}`} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-500 leading-tight">{item.reporter_name}</p>
                  <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                    <Clock size={10} />
                    <p className="text-[10px] font-bold uppercase tracking-tight">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-500 border border-rose-100">
                Archived
              </span>
            </div>

            <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden">
              {item.photo_evidence_url ? (
                <img src={`http://localhost:5000${item.photo_evidence_url}`} alt="Evidence" className="w-full h-full object-cover grayscale" />
              ) : (
                <AlertTriangle size={40} className="text-slate-300 opacity-20" />
              )}
            </div>

            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-lg font-black text-slate-600 line-clamp-1 mb-1">{displayIssue}</h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-4">
                <MapPin size={14} />
                <span className="truncate">{item.location_address}</span>
              </div>
              <p className="text-sm text-slate-400 font-medium leading-relaxed line-clamp-2 mb-6">
                {item.description || "No additional details provided."}
              </p>
              <div className="mt-auto pt-4 border-t border-slate-50">
                 <button onClick={() => handleRestore(item.report_id)} className="w-full py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
                    <RotateCcw size={14} /> Restore Report
                 </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderUsers = () => (
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
              <th className={`${u.tableHeadCell} text-center`}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredData.map((user) => (
              <tr key={user.user_id} className={`${u.tableRow} bg-slate-50/50`}>
                <td className={`${u.tableCell} font-medium text-slate-400 line-through`}>#{user.user_id}</td>
                <td className={`${u.tableCell} font-bold text-slate-500`}>{user.first_name} {user.last_name}</td>
                <td className={`${u.tableCell} text-slate-400`}>{user.contact_number}</td>
                <td className={`${u.tableCell} text-slate-400`}>{user.email}</td>
                <td className={u.tableCell}>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-500">
                    {user.role} (Archived)
                  </span>
                </td>
                <td className={`${u.tableCell} text-center`}>
                  <button onClick={() => handleRestore(user.user_id)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 mx-auto">
                    <RotateCcw size={14} /> Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-100/80">
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Ref ID</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Operational Team</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Fleet Asset</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Zone</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredData.map((row) => (
            <tr key={row.task_id} className="bg-slate-50/50">
              <td className="px-6 py-6 align-top font-mono text-[11px] font-semibold text-slate-400 line-through">#{row.task_id}</td>
              <td className="px-6 py-6 align-top opacity-70">
                <span className="text-[13px] font-black text-slate-600 block">{row.first_name} {row.last_name}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Driver</span>
              </td>
              <td className="px-6 py-6 align-top opacity-70">
                <div className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
                  <Truck size={14} className="text-slate-400" /> {row.vehicle_name}
                </div>
              </td>
              <td className="px-6 py-6 align-top opacity-70">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-200 px-3 py-1.5 rounded-xl w-fit">
                  <MapPin size={14} /> {row.zone_name}
                </div>
              </td>
              <td className="px-6 py-6 text-right align-top">
                  <button onClick={() => handleRestore(row.task_id)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-auto">
                    <RotateCcw size={14} /> Restore
                  </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderVehicles = () => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-100/80">
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Asset ID</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">Asset Profile</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredData.map((truck) => (
            <tr key={truck.vehicle_id} className="bg-slate-50/50">
              <td className="px-6 py-6 align-middle font-mono text-[11px] font-black text-slate-400 line-through">V-{truck.vehicle_id}</td>
              <td className="px-6 py-6 align-middle opacity-70">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-200 text-slate-400"><Truck size={24} /></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-600 uppercase tracking-tight">{truck.vehicle_name}</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{truck.plate_number || '---'}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-6 text-right align-middle">
                  <button onClick={() => handleRestore(truck.vehicle_id)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-auto">
                    <RotateCcw size={14} /> Restore
                  </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ✅ PERFECTED ZONES RENDERER
  const renderZones = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredData.map((zone) => (
        <div key={zone.zone_id} className="border-2 border-slate-200 rounded-2xl p-5 bg-slate-50 opacity-80 hover:opacity-100 transition-all relative group">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center border border-slate-300">
                    <Map size={20} className="text-slate-500" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-700 text-lg line-through">{zone.zone_name}</h4>
                    <p className="text-xs text-slate-400 font-medium">Zone ID: #{zone.zone_id}</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <Trash size={16} />
                    <span>Bins: <strong className="text-slate-600">{zone.bin_count || 0}</strong> in the area</span>
                </div>
                <div className="w-full h-px bg-slate-200" />
            </div>

            <button 
              onClick={() => handleRestore(zone.zone_id)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
            >
              <RotateCcw size={14} /> Restore Zone
            </button>
        </div>
      ))}
    </div>
  );

  // ✅ PERFECTED BINS RENDERER
  const renderBins = () => (
    <div className="flex flex-col gap-4">
      {/* Bin View Toggle (Only visible on Bins tab) */}
      <div className="flex justify-end mb-2">
        <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm w-fit">
          <button
            onClick={() => setBinViewMode('grid')}
            className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
              binViewMode === 'grid' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setBinViewMode('list')}
            className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
              binViewMode === 'list' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {binViewMode === 'grid' ? (
        // BINS GRID VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
          {filteredData.map((bin) => (
            <div key={bin.id} className="bg-white rounded-[32px] border border-slate-200 shadow-sm opacity-80 hover:opacity-100 transition-all duration-300 flex flex-col relative group overflow-hidden">
              <div className="w-full h-56 bg-slate-100 relative overflow-hidden grayscale">
                {bin.photoUrl ? (
                  <img src={bin.photoUrl} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><AlertTriangle size={40} className="text-slate-300 opacity-50" /></div>
                )}
                <div className="absolute top-4 right-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md bg-rose-500/90 text-white border-rose-400">
                    <Trash size={12} /> Archived
                  </span>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="mb-5 border-b border-slate-50 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-wider border border-slate-200 line-through">
                      {bin.binId}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-600 leading-tight line-clamp-1 line-through">{bin.binName || 'Unknown Bin'}</h3>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-slate-400 shrink-0"><MapPin size={16} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                      <p className="text-sm font-bold text-slate-600 leading-snug">{bin.binAddress || 'Address not provided'}</p>
                    </div>
                  </div>
                  
                  {/* ✅ Re-added Collector Display */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-slate-400 shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Collected By</p>
                      <p className="text-sm font-bold text-slate-600">{bin.collectorName || 'Unknown personnel'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-slate-50 p-1.5 rounded-lg text-slate-400 shrink-0"><Clock size={16} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Time of Collection</p>
                      <p className="text-sm font-bold text-slate-600">
                        {bin.timestamp ? new Date(bin.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Time unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-50">
                  <button onClick={() => handleRestore(bin.id)} className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                    <RotateCcw size={14} /> Restore Record
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // BINS LIST VIEW
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-gray-400 uppercase font-black bg-slate-50 border-b border-slate-100">
                <tr>
                  <th scope="col" className="px-6 py-5 tracking-wider w-24">Photo</th>
                  <th scope="col" className="px-6 py-5 tracking-wider">Bin Details</th>
                  <th scope="col" className="px-6 py-5 tracking-wider">Location</th>
                  <th scope="col" className="px-6 py-5 tracking-wider">Collector</th> {/* ✅ Re-added Collector */}
                  <th scope="col" className="px-6 py-5 tracking-wider">Time</th>
                  <th scope="col" className="px-6 py-5 tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((bin) => (
                  <tr key={bin.id} className="bg-slate-50/50 group">
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center grayscale">
                        {bin.photoUrl ? <img src={bin.photoUrl} alt="Bin" className="w-full h-full object-cover" /> : <AlertTriangle size={20} className="text-slate-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 opacity-70">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-600 mb-1 line-through">{bin.binName || 'Unknown Bin'}</span>
                        <span className="font-mono font-bold text-slate-400 text-[10px] bg-slate-200 px-2 py-0.5 rounded-md w-fit line-through">{bin.binId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] opacity-70">
                      <div className="flex items-start gap-2 text-slate-500">
                        <MapPin size={14} className="shrink-0 mt-0.5" />
                        <span className="text-xs font-medium truncate">{bin.binAddress || 'Address not provided'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 opacity-70">
                      <div className="flex items-center gap-2 text-slate-500">
                        <User size={14} />
                        <span className="text-xs font-bold">{bin.collectorName || 'Unknown personnel'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 opacity-70">
                      <div className="flex flex-col text-slate-500 text-xs">
                        <span className="font-bold flex items-center gap-1">
                          <Clock size={12} />
                          {bin.timestamp ? new Date(bin.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleRestore(bin.id)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-auto">
                        <RotateCcw size={14} /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center p-20">
         <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );

    if (filteredData.length === 0) return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border-2 border-dashed border-emerald-200">
        <Trash2 size={48} className="text-emerald-200 mb-4" />
        <p className="text-emerald-800 font-black uppercase tracking-widest text-xs">No archived {activeTab} records found</p>
      </div>
    );

    switch (activeTab) {
      case 'announcements': return renderAnnouncements();
      case 'reports': return renderReports();
      case 'users': return renderUsers();
      case 'tasks': return renderTasks();
      case 'vehicles': return renderVehicles();
      case 'zones': return renderZones(); 
      case 'bins': return renderBins();   
      default: return null;
    }
  };

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

        {/* DATA RENDERING LOGIC */}
        <div className="space-y-4">
          {renderContent()}
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