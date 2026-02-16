import React, { useEffect, useMemo, useState } from 'react';
import { X, Navigation, MapPin, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ✅ MAINTAINED: YOUR CUSTOM RED MAPPIN ICON
const redMarkerIcon = new L.DivIcon({
  html: renderToStaticMarkup(
    <div className="relative flex items-center justify-center">
      <div className="absolute w-12 h-12 bg-rose-500/30 rounded-full animate-ping" />
      <div className="relative bg-rose-600 p-1.5 rounded-full border-2 border-white shadow-lg shadow-rose-900/50 flex items-center justify-center">
        <MapPin color="white" size={18} fill="white" fillOpacity={0.2} />
      </div>
      <div className="absolute -bottom-1 w-2 h-2 bg-rose-600 rotate-45 border-r border-b border-white" />
    </div>
  ),
  className: 'custom-red-pin',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// ✅ MAINTAINED: AUTO-FOCUS & RE-CENTER LOGIC
const MapController = ({ boundaries, center }) => {
  const map = useMap();
  useEffect(() => {
    if (boundaries && boundaries.length >= 3) {
      const bounds = L.latLngBounds(boundaries);
      map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5 });
    } else if (center) {
      map.setView(center, 18, { animate: true });
    }
  }, [boundaries, center, map]);
  return null;
};

const ReportNavigationModal = ({ isOpen, onClose, report, zone }) => {
  const [copied, setCopied] = useState(false);

  const reportPos = useMemo(() => 
    report ? [Number(report.latitude), Number(report.longitude)] : null
  , [report]);

  // ✅ MAINTAINED EXACTLY: YOUR WORKING POLYGON PARSER LOGIC
  const safeBoundaries = useMemo(() => {
    let raw = zone?.boundaries || zone?.coordinates;
    if (!raw) return [];
    try {
      let data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data.coordinates) data = data.coordinates;
      while (Array.isArray(data) && Array.isArray(data[0]) && Array.isArray(data[0][0])) {
        data = data[0];
      }
      if (Array.isArray(data[0]) && typeof data[0][0] !== 'object' && data[0].length === 2) {
        // Correct level
      } else if (Array.isArray(data[0])) {
        data = data[0];
      }

      return data.map(point => {
        let lat, lng;
        if (point.lat !== undefined) {
          lat = point.lat; lng = point.lng;
        } else if (Array.isArray(point)) {
          if (Number(point[0]) > 50) {
            lat = Number(point[1]); lng = Number(point[0]);
          } else {
            lat = Number(point[0]); lng = Number(point[1]);
          }
        }
        return [Number(lat), Number(lng)];
      }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
    } catch (err) {
      console.error("Polygon Render Error:", err);
      return [];
    }
  }, [zone]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${report.latitude}, ${report.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-6xl h-[88vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
        
        {/* Header: Professional SaaS Style */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Navigation size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Spatial Intelligence</h2>
                <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-slate-200">Live GPS</span>
              </div>
              <p className="text-sm font-medium text-slate-400 mt-1 flex items-center gap-1">
                <MapPin size={12} className="text-rose-400" /> {report.location_address}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {copied ? 'Copied!' : 'Copy Coords'}
            </button>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-300">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-slate-200">
          <MapContainer center={reportPos} zoom={18} className="h-full w-full grayscale-[0.1] contrast-[1.1]">
            <MapController boundaries={safeBoundaries} center={reportPos} />
            
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satellite Imaging">
                <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} attribution="© Google Maps" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Street Navigation">
                <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} attribution="© Google Maps" />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* ✅ FIXED: Elegant High-Visibility Polygon Drawing */}
            {safeBoundaries.length > 0 && (
              <Polygon 
                key={`${zone?.zone_id}-${safeBoundaries.length}`} 
                positions={safeBoundaries} 
                pathOptions={{ 
                  color: zone?.zone_color || '#10b981', 
                  fillColor: zone?.zone_color || '#10b981', 
                  fillOpacity: 0.2, 
                  weight: 1,           // Visible thickness
                  dashArray: '10, 10', // Professional dashed look
                  opacity: 10         // High visibility border
                }} 
              />
            )}

            <Marker position={reportPos} icon={redMarkerIcon}>
              <Popup>
                <div className="p-2 text-center">
                  <p className="font-black text-rose-600 text-[10px] uppercase tracking-widest">{report.issue_type}</p>
                  <p className="text-xs font-bold text-slate-700 mt-1 uppercase">Incident Point</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Floating Glassmorphism Cards */}
          <div className="absolute bottom-8 left-8 z-[1000] flex flex-col gap-4 max-w-xs animate-in slide-in-from-bottom duration-700">
            
            {/* Zone Identity Card */}
            <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-white/40">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                    <ShieldCheck size={20} style={{ color: zone?.zone_color || '#10b981' }} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">Supervision Area</span>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5 uppercase">
                        {zone?.zone_name || 'Unassigned Territory'}
                    </h3>
                  </div>
               </div>
               
               <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`, '_blank')}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-600 transition-all shadow-lg flex items-center justify-center gap-2"
               >
                  <ExternalLink size={12} /> Start Navigation
               </button>
            </div>

            {/* Micro Coordinates Card */}
            <div className="bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-2xl border border-white/10 self-start">
               <p className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter uppercase">
                  Point: <span className="text-white">{Number(report.latitude).toFixed(6)}, {Number(report.longitude).toFixed(6)}</span>
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportNavigationModal;