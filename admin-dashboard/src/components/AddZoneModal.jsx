import React, { useState, useEffect } from 'react';
import { X, MousePointer2, Trash2, Save, Move } from 'lucide-react';
import { MapContainer, TileLayer, useMap, Polygon } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import * as turf from '@turf/turf';

/* ==========================================
   UPDATED NAZARETH BOUNDARY CONFIGURATION
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

const NAZARETH_LEAFLET_POSITIONS = NAZARETH_RAW_COORDS.map(c => [c.lat, c.lng]);

const turfCoords = NAZARETH_RAW_COORDS.map(c => [c.lng, c.lat]);
if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] || turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]) {
  turfCoords.push(turfCoords[0]); 
}
const NAZARETH_TURF_POLYGON = turf.polygon([turfCoords]);

/* ==========================================
   GEOMAN DRAWING CONTROLS
   ========================================== */
const GeomanControls = ({ onShapeCreated, setMapInstance, zoneColor }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    setMapInstance(map);

    map.pm.addControls({
      position: 'topleft',
      drawCircle: false, 
      drawMarker: false, 
      drawCircleMarker: false,
      drawPolyline: false, 
      drawRectangle: false, 
      drawPolygon: true,
      editMode: true, 
      dragMode: true, 
      removalMode: true,
    });

    map.pm.setGlobalOptions({ 
        pathOptions: { color: zoneColor, fillColor: zoneColor, fillOpacity: 0.3, weight: 3 },
        layerGroup: map, 
        filterLayer: (layer) => !layer.options.pmIgnore
    });

    map.on('pm:create', (e) => {
      const layer = e.layer;
      onShapeCreated(layer.getLatLngs());

      layer.on('pm:edit', () => {
        onShapeCreated(layer.getLatLngs());
      });
    });

    map.on('pm:globaleditmodetoggled', (e) => {
        map.eachLayer((layer) => {
            if (layer instanceof L.Polygon && !layer.options.pmIgnore) {
                layer.on('pm:edit', (event) => {
                    onShapeCreated(event.target.getLatLngs());
                });
            }
        });
    });

    return () => {
        map.off('pm:create');
        map.off('pm:globaleditmodetoggled');
    };
  }, [map, onShapeCreated, setMapInstance, zoneColor]);

  return null;
};

/* ==========================================
   MAIN DUAL-MODE MODAL
   ========================================== */
const AddZoneModal = ({ isOpen, onClose, onAddZone, onUpdateZone, onNotify, existingZones = [], mode = 'add', selectedZone = null }) => {
  const [formData, setFormData] = useState({
    zoneName: '',
    zoneColor: '#00e600',
    coordinates: null
  });
  
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    if (isOpen && mode === 'edit' && selectedZone) {
      setFormData({
        zoneName: selectedZone.zone_name || '',
        zoneColor: selectedZone.zone_color || '#00e600',
        coordinates: selectedZone.boundaries || selectedZone.coordinates || null
      });
    } else if (isOpen && mode === 'add') {
      setFormData({ zoneName: '', zoneColor: '#00e600', coordinates: null });
    }
  }, [isOpen, mode, selectedZone]);

  if (!isOpen) return null;

  const toggleAdjustPoints = () => {
    if (mapInstance) {
      const isEditing = mapInstance.pm.globalEditEnabled();
      mapInstance.pm.toggleGlobalEditMode();
    }
  };

  const checkWithinNazareth = (newCoords) => {
    try {
      const formatToTurf = (path) => {
        const points = Array.isArray(path[0]) ? path[0] : path;
        const coords = points.map(p => [p.lng, p.lat]);
        if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
          coords.push(coords[0]);
        }
        return turf.polygon([coords]);
      };

      const drawnPoly = formatToTurf(newCoords);
      return turf.booleanWithin(drawnPoly, NAZARETH_TURF_POLYGON);
    } catch (err) {
      console.error("Geofence Check Error:", err);
      return false; 
    }
  };

  const checkOverlap = (newCoords) => {
    try {
      const formatToTurf = (path) => {
        const points = Array.isArray(path[0]) ? path[0] : path;
        const coords = points.map(p => [p.lng, p.lat]);
        if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
          coords.push(coords[0]);
        }
        return turf.polygon([coords]);
      };

      const drawnPoly = formatToTurf(newCoords);
      for (const zone of existingZones) {
        if (mode === 'edit' && zone.zone_id === selectedZone?.zone_id) continue;
        const existingPath = zone.boundaries || zone.coordinates;
        if (!existingPath) continue;
        const existingPoly = formatToTurf(existingPath);
        if (turf.booleanIntersects(drawnPoly, existingPoly)) return zone.zone_name;
      }
      return null;
    } catch (err) { return null; }
  };

  const startDrawing = () => {
    if (mapInstance) {
      mapInstance.pm.enableDraw('Polygon', {
        snappable: true,
        templineStyle: { color: formData.zoneColor },
        hintlineStyle: { color: formData.zoneColor, dashArray: [5, 5] },
      });
    }
  };

  const clearMap = () => {
    if (mapInstance) {
      mapInstance.pm.disableDraw();
      mapInstance.eachLayer((layer) => {
        if (layer.options && (layer.options.isZone || layer.pm)) {
          mapInstance.removeLayer(layer);
        }
      });
      setFormData({ ...formData, coordinates: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.coordinates) {
      return onNotify("Please draw a zone boundary on the map first!", "error");
    }

    if (!checkWithinNazareth(formData.coordinates)) {
      return onNotify("Action Denied: Zones can only be created entirely within the Nazareth boundary.", "error");
    }

    const overlappedZoneName = checkOverlap(formData.coordinates);
    if (overlappedZoneName) {
      return onNotify(`Boundary overlaps with "${overlappedZoneName}". Please adjust.`, "error");
    }
    
    if (mode === 'edit') {
      onUpdateZone(selectedZone.zone_id, formData);
    } else {
      onAddZone(formData);
    }
    clearMap(); 
    onClose(); 
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        
        {/* ✅ HEADER WITH DEAD-CENTER LEGEND */}
        <div className="px-10 py-4 border-b border-gray-100 bg-white flex justify-between items-center relative">
          
          {/* Left Title Area */}
          <div>
            <h3 className="text-3xl font-bold text-gray-800">
              {mode === 'edit' ? 'Edit Zone Boundaries' : 'Create New Zone'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
               {mode === 'edit' ? `Adjusting ${selectedZone?.zone_name}` : 'Define zone details and boundaries.'}
            </p>
          </div>

          {/* Centered Notice Badge */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-200 shadow-sm pointer-events-none">
              <div className="w-8 h-0 border-t-[3px] border-dashed border-blue-500"></div>
              <div className="flex flex-col">
                <span className="text-[13px] font-extrabold text-blue-800 leading-tight">Nazareth Boundary</span>
                <span className="text-[11px] font-semibold text-blue-600 leading-tight">Draw zones inside the dashed line</span>
              </div>
          </div>

          {/* Right Close Button */}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X size={25} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[320px] p-6 space-y-6 bg-[#f4fff2] border-r border-gray-100 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Zone Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-green-500 bg-white text-sm"
                  value={formData.zoneName}
                  onChange={(e) => setFormData({...formData, zoneName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Zone Color</label>
                <div className="flex items-center gap-4 bg-white p-2.5 rounded-xl border border-gray-200">
                  <input type="color" value={formData.zoneColor} onChange={(e) => setFormData({...formData, zoneColor: e.target.value})} className="w-10 h-10 border-none rounded-lg cursor-pointer bg-transparent" />
                  <span className="text-sm font-mono text-gray-400 uppercase tracking-tighter">{formData.zoneColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-200/50 flex flex-col items-center">
              <p className="text-sm font-bold text-gray-700 self-start ml-2">Drawing Tools</p>
              
              <button type="button" onClick={startDrawing} className="w-52 py-3 px-6 bg-white border border-gray-200 rounded-2xl flex items-center gap-4 font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm text-[13px] cursor-pointer">
                <MousePointer2 size={18} className="text-green-400" /> Start Drawing
              </button>

              <button 
                type="button" 
                onClick={toggleAdjustPoints} 
                className="w-52 py-3 px-6 bg-white border border-gray-200 rounded-2xl flex items-center gap-4 font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm text-[13px] cursor-pointer"
              >
                <Move size={18} className="text-blue-500" /> Adjust Points
              </button>
              
              <button type="button" onClick={clearMap} className="w-52 py-3 px-6 bg-white border border-gray-200 rounded-2xl flex items-center gap-4 font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm text-[13px] cursor-pointer">
                <Trash2 size={18} className="text-red-400" /> Clear Current
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-gray-50">
            <MapContainer center={[8.4715, 124.6475]} zoom={15} className="h-full w-full">
              <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />

              {/* NON-INTERACTIVE DASHED BOUNDARY */}
              <Polygon 
                positions={NAZARETH_LEAFLET_POSITIONS}
                pmIgnore={true}
                interactive={false}
                pathOptions={{ color: '#3b82f6', fillOpacity: 0.03, weight: 3, dashArray: '8, 8' }}
              />

              {existingZones
                .filter(z => z.zone_id !== selectedZone?.zone_id)
                .map((zone) => (
                    <Polygon 
                      key={zone.zone_id}
                      positions={zone.boundaries || zone.coordinates}
                      pmIgnore={true}
                      pathOptions={{ color: zone.zone_color || '#888', fillOpacity: 0.15, weight: 2, dashArray: '5, 5' }}
                    />
              ))}

              {formData.coordinates && (
                 <Polygon 
                    positions={formData.coordinates}
                    pathOptions={{ color: formData.zoneColor, fillColor: formData.zoneColor, fillOpacity: 0.4, weight: 0.2 }}
                 />
              )}

              <GeomanControls 
                onShapeCreated={(coords) => setFormData({...formData, coordinates: coords})} 
                setMapInstance={setMapInstance}
                zoneColor={formData.zoneColor}
              />
            </MapContainer>
          </div>
        </div>

        <div className="px-10 py-5 justify-center border-t border-gray-100 flex gap-8 bg-white">
          <button onClick={onClose} className="w-48 py-2 bg-[#ff6b6b] text-white font-extrabold rounded-2xl cursor-pointer">Cancel</button>
          <button onClick={handleSubmit} className="w-48 py-2 bg-[#a3ffbc] text-[#1B5E20] font-extrabold rounded-2xl flex items-center justify-center gap-3 cursor-pointer">
            <Save size={20} /> {mode === 'edit' ? 'Update Zone' : 'Save Zone'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddZoneModal;