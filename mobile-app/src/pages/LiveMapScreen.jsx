import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar, Alert, Image } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Truck, Bell, ChevronLeft, MapPin, Navigation, CheckCircle2, Trash2, AlertTriangle, Map as MapIcon, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ✅ ADDED: Import mobileService to fetch live moving coordinates
import { mobileService } from '../services/mobileService'; 

MapboxGL.setAccessToken('pk.eyJ1IjoiamVnby1ybyIsImEiOiJjbWx6dnZ6YmQwOW12NGtxd25vMmJldGZhIn0.uCCN-70t1ZZugt6h1ZoMOg');

const { width, height } = Dimensions.get('window');

const RenderBinMarker = ({ status }) => (
  <View style={styles.emeraldMarkerContainer}>
    <View style={[styles.emeraldCore, status === 'Collected' && styles.collectedCore]}>
      {status === 'Collected' ? <CheckCircle2 size={12} color="white" /> : <Trash2 size={12} color="white" />}
    </View>
    <View style={[styles.emeraldTip, status === 'Collected' && styles.collectedTip]} />
  </View>
);

const RenderReportMarker = ({ status, isFocused }) => {
  let markerColor = '#EF4444'; 
  let ringColor = 'rgba(239, 68, 68, 0.4)';
  
  if (status === 'Resolved' || status === 'Collected') {
    markerColor = '#10B981'; 
    ringColor = 'rgba(16, 185, 129, 0.4)';
  } else if (status === 'In Progress') {
    markerColor = '#F59E0B'; 
    ringColor = 'rgba(245, 158, 11, 0.4)';
  }

  return (
    <View style={styles.reportMarkerContainer}>
      {isFocused && <View style={[styles.focusedRing, { backgroundColor: ringColor, borderColor: markerColor }]} />}
      <View style={[
        styles.reportCore, 
        { backgroundColor: markerColor }, 
        isFocused && { borderColor: 'white', borderWidth: 3, width: 24, height: 24, borderRadius: 12 }
      ]}>
        {status === 'Resolved' || status === 'Collected' ? (
          <CheckCircle2 size={12} color="white" />
        ) : status === 'In Progress' ? (
          <Clock size={12} color="white" />
        ) : (
          <AlertTriangle size={12} color="white" />
        )}
      </View>
      <View style={[
        styles.reportTip, 
        { backgroundColor: markerColor }
      ]} />
    </View>
  );
};

const LiveMapScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);

  const zoneData = route.params?.zoneData || {};
  const allZonesData = route.params?.allZonesData || []; 
  const isAllZones = zoneData.zone_id === 'all';
  
  const targetLocation = route.params?.focusLocation;
  const targetReportId = route.params?.reportId;
  const targetReport = route.params?.targetReport;

  const bins = isAllZones ? allZonesData.flatMap(z => z.bins || []) : (zoneData.bins || []);
  const reports = isAllZones ? allZonesData.flatMap(z => z.reports || []) : (zoneData.reports || []);

  // ✅ ADDED: State to hold the live moving coordinates of the truck
  const [liveTruckCoords, setLiveTruckCoords] = useState(
    (zoneData.truck_lng && zoneData.truck_lat) 
      ? [Number(zoneData.truck_lng), Number(zoneData.truck_lat)] 
      : null
  );

  // ✅ ADDED: Background interval to fetch the moving truck every 5 seconds
  useEffect(() => {
    if (isAllZones || !zoneData.zone_id) return;

    const fetchLiveLocation = async () => {
      try {
        const result = await mobileService.getZoneTrackingData();
        if (result && result.success) {
          const currentZoneInfo = result.data.find(z => z.zone_id === zoneData.zone_id);
          if (currentZoneInfo && currentZoneInfo.truck_lat && currentZoneInfo.truck_lng) {
            setLiveTruckCoords([Number(currentZoneInfo.truck_lng), Number(currentZoneInfo.truck_lat)]);
          }
        }
      } catch (error) {
        console.log("Map Polling Error:", error);
      }
    };

    const interval = setInterval(fetchLiveLocation, 5000); // Updates map every 5 seconds
    return () => clearInterval(interval);
  }, [isAllZones, zoneData.zone_id]);
  
  useEffect(() => {
    if (targetLocation && cameraRef.current) {
      setTimeout(() => {
        cameraRef.current.setCamera({
          centerCoordinate: [Number(targetLocation.longitude), Number(targetLocation.latitude)],
          zoomLevel: 18, 
          animationDuration: 2000, 
          pitch: 45, 
        });
      }, 500);
    }
  }, [targetLocation]);

  const zoneFeatures = useMemo(() => {
    const features = [];

    allZonesData.forEach(z => {
      if (!z.boundaries) return;

      try {
        const boundaryData = typeof z.boundaries === 'string' ? JSON.parse(z.boundaries) : z.boundaries;
        
        let rawPoints = [];
        if (boundaryData?.type === 'Polygon') {
          rawPoints = boundaryData.coordinates[0];
        } else if (Array.isArray(boundaryData)) {
          rawPoints = Array.isArray(boundaryData[0]) ? boundaryData[0] : boundaryData;
        }

        if (!rawPoints || rawPoints.length === 0) return;

        const polygonCoords = rawPoints.map(p => {
          const lat = Number(Array.isArray(p) ? p[1] : (p.latitude || p.lat));
          const lng = Number(Array.isArray(p) ? p[0] : (p.longitude || p.lng));
          return [lng, lat];
        });

        if (polygonCoords.length > 2) {
          const first = polygonCoords[0];
          const last = polygonCoords[polygonCoords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            polygonCoords.push([first[0], first[1]]); 
          }
        }

        features.push({
          type: 'Feature',
          properties: {
            zone_name: z.zone_name,
            zone_color: z.zone_color || '#3B82F6' 
          },
          geometry: {
            type: 'Polygon',
            coordinates: [polygonCoords] 
          }
        });
      } catch (e) {
        console.error(`Failed to parse boundaries for ${z.zone_name}:`, e);
      }
    });

    return { type: 'FeatureCollection', features };
  }, [allZonesData]);

  // ✅ UPDATED: Use liveTruckCoords for initial center if available
  const initialCameraCoords = targetLocation 
    ? [Number(targetLocation.longitude), Number(targetLocation.latitude)]
    : (liveTruckCoords && !isAllZones)
        ? liveTruckCoords 
        : [124.6459, 8.4772];
    
  const zoomLvl = targetLocation ? 18 : (isAllZones ? 13 : 15.5);

  const allStops = [...bins, ...reports];
  const totalStops = allStops.length;
  const completedStops = allStops.filter(s => s.status === 'Collected' || s.status === 'Resolved').length;
  const pendingStops = totalStops - completedStops;
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  const nextStop = allStops.find(s => s.status === 'Pending');
  const locationText = nextStop ? nextStop.address : 'Completed';

  const handleZonePress = (event) => {
    const feature = event.features[0];
    if (feature && feature.properties) {
      Alert.alert("Zone Information", `You selected: ${feature.properties.zone_name}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={initialCameraCoords}
            zoomLevel={zoomLvl}
            animationDuration={1500}
          />

          {zoneFeatures.features.length > 0 && (
            <MapboxGL.ShapeSource 
              id="zonesSource" 
              shape={zoneFeatures}
              onPress={handleZonePress}
            >
              <MapboxGL.FillLayer 
                id="zonesFill" 
                style={{
                  fillColor: ['get', 'zone_color'],
                  fillOpacity: 0.3
                }}
              />
              <MapboxGL.LineLayer 
                id="zonesLine" 
                style={{
                  lineColor: ['get', 'zone_color'],
                  lineWidth: 2
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ✅ UPDATED: Uses 'liveTruckCoords' so it drives live on the map */}
          {!isAllZones && liveTruckCoords && (
            <MapboxGL.MarkerView 
              id="truck-marker" 
              coordinate={liveTruckCoords}
            >
              <View style={styles.customTruckPuck}>
                <Image 
                  source={require('../../assets/truck.png')} 
                  style={styles.truckIconImage} 
                  resizeMode="contain"
                  fadeDuration={0} 
                />
              </View>
            </MapboxGL.MarkerView>
          )}

          {bins.map((bin, index) => {
            if (!bin.lng || !bin.lat) return null;
            return (
              <MapboxGL.PointAnnotation 
                key={`map-bin-${bin.id || 'new'}-${index}`} 
                id={`map-bin-${bin.id || 'new'}-${index}`} 
                coordinate={[Number(bin.lng), Number(bin.lat)]}
              >
                <RenderBinMarker status={bin.status} />
              </MapboxGL.PointAnnotation>
            );
          })}

          {reports.map((report, index) => {
            if (!report.lng || !report.lat) return null;
            const isFocused = String(report.id) === String(targetReportId);

            return (
              <MapboxGL.PointAnnotation 
                key={`map-rep-${report.id || 'new'}-${index}`} 
                id={`map-rep-${report.id || 'new'}-${index}`} 
                coordinate={[Number(report.lng), Number(report.lat)]}
                style={{ zIndex: isFocused ? 1000 : 1 }}
              >
                <RenderReportMarker status={report.status} isFocused={isFocused} />
              </MapboxGL.PointAnnotation>
            );
          })}

          {targetLocation && (
            <MapboxGL.PointAnnotation 
              id="focused-target-marker" 
              coordinate={[Number(targetLocation.longitude), Number(targetLocation.latitude)]}
              style={{ zIndex: 1000 }}
            >
              <RenderReportMarker 
                status={targetReport ? targetReport.status : 'Pending'} 
                isFocused={true} 
              />
            </MapboxGL.PointAnnotation>
          )}

        </MapboxGL.MapView>
      </View>

      <View style={[styles.floatingHeader, { top: Platform.OS === 'ios' ? insets.top : 40 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        
        <View style={styles.headerTag}>
          <View style={[styles.liveDot, isAllZones && { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.headerText}>
            {targetLocation ? 'NAVIGATING TO REPORT' : (isAllZones ? 'CITY OVERVIEW' : 'LIVE TRACKING')}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.statusCard}>
          <View style={styles.dragHandle} />
          
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.truckId}>
                {targetLocation ? 'Report Location View' : (isAllZones ? 'Cagayan de Oro City' : (zoneData.vehicle_name || zoneData.plate_number || 'Vehicle #N/A'))}
              </Text>
              <Text style={styles.driverName}>
                {targetReport ? `Current Status: ${targetReport.status}` : (isAllZones ? 'All Monitoring Zones' : `Driver: ${zoneData.driver_name || 'Unassigned'}`)}
              </Text>
            </View>
            
            {targetReport ? (
              <View style={styles.etaContainer}>
                {targetReport.status === 'Resolved' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>Resolved</Text>
                  </View>
                ) : targetReport.status === 'In Progress' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Clock size={16} color="#F59E0B" />
                    <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>In Progress</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                    <AlertTriangle size={16} color="#EF4444" />
                    <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>Pending</Text>
                  </View>
                )}
              </View>
            ) : (!isAllZones && !targetLocation && (
              <View style={styles.etaContainer}>
                <Text style={styles.etaTime}>Active</Text>
                <Text style={styles.etaLabel}>{zoneData.zone_name}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />
          
          <View style={styles.locationRow}>
             {isAllZones ? <MapIcon size={16} color="#3B82F6" /> : <Navigation size={16} color="#3B82F6" />}
             <Text style={styles.locationText}>
               {targetLocation ? 'Report Address: ' : (isAllZones ? 'Total Pending Stops: ' : (nextStop ? 'Approaching ' : 'Current Status: '))} 
               <Text style={{fontWeight: '700', color:'#1e293b'}}>
                 {targetReport ? targetReport.location_address : (targetLocation ? 'Selected Report Location' : (isAllZones ? pendingStops : locationText))}
               </Text>
             </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{progressPercent}%</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{pendingStops}</Text>
              <Text style={styles.statLabel}>Stops Left</Text>
            </View>
            
            <TouchableOpacity activeOpacity={0.9}>
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.notifyButton}>
                    <Bell color="white" size={18} />
                    <Text style={styles.notifyText}>Notify Me</Text>
                </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { ...StyleSheet.absoluteFillObject },
  map: { flex: 1 },
  floatingHeader: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  backButton: { backgroundColor: 'white', padding: 12, borderRadius: 14, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  headerTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, elevation: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 6 },
  headerText: { fontSize: 12, fontWeight: '800', color: '#1e293b', letterSpacing: 0.5 },
  
  // ✅ ADDED: Professional Puck Styles for the Truck Marker
  customTruckPuck: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'white',
    borderWidth: 2.5,
    borderColor: '#3B82F6', 
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  truckIconImage: {
    width: 28,
    height: 28,
  },

  emeraldMarkerContainer: { alignItems: 'center', justifyContent: 'center', width: 30, height: 30 },
  emeraldCore: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 3, zIndex: 2 },
  emeraldTip: { width: 8, height: 8, backgroundColor: '#10B981', borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'white', transform: [{ rotate: '45deg' }], marginTop: -4, zIndex: 1 },
  reportMarkerContainer: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  reportCore: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 3, zIndex: 2 },
  reportTip: { width: 8, height: 8, borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'white', transform: [{ rotate: '45deg' }], marginTop: -4, zIndex: 1 },
  collectedCore: { backgroundColor: '#94a3b8' },
  collectedTip: { backgroundColor: '#94a3b8' },
  focusedRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, zIndex: 0, borderWidth: 1 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  statusCard: { backgroundColor: '#F6FBF6', borderRadius: 24, padding: 20, paddingTop: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  truckId: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  driverName: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  etaContainer: { alignItems: 'flex-end' },
  etaTime: { fontSize: 20, fontWeight: '800', color: '#3B82F6' },
  etaLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 15 },
  locationRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10, marginBottom: 15 },
  locationText: { marginLeft: 8, fontSize: 13, color: '#475569', flex: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  notifyButton: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, alignItems: 'center', elevation: 2 },
  notifyText: { color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 14 },
});

export default LiveMapScreen;