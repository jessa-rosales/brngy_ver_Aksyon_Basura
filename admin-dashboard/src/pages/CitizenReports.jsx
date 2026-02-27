import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, Trash2, X, ChevronDown, Clock, Calendar as CalendarIcon,
  AlertTriangle, MapPin, Info, FileText, Eye, Flag, CheckCircle, Navigation,
  Archive // ✅ Added Archive Icon
} from 'lucide-react'; 
import { design } from '../styles/design'; 

// CONTEXT & SERVICES
import { useUser } from '../context/UserContext';
import { reportService } from '../services/reportService'; 
import { zoneService } from '../services/zoneService'; 

// COMPONENTS
import ReportDetailsModal from '../components/ReportDetailsModal';
import ReportNavigationModal from '../components/ReportNavigationModal';
import ConfirmDialog from '../components/ConfirmDialog'; // ✅ Added ConfirmDialog
import Notification from '../components/Notification'; // ✅ Added Notification for consistent UX

const CitizenReports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { layout: l, userManagement: u } = design;

  // STATE MANAGEMENT
  const [reports, setReports] = useState([]);
  const [zones, setZones] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedDate, setSelectedDate] = useState('');
  const [notify, setNotify] = useState({ show: false, msg: '', type: 'success' }); // ✅ Added Notification State
  
  // MODAL & UI STATES
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); 
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [activeZone, setActiveZone] = useState(null);

  // ✅ NEW ARCHIVE STATES
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToArchive, setItemToArchive] = useState(null);

  // ✅ ROBUST HELPER: Point in Polygon Logic
  const isPointInPolygon = (lat, lng, polygon) => {
    if (!polygon) return false;
    const x = Number(lat);
    const y = Number(lng);
    let inside = false;
    
    const coords = Array.isArray(polygon[0][0]) || typeof polygon[0][0] === 'object' 
      ? polygon[0] 
      : polygon;
    
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = Number(coords[i].lat ?? coords[i][0]);
      const yi = Number(coords[i].lng ?? coords[i][1]);
      const xj = Number(coords[j].lat ?? coords[j][0]);
      const yj = Number(coords[j].lng ?? coords[j][1]);

      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reportRes, zoneRes] = await Promise.all([
        reportService.getAllReports(),
        zoneService.getZones()
      ]);
      if (reportRes.success) setReports(reportRes.reports);
      if (zoneRes) setZones(zoneRes);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  useEffect(() => {
    if (!loading && reports.length > 0 && location.state?.autoOpenId) {
      const reportToOpen = reports.find(
        r => String(r.report_id) === String(location.state.autoOpenId)
      );
      if (reportToOpen) {
        setSelectedReport(reportToOpen);
        setIsDetailsOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [loading, reports, location.state]);

  useEffect(() => {
    const handleOutsideClick = () => setActiveFilter(null);
    if (activeFilter) window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeFilter]);

  const triggerNotify = (msg, type = 'success') => setNotify({ show: true, msg, type });

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    if (zones.length > 0) {
      const found = zones.find(z => 
        isPointInPolygon(report.latitude, report.longitude, z.boundaries || z.coordinates)
      );
      setActiveZone(found || null);
    } else {
      setActiveZone(null);
    }
    setIsDetailsOpen(true);
  };

  const handleNavigateClick = (report) => {
    setSelectedReport(report);
    const found = zones.find(z => {
      const polyData = z.boundaries || z.coordinates;
      return isPointInPolygon(report.latitude, report.longitude, polyData);
    });
    setActiveZone(found || null);
    setIsNavModalOpen(true);
  };

  const handleResolve = async (id) => {
    try {
      const result = await reportService.updateReportStatus(id, 'Resolved');
      if (result.success) {
        setReports(prev => prev.map(r => r.report_id === id ? {...r, status: 'Resolved'} : r));
        setIsDetailsOpen(false);
        triggerNotify("Report resolved successfully", "success");
      }
    } catch (error) {
      console.error("Failed to resolve report");
      triggerNotify("Failed to resolve report", "error");
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
      const result = await reportService.deleteReport(itemToArchive);
      if (result.success) {
        setReports(prev => prev.filter(r => r.report_id !== itemToArchive));
        setIsDetailsOpen(false);
        setIsConfirmOpen(false);
        triggerNotify("Moved to Archive Center", "warning");
      } else {
        throw new Error("Failed to archive");
      }
    } catch (error) {
      console.error("Archive failed", error);
      triggerNotify("Failed to archive report", "error");
      setIsConfirmOpen(false);
    }
  };

  const categoryOptions = [
    { label: 'All Types', icon: FileText, color: 'text-gray-400' },
    { label: 'Missed Pickup', icon: Clock, color: 'text-blue-500' }, 
    { label: 'Illegal Dumping', icon: Flag, color: 'text-red-500' },
    { label: 'Overflowing Bin', icon: AlertTriangle, color: 'text-orange-500' }, 
    { label: 'Other Issue', icon: Info, color: 'text-purple-500' },
  ];

  const statusOptions = [
    { label: 'All Status', icon: FileText, color: 'text-gray-400' },
    { label: 'Need Attention', icon: AlertTriangle, color: 'text-rose-600' },
    { label: 'Pending', icon: Clock, color: 'text-orange-500' },
    { label: 'In Progress', icon: Clock, color: 'text-amber-500' },
    { label: 'Resolved', icon: CheckCircle, color: 'text-green-600' },
  ];

  // ✅ FIXED FILTER & SORT LOGIC
  const filteredReports = reports.filter(item => {
    const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
    
    // Search logic
    const matchesSearch = !searchTerm || 
      displayIssue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reporter_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Category logic - Handles 'Other Issue' specifically
    const matchesCategory = categoryFilter === 'All Types' || 
      (categoryFilter === 'Other Issue' ? item.issue_type === 'Other' : item.issue_type === categoryFilter);

    // Status logic - Handles 'Need Attention' via attention_count
    const matchesStatus = statusFilter === 'All Status' || 
      (statusFilter === 'Need Attention' ? parseInt(item.attention_count) > 0 : item.status === statusFilter);

    // Date logic - Accurate comparison using Canada locale for YYYY-MM-DD format
    const reportDate = new Date(item.created_at).toLocaleDateString('en-CA'); 
    const matchesDate = !selectedDate || reportDate === selectedDate;

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  }).sort((a, b) => {
    // If filtering by Need Attention, sort highest signals first
    if (statusFilter === 'Need Attention') {
      return (parseInt(b.attention_count) || 0) - (parseInt(a.attention_count) || 0);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const stats = [
    { label: 'Active Reports', value: reports.filter(r => r.status !== 'Resolved').length, color: 'text-gray-800' },
    { label: 'Resolved', value: reports.filter(r => r.status === 'Resolved').length, color: 'text-emerald-600' },
    { label: 'In Progress', value: reports.filter(r => r.status === 'In Progress').length, color: 'text-amber-600' },
    { label: 'Total Reports', value: reports.length, color: 'text-blue-600' },
  ];

  if (!user) return null;

  return (
    <div className="h-full bg-[#f0fdf4] overflow-y-auto relative font-sans">
      <header className={l.header}>
        <div className="relative w-full max-w-2xl group flex items-center gap-3"> 
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search reports..." 
              className={l.searchBox} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700" onClick={loadData}>
            <Clock size={22} className={loading ? "animate-spin" : ""} />
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
        
        {/* ✅ ADDED ARCHIVE BUTTON TO TITLE SECTION */}
        <div className="flex justify-between items-end">
          <div className={u.titleSection}>
            <h2 className="text-2xl font-bold text-[#1B5E20]">Citizen Reports</h2>
            <p className="text-gray-600 text-sm mt-1">Review community feedback from the mobile app</p>
          </div>
          
          <button 
            onClick={() => navigate("/archive-center")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
          >
            <Archive size={14} /> View Archives
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-600 flex flex-col justify-center min-h-25">
              <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-tight">{stat.label}</p>
              <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className={u.tableControls}>
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

            {/* Category Filter */}
            <div className="relative min-w-[200px] w-full md:w-auto">
              <div onClick={(e) => { e.stopPropagation(); setActiveFilter(activeFilter === 'category' ? null : 'category'); }} className={`${u.filterSelect} flex items-center justify-between cursor-pointer bg-white`}>
                <span className="flex items-center gap-2 truncate text-xs font-bold">{categoryFilter}</span>
                <ChevronDown size={14} className={`transition-transform ${activeFilter === 'category' ? 'rotate-180' : ''}`} />
              </div>
              {activeFilter === 'category' && (
                <div className="absolute top-[110%] left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1">
                  {categoryOptions.map((opt) => (
                    <div key={opt.label} onClick={() => setCategoryFilter(opt.label)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 cursor-pointer text-xs font-bold text-gray-600">
                      <opt.icon size={14} className={opt.color} /> {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
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
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
             <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
            {filteredReports.map((item) => {
              const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
              return (
                <div key={item.report_id} className="bg-white rounded-[32px] border border-slate-100 flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                  <div className="p-5 flex items-center justify-between border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-100 shadow-sm">
                        <img src={item.profile_picture ? `http://localhost:5000${item.profile_picture}` : `https://api.dicebear.com/7.x/initials/svg?seed=${item.reporter_name}`} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{item.reporter_name}</p>
                        <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                          <Clock size={10} />
                          <p className="text-[10px] font-bold uppercase tracking-tight">
                            {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${item.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden">
                    {item.photo_evidence_url ? (
                      <img src={`http://localhost:5000${item.photo_evidence_url}`} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <AlertTriangle size={40} className="text-slate-300 opacity-20" />
                    )}
                    {parseInt(item.attention_count) > 0 && (
                      <div className="absolute bottom-3 left-3 bg-rose-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1 shadow-lg">
                        <AlertTriangle size={10} /> {item.attention_count} ATTENTION SIGNALS
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex gap-2 mb-3">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase border border-emerald-100">
                        {displayIssue}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 line-clamp-1 mb-1">{displayIssue}</h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mb-4">
                      <MapPin size={14} />
                      <span className="truncate">{item.location_address}</span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2 mb-6">
                      {item.description || "No additional details provided."}
                    </p>
                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
                        <button onClick={() => handleViewDetails(item)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                          <Eye size={14} /> Details
                        </button>
                        <button onClick={() => handleNavigateClick(item)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100" title="Navigate to location">
                          <Navigation size={16} />
                        </button>
                        {/* ✅ REPLACED DELETE ICON WITH ARCHIVE ICON */}
                        <button onClick={() => triggerArchive(item.report_id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100" title="Move to Archive">
                          <Archive size={16} />
                        </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[32px] border border-dashed border-slate-200">
            <CalendarIcon size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-bold">No reports found for this date or filter.</p>
          </div>
        )}
      </main>

      <ReportNavigationModal 
        isOpen={isNavModalOpen}
        onClose={() => { setIsNavModalOpen(false); setActiveZone(null); }}
        report={selectedReport}
        zone={activeZone}
      />

      {selectedReport && (
        <ReportDetailsModal 
          isOpen={isDetailsOpen} 
          onClose={() => {
            setIsDetailsOpen(false);
            setActiveZone(null); 
          }} 
          report={selectedReport}
          zone={activeZone} 
          onAssign={() => {}}
          onResolve={() => handleResolve(selectedReport.report_id)}
          // Pass the archive trigger to the details modal if needed
          onArchive={() => triggerArchive(selectedReport.report_id)} 
        />
      )}

      {/* ✅ ADDED CONFIRM DIALOG FOR ARCHIVING */}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Report?"
        message="This report will be removed from the active list and moved to the system archives. You can review it later in the Archive Center."
        confirmText="Archive Now"
        type="warning"
      />

      {/* ✅ ADDED NOTIFICATION FOR SUCCESS/ERROR ALERTS */}
      <Notification key={notify.msg} show={notify.show} message={notify.msg} type={notify.type} onClose={() => setNotify({ ...notify, show: false })} />
    </div>
  );
};

export default CitizenReports;