import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import { 
  Search, Bell, Truck, MapPin, X, Navigation, 
  Activity, Users, Crosshair, Layers, Map as MapIcon, Route,
  CheckCircle2, AlertTriangle, Clock, Calendar
} from 'lucide-react';

// CONTEXT & SERVICES
import { useUser } from '../context/UserContext';
import { vehicleTrackingService } from '../services/vehicleTrackingService';
import { design } from '../styles/design';

// ✅ Custom Truck Icon
import truckIcon from '../assets/truck.png'; 

// 🔑 Mapbox Token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiamVnby1ybyIsImEiOiJjbWx6dnZ6YmQwOW12NGtxd25vMmJldGZhIn0.uCCN-70t1ZZugt6h1ZoMOg';

// ==========================================
// 🔥 CUSTOM SMOOTH MARKER
// Calculates micro-coordinates at 60fps so the truck "drives" smoothly
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

  const [viewState, setViewState] = useState({
    longitude: 124.6459, 
    latitude: 8.4772,    
    zoom: 13,
    pitch: 45,           
  });

  const loadData = useCallback(async () => {
    try {
      const response = await vehicleTrackingService.getLiveFleet();
      if (response && response.success) {
        const fleet = response.data || [];
        setVehicles(fleet);
        updateMovementStates(fleet);
      }
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
        // threshold: approx 1.5 meters to ignore GPS drift
        const movedSignificantly = 
          Math.abs(mem.lat - currentLat) > 0.000015 || 
          Math.abs(mem.lng - currentLng) > 0.000015;

        if (movedSignificantly) {
          // TRUCK IS MOVING
          newStatuses[id] = { state: 'Running', lastMoved: now };
          trackingMemory.current[id] = { lat: currentLat, lng: currentLng, lastMoved: now };
        } else {
          // TRUCK IS STATIC - Check if it was already running
          const timeSinceMove = now - mem.lastMoved;
          if (timeSinceMove > 15000) { // 15 seconds of no movement = Parked
            newStatuses[id] = { state: 'Parked', lastMoved: mem.lastMoved };
          } else {
            // Keep current state (handles red lights/short stops)
            newStatuses[id] = newStatuses[id] || { state: 'Parked', lastMoved: now };
          }
        }
      } else {
        // First time seeing this truck
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

  const liveFleet = useMemo(() => {
    return vehicles.filter(truck => 
      `${truck.vehicle_name} ${truck.plate_number} ${truck.driverName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const activeSelectedTruck = liveFleet.find(t => t.vehicle_id === selectedTruckId);

  const focusOnTruck = (truck) => {
    setSelectedTruckId(truck.vehicle_id);
    const safeLng = Number(truck.lng) || 124.6459;
    const safeLat = Number(truck.lat) || 8.4772;

    setViewState({
      longitude: safeLng,
      latitude: safeLat,
      zoom: 16,
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
        
        {/* Title Bar */}
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
                        {/* Parked/Running Status Dot */}
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
                  longitude={Number(activeSelectedTruck.lng) || 124.6459}
                  latitude={Number(activeSelectedTruck.lat) || 8.4772}
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
                        <Users size={12} className="text-blue-500" /> {activeSelectedTruck.driverName}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <MapPin size={12} className="text-rose-500" /> {activeSelectedTruck.zoneName}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Route size={12} className="text-emerald-500" /> {activeSelectedTruck.distanceKm} km traveled
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Crosshair size={12} className="text-amber-500" /> 
                        {Number(activeSelectedTruck.lat || 0).toFixed(5)}, {Number(activeSelectedTruck.lng || 0).toFixed(5)}
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
                setViewState({ longitude: 124.6459, latitude: 8.4772, zoom: 13, pitch: is3D ? 45 : 0 });
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
            <h3 className="text-xl font-bold text-gray-800">Active Vehicles Dashboard</h3>
            <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold">{liveFleet.length} Online</span>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      
                      <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-md border ${
                        isRunning 
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                          : 'text-orange-600 bg-orange-50 border-orange-100'
                      }`}>
                        {isRunning ? <Activity size={10} /> : <MapPin size={10} />}
                        {isRunning ? 'RUNNING' : 'PARKED'}
                      </div>
                    </div>

                    <div className="space-y-3 mt-2 flex-1">
                      <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                        <Users size={16} className="text-indigo-400" />
                        <span className="truncate">Driver: <strong className="text-gray-800">{truck.driverName}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                        <MapPin size={16} className="text-rose-400" />
                        <span className="truncate">Zone: <strong className="text-gray-800">{truck.zoneName}</strong></span>
                      </div>

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

                      <div className="flex items-start gap-3 text-gray-600 text-sm font-medium">
                        <Navigation size={16} className="text-sky-500 mt-0.5" />
                        <span className="truncate">Loc: <strong className="text-gray-800">{Number(truck.lat || 0).toFixed(5)}, {Number(truck.lng || 0).toFixed(5)}</strong></span>
                      </div>
                    </div>

                    <div className="w-full h-px bg-gray-200 my-4" />
                    
                    {/* 🔥 UPDATED: ACTUAL DUTY LOG SCHEDULE SECTION */}
                    <div className="flex flex-col gap-1.5 mb-4 px-1">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase">
                            <Clock size={12} className="text-blue-500" /> Start Duty:
                         </div>
                         <span className="text-xs font-bold text-slate-700">{truck.startTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase">
                            <Calendar size={12} className="text-rose-500" /> End Duty:
                         </div>
                         <span className="text-xs font-bold text-slate-700">{truck.endTime}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => focusOnTruck(truck)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      <Crosshair size={16} /> Locate on Map
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