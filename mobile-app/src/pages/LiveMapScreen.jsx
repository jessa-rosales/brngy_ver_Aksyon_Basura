import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar, Alert } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Truck, Bell, ChevronLeft, MapPin, Navigation, CheckCircle2, Trash2, AlertTriangle, Map as MapIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const RenderReportMarker = ({ isCompleted }) => (
  <View style={styles.reportMarkerContainer}>
    <View style={[styles.reportCore, isCompleted && styles.collectedCore]}>
      {isCompleted ? <CheckCircle2 size={12} color="white" /> : <AlertTriangle size={12} color="white" />}
    </View>
    <View style={[styles.reportTip, isCompleted && styles.collectedTip]} />
  </View>
);

const LiveMapScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  
  const zoneData = route.params?.zoneData || {};
  const allZonesData = route.params?.allZonesData || []; 
  const isAllZones = zoneData.zone_id === 'all';

  const bins = isAllZones ? allZonesData.flatMap(z => z.bins || []) : (zoneData.bins || []);
  const reports = isAllZones ? allZonesData.flatMap(z => z.reports || []) : (zoneData.reports || []);
  
  // ✅ FIXED: Bulletproof Mapbox GeoJSON Parsing Logic
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

        // 1. Ensure [lng, lat] format
        const polygonCoords = rawPoints.map(p => {
          const lat = Number(Array.isArray(p) ? p[1] : (p.latitude || p.lat));
          const lng = Number(Array.isArray(p) ? p[0] : (p.longitude || p.lng));
          return [lng, lat];
        });

        // 2. Mapbox STRICT rule: Polygons must be closed (first point === last point)
        if (polygonCoords.length > 2) {
          const first = polygonCoords[0];
          const last = polygonCoords[polygonCoords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            polygonCoords.push([first[0], first[1]]); // Close the loop automatically
          }
        }

        features.push({
          type: 'Feature',
          properties: {
            zone_name: z.zone_name,
            zone_color: z.zone_color || '#3B82F6' // Fallback color just in case
          },
          geometry: {
            type: 'Polygon',
            coordinates: [polygonCoords] // 3. Ensure deep array bracket structure
          }
        });
      } catch (e) {
        console.error(`Failed to parse boundaries for ${z.zone_name}:`, e);
      }
    });

    return { type: 'FeatureCollection', features };
  }, [allZonesData]);

  const initialCameraCoords = (zoneData.truck_lng && zoneData.truck_lat && !isAllZones)
    ? [Number(zoneData.truck_lng), Number(zoneData.truck_lat)] 
    : [124.6459, 8.4772]; // CDO Center
    
  const zoomLvl = isAllZones ? 13 : 15.5;

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
            centerCoordinate={initialCameraCoords}
            zoomLevel={zoomLvl}
            animationDuration={1500}
          />

          {/* Render Colored Zone Boundaries */}
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

          {/* Render Truck Marker */}
          {!isAllZones && zoneData.truck_lat && (
            <MapboxGL.PointAnnotation id="truck-marker" coordinate={initialCameraCoords}>
              <View style={styles.truckMarker}>
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.markerGradient}>
                  <Truck color="white" size={20} />
                </LinearGradient>
                <View style={styles.markerArrow} />
              </View>
            </MapboxGL.PointAnnotation>
          )}

          {/* Render Bins */}
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

          {/* Render Reports */}
          {reports.map((report, index) => {
            if (!report.lng || !report.lat) return null;
            const isCompleted = report.status === 'Resolved' || report.status === 'Collected';
            return (
              <MapboxGL.PointAnnotation 
                key={`map-rep-${report.id || 'new'}-${index}`} 
                id={`map-rep-${report.id || 'new'}-${index}`} 
                coordinate={[Number(report.lng), Number(report.lat)]}
              >
                <RenderReportMarker isCompleted={isCompleted} />
              </MapboxGL.PointAnnotation>
            );
          })}

        </MapboxGL.MapView>
      </View>

      <View style={[styles.floatingHeader, { top: Platform.OS === 'ios' ? insets.top : 40 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        
        <View style={styles.headerTag}>
          <View style={[styles.liveDot, isAllZones && { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.headerText}>{isAllZones ? 'CITY OVERVIEW' : 'LIVE TRACKING'}</Text>
        </View>
      </View>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.statusCard}>
          <View style={styles.dragHandle} />
          
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.truckId}>{isAllZones ? 'Cagayan de Oro City' : (zoneData.vehicle_name || zoneData.plate_number || 'Vehicle #N/A')}</Text>
              <Text style={styles.driverName}>{isAllZones ? 'All Monitoring Zones' : `Driver: ${zoneData.driver_name || 'Unassigned'}`}</Text>
            </View>
            {!isAllZones && (
              <View style={styles.etaContainer}>
                <Text style={styles.etaTime}>Active</Text>
                <Text style={styles.etaLabel}>{zoneData.zone_name}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />
          
          <View style={styles.locationRow}>
             {isAllZones ? <MapIcon size={16} color="#3B82F6" /> : <Navigation size={16} color="#3B82F6" />}
             <Text style={styles.locationText}>
               {isAllZones ? 'Total Pending Stops: ' : (nextStop ? 'Approaching ' : 'Current Status: ')} 
               <Text style={{fontWeight: '700', color:'#1e293b'}}>
                 {isAllZones ? pendingStops : locationText}
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
  truckMarker: { alignItems: 'center', justifyContent: 'center' },
  markerGradient: { padding: 10, borderRadius: 25, borderWidth: 3, borderColor: 'white', elevation: 5 },
  markerArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#2563EB', transform: [{ rotate: '180deg' }], marginTop: -2 },
  emeraldMarkerContainer: { alignItems: 'center', justifyContent: 'center', width: 30, height: 30 },
  emeraldCore: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 3, zIndex: 2 },
  emeraldTip: { width: 8, height: 8, backgroundColor: '#10B981', borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'white', transform: [{ rotate: '45deg' }], marginTop: -4, zIndex: 1 },
  reportMarkerContainer: { alignItems: 'center', justifyContent: 'center', width: 30, height: 30 },
  reportCore: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#DC2626', borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 3, zIndex: 2 },
  reportTip: { width: 8, height: 8, backgroundColor: '#DC2626', borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'white', transform: [{ rotate: '45deg' }], marginTop: -4, zIndex: 1 },
  collectedCore: { backgroundColor: '#94a3b8' },
  collectedTip: { backgroundColor: '#94a3b8' },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  statusCard: { backgroundColor: '#F6FBF6', borderRadius: 24, padding: 20, paddingTop: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  truckId: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  driverName: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  etaContainer: { alignItems: 'flex-end' },
  etaTime: { fontSize: 20, fontWeight: '800', color: '#3B82F6' },
  etaLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
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