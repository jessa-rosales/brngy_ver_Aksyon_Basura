import React, { useState, useEffect } from 'react';
import { X, MousePointer2, Trash2, Save, Move } from 'lucide-react'; // Added Move icon
import { MapContainer, TileLayer, useMap, Polygon, Popup } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import * as turf from '@turf/turf';

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

  // ✅ NEW FUNCTION: Toggle Adjust Mode programmatically
  const toggleAdjustPoints = () => {
    if (mapInstance) {
      const isEditing = mapInstance.pm.globalEditEnabled();
      mapInstance.pm.toggleGlobalEditMode();
      
      // Visual feedback to the user via console or optional state
      if (!isEditing) {
        console.log("Adjust Points enabled: You can now drag the white dots.");
      }
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

    // 1. Check if coordinates exist using the onNotify prop
    if (!formData.coordinates) {
      return onNotify("Please draw a zone boundary on the map first!", "error");
    }

    // 2. Check for overlaps and provide sleek feedback
    const overlappedZoneName = checkOverlap(formData.coordinates);
    if (overlappedZoneName) {
      return onNotify(`Boundary overlaps with "${overlappedZoneName}". Please adjust.`, "error");
    }
    
    // 3. Process the save/update
    if (mode === 'edit') {
      onUpdateZone(selectedZone.zone_id, formData);
    } else {
      onAddZone(formData);
    }
    clearMap(); 
    onClose(); //After complete mo auto close ang modal
  };

  return (
    <div className="fixed inset-0 z-3000 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        
        <div className="px-10 py-4 border-b border-gray-100 bg-white flex justify-between items-center">
          <div>
            <h3 className="text-3xl font-bold text-gray-800">
              {mode === 'edit' ? 'Edit Zone Boundaries' : 'Create New Zone'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
               {mode === 'edit' ? `Adjusting ${selectedZone?.zone_name}` : 'Define zone details and boundaries'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"><X size={25} /></button>
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

              {/* ADJUST POINTS BUTTON */}
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
            <MapContainer center={[8.4822, 124.6472]} zoom={15} className="h-full w-full">
              <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />

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