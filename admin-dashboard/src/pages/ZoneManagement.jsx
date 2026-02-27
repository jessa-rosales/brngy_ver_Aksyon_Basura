import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Map as MapIcon, Plus, Edit, Trash2, ArrowUp, Trash, Bell, Archive } from 'lucide-react'; 
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, LayersControl, Polygon, Popup, Marker } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { design } from '../styles/design';
import Notification from '../components/Notification';
import AddZoneModal from '../components/AddZoneModal';
import AddBinModal from '../components/AddBinModal';
import ConfirmDialog from '../components/ConfirmDialog'; // ✅ Added for modern archiving

// SERVICES & CONTEXT
import { zoneService } from '../services/zoneService';
import { archiveService } from '../services/archiveService'; // ✅ Added for Archive Center
import { useUser } from '../context/UserContext'; 

const mainMapBinIcon = new L.DivIcon({
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

const ZoneManagement = () => {
  const navigate = useNavigate();
  const { user } = useUser(); 
  const [searchTerm, setSearchTerm] = useState('');
  const [zones, setZones] = useState([]);
  const [allBins, setAllBins] = useState([]);
  
  const [notify, setNotify] = useState({ show: false, msg: '', type: 'success' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [selectedZone, setSelectedZone] = useState(null);

  const [isBinModalOpen, setIsBinModalOpen] = useState(false);
  const [activeZoneForBin, setActiveZoneForBin] = useState(null);
  const [zoneBins, setZoneBins] = useState([]);

  // ✅ ARCHIVE CENTER STATES
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [zoneToArchive, setZoneToArchive] = useState(null);

  const scrollContainerRef = useRef(null);
  const { layout: l, dashboard: d, ui } = design;

  const triggerNotify = (msg, type = 'success') => setNotify({ show: true, msg, type });

  /* INITIAL LOAD */
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    refreshAllData();
  }, [user, navigate]);

  const refreshAllData = async () => {
    try {
      const [zoneData, binData] = await Promise.all([
        zoneService.getZones(),
        zoneService.getAllBins()
      ]);
      
      // ✅ Updated to only show non-archived zones in active management
      setZones((zoneData || []).filter(z => !z.is_archived));
      setAllBins(binData || []);
    } catch (err) { console.error("Data Load Error", err); }
  };

  /* ZONE ACTIONS  */
  const handleAddZone = async (data) => {
    const res = await zoneService.addZone(data);
    if (res) {
      refreshAllData();
      setIsModalOpen(false);
      triggerNotify(`Zone created successfully!`, "success");
    }
  };

  const handleUpdateZone = async (id, data) => {
    const res = await zoneService.updateZone(id, data);
    if (res) {
      refreshAllData();
      setIsModalOpen(false);
      triggerNotify("Zone boundaries updated!", "success");
    }
  };

  // ✅ Updated Deletion to use Archiving
  const handleDeleteZone = (id) => {
    setZoneToArchive(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmArchive = async () => {
    try {
      // ✅ Check if it actually returns true
      const success = await zoneService.deleteZone(zoneToArchive); 
      
      if (!success) {
         throw new Error("Server rejected the archive request");
      }
      
      refreshAllData();
      setIsConfirmOpen(false);
      triggerNotify("Zone moved to Archive Center", "warning");
    } catch (err) {
      // ✅ Now it will properly show an error if it fails!
      setIsConfirmOpen(false);
      triggerNotify("Failed to archive zone", "error"); 
    }
  };

  /* BIN ACTIONS */
  const fetchBinsForZone = async (zoneId) => {
    const data = await zoneService.getBinsByZone(zoneId);
    setZoneBins(data.map(b => ({ ...b, latitude: b.latitude || b.lat, longitude: b.longitude || b.lng })));
  };

  const handleAddBin = async (data) => {
    const res = await zoneService.addBin(data);
    if (res.ok) {
      fetchBinsForZone(data.zone_id);
      refreshAllData();
      triggerNotify("New bin added!", "success");
    }
  };

  const handleRelocateBin = async (binId, coords) => {
    const res = await zoneService.relocateBin(binId, coords);
    if (res.ok) {
      fetchBinsForZone(activeZoneForBin.zone_id);
      refreshAllData();
      triggerNotify("Bin relocated!", "relocate");
    }
  };

  const handleDeleteBin = async (binId) => {
    if (!window.confirm("Delete this bin?")) return;
    const res = await zoneService.deleteBin(binId);
    if (res.ok) {
      fetchBinsForZone(activeZoneForBin.zone_id);
      refreshAllData();
      triggerNotify("Bin removed.", "error");
    }
  };

  /* UI LOGIC */
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const container = scrollContainerRef.current;
    const handleScroll = () => { if (container) setShowBackToTop(container.scrollTop > 400); };
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const openAddModal = () => { setModalMode('add'); setSelectedZone(null); setIsModalOpen(true); };
  const openEditModal = (z) => { setModalMode('edit'); setSelectedZone(z); setIsModalOpen(true); };

  const filteredZones = zones.filter(z => (z.zone_name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  if (!user) return null;

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto relative bg-[#f0fdf4]">
      {/* HEADER */}
      <header className={l.header}>
        <div className="relative w-full max-w-2xl"> 
          <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search zones..." 
            className={l.searchBox} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-6">
          <button className="relative text-gray-600 hover:text-green-700">
            <Bell size={24} />
          </button>
          
          <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
            <div className="text-right hidden md:block cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate("/profile-settings")}>
              <p className="text-sm font-bold text-gray-800 leading-tight">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
            <div className={`${l.profileCircle} cursor-pointer hover:ring-4 hover:ring-green-100 transition-all overflow-hidden border border-gray-100`} onClick={() => navigate("/profile-settings")}>
              <img src={user.profile_picture ? `http://localhost:5000${user.profile_picture}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.first_name}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-[#1B5E20]">Zone Boundaries</h2>
            <p className="text-gray-600 text-sm">Monitor and manage waste collection areas</p>
          </div>
          {/* ✅ ARCHIVE CENTER SHORTCUT */}
          <button 
            onClick={() => navigate("/archive-center")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
          >
            <Archive size={14} /> View Archives
          </button>
        </div>

        {/* INTERACTIVE MAP VIEW */}
        <div className={d.mapCard}>
          <div className={d.mapHeader}>
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-lg">Interactive Map View</h3>
            <button onClick={openAddModal} className="bg-[#4CAF50] hover:bg-[#43A047] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer">
              <span className="bg-white text-[#4CAF50] rounded-full p-0.5"><Plus size={14} /></span> Add New Zone
            </button>
          </div>
          <div className={d.mapFrame}>
             <MapContainer center={[8.4822, 124.6472]} zoom={15} style={{ height: "100%", width: "100%" }}>
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Google Streets">
                    <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite View">
                    <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='&copy; Google Maps' />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {zones.map((zone) => {
                  if (!zone.boundaries) return null;
                  const positions = Array.isArray(zone.boundaries[0]) ? zone.boundaries[0] : zone.boundaries;
                  return (
                    <Polygon key={`map-zone-${zone.zone_id}`} positions={positions} pathOptions={{ color: zone.zone_color || '#2E7D32', fillColor: zone.zone_color || '#2E7D32', fillOpacity: 0.4, weight: 0.2 }}>
                        <Popup><h4 className="font-bold">{zone.zone_name}</h4></Popup>
                    </Polygon>
                  );
                })}

                {allBins.map((bin) => (
                  <Marker key={`map-bin-${bin.bin_id}`} position={[bin.latitude || bin.lat, bin.longitude || bin.lng]} icon={mainMapBinIcon}>
                    <Popup><p className="font-bold text-sm">{bin.bin_name}</p></Popup>
                  </Marker>
                ))}
             </MapContainer>
          </div>
        </div>

        {/* ZONE AREA SECTION */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b bg-white border-t-4 border-[#2B9447]">
             <h3 className="text-xl font-bold text-gray-800">Zone Area</h3>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredZones.length > 0 ? (
                filteredZones.map((zone) => (
                <div key={zone.zone_id} className="border-2 border-green-100 rounded-2xl p-5 bg-white hover:shadow-md transition-all relative group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
                            <MapIcon size={20} className="text-green-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 text-lg">{zone.zone_name}</h4>
                            <p className="text-xs text-gray-400 font-medium">Zone ID: #{zone.zone_id}</p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                            <Trash size={16} className="text-gray-400" />
                            <span>
                                Bins: <strong className="text-gray-700">{zone.bin_count || 0}</strong> in the area
                            </span>
                        </div>
                        <div className="w-full h-px bg-gray-100" />
                    </div>

                    <div className="flex gap-3">
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                            onClick={() => openEditModal(zone)}
                        >
                            <Edit size={14} /> Edit Boundaries
                        </button>
                        
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-50 text-green-700 rounded-lg border border-green-100 text-xs font-bold hover:bg-green-100 transition-colors cursor-pointer"
                            onClick={() => {
                                setActiveZoneForBin(zone);
                                fetchBinsForZone(zone.zone_id); 
                                setIsBinModalOpen(true);
                            }}
                        >
                            <Plus size={14} /> Add Bin
                        </button>
                    </div>

                    <button 
                        onClick={() => handleDeleteZone(zone.zone_id)}
                        className="absolute top-4 right-4 p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                ))
            ) : (
                <div className="col-span-full py-16 text-center text-gray-400 italic font-medium">No created zones found.</div>
            )}
          </div>
        </div>
      </main>
      
      {showBackToTop && (
        <button 
          onClick={scrollToTop}
          className={`${ui.backToTop} flex items-center justify-center animate-bounce z-[2000]`}
        >
          <ArrowUp size={24} />
        </button>
      )}

      {/* ZONE MODAL */}
      <AddZoneModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddZone={handleAddZone} 
        onUpdateZone={handleUpdateZone}
        onNotify={triggerNotify}
        existingZones={zones}
        mode={modalMode}
        selectedZone={selectedZone}
      />

      {/*ADD BIN MODAL */}
      <AddBinModal 
        isOpen={isBinModalOpen} 
        onClose={() => setIsBinModalOpen(false)} 
        zone={activeZoneForBin}
        onAddBin={handleAddBin}
        onRelocateBin={handleRelocateBin}
        onDeleteBin={handleDeleteBin}
        onNotify={triggerNotify}
        existingBins={zoneBins}
      />

      {/* MODERN ARCHIVE CONFIRMATION */}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Zone?"
        message="This zone will be hidden from the map and moved to the Archive Center. All associated bins will remain in records."
        confirmText="Archive Now"
        type="warning"
      />

      <Notification 
          key={notify.msg}
          show={notify.show} 
          message={notify.msg} 
          type={notify.type} 
          onClose={() => setNotify({ ...notify, show: false })} 
      />
    </div>
  );
};

export default ZoneManagement;