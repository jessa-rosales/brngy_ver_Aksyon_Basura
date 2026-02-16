import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Map as MapIcon, Inbox, X, ArrowUp, Trash2, ChevronDown, AlertCircle, Clock, ChevronRight, Image as ImageIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, LayersControl, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { design } from '../styles/design'; 

// SERVICES & CONTEXT
import { zoneService } from '../services/zoneService';
import { reportService } from '../services/reportService'; 
import { useUser } from '../context/UserContext';

// ✅ ROBUST HELPER: Ensures reports show up geographically inside zones
const isPointInPolygon = (lat, lng, polygon) => {
  if (!polygon || !Array.isArray(polygon)) return false;
  const x = Number(lat);
  const y = Number(lng);
  let inside = false;
  
  // Flatten depth if needed
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

const MapFocusHandler = ({ selectedZoneId, zones }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedZoneId === 'all') {
      // Zoom back out to city level
      map.setView([8.4822, 124.6472], 15, { animate: true });
    } else {
      const activeZone = zones.find(z => String(z.zone_id) === String(selectedZoneId));
      if (activeZone && activeZone.boundaries) {
        // Flatten boundaries to calculate the box area
        const positions = Array.isArray(activeZone.boundaries[0]) 
          ? activeZone.boundaries[0] 
          : activeZone.boundaries;
        
        // Convert to LatLng objects for Leaflet
        const latLngs = positions.map(p => [
          Number(p.lat ?? p[0]), 
          Number(p.lng ?? p[1])
        ]);

        // Automatically zoom the map to fit the selected zone
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
      }
    }
  }, [selectedZoneId, zones, map]);

  return null;
};

const dashboardBinIcon = new L.DivIcon({
  html: renderToStaticMarkup(
    <div className="relative flex items-center justify-center">
      <div className="absolute w-8 h-8 bg-emerald-500/20 rounded-full animate-pulse" />
      <div className="relative bg-emerald-700 p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
        <Trash2 color="white" size={12} />
      </div>
      <div className="absolute -bottom-1 w-2 h-2 bg-emerald-700 rotate-45 border-r border-b border-white" />
    </div>
  ),
  className: 'main-bin-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const reportIcon = new L.DivIcon({
  html: renderToStaticMarkup(
    <div className="relative flex items-center justify-center">
      {/* Outer Pulse Effect */}
      <div className="absolute w-10 h-10 bg-rose-500/40 rounded-full animate-ping" />
      {/* Main Pin Container */}
      <div className="relative bg-rose-600 p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
        <AlertCircle color="white" size={12} fill="white" fillOpacity={0.2} />
      </div>
      {/* Bottom Pointer Tip */}
      <div className="absolute -bottom-1 w-2 h-2 bg-rose-600 rotate-45 border-r border-b border-white" />
    </div>
  ),
  className: 'report-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [zones, setZones] = useState([]);
  const [allBins, setAllBins] = useState([]);
  const [allReports, setAllReports] = useState([]); 
  
  const [selectedZoneId, setSelectedZoneId] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef(null); 
  const { layout: l, dashboard: d, ui } = design;

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const [zoneData, binData, reportData] = await Promise.all([
          zoneService.getZones(),
          zoneService.getAllBins(),
          reportService.getAllReports()
        ]);
        setZones(zoneData || []);
        setAllBins(binData || []);
        setAllReports(reportData.reports || []);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      }
    };
    if (user) loadMapData();
  }, [user]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      if (container) setShowBackToTop(container.scrollTop > 400);
    };
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  // ✅ FILTERS
  const filteredZones = selectedZoneId === 'all' 
    ? zones 
    : zones.filter(z => String(z.zone_id) === String(selectedZoneId));

  const filteredBins = selectedZoneId === 'all' 
    ? allBins 
    : allBins.filter(b => String(b.zone_id) === String(selectedZoneId));

  const filteredReports = allReports.filter(report => {
    if (report.status !== 'Pending') return false;
    if (selectedZoneId === 'all') return true;
    const activeZone = zones.find(z => String(z.zone_id) === String(selectedZoneId));
    if (!activeZone || !activeZone.boundaries) return false;
    return isPointInPolygon(report.latitude, report.longitude, activeZone.boundaries);
  });

  const currentZoneName = selectedZoneId === 'all' ? 'All Zones' : zones.find(z => String(z.zone_id) === String(selectedZoneId))?.zone_name;

  if (!user) return null;

const getRelativeTime = (dateString) => {
  const now = new Date();
  const posted = new Date(dateString);
  const diffInSeconds = Math.floor((now - posted) / 1000);
  const diffInHours = Math.floor(diffInSeconds / 3600);

  // ✅ IF OLDER THAN 24H: Show Full Date (Month, Day, Year) + Exact Time
  if (diffInHours >= 24) {
    return posted.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', // Added the Year here
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    }).replace(',', ' •'); // Replaces the first comma with a bullet for cleaner look
  }

  // Standard Relative Logic for < 24 hrs
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  return `${diffInHours}hr${diffInHours > 1 ? 's' : ''} ago`;
};

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto relative bg-[#f0fdf4]" onClick={() => setIsDropdownOpen(false)}>
      
      {/* HEADER */}
      <header className={l.header}>
        <div className="relative w-full max-w-2xl group flex items-center gap-3"> 
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input type="text" placeholder="Search..." className={l.searchBox} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700"><Bell size={24} /></button>
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className={`${l.profileCircle} overflow-hidden border border-gray-100`} onClick={() => navigate("/profile-settings")}>
              <img src={user.profile_picture ? `http://localhost:5000${user.profile_picture}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8">
        <div className="-mt-5">
          <h2 className="text-2xl font-bold text-[#1B5E20]">Dashboard Overview</h2>
          <p className="text-gray-600 text-sm">Real-time waste collection monitoring and management</p>

         {/* <p className="text-gray-600 text-sm">Real-time waste collection monitoring and management Monitoring Area: <span className="font-bold text-green-700">{currentZoneName}</span></p>*/}
        </div>

        {/* KPI CARDS */}
        <div className={d.kpiGrid}>
          {[
            { label: 'Bins Collected Today', value: '0' },
            { label: 'Missed Pickups', value: '0' },
            { label: 'Pending Reports', value: filteredReports.length || '0' },
            { label: 'Total Zones', value: zones.length || '0' }, 
          ].map((stat, i) => (
            <div key={i} className={d.kpiCard}>
              <p className={d.kpiLabel}>{stat.label}</p>
              <h3 className={d.kpiValue}>{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* MAP SECTION */}
        <div className={d.mapCard}>
          <div className={d.mapHeader}>
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><MapIcon size={18} className="text-green-600" /> Interactive Map View</h3>
            
            <div className="flex gap-2 relative">
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all min-w-[150px] justify-between">
                  <span className="truncate">{currentZoneName}</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-[5000] py-2 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => { setSelectedZoneId('all'); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-bold hover:bg-green-50 ${selectedZoneId === 'all' ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>All Zones</button>
                    {zones.map(zone => (
                      <button key={zone.zone_id} onClick={() => { setSelectedZoneId(zone.zone_id); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-bold hover:bg-green-50 ${selectedZoneId === zone.zone_id ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>{zone.zone_name}</button>
                    ))}
                  </div>
                )}
              </div>
              <button className={ui.btnPlayback}>PLAYBACK</button>
            </div>
          </div>
          
          <div className={d.mapFrame}>
            {selectedZoneId !== 'all' && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[4000] flex gap-4 pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-green-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zone Bins</span>
                      <span className="text-xl font-black text-green-700">{filteredBins.length}</span>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zone Reports</span>
                      <span className="text-xl font-black text-rose-600">{filteredReports.length}</span>
                    </div>
                  </div>
                </div>
             )}    
            
            <MapContainer center={[8.4822, 124.6472]} zoom={15}  style={{ height: "100%", width: "100%" }}>
              <MapFocusHandler selectedZoneId={selectedZoneId} zones={zones} />
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Google Streets">
                    <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite View">
                    <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {filteredZones.map((zone) => {
                  if (!zone.boundaries) return null;
                  const positions = Array.isArray(zone.boundaries[0]) ? zone.boundaries[0] : zone.boundaries;
                  return (
                    <Polygon key={`dash-zone-${zone.zone_id}`} positions={positions} pathOptions={{ color: zone.zone_color || '#2E7D32', fillColor: zone.zone_color || '#2E7D32', fillOpacity: 0.2, weight: 1.5 }}>
                      <Popup><h4 className="font-bold text-gray-800">{zone.zone_name}</h4></Popup>
                    </Polygon>
                  );
                })}

                {filteredBins.map((bin) => (
                  <Marker key={`dash-bin-${bin.bin_id}`} position={[Number(bin.latitude), Number(bin.longitude)]} icon={dashboardBinIcon}>
                    <Popup><p className="font-bold text-gray-800 text-sm">{bin.bin_name}</p><p className="text-[10px] uppercase font-black">{bin.collection_status || 'Pending'}</p></Popup>
                  </Marker>
                ))}

                {filteredReports.map((report) => (
                  <Marker key={`dash-rep-${report.report_id}`} position={[Number(report.latitude), Number(report.longitude)]} icon={reportIcon}>
                    <Popup><p className="font-bold text-red-600 text-sm">{report.issue_type}</p><p className="text-[10px] text-gray-500 uppercase">{report.location_address}</p></Popup>
                  </Marker>
                ))}
             </MapContainer>
          </div>
          <div className={d.mapLegend}>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-600" /><span>Waste Bins</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>Citizen Reports</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#2E7D32] opacity-50" /><span>Active Zones</span></div>
          </div>
        </div>

        {/* LOWER LOGS */}
        {/* LOWER LOGS */}
        <div className={d.listGrid}>
          <div className={d.citizenCard}>
            <div className="p-5 flex justify-between items-center border-b bg-white rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-700">Citizen Report</h3>
              <button className={ui.btnSeeAllOrange} onClick={() => navigate('/reports')}>See All</button>
            </div>
            
            <div className="max-h-[460px] overflow-y-auto bg-white">
              {filteredReports.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {filteredReports.map((report) => (
                    <div 
                      key={report.report_id} 
                      className="p-4 hover:bg-orange-50/50 cursor-pointer transition-colors group flex items-center justify-between"
                      onClick={() => navigate('/reports', { state: { autoOpenId: report.report_id } })}
                    >
                      <div className="flex gap-4 items-start flex-1">
                        {/* IMAGE THUMBNAIL */}
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm flex-shrink-0">
                          {report.photo_evidence_url ? (
                            <img 
                              src={`http://localhost:5000${report.photo_evidence_url}`} 
                              alt="report" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>

                        {/* TEXT CONTENT */}
                        <div className="flex-1 pr-2">
                          <div className="flex justify-between items-start w-full">
                            <p className="text-sm font-black text-gray-800 line-clamp-1">{report.issue_type}</p>
                            
                            {/* ✅ Shows Relative time or Full Date with Year/Time based on age */}
                            <p 
                              title={new Date(report.created_at).toLocaleString()} // Native tooltip shows full raw timestamp on hover
                              className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter whitespace-nowrap ml-2 cursor-help"
                            >
                              {getRelativeTime(report.created_at)}
                            </p>
                          </div>
                          
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter mt-0.5">
                            Reported By: {report.reporter_name || 'Anonymous'}
                          </p>

                          {/* ✅ DESCRIPTION ADDED BELOW */}
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-medium italic">
                            "{report.description || 'No description provided'}"
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={d.emptyState}>
                  <Inbox size={48} className="text-orange-300 mb-2" />
                  <p className={d.emptyText}>No Pending Reports</p>
                </div>
              )}
            </div>
          </div>

          <div className={d.photoCard}>
            <div className="p-5 flex justify-between items-center border-b">
              <h3 className="text-xl font-bold text-gray-700">Photo Proof</h3>
              <div className="flex gap-2">
                 <button className={ui.btnApprove}>Approve</button>
                 <button className={ui.btnSeeAllGreen}>See All</button>
              </div>
            </div>
            <div className={d.emptyState}>
              <Inbox size={48} className="text-green-300 mb-2" />
              <p className={d.emptyText}>No Proof Uploaded</p>
            </div>
          </div>
        </div>
      </main>

      {showBackToTop && (
        <button onClick={scrollToTop} className={`${ui.backToTop} flex items-center justify-center animate-bounce z-[2000]`}><ArrowUp size={24} /></button>
      )}
    </div>
  );
};

export default Dashboard;