import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Bell, User, Truck, Users, MapPin, 
  Plus, Edit3, Trash2, Calendar, Clock, 
  RefreshCw, Wrench, Ban, X,
  SortAsc, SortDesc, AlertCircle, Archive, ClipboardList, CheckCircle2, Filter
} from 'lucide-react';
import { design } from '../styles/design';

// SERVICES & CONTEXT
import { useUser } from '../context/UserContext';
import { assignmentService } from '../services/assignmentService';
import { vehicleService } from '../services/vehicleService';
import { vehicleTrackingService } from '../services/vehicleTrackingService'; 

// COMPONENTS
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import RegisterTruckModal from '../components/RegisterTruckModal';
import Notification from '../components/Notification';
import ConfirmDialog from '../components/ConfirmDialog'; 

const AssignTask = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [assignments, setAssignments] = useState([]);
  const [trucks, setTrucks] = useState([]); 
  const [fleetWithLogs, setFleetWithLogs] = useState([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('assign');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); 
  const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });

  // DATE RANGE STATES
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingTruck, setEditingTruck] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [assignmentToArchive, setAssignmentToArchive] = useState(null);

  const [isTruckConfirmOpen, setIsTruckConfirmOpen] = useState(false);
  const [truckToArchive, setTruckToArchive] = useState(null);

  const [dataOptions, setDataOptions] = useState({
    drivers: [], collectors: [], vehicles: [], zones: []
  });

  const { layout: l, userManagement: u } = design;

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVars = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const triggerNotif = (message, type = 'success') => {
    setNotif({ show: true, message, type });
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assigns, opts, allVehicles, liveFleetRes] = await Promise.all([
        assignmentService.getAssignments().catch(() => []),
        assignmentService.getOptions().catch(() => ({ drivers: [], collectors: [], vehicles: [], zones: [] })),
        vehicleService.getAll().catch(() => []),
        vehicleTrackingService.getLiveFleet().catch(() => ({ data: [] }))
      ]);
      
      setAssignments(Array.isArray(assigns) ? assigns : []);
      setTrucks(Array.isArray(allVehicles) ? allVehicles : []);
      setFleetWithLogs(liveFleetRes?.data || []); 
      
      setDataOptions({
        drivers: opts?.drivers || [],
        collectors: opts?.collectors || [],
        vehicles: opts?.vehicles || [],
        zones: opts?.zones || []
      });
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  const processedAssignments = useMemo(() => {
    let filtered = assignments.filter(a => 
      `${a.first_name} ${a.last_name} ${a.vehicle_name} ${a.zone_name}`
      .toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => sortOrder === 'asc' ? a.task_id - b.task_id : b.task_id - a.task_id);
  }, [assignments, searchTerm, sortOrder]);

  const processedTrucks = useMemo(() => {
    let filtered = trucks.filter(t => `${t.vehicle_name} ${t.plate_number} ${t.status}`.toLowerCase().includes(searchTerm.toLowerCase()));
    const data = filtered.map(truck => {
        const assignedTeams = assignments.filter(a => Number(a.vehicle_id) === Number(truck.vehicle_id));
        return {
          ...truck,
          details: assignedTeams.map(a => ({
            driverName: `${a.first_name} ${a.last_name}`,
            zoneName: a.zone_name,
            startTime: a.start_time,
            endTime: a.end_time,
            workDays: a.work_days || []
          })),
          hasAssignment: assignedTeams.length > 0
        };
      });
    return data.sort((a, b) => sortOrder === 'asc' ? a.vehicle_id - b.vehicle_id : b.vehicle_id - a.vehicle_id);
  }, [trucks, assignments, searchTerm, sortOrder]);

  const allDutyLogs = useMemo(() => {
    const logs = [];
    const seen = new Set();
    fleetWithLogs.forEach(truck => {
      if (truck.history && Array.isArray(truck.history)) {
        truck.history.forEach(log => {
          const uniqueKey = `${truck.vehicle_id}_${log.date}_${log.start}`;
          if (!seen.has(uniqueKey)) {
            if (startDate && endDate) {
                const logDate = new Date(log.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                start.setHours(0,0,0,0);
                end.setHours(23,59,59,999);
                if (logDate < start || logDate > end) return;
            }
            seen.add(uniqueKey);
            logs.push({
              ...log,
              vehicle_name: log.log_vehicle_name,
              plate_number: log.log_plate_number,
              zone_name: log.log_zone_name,
              schedStart: log.schedStart,
              schedEnd: log.schedEnd,
              workDays: log.workDays || [],
              task_id: truck.task_id
            });
          }
        });
      }
    });
    let filtered = logs.filter(log => `${log.driverName} ${log.vehicle_name} ${log.zone_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [fleetWithLogs, searchTerm, startDate, endDate]);

  const handleSaveAssignment = async (payload) => {
    let res = editingAssignment ? await assignmentService.update(editingAssignment.task_id, payload) : await assignmentService.establish(payload);
    if (!res.error) { setIsModalOpen(false); setEditingAssignment(null); await loadData(); triggerNotif(editingAssignment ? "Assignment updated!" : "New team established!", "success"); } else triggerNotif(res.error, "error");
  };

  const handleRegisterVehicle = async (payload) => {
    let res = editingTruck ? await vehicleService.update(editingTruck.vehicle_id, payload) : await vehicleService.register(payload);
    if (!res.error) { setIsTruckModalOpen(false); setEditingTruck(null); await loadData(); triggerNotif(editingTruck ? "Vehicle profile updated!" : "New vehicle registered!", "success"); } else triggerNotif(res.error, "error");
  };

  const handleEditAssignmentClick = (row) => { setEditingAssignment(row); setIsModalOpen(true); };
  const handleEditTruckClick = (truck) => { setEditingTruck(truck); setIsTruckModalOpen(true); };

  const triggerArchive = (id) => { setAssignmentToArchive(id); setIsConfirmOpen(true); };
  const handleConfirmArchive = async () => {
    try {
      const result = await assignmentService.deleteAssignment(assignmentToArchive); 
      if (!result?.error) { await loadData(); triggerNotif("Assignment moved to Archive Center.", "warning"); } else { triggerNotif(result.error || "Failed to archive assignment.", "error"); }
    } catch (error) { triggerNotif("Connection error.", "error"); } finally { setIsConfirmOpen(false); setAssignmentToArchive(null); }
  };

  const triggerTruckArchive = (id) => { setTruckToArchive(id); setIsTruckConfirmOpen(true); };
  const handleConfirmTruckArchive = async () => {
    try {
      const result = await vehicleService.deleteVehicle(truckToArchive); 
      if (!result?.error) { await loadData(); triggerNotif("Vehicle moved to Archive Center.", "warning"); } else { triggerNotif(result.error || "Failed to archive vehicle.", "error"); }
    } catch (error) { triggerNotif("Connection error.", "error"); } finally { setIsTruckConfirmOpen(false); setTruckToArchive(null); }
  };

  const kpiCards = [
    { label: 'Active Drivers', value: dataOptions.drivers?.length || 0, sub: 'Personnel Ready', icon: User, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Ready Fleet', value: trucks.filter(v => v.status === 'Active').length, sub: 'Ready Assets', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Maintenance', value: trucks.filter(v => v.status === 'Maintenance').length, sub: 'Service Required', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active Teams', value: assignments.filter(a => a.assignment_status === 'Active').length, sub: 'Ongoing Tasks', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (!user) return null;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="h-full bg-[#f0fdf4] overflow-y-auto relative font-sans text-slate-700">
      
      <header className={l.header}>
        <div className="relative w-full max-w-4xl group flex items-center gap-3"> 
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input type="text" placeholder={`Search logistics...`} className={l.searchBox} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-red-500 cursor-pointer"><X size={18} /></button>}
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-2.5 rounded-xl text-slate-500 hover:text-emerald-600 transition-all bg-white border border-slate-100 shadow-sm flex items-center gap-2 text-xs font-bold">
            {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}<span className="hidden sm:inline uppercase">{sortOrder}</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={loadData} className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-600 transition-all bg-white border border-slate-100 shadow-sm"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></motion.button>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700"><Bell size={24} /></button>
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className={`${l.profileCircle} cursor-pointer hover:ring-4 hover:ring-green-100 transition-all overflow-hidden border border-gray-100`} onClick={() => navigate("/profile-settings")}>
                {user.profile_picture ? <img src={`http://localhost:5000${user.profile_picture}`} alt="profile" className="w-full h-full object-cover" /> : <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} alt="profile" />}
            </div>
          </div>
        </div>
      </header>
      
      <main className="p-8 space-y-8">
        
        <motion.div variants={itemVars} className="flex justify-between items-end">
          <div className={u.titleSection} style={{ marginBottom: 0 }}>
            <h2 className="text-3xl font-bold text-[#1B5E20]">Logistics Control</h2>
            <p className="text-gray-600 text-sm mt-1">Monitor personnel deployment and vehicle fleet</p>
          </div>
          <button onClick={() => navigate("/archive-center")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
            <Archive size={14} /> View Archives
          </button>
        </motion.div>

        <motion.div variants={containerVars} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((stat, i) => (
            <motion.div key={i} variants={itemVars} whileHover={{ y: -5 }} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-600 flex items-start gap-4 transition-all group">
              <div className={`p-3 ${stat.bg} rounded-xl group-hover:scale-110 transition-transform`}><stat.icon size={22} className={stat.color} /></div>
              <div className="flex flex-col justify-center">
                <p className="text-xs text-gray-500 font-bold mb-0.5 uppercase tracking-tight">{stat.label}</p>
                <h3 className="text-2xl font-black text-gray-800 leading-none">{stat.value}</h3>
                <p className="text-[10px] font-bold text-gray-400 mt-1">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={itemVars} className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-[6px] border-t-[#2B9447] overflow-hidden min-h-[500px] flex flex-col">
          
          {/* 🔥 UPDATED TABLE CONTROLS: Tabs on Left, Actions (Calendar/Buttons) on Right */}
          <div className="flex items-center justify-between p-4 bg-white border-b border-slate-50">
            {/* Left Side: Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg relative w-96">
                <div className={`absolute top-1 bottom-1 left-1 w-[calc(33.33%-4px)] bg-white rounded-md shadow-sm transition-transform duration-300 ${activeTab === 'trucks' ? 'translate-x-full' : activeTab === 'logs' ? 'translate-x-[200%]' : 'translate-x-0'}`} />
                <button onClick={() => setActiveTab('assign')} className={`relative z-10 flex-1 px-4 py-2 text-xs font-bold ${activeTab === 'assign' ? 'text-green-800' : 'text-gray-500'}`}>Assign Task</button>
                <button onClick={() => setActiveTab('trucks')} className={`relative z-10 flex-1 px-4 py-2 text-xs font-bold ${activeTab === 'trucks' ? 'text-green-800' : 'text-gray-500'}`}>View Trucks</button>
                <button onClick={() => setActiveTab('logs')} className={`relative z-10 flex-1 px-4 py-2 text-xs font-bold ${activeTab === 'logs' ? 'text-green-800' : 'text-gray-500'}`}>Duty Logs</button>
            </div>

            {/* Right Side: Calendar or Buttons */}
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {activeTab === 'logs' ? (
                  <motion.div 
                    key="log-filters"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} 
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 shadow-inner"
                  >
                    <Calendar size={14} className="text-emerald-600 mr-1" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Period:</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-[11px] font-black text-slate-700 outline-none bg-transparent cursor-pointer" />
                        <span className="text-slate-300">—</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-[11px] font-black text-slate-700 outline-none bg-transparent cursor-pointer" />
                    </div>
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-rose-500 border border-slate-100 transition-all">
                            <X size={12} />
                        </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.button 
                    key="action-btn"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                    onClick={() => { setEditingAssignment(null); setEditingTruck(null); activeTab === 'assign' ? setIsModalOpen(true) : setIsTruckModalOpen(true) }} 
                    className="bg-[#98EE99] hover:bg-[#86d987] text-gray-800 px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm border border-green-200 transition-all"
                  >
                    <Plus size={16} className="bg-green-800 text-white rounded-full p-0.5" /> 
                    {activeTab === 'assign' ? 'Assign Driver & Collector' : 'Register Vehicle'}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden px-4 pb-4">
            <AnimatePresence mode="wait">
              {activeTab === 'assign' ? (
                <motion.div key="assign-tab" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="h-full">
                    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                      <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-slate-50/80">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Ref ID</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Operational Team</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Fleet Asset</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Zone</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Schedule Profile</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Timeline</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {processedAssignments.map((row, idx) => (
                            <motion.tr key={row.task_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="group hover:bg-slate-50/30 transition-all duration-200">
                              <td className="px-6 py-6 align-top font-mono text-[11px] font-semibold text-slate-400"><span className="bg-slate-100/80 px-2 py-1 rounded">#{row.task_id}</span></td>
                              <td className="px-6 py-6 align-top">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-[11px] text-white font-black shadow-sm">{(row.first_name || 'U').charAt(0)}</div>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-black text-slate-800 leading-tight">{row.first_name} {row.last_name}</span>
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">Lead Driver</span>
                                  </div>
                                </div>
                                <div className="pl-11 flex flex-wrap gap-1.5">
                                  {row.collector_names?.map((fullName, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
                                      <div className="w-1 h-1 rounded-full bg-emerald-400" /><span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">{fullName}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-6 align-top">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700">
                                    <Truck size={14} className={row.truck_archived ? "text-rose-400" : "text-slate-300"} /> 
                                    <span className={row.truck_archived ? "text-slate-400 line-through decoration-rose-400" : ""}>{row.vehicle_name}</span>
                                    {row.truck_archived ? (
                                      <span className="bg-rose-100 text-rose-700 border-rose-200 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border shadow-sm flex items-center gap-1"><Ban size={10} /> Archived</span>
                                    ) : (
                                      row.truck_status && row.truck_status !== 'Active' && (
                                        <span className={`text-[8px] font-black uppercase tracking-tighter border shadow-sm ${row.truck_status === 'Maintenance' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{row.truck_status}</span>
                                      )
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-bold pl-5 tracking-widest uppercase w-fit px-1.5 rounded ${row.truck_archived ? 'text-rose-400 bg-rose-50' : 'text-slate-400 bg-slate-50'}`}>{row.plate_number || '---'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6 align-top">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-emerald-50/50 border border-emerald-100 px-3 py-1.5 rounded-xl w-fit"><MapPin size={14} className="text-emerald-500" /> {row.zone_name}</div>
                              </td>
                              <td className="px-6 py-6 align-top">
                                <div className="flex flex-col gap-3">
                                  <div className="flex -space-x-1">
                                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                                        const isActive = Array.isArray(row.work_days) && row.work_days.includes(day);
                                        return (
                                          <div key={i} className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black shadow-sm transition-all ${isActive ? 'bg-emerald-500 text-white z-10 scale-110' : 'bg-slate-100 text-slate-300'}`}>{day.charAt(0)}</div>
                                        );
                                      })}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600"><Clock size={12} className="text-emerald-500" /> {row.start_time} - {row.end_time}</div>
                                </div>
                              </td>
                              <td className="px-6 py-6 align-top">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-tighter"><Calendar size={12} className="text-emerald-600" /> {row.start_date ? new Date(row.start_date).toLocaleDateString('en-GB') : 'N/A'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-4.5">TO {row.end_date ? new Date(row.end_date).toLocaleDateString('en-GB') : '---'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-right align-top">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditAssignmentClick(row)} className="p-2 text-slate-400 hover:text-emerald-600 transition-all bg-white rounded-lg border border-slate-100 shadow-sm" title="Edit Assignment"><Edit3 size={16} /></button>
                                  <button onClick={() => triggerArchive(row.task_id)} className="p-2 text-slate-400 hover:text-rose-500 transition-all bg-white rounded-lg border border-slate-100 shadow-sm" title="Archive Assignment"><Archive size={16} /></button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </motion.div>
              ) : activeTab === 'trucks' ? (
                <motion.div key="trucks-tab" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="h-full">
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-left border-separate border-spacing-0 table-fixed">
                      <thead>
                        <tr className="bg-slate-50/80">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[10%]">Asset ID</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[25%]">Asset Profile</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[40%]">Operational Timeline</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 w-[15%]">Status</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right w-[10%]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {processedTrucks.map((truck, idx) => (
                          <motion.tr key={truck.vehicle_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }} className="group hover:bg-slate-50/40 transition-all duration-200">
                            <td className="px-6 py-8 align-top font-mono text-[11px] font-black text-slate-400"><span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">V-{truck.vehicle_id}</span></td>
                            <td className="px-6 py-8 align-top">
                              <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${truck.status === 'Active' ? 'bg-slate-100 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-amber-100 text-amber-600'}`}><Truck size={24} /></div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{truck.vehicle_name}</span>
                                  <span className="text-[10px] font-bold text-slate-400 mt-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-fit tracking-widest uppercase">{truck.plate_number || '---'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-8 align-top">
                              {truck.status === 'Active' ? (
                                truck.hasAssignment ? (
                                  <div className="flex flex-col gap-6">
                                    {truck.details.map((shift, i) => (
                                      <div key={i} className="relative pl-6 border-l-2 border-emerald-500/20">
                                        <div className="absolute -left-1.25 top-0 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                        <div className="flex flex-col gap-2">
                                          <div className="flex items-center gap-3"><span className="text-[13px] font-black text-slate-700">{shift.driverName}</span><div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-tighter"><MapPin size={10} /> {shift.zoneName}</div></div>
                                          <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[11px] font-black shadow-md"><Clock size={12} className="text-emerald-400" /> {shift.startTime} — {shift.endTime}</div>
                                            <div className="flex gap-1">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (<div key={d} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all ${shift.workDays.includes(d) ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm scale-110' : 'bg-slate-50 text-slate-200 border-transparent'}`}>{d.charAt(0)}</div>))}</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest italic py-2 flex items-center gap-2"><AlertCircle size={14}/> Standby Mode</span>
                              ) : (
                                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border w-fit ${truck.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                  {truck.status === 'Maintenance' ? <Wrench size={18} className="animate-pulse" /> : <Ban size={18} />}
                                  <span className="text-[11px] font-black uppercase tracking-widest">Asset Unavailable: {truck.status}</span>
                                </motion.div>
                              )}
                            </td>
                            <td className="px-6 py-8 align-top">
                              <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-2xl border w-fit ${
                                truck.status === 'Maintenance' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                truck.status === 'Inactive' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                truck.hasAssignment ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                              }`}>{truck.status !== 'Active' ? truck.status : (truck.hasAssignment ? 'On Deployment' : 'Standby')}</span>
                            </td>
                            <td className="px-6 py-8 text-right align-top">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => handleEditTruckClick(truck)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-emerald-600 shadow-sm transition-all active:scale-90"><Edit3 size={18} /></button>
                                  <button onClick={() => triggerTruckArchive(truck.vehicle_id)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 shadow-sm transition-all active:scale-90"><Archive size={18} /></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="logs-tab" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="h-full">
                   <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50/80">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Date Logged</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Personnel & Team</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Duty Timeline</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Zone</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Fleet Asset</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Performance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {allDutyLogs.length > 0 ? allDutyLogs.map((log, idx) => (
                          <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }} className="group hover:bg-slate-50/40 transition-all duration-200">
                             <td className="px-6 py-6 align-top">
                               <div className="flex items-center gap-3 text-[#1B5E20]">
                                  <Calendar size={16} className="bg-emerald-50 p-0.5 rounded" />
                                  <span className="text-[13px] font-black">{log.date}</span>
                               </div>
                             </td>
                             <td className="px-6 py-6 align-top">
                               <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-tighter">Driver</span>
                                     <span className="text-[13px] font-black text-slate-800">{log.driverName}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 pl-11">
                                     {log.collectors?.map((name, i) => (
                                       <span key={i} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{name}</span>
                                     ))}
                                  </div>
                               </div>
                             </td>
                             <td className="px-6 py-6 align-top">
                               <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-700"><Clock size={12} className="text-blue-500" /> {log.start} — {log.end}</div>
                                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-5">Sched: {log.schedStart} - {log.schedEnd}</div>
                                  <div className="flex -space-x-1 pl-5 pt-1">
                                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                                        const isActive = Array.isArray(log.workDays) && log.workDays.includes(day);
                                        return (
                                          <div key={i} className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black shadow-sm transition-all ${isActive ? 'bg-emerald-500 text-white z-10 scale-110' : 'bg-slate-100 text-slate-300'}`}>{day.charAt(0)}</div>
                                        );
                                      })}
                                  </div>
                               </div>
                             </td>
                             <td className="px-6 py-6 align-top">
                               <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 w-fit"><MapPin size={12} /> {log.zone_name}</div>
                             </td>
                             <td className="px-6 py-6 align-top">
                               <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-slate-700 uppercase">{log.vehicle_name}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{log.plate_number}</span>
                               </div>
                             </td>
                             <td className="px-6 py-6 align-top">
                                <div className="flex gap-4">
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Bins</span>
                                      <span className="text-[12px] font-black text-emerald-600 flex items-center gap-1"><Trash2 size={10}/> {log.bins}</span>
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Reports</span>
                                      <span className="text-[12px] font-black text-blue-600 flex items-center gap-1"><CheckCircle2 size={10}/> {log.reports}</span>
                                   </div>
                                </div>
                             </td>
                          </motion.tr>
                        )) : (
                          <tr><td colSpan="6" className="px-6 py-20 text-center text-slate-400 italic">No historical duty logs found in the system.</td></tr>
                        )}
                      </tbody>
                    </table>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <CreateAssignmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAssignment(null); }} onCreate={handleSaveAssignment} dataOptions={dataOptions} editingData={editingAssignment} />
      <RegisterTruckModal isOpen={isTruckModalOpen} onClose={() => { setIsTruckModalOpen(false); setEditingTruck(null); }} onCreate={handleRegisterVehicle} editingData={editingTruck} />
      <ConfirmDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmArchive} title="Archive Assignment?" message="This operational team assignment will be removed from the active schedule and moved to the system archives." confirmText="Archive Now" type="warning" />
      <ConfirmDialog isOpen={isTruckConfirmOpen} onClose={() => setIsTruckConfirmOpen(false)} onConfirm={handleConfirmTruckArchive} title="Archive Fleet Asset?" message="This vehicle will be removed from the active fleet and moved to the system archives." confirmText="Archive Now" type="warning" />
      <Notification show={notif.show} message={notif.message} type={notif.type} onClose={() => setNotif({ ...notif, show: false })} />
    </motion.div>
  );
};

export default AssignTask;