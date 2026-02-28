import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import { 
  Search, Bell, Truck, MapPin, X, Navigation, 
  Activity, Users, Crosshair, Layers, Map as MapIcon, Route,
  CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';

// CONTEXT & SERVICES
import { useUser } from '../context/UserContext';
import { vehicleService } from '../services/vehicleService';
import { assignmentService } from '../services/assignmentService';
import { design } from '../styles/design';

// 🔑 Mapbox Token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiamVnby1ybyIsImEiOiJjbWx6dnZ6YmQwOW12NGtxd25vMmJldGZhIn0.uCCN-70t1ZZugt6h1ZoMOg';

const VehicleTracking = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { layout: l, dashboard: d, userManagement: u } = design;

  // 🔥 NEW: Reference for the map container to scroll to
  const mapContainerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data States
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  // Map UI States
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [mapType, setMapType] = useState('streets'); 
  const [is3D, setIs3D] = useState(true); 

  const [viewState, setViewState] = useState({
    longitude: 124.6459, 
    latitude: 8.4772,    
    zoom: 13,
    pitch: 45,           
  });

  // Fetch Data
  const loadData = useCallback(async () => {
    try {
      const [vData, aData] = await Promise.all([
        vehicleService.getAll().catch(() => []),
        assignmentService.getAssignments().catch(() => [])
      ]);
      
      setVehicles(Array.isArray(vData) ? vData : []);
      setAssignments(Array.isArray(aData) ? aData : []);
    } catch (error) {
      console.error("Failed to load tracking data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for live updates
  useEffect(() => {
    if (user) {
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    } else {
      navigate('/login');
    }
  }, [user, loadData, navigate]);

  // Combine Data
  const liveFleet = useMemo(() => {
    return vehicles
      .filter(v => v.status === 'Active') 
      .map(truck => {
        const currentTask = assignments.find(a => 
          Number(a.vehicle_id) === Number(truck.vehicle_id) && 
          a.assignment_status === 'Active'
        );

        // Fallback mock coordinates and data for prototype
        const numId = String(truck.vehicle_id).replace(/\D/g, '') || 1;
        const mockLat = 8.4772 + ((Number(numId) * 0.002) % 0.02);
        const mockLng = 124.6459 + ((Number(numId) * 0.003) % 0.02);
        
        // Mock stats based on truck ID
        const mockDistance = (Number(numId) * 3.4 + 5.2).toFixed(1);
        const mockBins = Math.floor(Number(numId) * 4 + 12);
        const mockMissed = Math.floor(Number(numId) % 3);

        return {
          ...truck,
          driverName: currentTask ? `${currentTask.first_name} ${currentTask.last_name}` : 'Unassigned',
          zoneName: currentTask ? currentTask.zone_name : 'Standby',
          lat: truck.current_lat ? Number(truck.current_lat) : mockLat,
          lng: truck.current_lng ? Number(truck.current_lng) : mockLng,
          speed: Math.floor(Math.random() * 40) + 10, 
          distanceKm: truck.distance_traveled ? Number(truck.distance_traveled).toFixed(1) : mockDistance,
          
          binsCollected: truck.bins_collected || mockBins,
          missedPickups: truck.missed_pickups || mockMissed,
          currentLocation: truck.current_location_name || 'Moving along route...',
          lastUpdated: truck.last_updated || 'Just now',
        };
      })
      .filter(truck => 
        `${truck.vehicle_name} ${truck.plate_number} ${truck.driverName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      );
  }, [vehicles, assignments, searchTerm]);

  // Fly map to selected truck
  const focusOnTruck = (truck) => {
    setSelectedTruck(truck);
    setViewState({
      longitude: truck.lng,
      latitude: truck.lat,
      zoom: 16,
      pitch: is3D ? 60 : 0, 
      transitionDuration: 1500,
    });
    
    // 🔥 CHANGED: Smoothly scroll specifically to the map element
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Toggle 2D/3D
  const toggle3D = () => {
    setIs3D(!is3D);
    setViewState(prev => ({
      ...prev,
      pitch: !is3D ? 45 : 0,
      transitionDuration: 500
    }));
  };

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
                <img src={`http://localhost:5000${user.profile_picture}`} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} alt="profile" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-8 space-y-8">
        
        {/* Title Bar - 🔥 ATTACHED REF HERE 🔥 */}
        <div ref={mapContainerRef} className="flex justify-between items-end pt-2">
          <div>
            <h2 className="text-3xl font-bold text-[#1B5E20]">Live Fleet Tracking</h2>
            <p className="text-gray-600 text-sm mt-1">Real-time GPS positioning of all active collection vehicles</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 shadow-sm animate-pulse">
              <Activity size={14} /> LIVE SATELLITE LINK
            </span>
          </div>
        </div>

        {/* TOP: Mapbox Map */}
        <div className={d.mapCard}>
          <div className={d.mapHeader}>
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-lg">Interactive Map View</h3>
          </div>
          <div className={`${d.mapFrame} relative`} style={{ height: '450px' }}>
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              mapStyle={mapType === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12'}
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="top-right" />

              {/* Render Map Markers */}
              {liveFleet.map((truck) => (
                <Marker 
                  key={`truck-marker-${truck.vehicle_id}`} 
                  longitude={truck.lng} 
                  latitude={truck.lat}
                  anchor="center"
                  onClick={e => {
                    e.originalEvent.stopPropagation();
                    focusOnTruck(truck);
                  }}
                >
                  <div className="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110 z-10">
                    <div className="absolute w-12 h-12 bg-emerald-500/30 rounded-full animate-ping" />
                    <div className={`relative p-2 rounded-full border-2 border-white shadow-xl flex items-center justify-center ${
                      selectedTruck?.vehicle_id === truck.vehicle_id ? 'bg-indigo-600 scale-125' : 'bg-emerald-600'
                    }`}>
                      <Truck color="white" size={16} />
                    </div>
                  </div>
                </Marker>
              ))}

              {/* Popup for Selected Truck */}
              {selectedTruck && (
                <Popup
                  longitude={selectedTruck.lng}
                  latitude={selectedTruck.lat}
                  anchor="bottom"
                  offset={25}
                  closeButton={false}
                  onClose={() => setSelectedTruck(null)}
                  className="z-50"
                  style={{ padding: 0 }}
                >
                  <div className="bg-white rounded-2xl p-4 shadow-2xl min-w-[200px] border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="font-black text-slate-800 uppercase tracking-tight">{selectedTruck.vehicle_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest">{selectedTruck.plate_number}</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">
                        Online
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Users size={12} className="text-blue-500" /> {selectedTruck.driverName}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <MapPin size={12} className="text-rose-500" /> {selectedTruck.zoneName}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Route size={12} className="text-emerald-500" /> {selectedTruck.distanceKm} km traveled
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Crosshair size={12} className="text-amber-500" /> {selectedTruck.lat.toFixed(5)}, {selectedTruck.lng.toFixed(5)}
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>

            {/* Floating Map Controls (Top Left) */}
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

            {/* Recenter Button */}
            <button 
              onClick={() => {
                setSelectedTruck(null);
                setViewState({ longitude: 124.6459, latitude: 8.4772, zoom: 13, pitch: is3D ? 45 : 0 });
              }}
              className="absolute bottom-6 right-6 bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all z-20"
              title="Recenter City Map"
            >
              <Crosshair size={20} />
            </button>
          </div>
        </div>

        {/* BOTTOM: Active Vehicles Dashboard */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b bg-white border-t-4 border-[#2B9447] flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">Active Vehicles Dashboard</h3>
            <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold">{liveFleet.length} Online</span>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {liveFleet.length > 0 ? (
              liveFleet.map((truck) => (
                <div 
                  key={`fleet-card-${truck.vehicle_id}`}
                  className={`border-2 rounded-2xl p-5 bg-white transition-all relative flex flex-col h-full ${
                    selectedTruck?.vehicle_id === truck.vehicle_id 
                      ? 'border-emerald-500 shadow-lg scale-[1.02]' 
                      : 'border-green-100 hover:shadow-md hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        selectedTruck?.vehicle_id === truck.vehicle_id 
                          ? 'bg-emerald-600 text-white border-emerald-700' 
                          : 'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        <Truck size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-lg leading-tight">{truck.vehicle_name}</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{truck.plate_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      <Navigation size={10} /> {truck.speed} km/h
                    </div>
                  </div>

                  <div className="space-y-3 mt-2 flex-1">
                    {/* Personnel & Zone Info */}
                    <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                      <Users size={16} className="text-indigo-400" />
                      <span className="truncate">Driver: <strong className="text-gray-800">{truck.driverName}</strong></span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                      <MapPin size={16} className="text-rose-400" />
                      <span className="truncate">Zone: <strong className="text-gray-800">{truck.zoneName}</strong></span>
                    </div>

                    {/* Bins & Missed Stats */}
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 my-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-gray-600 font-medium">Collected: <strong className="text-emerald-700">{truck.binsCollected}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle size={16} className="text-rose-500" />
                        <span className="text-gray-600 font-medium">Missed: <strong className="text-rose-700">{truck.missedPickups}</strong></span>
                      </div>
                    </div>

                    {/* Current Location */}
                    <div className="flex items-start gap-3 text-gray-600 text-sm font-medium">
                      <Navigation size={16} className="text-sky-500 mt-0.5" />
                      <span className="truncate">Loc: <strong className="text-gray-800">{truck.currentLocation}</strong></span>
                    </div>
                  </div>

                  {/* Divider & Last Updated */}
                  <div className="w-full h-px bg-gray-200 my-4" />
                  
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      <Clock size={12} /> Last updated: {truck.lastUpdated}
                    </div>
                  </div>

                  {/* Map Button */}
                  <button 
                    onClick={() => focusOnTruck(truck)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all duration-200 cursor-pointer"
                  >
                    <Crosshair size={16} /> Locate on Map
                  </button>
                </div>
              ))
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