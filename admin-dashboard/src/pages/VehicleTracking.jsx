import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl, Popup, Source, Layer } from 'react-map-gl/mapbox';
import { 
  Search, Bell, Truck, MapPin, X, Navigation, 
  Activity, Users, Crosshair, Layers, Map as MapIcon, Route,
  CheckCircle2, AlertTriangle, Clock, Calendar,
  Trash2, AlertCircle
} from 'lucide-react';

// CONTEXT & SERVICES
import { useUser } from '../context/UserContext';
import { vehicleTrackingService } from '../services/vehicleTrackingService';
import { zoneService } from '../services/zoneService';
import { reportService } from '../services/reportService';
import { design } from '../styles/design';

// ✅ Custom Truck Icon
import truckIcon from '../assets/truck.png'; 

// 🔑 Mapbox Token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiamVnby1ybyIsImEiOiJjbWx6dnZ6YmQwOW12NGtxd25vMmJldGZhIn0.uCCN-70t1ZZugt6h1ZoMOg';

/* ==========================================
   NAZARETH BOUNDARY CONFIGURATION
   ========================================== */
const NAZARETH_RAW_COORDS = [
  { lat: 8.474278931277277, lng: 124.6416735649109 },
  { lat: 8.473249232032625, lng: 124.64182376861574 },
  { lat: 8.47292013734312, lng: 124.64173793792726 },
  { lat: 8.472495517931753, lng: 124.64177012443544 },
  { lat: 8.471805510388503, lng: 124.64146971702577 },
  { lat: 8.471094465135494, lng: 124.64115858078004 },
  { lat: 8.469846743009528, lng: 124.64514434337617 },
  { lat: 8.469708748133874, lng: 124.64548230171205 },
  { lat: 8.4690932448959, lng: 124.64548230171205 },
  { lat: 8.468552087301081, lng: 124.64524626731874 },
  { lat: 8.466695000208981, lng: 124.64402854442598 },
  { lat: 8.464901551589385, lng: 124.64708089828493 },
  { lat: 8.466015902915824, lng: 124.64851856231691 },
  { lat: 8.46642971548801, lng: 124.64921593666078 },
  { lat: 8.466397795540207, lng: 124.64953243732454 },
  { lat: 8.466503886632513, lng: 124.64983820915224 },
  { lat: 8.46840872672014, lng: 124.65122222900392 },
  { lat: 8.47082907679877, lng: 124.6527671813965 },
  { lat: 8.471646472289459, lng: 124.65171575546266 },
  { lat: 8.472607175158831, lng: 124.65216636657716 },
  { lat: 8.473063133108639, lng: 124.6523802309309 },
  { lat: 8.473567875628627, lng: 124.65261697769166 },
  { lat: 8.473716492061547, lng: 124.65269207954408 },
  { lat: 8.473918185700098, lng: 124.65223073959352 },
  { lat: 8.475510500184921, lng: 124.65230584144594 },
  { lat: 8.475754654489542, lng: 124.65232729911806 },
  { lat: 8.47566189340505, lng: 124.65082526206972 },
  { lat: 8.475672544357778, lng: 124.64916765689851 },
  { lat: 8.47460818945307, lng: 124.64960217475893 },
  { lat: 8.47445957336473, lng: 124.64998841285707 },
  { lat: 8.474523265981052, lng: 124.64951634407045 },
  { lat: 8.47445957336473, lng: 124.64870095252992 },
  { lat: 8.474226033681298, lng: 124.64805722236635 },
  { lat: 8.474183571905444, lng: 124.64719891548158 },
  { lat: 8.474427727052605, lng: 124.64700579643251 },
  { lat: 8.47441711161465, lng: 124.6467161178589 },
  { lat: 8.474958498576875, lng: 124.6467161178589 },
  { lat: 8.474998686427247, lng: 124.64370131492616 },
  { lat: 8.47377835251348, lng: 124.6434384584427 }
];

// Mapbox requires GeoJSON coords to be [longitude, latitude]
const NAZARETH_GEOJSON_COORDS = NAZARETH_RAW_COORDS.map(c => [c.lng, c.lat]);
// Close the polygon if it isn't already
if (
  NAZARETH_GEOJSON_COORDS[0][0] !== NAZARETH_GEOJSON_COORDS[NAZARETH_GEOJSON_COORDS.length - 1][0] || 
  NAZARETH_GEOJSON_COORDS[0][1] !== NAZARETH_GEOJSON_COORDS[NAZARETH_GEOJSON_COORDS.length - 1][1]
) {
  NAZARETH_GEOJSON_COORDS.push(NAZARETH_GEOJSON_COORDS[0]);
}

const NAZARETH_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [NAZARETH_GEOJSON_COORDS]
      }
    }
  ]
};

const nazarethFillStyle = {
  id: 'nazareth-fill',
  type: 'fill',
  paint: {
    'fill-color': '#3b82f6',
    'fill-opacity': 0.03
  }
};

const nazarethLineStyle = {
  id: 'nazareth-line',
  type: 'line',
  paint: {
    'line-color': '#3b82f6',
    'line-width': 3,
    'line-dasharray': [3, 3]
  }
};

// ==========================================
// 🔥 MATH HELPER: Point in Polygon
// Used to count bins/reports inside a zone
// ==========================================
const isPointInPolygon = (lat, lng, polygon) => {
  if (!polygon || !Array.isArray(polygon)) return false;
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

// ==========================================
// 🔥 MAPBOX LAYER STYLES FOR ZONES
// ==========================================
const zoneFillStyle = {
  id: 'zones-fill',
  type: 'fill',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.15
  }
};

const zoneLineStyle = {
  id: 'zones-line',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2,
    'line-dasharray': [2, 2]
  }
};

// ==========================================
// 🔥 CUSTOM SMOOTH MARKER
// ==========================================
const AnimatedMarker = ({ longitude, latitude, children, onClick }) => {
  const [pos, setPos] = useState([longitude, latitude]);
  const prevTarget = useRef([longitude, latitude]);
  const requestRef = useRef();
  const startTime = useRef(null);

  useEffect(() => {
    if (prevTarget.current[0] === longitude && prevTarget.current[1] === latitude) return;

    const startLng = pos[0]; 
    const startLat = pos[1];
    const endLng = longitude;
    const endLat = latitude;
    const duration = 3800; 

    prevTarget.current = [longitude, latitude];
    startTime.current = null;

    const animate = (time) => {
      if (!startTime.current) startTime.current = time;
      const progress = Math.min((time - startTime.current) / duration, 1);

      setPos([
        startLng + (endLng - startLng) * progress,
        startLat + (endLat - startLat) * progress
      ]);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current);
  }, [longitude, latitude]);

  return (
    <Marker longitude={pos[0]} latitude={pos[1]} anchor="center" onClick={onClick}>
      {children}
    </Marker>
  );
};


const VehicleTracking = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { layout: l, dashboard: d } = design;

  const mapContainerRef = useRef(null);

  // 🔥 PERSISTENT MEMORY FOR MOVEMENT
  const trackingMemory = useRef({}); 
  const [movementStatus, setMovementStatus] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [mapType, setMapType] = useState('streets'); 
  const [is3D, setIs3D] = useState(true); 

  // 🔥 REAL DATA STATES
  const [zones, setZones] = useState([]); 
  const [bins, setBins] = useState([]);
  const [reports, setReports] = useState([]);
  
  // 🔥 NEW: State for Zone Popup
  const [selectedZoneInfo, setSelectedZoneInfo] = useState(null);

  // ✅ Updated default viewState to center and zoom in on Nazareth
  const [viewState, setViewState] = useState({
    longitude: 124.6469, 
    latitude: 8.4703,    
    zoom: 15,
    pitch: 45,           
  });

  const loadData = useCallback(async () => {
    try {
      const [fleetRes, zoneData, binData, reportData] = await Promise.all([
        vehicleTrackingService.getLiveFleet(),
        zoneService.getZones(),
        zoneService.getAllBins(),
        reportService.getAllReports()
      ]);
      
      if (fleetRes && fleetRes.success) {
        const fleet = fleetRes.data || [];
        setVehicles(fleet);
        updateMovementStates(fleet);
      }

      setZones(zoneData || []);
      setBins(binData || []);
      setReports(reportData?.reports || []);

    } catch (error) {
      console.error("Failed to load tracking data", error);
    } finally {
      setIsLoading(false);
    }
  }, [movementStatus]);

  // 🔥 REFINED MOVEMENT CALCULATOR
  const updateMovementStates = (fleet) => {
    const now = Date.now();
    const newStatuses = { ...movementStatus };

    fleet.forEach(truck => {
      const id = truck.vehicle_id;
      const currentLat = Number(truck.lat);
      const currentLng = Number(truck.lng);
      const mem = trackingMemory.current[id];

      if (mem) {
        const movedSignificantly = 
          Math.abs(mem.lat - currentLat) > 0.000015 || 
          Math.abs(mem.lng - currentLng) > 0.000015;

        if (movedSignificantly) {
          newStatuses[id] = { state: 'Running', lastMoved: now };
          trackingMemory.current[id] = { lat: currentLat, lng: currentLng, lastMoved: now };
        } else {
          const timeSinceMove = now - mem.lastMoved;
          if (timeSinceMove > 15000) { 
            newStatuses[id] = { state: 'Parked', lastMoved: mem.lastMoved };
          } else {
            newStatuses[id] = newStatuses[id] || { state: 'Parked', lastMoved: now };
          }
        }
      } else {
        newStatuses[id] = { state: 'Parked', lastMoved: now };
        trackingMemory.current[id] = { lat: currentLat, lng: currentLng, lastMoved: now };
      }
    });

    setMovementStatus(newStatuses);
  };

  useEffect(() => {
    if (user) {
      loadData();
      const interval = setInterval(loadData, 4000);
      return () => clearInterval(interval);
    } else {
      navigate('/login');
    }
  }, [user, loadData, navigate]);

  // ==========================================
  // 🔥 DATA PROCESSING & GEOJSON CONVERSION
  // ==========================================

  const processedBins = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return bins.map(bin => {
      let displayStatus = (bin.collection_status || 'pending').toLowerCase(); 
      
      if (displayStatus === 'collected' && bin.collectedAt) {
        const collectedDate = new Date(bin.collectedAt);
        if (collectedDate < startOfToday) {
          displayStatus = 'pending';
        }
      }
      return { ...bin, displayStatus };
    });
  }, [bins]);

  const visibleReports = useMemo(() => {
    const now = Date.now();
    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

    return reports.filter(report => {
      const status = (report.status || '').toLowerCase();
      
      if (status === 'resolved' || status === 'resolve' || status === 'collected') {
        const timeField = report.resolvedAt || report.resolved_at || report.updated_at;
        
        if (timeField) {
          const resolvedTime = new Date(timeField).getTime();
          return (now - resolvedTime) < FIVE_HOURS_MS;
        }
        return false; 
      }
      return true;
    });
  }, [reports]);

  // 🔥 Add Bin & Report Counts directly into GeoJSON Properties
  const zonesGeoJSON = useMemo(() => {
    if (!zones || zones.length === 0) return null;

    const features = zones.map(zone => {
      if (!zone.boundaries) return null;
      
      const coords = Array.isArray(zone.boundaries[0]) ? zone.boundaries[0] : zone.boundaries;
      
      const polygonCoords = coords.map(p => [
        Number(p.lng ?? p[1]), 
        Number(p.lat ?? p[0])
      ]);

      // Calculate totals for this zone
      const zoneBins = processedBins.filter(b => 
        String(b.zone_id) === String(zone.zone_id) || 
        isPointInPolygon(b.latitude, b.longitude, zone.boundaries)
      ).length;

      const zoneReports = visibleReports.filter(r => 
        isPointInPolygon(r.latitude, r.longitude, zone.boundaries)
      ).length;

      return {
        type: 'Feature',
        properties: { 
          id: zone.zone_id, 
          name: zone.zone_name, 
          color: zone.zone_color || '#10B981',
          binCount: zoneBins,
          reportCount: zoneReports
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords] 
        }
      };
    }).filter(Boolean);

    return { type: 'FeatureCollection', features };
  }, [zones, processedBins, visibleReports]);

  const liveFleet = useMemo(() => {
    return vehicles.map(truck => {
      let filteredHistory = truck.history || [];
      filteredHistory = filteredHistory.slice(0, 2);
      return { ...truck, filteredHistory };
    }).filter(truck => {
      const searchString = `${truck.vehicle_name} ${truck.plate_number} ${truck.filteredHistory.map(h => h.driverName).join(' ')}`
        .toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    });
  }, [vehicles, searchTerm]);

  const activeSelectedTruck = liveFleet.find(t => t.vehicle_id === selectedTruckId);

  const focusOnTruck = (truck) => {
    setSelectedTruckId(truck.vehicle_id);
    const safeLng = Number(truck.lng) || 124.6469;
    const safeLat = Number(truck.lat) || 8.4703;

    setViewState({
      longitude: safeLng,
      latitude: safeLat,
      zoom: 17,
      pitch: is3D ? 60 : 0, 
      transitionDuration: 1500,
    });
    
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggle3D = () => {
    setIs3D(!is3D);
    setViewState(prev => ({
      ...prev,
      pitch: !is3D ? 45 : 0,
      transitionDuration: 500
    }));
  };

  // 🔥 Map Click Handler for Zones
  const handleMapClick = useCallback((event) => {
    const { features, lngLat } = event;
    const clickedFeature = features && features.find(f => f.layer.id === 'zones-fill');
    
    if (clickedFeature) {
      setSelectedZoneInfo({
        longitude: lngLat.lng,
        latitude: lngLat.lat,
        ...clickedFeature.properties
      });
    } else {
      setSelectedZoneInfo(null);
    }
  }, []);

  if (!user) return null;

  return (
    <div className="h-full bg-[#f0fdf4] overflow-y-auto relative font-sans">
      
      {/* HEADER */}
      <header className={l.header}>
        <div className="relative w-full max-w-2xl group flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search fleet by ID, Plate, or Driver..." 
              className={l.searchBox} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-red-500">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700">
            <Bell size={24} />
          </button>
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className={`${l.profileCircle} cursor-pointer hover:ring-4 hover:ring-green-100 transition-all overflow-hidden border border-gray-100`} onClick={() => navigate("/profile-settings")}>
              {user.profile_picture ? (
                <img src={`https://brngy-nzrth.onrender.com${user.profile_picture}`} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} alt="profile" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-8 space-y-8">
        
        {/* Title Bar & Filter */}
        <div ref={mapContainerRef} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pt-2">
          <div>
            <h2 className="text-3xl font-bold text-[#1B5E20]">Live Fleet Tracking</h2>
            <p className="text-gray-600 text-sm mt-1">Real-time GPS positioning of all active collection vehicles</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 shadow-sm animate-pulse">
              <Activity size={14} /> SATELLITE LINK
            </span>
          </div>
        </div>

        {/* TOP: Mapbox Map */}
        <div className={d.mapCard}>
          <div className={`${d.mapHeader} flex flex-wrap justify-between items-center gap-4`}>
            
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 text-lg">
                <MapIcon size={18} className="text-green-600" /> Interactive Map View
              </h3>
              {/* ✅ ADDED MAP LEGEND BADGE */}
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm">
                <div className="w-5 h-0 border-t-2 border-dashed border-blue-500"></div>
                <span className="text-xs font-bold text-blue-700">Nazareth Area Boundary</span>
              </div>
            </div>

          </div>
          <div className={`${d.mapFrame} relative`} style={{ height: '450px' }}>
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              mapStyle={mapType === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12'}
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: '100%', height: '100%' }}
              interactiveLayerIds={['zones-fill']} 
              onClick={handleMapClick} 
            >
              <NavigationControl position="top-right" />

              {/* ✅ ADDED NAZARETH BOUNDARY LAYER (UNDERNEATH ZONES) */}
              <Source id="nazareth-data" type="geojson" data={NAZARETH_GEOJSON}>
                <Layer {...nazarethFillStyle} />
                <Layer {...nazarethLineStyle} />
              </Source>

              {/* 🔥 ZONES POLYGONS VIA GEOJSON */}
              {zonesGeoJSON && (
                <Source id="zones-data" type="geojson" data={zonesGeoJSON}>
                  <Layer {...zoneFillStyle} />
                  <Layer {...zoneLineStyle} />
                </Source>
              )}

              {/* 🔥 ZONE CLICK POPUP */}
              {selectedZoneInfo && (
                <Popup
                  longitude={selectedZoneInfo.longitude}
                  latitude={selectedZoneInfo.latitude}
                  anchor="bottom"
                  offset={15}
                  closeButton={false}
                  onClose={() => setSelectedZoneInfo(null)}
                  className="z-50"
                  style={{ padding: 0 }}
                >
                  <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-100 min-w-[160px]">
                    <h4 className="font-black text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-2 mb-2">
                      {selectedZoneInfo.name}
                    </h4>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Trash2 size={12} className="text-emerald-500"/> Total Bins
                      </span>
                      <span className="text-sm font-black text-emerald-600">{selectedZoneInfo.binCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-rose-500"/> Active Reports
                      </span>
                      <span className="text-sm font-black text-rose-600">{selectedZoneInfo.reportCount}</span>
                    </div>
                  </div>
                </Popup>
              )}

              {/* 🔥 BINS MARKERS */}
              {processedBins.map((bin, idx) => {
                let outerPulse = 'bg-slate-500/20';
                let innerBg = 'bg-slate-700';
                let pinTail = 'bg-slate-700';

                if (bin.displayStatus === 'pending') {
                  outerPulse = 'bg-emerald-500/20 animate-pulse';
                  innerBg = 'bg-emerald-700';
                  pinTail = 'bg-emerald-700';
                } else if (bin.displayStatus === 'missed') {
                  outerPulse = 'bg-rose-500/20 animate-pulse';
                  innerBg = 'bg-rose-700';
                  pinTail = 'bg-rose-700';
                }

                return (
                  <Marker key={`bin-${bin.bin_id || idx}`} longitude={Number(bin.longitude)} latitude={Number(bin.latitude)} anchor="bottom">
                    <div className="relative flex items-center justify-center cursor-pointer pb-2" title={`Bin: ${bin.displayStatus}`}>
                      <div className={`absolute w-8 h-8 rounded-full ${outerPulse}`} />
                      <div className={`relative p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${innerBg}`}>
                        <Trash2 color="white" size={12} />
                      </div>
                      <div className={`absolute bottom-1 w-2 h-2 rotate-45 border-r border-b border-white ${pinTail}`} />
                    </div>
                  </Marker>
                );
              })}

              {/* 🔥 REPORTS MARKERS */}
              {visibleReports.map((report, idx) => {
                const status = (report.status || '').toLowerCase();
                let outerPulse = 'bg-slate-500/20';
                let innerBg = 'bg-slate-600';
                let pinTail = 'bg-slate-600';

                if (status === 'pending') {
                  outerPulse = 'bg-rose-500/40 animate-ping';
                  innerBg = 'bg-rose-600';
                  pinTail = 'bg-rose-600';
                } else if (status === 'in progress' || status === 'in_progress') {
                  outerPulse = 'bg-orange-500/40 animate-pulse';
                  innerBg = 'bg-orange-600';
                  pinTail = 'bg-orange-600';
                }

                return (
                  <Marker key={`report-${report.report_id || idx}`} longitude={Number(report.longitude)} latitude={Number(report.latitude)} anchor="bottom">
                    <div className="relative flex items-center justify-center cursor-pointer pb-2" title={`Report: ${report.status}`}>
                      <div className={`absolute w-10 h-10 rounded-full ${outerPulse}`} />
                      <div className={`relative p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${innerBg}`}>
                        <AlertCircle color="white" size={12} fill="white" fillOpacity={0.2} />
                      </div>
                      <div className={`absolute bottom-1 w-2 h-2 rotate-45 border-r border-b border-white ${pinTail}`} />
                    </div>
                  </Marker>
                );
              })}

              {/* Render Map Markers */}
              {liveFleet.map((truck) => {
                const isRunning = movementStatus[truck.vehicle_id]?.state === 'Running';
                const safeLng = Number(truck.lng) || 124.6459;
                const safeLat = Number(truck.lat) || 8.4772;

                return (
                  <AnimatedMarker 
                    key={`truck-marker-${truck.vehicle_id}`} 
                    longitude={safeLng} 
                    latitude={safeLat}
                    onClick={e => {
                      e.originalEvent.stopPropagation();
                      focusOnTruck(truck);
                    }}
                  >
                    <div className="relative flex items-center justify-center cursor-pointer">
                      <div className={`relative p-2 rounded-full shadow-xl flex items-center justify-center bg-white border-2 ${
                        isRunning ? 'border-emerald-500 shadow-emerald-500/40' : 'border-orange-400'
                      } ${
                        selectedTruckId === truck.vehicle_id ? 'ring-4 ring-indigo-300 scale-110' : ''
                      }`}
                      style={{
                        width: selectedTruckId === truck.vehicle_id ? 54 : 44,
                        height: selectedTruckId === truck.vehicle_id ? 54 : 44,
                        transition: 'all 0.3s ease'
                      }}>
                        <img 
                          src={truckIcon} 
                          alt="truck" 
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: isRunning ? '#10B981' : '#F97316',
                          border: '2px solid white'
                        }} />
                      </div>
                    </div>
                  </AnimatedMarker>
                );
              })}

              {/* Popup for Selected Truck */}
              {activeSelectedTruck && (
                <Popup
                  longitude={Number(activeSelectedTruck.lng) || 124.6469}
                  latitude={Number(activeSelectedTruck.lat) || 8.4703}
                  anchor="bottom"
                  offset={25}
                  closeButton={false}
                  onClose={() => setSelectedTruckId(null)}
                  className="z-50"
                  style={{ padding: 0 }}
                >
                  <div className="bg-white rounded-2xl p-4 shadow-2xl min-w-[200px] border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="font-black text-slate-800 uppercase tracking-tight">{activeSelectedTruck.vehicle_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest">{activeSelectedTruck.plate_number}</p>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                        movementStatus[activeSelectedTruck.vehicle_id]?.state === 'Running' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {movementStatus[activeSelectedTruck.vehicle_id]?.state === 'Running' 
                          ? <Activity size={10} /> 
                          : <MapPin size={10} />
                        }
                        {movementStatus[activeSelectedTruck.vehicle_id]?.state || 'Parked'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Users size={12} className="text-blue-500" /> 
                        {activeSelectedTruck.filteredHistory[0]?.driverName || 'Unassigned'}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Route size={12} className="text-emerald-500" /> {activeSelectedTruck.distanceKm || 0} km traveled
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>

            <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
              <button 
                onClick={() => setMapType(prev => prev === 'streets' ? 'satellite' : 'streets')}
                className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all group flex items-center gap-2"
                title="Toggle Satellite View"
              >
                <Layers size={18} />
                <span className="text-xs font-bold hidden group-hover:block transition-all pr-1">
                  {mapType === 'streets' ? 'Satellite' : 'Streets'}
                </span>
              </button>

              <button 
                onClick={toggle3D}
                className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all group flex items-center gap-2"
                title="Toggle 2D/3D View"
              >
                <MapIcon size={18} />
                <span className="text-xs font-bold hidden group-hover:block transition-all pr-1">
                  {is3D ? '2D View' : '3D View'}
                </span>
              </button>
            </div>

            <button 
              onClick={() => {
                setSelectedTruckId(null);
                setViewState({ longitude: 124.6469, latitude: 8.4703, zoom: 17, pitch: is3D ? 45 : 0 });
              }}
              className="absolute bottom-6 right-6 bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all z-20"
              title="Recenter City Map"
            >
              <Crosshair size={20} />
            </button>
          </div>
        </div>

        {/* BOTTOM DASHBOARD */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b bg-white border-t-4 border-[#2B9447] flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">Physical Fleet Roster</h3>
            <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold">{liveFleet.length} Assets Found</span>
          </div>
          
          <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            {liveFleet.length > 0 ? (
              liveFleet.map((truck) => {
                const isRunning = movementStatus[truck.vehicle_id]?.state === 'Running';
                return (
                  <div 
                    key={`fleet-card-${truck.vehicle_id}`}
                    className={`border-2 rounded-2xl p-5 bg-white transition-all relative flex flex-col h-full ${
                      selectedTruckId === truck.vehicle_id 
                        ? 'border-emerald-500 shadow-lg scale-[1.02]' 
                        : 'border-green-100 hover:shadow-md hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${
                          selectedTruckId === truck.vehicle_id ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <img src={truckIcon} alt="truck" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg leading-tight">{truck.vehicle_name}</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{truck.plate_number}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-md border ${
                          isRunning 
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                            : 'text-orange-600 bg-orange-50 border-orange-100'
                        }`}>
                          {isRunning ? <Activity size={10} /> : <MapPin size={10} />}
                          {isRunning ? 'RUNNING' : 'PARKED'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-gray-600 text-xs font-medium mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Navigation size={14} className="text-sky-500 mt-0.5 flex-shrink-0" />
                      <span className="truncate">Lat: {Number(truck.lat || 0).toFixed(5)} <br/> Lng: {Number(truck.lng || 0).toFixed(5)}</span>
                    </div>

                    <div className="w-full h-px bg-gray-200 my-2" />
                    
                    {/* THE SHIFT ROSTER */}
                    <div className="flex-1 flex flex-col gap-2 mt-2">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Duty Sessions</h5>
                      
                      {truck.filteredHistory && truck.filteredHistory.length > 0 ? (
                        truck.filteredHistory.map((shift, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-2 ${shift.end === 'Active' ? 'bg-emerald-50/60 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                   <Users size={14} className="text-indigo-500"/> {shift.driverName}
                                </div>
                                {shift.end === 'Active' ? (
                                   <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full animate-pulse tracking-widest">LIVE NOW</span>
                                ) : (
                                   <span className="text-[8px] font-black text-slate-500 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-full tracking-widest">COMPLETED</span>
                                )}
                             </div>
                      
                             <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                <span className="flex items-center gap-1.5"><MapPin size={12} className="text-rose-500"/> {shift.log_zone_name || shift.zoneName}</span>
                                <span className="flex items-center gap-1.5"><Clock size={12} className="text-blue-500"/> {shift.start} - {shift.end}</span>
                             </div>

                             <div className="flex items-center justify-between text-[10px] font-black pt-2 mt-1 border-t border-slate-200/60">
                                <span className="text-slate-400">{shift.date}</span>
                                <div className="flex gap-3">
                                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12}/> {shift.bins || '0/0'} Bins</span>
                                  <span className="text-blue-600 flex items-center gap-1"><AlertTriangle size={12}/> {shift.reports || 0} Reports</span>
                                </div>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                          <Calendar size={20} className="text-slate-300 mb-1" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No matching shifts</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => focusOnTruck(truck)}
                      className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      <Crosshair size={16} /> Locate Vehicle on Map
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-gray-400 italic font-medium flex flex-col items-center">
                <Truck size={40} className="mb-3 opacity-20" />
                <p>No active vehicles found.</p>
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
};

export default VehicleTracking;