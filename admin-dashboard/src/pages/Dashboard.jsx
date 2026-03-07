import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, Map as MapIcon, Inbox, X, ArrowUp, Trash2, 
  ChevronDown, AlertCircle, Clock, ChevronRight, Image as ImageIcon,
  Flame, AlertOctagon, MapPin, BarChart3, TrendingUp
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, LayersControl, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { design } from '../styles/design'; 

// SERVICES & CONTEXT
import { zoneService } from '../services/zoneService';
import { reportService } from '../services/reportService'; 
import { collectionService } from '../services/collectionService'; 
import { useUser } from '../context/UserContext';

// Helper: Calculate distance in meters between two coordinates (Haversine formula)
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Reports show up geographically inside zones
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

// ==========================================
// 🔥 DYNAMIC MARKER ICONS
// ==========================================
const getBinIcon = (status) => {
  let outerPulse = 'bg-slate-400/20';
  let innerBg = 'bg-slate-500';
  let pinTail = 'bg-slate-500';
  let isPulse = false;

  if (status === 'pending') {
    outerPulse = 'bg-emerald-500/20';
    innerBg = 'bg-emerald-700';
    pinTail = 'bg-emerald-700';
    isPulse = true;
  } else if (status === 'missed') {
    outerPulse = 'bg-rose-500/20';
    innerBg = 'bg-rose-700';
    pinTail = 'bg-rose-700';
    isPulse = true;
  } // else gray for collected

  return new L.DivIcon({
    html: renderToStaticMarkup(
      <div className="relative flex items-center justify-center">
        {isPulse && <div className={`absolute w-8 h-8 rounded-full animate-pulse ${outerPulse}`} />}
        <div className={`relative p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${innerBg}`}>
          <Trash2 color="white" size={12} />
        </div>
        <div className={`absolute -bottom-1 w-2 h-2 rotate-45 border-r border-b border-white ${pinTail}`} />
      </div>
    ),
    className: 'main-bin-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const getReportIcon = (status) => {
  const s = (status || '').toLowerCase();
  let outerPulse = 'bg-slate-400/20';
  let innerBg = 'bg-slate-500';
  let pinTail = 'bg-slate-500';
  let animation = '';

  if (s === 'pending') {
    outerPulse = 'bg-rose-500/40';
    innerBg = 'bg-rose-600';
    pinTail = 'bg-rose-600';
    animation = 'animate-ping';
  } else if (s === 'in progress' || s === 'in_progress') {
    outerPulse = 'bg-orange-500/40';
    innerBg = 'bg-orange-600';
    pinTail = 'bg-orange-600';
    animation = 'animate-pulse';
  } // else gray for resolved

  return new L.DivIcon({
    html: renderToStaticMarkup(
      <div className="relative flex items-center justify-center">
        {animation && <div className={`absolute w-10 h-10 rounded-full ${animation} ${outerPulse}`} />}
        <div className={`relative p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${innerBg}`}>
          <AlertCircle color="white" size={12} fill="white" fillOpacity={0.2} />
        </div>
        <div className={`absolute -bottom-1 w-2 h-2 rotate-45 border-r border-b border-white ${pinTail}`} />
      </div>
    ),
    className: 'report-marker-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [zones, setZones] = useState([]);
  const [allBins, setAllBins] = useState([]);
  const [allReports, setAllReports] = useState([]); 
  const [collectedBinsHistory, setCollectedBinsHistory] = useState([]); 
  
  const [selectedZoneId, setSelectedZoneId] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const [hotspotModal, setHotspotModal] = useState({ isOpen: false, type: '', data: null });
  
  const scrollContainerRef = useRef(null); 
  const { layout: l, dashboard: d, ui } = design;

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const [zoneData, binData, reportData, collectionsData] = await Promise.all([
          zoneService.getZones(),
          zoneService.getAllBins(),
          reportService.getAllReports(),
          collectionService.getCollectedBins().catch(() => []) 
        ]);
        setZones(zoneData || []);
        setAllBins(binData || []);
        setAllReports(reportData?.reports || []);
        setCollectedBinsHistory(collectionsData || []);
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

  // ==========================================
  // 🔥 STATUS PROCESSING (Cycles & Vanish)
  // ==========================================

  // BINS LOGIC: Reset to pending if collected before 12:00 AM today
  const processedBins = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allBins.map(bin => {
      let displayStatus = (bin.collection_status || 'pending').toLowerCase(); 
      
      const collectedTime = bin.last_collected_timestamp || bin.collectedAt;
      
      if (displayStatus === 'collected' && collectedTime) {
        const collectedDate = new Date(collectedTime);
        if (collectedDate < startOfToday) {
          displayStatus = 'pending';
        }
      }
      return { ...bin, displayStatus };
    });
  }, [allBins]);

  // REPORTS LOGIC: Vanish resolved reports after 5 hours
  const visibleReports = useMemo(() => {
    const now = Date.now();
    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

    return allReports.filter(report => {
      const status = (report.status || '').toLowerCase();
      
      if (status === 'resolved' || status === 'resolve') {
        const timeField = report.resolved_at || report.resolvedAt || report.updated_at;
        
        if (timeField) {
          const resolvedTime = new Date(timeField).getTime();
          return (now - resolvedTime) < FIVE_HOURS_MS;
        }
        return false; // Hide if missing timestamp but resolved
      }
      return true; // Keep Pending and In Progress
    });
  }, [allReports]);

  // FILTERS
  const filteredZones = selectedZoneId === 'all' 
    ? zones 
    : zones.filter(z => String(z.zone_id) === String(selectedZoneId));

  const filteredBins = selectedZoneId === 'all' 
    ? processedBins 
    : processedBins.filter(b => String(b.zone_id) === String(selectedZoneId));

  const filteredReports = visibleReports.filter(report => {
    if (selectedZoneId === 'all') return true;
    const activeZone = zones.find(z => String(z.zone_id) === String(selectedZoneId));
    if (!activeZone || !activeZone.boundaries) return false;
    return isPointInPolygon(report.latitude, report.longitude, activeZone.boundaries);
  });

  const currentZoneName = selectedZoneId === 'all' ? 'All Zones' : zones.find(z => String(z.zone_id) === String(selectedZoneId))?.zone_name;

  // ==========================================
  // 🔥 UPDATED: COMBINED PHOTO PROOFS LOGIC
  // strictly filters for Collector resolved photos only
  // ==========================================
  const photoProofs = useMemo(() => {
    const proofs = [];

    // 1. Add Collected Bins
    collectedBinsHistory.forEach(bin => {
      if (bin.photoUrl) {
        proofs.push({
          id: `bin-${bin.id}`,
          rawId: bin.id, 
          isReport: false, 
          type: 'Bin Collection',
          title: bin.binName || 'Collected Bin',
          photo: bin.photoUrl,
          timestamp: bin.timestamp,
          zone: bin.zone || 'Unassigned Zone',
          collector: bin.collectorName || 'Unknown Collector',
          driver: null, 
        });
      }
    });

    // 2. Add Reports (STRICTLY ONLY COLLECTOR RESOLVED PHOTOS)
    allReports.forEach(report => {
      if (report.resolved_photo_url) { // 🔥 Checks only for the collector's resolution photo
        let zoneName = 'Unassigned Zone';
        if (zones && zones.length > 0) {
          const activeZone = zones.find(z => isPointInPolygon(report.latitude, report.longitude, z.boundaries || z.coordinates));
          if (activeZone) zoneName = activeZone.zone_name;
        }
        
        proofs.push({
          id: `rep-${report.report_id}`,
          rawId: report.report_id, 
          isReport: true, 
          type: 'Resolved Report', // Always 'Resolved Report' because we filtered purely for resolved photos
          title: report.issue_type,
          photo: `http://localhost:5000${report.resolved_photo_url}`,
          timestamp: report.resolved_at,
          zone: zoneName,
          collector: report.collector_name || 'Unknown Collector',
          driver: report.driver_name !== 'Assigning Driver...' ? report.driver_name : null
        });
      }
    });

    // Sort combined list by newest first
    return proofs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [collectedBinsHistory, allReports, zones]);

  // --- 🔥 HOTSPOT ANALYTICS LOGIC ---
  const topZones = useMemo(() => {
    const counts = {};
    allReports.forEach(report => {
      const activeZone = zones.find(z => isPointInPolygon(report.latitude, report.longitude, z.boundaries));
      const zoneName = activeZone ? activeZone.zone_name : 'Unassigned Territory';
      
      if (!counts[zoneName]) {
        counts[zoneName] = { total: 0, issues: {} };
      }
      
      counts[zoneName].total += 1;
      counts[zoneName].issues[report.issue_type] = (counts[zoneName].issues[report.issue_type] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, data]) => ({ name, count: data.total, issues: data.issues }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); 
  }, [allReports, zones]);

  const topBins = useMemo(() => {
    const counts = {};
    allReports.forEach(report => {
      if (['Overflowing Bin', 'Missed Pickup'].includes(report.issue_type)) {
        let nearestBin = null;
        let minDistance = Infinity;
        
        allBins.forEach(bin => {
          const dist = getDistanceInMeters(report.latitude, report.longitude, bin.latitude, bin.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearestBin = bin;
          }
        });

        if (nearestBin && minDistance <= 50) {
          const binName = nearestBin.bin_name;
          if (!counts[binName]) {
            const parentZone = zones.find(z => String(z.zone_id) === String(nearestBin.zone_id));
            const zoneName = parentZone ? parentZone.zone_name : 'Unassigned Zone';
            
            counts[binName] = { total: 0, issues: {}, zoneName: zoneName };
          }
          counts[binName].total += 1;
          counts[binName].issues[report.issue_type] = (counts[binName].issues[report.issue_type] || 0) + 1;
        }
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, count: data.total, issues: data.issues, zoneName: data.zoneName }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); 
  }, [allReports, allBins, zones]); 
  
  // --- REAL DATA KPI CALCULATIONS ---
  const binsCollectedToday = useMemo(() => {
    return filteredBins.filter(b => b.displayStatus === 'collected').length;
  }, [filteredBins]);

  const missedPickupsCount = useMemo(() => {
    return filteredReports.filter(r => r.issue_type === 'Missed Pickup').length;
  }, [filteredReports]);

  if (!user) return null;

  const getRelativeTime = (dateString) => {
    const now = new Date();
    const posted = new Date(dateString);
    const diffInSeconds = Math.floor((now - posted) / 1000);
    const diffInHours = Math.floor(diffInSeconds / 3600);

    if (diffInHours >= 24) {
      return posted.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      }).replace(',', ' •');
    }

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
        </div>

        {/* KPI CARDS */}
        <div className={d.kpiGrid}>
          {[
            { label: 'Bins Collected', value: binsCollectedToday || '0' },
            { label: 'Missed Pickups', value: missedPickupsCount || '0' },
            { label: 'Pending Reports', value: filteredReports.filter(r => r.status === 'Pending').length || '0' },
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
                  <Marker key={`dash-bin-${bin.bin_id}`} position={[Number(bin.latitude), Number(bin.longitude)]} icon={getBinIcon(bin.displayStatus)}>
                    <Popup>
                      <p className="font-bold text-gray-800 text-sm">{bin.bin_name}</p>
                      <p className="text-[10px] uppercase font-black">{bin.displayStatus}</p>
                    </Popup>
                  </Marker>
                ))}

                {filteredReports.map((report) => (
                  <Marker key={`dash-rep-${report.report_id}`} position={[Number(report.latitude), Number(report.longitude)]} icon={getReportIcon(report.status)}>
                    <Popup>
                      <p className="font-bold text-slate-800 text-sm">{report.issue_type}</p>
                      <p className={`text-[10px] uppercase font-black mb-1 ${
                        report.status === 'Resolved' ? 'text-slate-500' :
                        report.status === 'In Progress' ? 'text-orange-500' : 'text-rose-500'
                      }`}>
                        {report.status}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">{report.location_address}</p>
                    </Popup>
                  </Marker>
                ))}
             </MapContainer>
          </div>
          
          <div className={`${d.mapLegend} flex-wrap`}>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span>Pending Bin</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400" /><span>Collected Bin / Resolved Report</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-600" /><span>Missed Bin / Pending Report</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /><span>Report In Progress</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#2E7D32] opacity-50" /><span>Active Zones</span></div>
          </div>
        </div>

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

                        <div className="flex-1 pr-2">
                          <div className="flex justify-between items-start w-full">
                            <p className="text-sm font-black text-gray-800 line-clamp-1">{report.issue_type}</p>
                            
                            <p 
                              title={new Date(report.created_at).toLocaleString()} 
                              className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter whitespace-nowrap ml-2 cursor-help"
                            >
                              {getRelativeTime(report.created_at)}
                            </p>
                          </div>
                          
                          <p className={`text-[10px] font-black uppercase tracking-tighter mt-0.5 ${
                             report.status === 'Resolved' ? 'text-slate-400' :
                             report.status === 'In Progress' ? 'text-orange-500' : 'text-rose-500'
                          }`}>
                            Status: {report.status} • By: {report.reporter_name || 'Anonymous'}
                          </p>

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

          {/* 🔥 UPDATED PHOTO PROOF CARD WITH REAL DATA & CLICK NAVIGATION */}
          <div className={d.photoCard}>
            <div className="p-5 flex justify-between items-center border-b">
              <h3 className="text-xl font-bold text-gray-700">Photo Proof</h3>
              <div className="flex gap-2">
                 <button className={ui.btnSeeAllGreen} onClick={() => navigate('/bins')}>See All</button>
              </div>
            </div>
            
            <div className="max-h-[460px] overflow-y-auto bg-white">
              {photoProofs.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {photoProofs.map((proof) => (
                    <div 
                      key={proof.id} 
                      onClick={() => {
                        if (proof.isReport) {
                          navigate('/reports', { state: { autoOpenId: proof.rawId } });
                        } else {
                          navigate('/bins', { state: { autoOpenId: proof.rawId } });
                        }
                      }}
                      className="p-4 hover:bg-green-50/50 cursor-pointer transition-colors group flex items-start gap-4"
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm flex-shrink-0">
                        <img src={proof.photo} alt={proof.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1 pr-2">
                        <div className="flex justify-between items-start w-full">
                          <p className="text-sm font-black text-gray-800 line-clamp-1">{proof.title}</p>
                          <p title={new Date(proof.timestamp).toLocaleString()} className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter whitespace-nowrap ml-2 cursor-help">
                            {getRelativeTime(proof.timestamp)}
                          </p>
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-tighter mt-0.5 ${proof.type === 'Bin Collection' ? 'text-emerald-500' : 'text-blue-500'}`}>
                          {proof.type} • {proof.zone}
                        </p>
                        <div className="mt-1 flex flex-col gap-0.5">
                          <p className="text-[11px] text-gray-500 font-medium line-clamp-1">
                            <span className="font-bold text-gray-600">Uploaded by:</span> {proof.collector}
                          </p>
                          {proof.driver && (
                            <p className="text-[11px] text-gray-500 font-medium line-clamp-1">
                              <span className="font-bold text-gray-600">Lead Driver:</span> {proof.driver}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={d.emptyState}>
                  <Inbox size={48} className="text-green-300 mb-2" />
                  <p className={d.emptyText}>No Proof Uploaded</p>
                </div>
              )}
            </div>
          </div>
          {/* --- END PHOTO PROOF --- */}

        </div>

        {/* --- 🔥 ENHANCED PROFESSIONAL HOTSPOT ANALYTICS CARD --- */}
        <div className="mt-8 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 border-t-4 border-t-rose-500 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-7 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-rose-50/80 via-white to-white">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white text-rose-600 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.3)] border border-rose-100 flex items-center justify-center">
                <BarChart3 size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Incident Hotspots</h3>
                <p className="text-[13px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-rose-400" />
                  Automated system analytics based on recent reports
                </p>
              </div>
            </div>
            <span className="bg-white text-rose-600 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 border border-rose-100 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              Live Data
            </span>
          </div>

          {/* Content */}
          <div className="p-7 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50/40">
            
            {/* Top Zones Column */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100/80 shadow-sm">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <MapPin size={18} strokeWidth={2.5} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Most Reported Zones</h4>
                </div>
              </div>
              
              <div className="space-y-3">
                {topZones.length > 0 ? topZones.map((zone, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setHotspotModal({ isOpen: true, type: 'Zone', data: zone })}
                    className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 ${idx === 0 ? 'border-indigo-200 bg-indigo-50/20 ring-1 ring-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-200'}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black transition-colors ${idx === 0 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 text-[15px] truncate">{zone.name}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-3">
                       <span className={`min-w-[40px] h-8 flex items-center justify-center rounded-lg text-xs font-black px-2.5 transition-colors shadow-sm border ${idx === 0 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-50 text-indigo-700 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                         {zone.count} <span className="ml-1.5 text-[9px] opacity-80 uppercase tracking-wider font-bold">Reports</span>
                       </span>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <MapPin size={32} className="text-slate-300 mb-3" />
                    <span className="text-sm text-slate-500 font-semibold">No zone incidents recorded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Bins Column */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100/80 shadow-sm">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                    <AlertOctagon size={18} strokeWidth={2.5} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Critical Waste Bins</h4>
                </div>
              </div>
              
              <div className="space-y-3">
                {topBins.length > 0 ? topBins.map((bin, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setHotspotModal({ isOpen: true, type: 'Waste Bin', data: bin })}
                    className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 ${idx === 0 ? 'border-rose-200 bg-rose-50/20 ring-1 ring-rose-50' : 'border-slate-100 bg-white hover:border-rose-200'}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <span className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-lg text-xs font-black transition-colors ${idx === 0 ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex flex-col truncate">
                        <span className="font-bold text-slate-800 text-[15px] truncate leading-tight">{bin.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate mt-0.5">{bin.zoneName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-3">
                       <span className={`min-w-[40px] h-8 flex items-center justify-center rounded-lg text-xs font-black px-2.5 transition-colors shadow-sm border ${idx === 0 ? 'bg-rose-500 text-white border-rose-400' : 'bg-rose-50 text-rose-700 border-rose-100 group-hover:bg-rose-500 group-hover:text-white'}`}>
                         {bin.count} <span className="ml-1.5 text-[9px] opacity-80 uppercase tracking-wider font-bold">Issues</span>
                       </span>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <AlertOctagon size={32} className="text-slate-300 mb-3" />
                    <span className="text-sm text-slate-500 font-semibold">No critical bins detected</span>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
        
      </main>

      {showBackToTop && (
        <button onClick={scrollToTop} className={`${ui.backToTop} flex items-center justify-center animate-bounce z-[2000]`}><ArrowUp size={24} /></button>
      )}

      {hotspotModal.isOpen && hotspotModal.data && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            
            <div className={`relative overflow-hidden p-6 ${hotspotModal.type === 'Zone' ? 'bg-gradient-to-br from-indigo-600 to-violet-700' : 'bg-gradient-to-br from-rose-500 to-red-600'}`}>
              <div className="absolute -right-8 -top-8 opacity-[0.15] pointer-events-none transform rotate-12">
                {hotspotModal.type === 'Zone' ? <MapPin size={140} /> : <AlertOctagon size={140} />}
              </div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div className="text-white flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                      {hotspotModal.type === 'Zone' ? <MapPin size={16} /> : <AlertOctagon size={16} />}
                    </div>
                    <span className="font-black text-[11px] uppercase tracking-widest text-white/90">
                      {hotspotModal.type} Breakdown
                    </span>
                  </div>
                  <h3 className="font-black text-2xl leading-tight text-white drop-shadow-md">
                    {hotspotModal.data.name}
                  </h3>
                  {hotspotModal.type === 'Waste Bin' && hotspotModal.data.zoneName && (
                    <p className="text-[13px] font-semibold text-white/80 mt-1.5 flex items-center gap-1.5">
                      <MapPin size={14} className="opacity-70" /> {hotspotModal.data.zoneName}
                    </p>
                  )}
                </div>
                
                <button 
                  onClick={() => setHotspotModal({ isOpen: false, type: '', data: null })} 
                  className="p-2 bg-white/10 hover:bg-white/25 rounded-xl transition-colors text-white backdrop-blur-md border border-white/10"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
            <div className="p-7">
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Issues Recorded</p>
                  <p className="text-3xl font-black text-slate-800">{hotspotModal.data.count}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${hotspotModal.type === 'Zone' ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                  <BarChart3 size={28} strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="space-y-5">
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} /> Frequency Distribution
                </h5>
                
                <div className="space-y-4">
                  {(() => {
                    const maxCount = Math.max(...Object.values(hotspotModal.data.issues));
                    
                    return Object.entries(hotspotModal.data.issues)
                      .sort((a, b) => b[1] - a[1]) 
                      .map(([issueName, issueCount], i) => {
                        const percentage = Math.round((issueCount / maxCount) * 100);
                        
                        return (
                          <div key={i} className="group">
                            <div className="flex justify-between items-end mb-2">
                              <span className="font-bold text-slate-700 text-[13px]">{issueName}</span>
                              <span className="font-black text-slate-900 text-sm">{issueCount}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                               <div 
                                 className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${hotspotModal.type === 'Zone' ? 'bg-indigo-500' : 'bg-rose-500'}`} 
                                 style={{ width: `${percentage}%` }}
                               >
                                  <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                               </div>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setHotspotModal({ isOpen: false, type: '', data: null })}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-slate-50 transition-all focus:ring-2 focus:ring-slate-200 focus:outline-none"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;