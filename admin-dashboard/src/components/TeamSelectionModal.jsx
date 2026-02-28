import React from 'react';
import { X, Users, Truck, MapPin, Clock, ChevronRight, AlertTriangle } from 'lucide-react';

const TeamSelectionModal = ({ isOpen, onClose, teams, onSelect, report, allReports = [], allZones = [] }) => {
  if (!isOpen) return null;

  const activeTeams = teams ? teams.filter(team => !team.is_archived) : [];

  // Helper to determine which zone a report belongs to based on coordinates
  const isPointInPolygon = (lat, lng, polygon) => {
    if (!polygon) return false;
    const x = Number(lat);
    const y = Number(lng);
    let inside = false;
    const coords = Array.isArray(polygon[0][0]) || typeof polygon[0][0] === 'object' ? polygon[0] : polygon;
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

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[32px] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800">Assign Operational Team</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
              Select a team for: <span className="text-emerald-600">{report?.issue_type === 'Other' ? report?.issue_type_other : report?.issue_type}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Team List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeTeams.length > 0 ? (
            activeTeams.map((team) => {
              
              // ✅ MODIFIED: Get each individual report's ID and Zone Name
              const teamReports = allReports.filter(r => r.assigned_team_id === team.task_id && r.status === 'In Progress');
              
              const activeReportDetails = teamReports.map(r => {
                const foundZone = allZones.find(z => isPointInPolygon(r.latitude, r.longitude, z.boundaries || z.coordinates));
                return {
                  id: r.report_id,
                  zoneName: foundZone ? foundZone.zone_name : "Unassigned Territory"
                };
              });

              return (
                <div 
                  key={team.task_id}
                  onClick={() => onSelect(team)}
                  className="group border border-slate-100 rounded-2xl p-5 flex flex-col gap-4 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer relative overflow-hidden"
                >
                  {/* Top Row: Original Columns */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Team Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black shadow-sm">
                          {(team.first_name || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-none">{team.first_name} {team.last_name}</p>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Lead Driver</p>
                        </div>
                      </div>
                      
                      {/* Collectors */}
                      <div className="flex flex-wrap gap-2">
                        {team.collector_names?.map((name, i) => (
                          <span key={i} className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Fleet & Zone */}
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Truck size={14} className="text-slate-400" /> {team.vehicle_name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 pl-5 uppercase tracking-tighter">
                          {team.plate_number}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 h-fit w-fit">
                        <MapPin size={14} /> {team.zone_name}
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-600">
                        <Clock size={14} className="text-emerald-500" /> {team.start_time} - {team.end_time}
                      </div>
                      <div className="flex gap-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${team.work_days?.includes(day) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                            {day[0]}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      <ChevronRight size={24} className="text-emerald-500" />
                    </div>
                  </div>

                  {/* Separated Zone Assignments */}
                  <div className="mt-2 pt-4 border-t border-slate-100/60">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">
                      Current Territorial Assignments
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Main Assigned Zone */}
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl border border-emerald-100 flex items-center gap-1.5">
                        <MapPin size={12} className="text-emerald-500" /> Main Route: {team.zone_name}
                      </span>
                      
                      {/* ✅ UPDATED: Render each specific report with its ID and Zone */}
                      {activeReportDetails.map((rep, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-xl border border-blue-100 flex items-center gap-1.5 shadow-sm">
                          <AlertTriangle size={12} className="text-blue-500" /> Active Report #{rep.id} In: {rep.zoneName}
                        </span>
                      ))}
                      
                      {activeReportDetails.length === 0 && (
                        <span className="text-[10px] text-slate-400 font-medium italic px-2">
                          No active reports assigned
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-400 font-bold">No active teams found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionModal;