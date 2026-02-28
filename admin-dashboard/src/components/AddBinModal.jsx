import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Trash2, Plus, MapPin, Eraser } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, LayersControl, Popup, useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import * as turf from '@turf/turf';
import L from 'leaflet';


const getDynamicBinIcon = (color = '#2E7D32', zoom) => {
  const baseSize = 50;
  const scaleFactor = Math.pow(2, zoom - 17);
  const size = Math.max(15, Math.min(35, baseSize * scaleFactor));
  const lucideSize = Math.max(8, size * 0.5);

  return new L.DivIcon({
    html: renderToStaticMarkup(
      <div style={{ 
        backgroundColor: color, 
        padding: '2px', 
        borderRadius: '50%', 
        border: `${Math.max(1, size * 0.05)}px solid white`,
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`
      }}>
        <Trash2 color="white" size={lucideSize} />
      </div>
    ),
    className: 'custom-bin-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MapController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target?.latitude && target?.longitude) {
      map.flyTo([Number(target.latitude), Number(target.longitude)], 18);
    }
  }, [target, map]);
  return null;
};

const ZoomHandler = ({ setZoom }) => {
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
  });
  return null;
};

const AddBinModal = ({ isOpen, onClose, zone, onAddBin, onDeleteBin, onRelocateBin, onNotify, existingBins = [] }) => {
  const [formData, setFormData] = useState({ binName: '', address: '' });
  const [tempMarker, setTempMarker] = useState(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(17);
  const markerRef = useRef(null);

  useEffect(() => {
    if (isOpen) handleClearSelection();
  }, [isOpen, zone]);

  if (!isOpen || !zone) return null;

  const handleClearSelection = () => {
    setTempMarker(null);
    setIsPlacing(false);
    setSelectedBinId(null);
    setFormData({ binName: '', address: '' });
  };

  const getSafeBoundaries = () => {
    if (!zone?.boundaries) return [];
    return Array.isArray(zone.boundaries[0]) ? zone.boundaries[0] : zone.boundaries;
  };

  const safeBoundaries = getSafeBoundaries();

  if (safeBoundaries.length === 0) {
    return (
      <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/60">
        <div className="bg-white p-6 rounded-xl shadow-2xl">Error: Zone has no boundary data.</div>
      </div>
    );
  }

  const handleRelocateEnd = (bin, e) => {
    const { lat, lng } = e.target.getLatLng();
    const polyCoords = safeBoundaries.map(p => [p.lng, p.lat]);
    if (polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0]) polyCoords.push(polyCoords[0]);

    if (turf.booleanPointInPolygon(turf.point([lng, lat]), turf.polygon([polyCoords]))) {
      if (window.confirm(`Relocate "${bin.bin_name}" to this new position?`)) {
        onRelocateBin(bin.bin_id, { lat, lng });
      }
    } else {
      onNotify(`Error: Position is outside of "${zone.zone_name}"`, "error");
    }
    setSelectedBinId(null);
  };

  const DraggableMarker = () => {
    const handlers = useMemo(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          const polyCoords = safeBoundaries.map(p => [p.lng, p.lat]);
          if (polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0]) polyCoords.push(polyCoords[0]);
          if (turf.booleanPointInPolygon(turf.point([lng, lat]), turf.polygon([polyCoords]))) {
            setTempMarker({ lat, lng });
          } else {
            onNotify("Bin must be placed inside the zone boundary.", "error");
            if (tempMarker) marker.setLatLng([tempMarker.lat, tempMarker.lng]);
          }
        }
      },
    }), [tempMarker]);

    return tempMarker ? (
      <Marker 
        draggable={true} 
        eventHandlers={handlers} 
        position={[tempMarker.lat, tempMarker.lng]} 
        icon={getDynamicBinIcon('#2E7D32', zoomLevel)}
        ref={markerRef}
      >
        <Popup className="font-bold">New Bin Position</Popup>
      </Marker>
    ) : null;
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (!isPlacing) return;
        const { lat, lng } = e.latlng;
        const polyCoords = safeBoundaries.map(p => [p.lng, p.lat]);
        if (polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0]) polyCoords.push(polyCoords[0]);
        if (turf.booleanPointInPolygon(turf.point([lng, lat]), turf.polygon([polyCoords]))) {
          setTempMarker({ lat, lng });
          setIsPlacing(false);
        } else {
          onNotify("Please click inside the highlighted green area!", "error");
        }
      },
    });
    return null;
  };

  const handleAddLocation = () => {
    if (!formData.binName || !tempMarker) return onNotify("Please provide a name and mark the map.", "error");
    onAddBin({
      bin_name: formData.binName,
      zone_id: zone.zone_id,
      latitude: tempMarker.lat,
      longitude: tempMarker.lng,
      collection_status: "Pending",
      bin_address: formData.address
    });
    handleClearSelection();
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
      <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* HEADER */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-white">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Manage Bin Locations</h2>
            <p className="text-gray-400 text-sm flex items-center gap-2">
               Current Action Area: <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold text-xs border border-green-200">{zone.zone_name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"><X size={30} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT SIDEBAR: NEW BIN FORM */}
          <div className="w-80 p-6 flex flex-col gap-6 overflow-y-auto bg-[#f9fafb] border-r">
            <div className="bg-[#E8F5E9] rounded-2xl p-5 border border-green-100 space-y-4 shadow-sm">
              <h3 className="font-bold text-green-800 text-lg flex items-center gap-2"><Plus size={20} /> New Bin</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Bin Name" className="w-full px-4 py-2.5 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-green-500 outline-none text-sm" value={formData.binName} onChange={(e) => setFormData({...formData, binName: e.target.value})} />
                <input type="text" placeholder="Address / Description" className="w-full px-4 py-2.5 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-green-500 outline-none text-sm" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="pt-2 space-y-2 border-t border-green-200/50">
                <button onClick={() => { setIsPlacing(true); setSelectedBinId(null); }} className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${isPlacing ? 'bg-orange-500 text-white animate-pulse' : 'bg-white text-gray-700 border border-green-200'}`}>
                  <MapPin size={16} className={isPlacing ? "text-white" : "text-gray-400"} /> {isPlacing ? "Click inside the Zone..." : "Place Pin on Map"}
                </button>
                <button onClick={handleAddLocation} className="w-full py-2.5 bg-[#2E7D32] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1B5E20] shadow-sm transition-all active:scale-95 cursor-pointer">
                  <Plus size={16} /> Add Bin Location
                </button>
                <button onClick={handleClearSelection} className="w-full py-2 bg-white text-red-500 border border-red-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 transition-all cursor-pointer mt-1"><Eraser size={14} /> Clear Selection</button>
              </div>
            </div>
            
            <div className="mt-auto">
                <button onClick={onClose} className="w-full py-3 bg-[#ff6b6b] text-white font-extrabold rounded-2xl cursor-pointer shadow-md hover:opacity-90 active:scale-95 transition-all">Cancel</button>
            </div>
          </div>

          {/* CENTRAL MAP PANEL */}
          <div className="flex-1 flex flex-col bg-gray-50 relative">
            <MapContainer center={[Number(safeBoundaries[0].lat), Number(safeBoundaries[0].lng)]} zoom={17} className="h-full w-full">
              <ZoomHandler setZoom={setZoomLevel} />
              
              <LayersControl position="bottomleft">
                <LayersControl.BaseLayer checked name="Google Streets"><TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution="&copy; Google Maps" /></LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite View"><TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution="&copy; Google Maps" /></LayersControl.BaseLayer>
              </LayersControl>

              <Polygon positions={safeBoundaries} pathOptions={{ color: '#2E7D32', fillColor: '#4CAF50', fillOpacity: 0.25, weight: 0.2 }} />
              
              {existingBins && existingBins.map(bin => (
                <Marker 
                  key={bin.bin_id} 
                  position={[Number(bin.latitude), Number(bin.longitude)]} 
                  icon={getDynamicBinIcon(selectedBinId === bin.bin_id ? '#1E88E5' : '#2E7D32', zoomLevel)}
                  draggable={selectedBinId === bin.bin_id}
                  eventHandlers={{ dragend: (e) => handleRelocateEnd(bin, e) }}
                >
                  <Popup className="font-bold">{bin.bin_name}</Popup>
                </Marker>
              ))}

              <DraggableMarker />
              <MapClickHandler />
              <MapController target={existingBins.find(b => b.bin_id === selectedBinId)} />
            </MapContainer>

            {/* FLOATING STATUS INDICATOR */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                 <div className={`px-4 py-2 rounded-full shadow-lg border flex items-center gap-2 transition-all ${isPlacing ? 'bg-orange-500 border-orange-400 text-white animate-bounce' : 'bg-white/90 text-gray-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${isPlacing ? 'bg-white animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {isPlacing ? `Click inside ${zone.zone_name}` : selectedBinId ? "Drag blue bin to relocate" : `Viewing: ${zone.zone_name}`}
                    </span>
                 </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: EXISTING BINS LIST */}
          <div className="w-80 p-6 flex flex-col overflow-hidden bg-[#f9fafb] border-l">
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <Trash2 size={18} className="text-gray-400" /> Existing Bins
            </h3>
            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {existingBins && existingBins.length > 0 ? existingBins.map((bin) => (
                <div 
                  key={bin.bin_id} 
                  onClick={() => { setSelectedBinId(bin.bin_id); setTempMarker(null); }}
                  className={`p-4 rounded-xl border transition-all flex justify-between items-center group cursor-pointer ${selectedBinId === bin.bin_id ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-100' : 'border-green-100 hover:bg-green-50/30'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-700 text-sm leading-tight truncate">{bin.bin_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter shrink-0 ${bin.collection_status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{bin.collection_status}</span>
                      <p className="text-[11px] text-gray-400 truncate">{bin.bin_address || 'No address'}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteBin(bin.bin_id); }} className="text-red-300 hover:text-red-500 p-2 cursor-pointer transition-all shrink-0"><Trash2 size={16} /></button>
                </div>
              )) : (
                <div className="text-center py-10 text-gray-400 italic text-sm">No bins in this zone yet.</div>
              )}
            </div>
            
            <div className="mt-6">
                <button onClick={onClose} className="w-full py-3 bg-[#a3ffbc] text-[#1B5E20] font-extrabold rounded-2xl cursor-pointer shadow-md hover:opacity-90 active:scale-95 transition-all">Save Changes</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AddBinModal;