import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { 
  Navigation, CheckCircle2, XCircle, Trash2, ArrowRight, Maximize2, Minimize2, 
  MapPin, Home, Building2, GraduationCap, ScanLine, AlertTriangle, Clock, Calendar, Truck 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from '../services/driverService';

const { width } = Dimensions.get('window');

const DriverRouteScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  
  // 1. STATE MANAGEMENT
  const userRole = route.params?.role || 'driver';
  const isDriver = userRole === 'driver';

  const [viewMode, setViewMode] = useState('overview'); 
  const [isFullScreenNav, setIsFullScreenNav] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  
  const [userData, setUserData] = useState(null);
  const [assignedZone, setAssignedZone] = useState(null);
  const [routePath, setRoutePath] = useState([]); 
  const [bins, setBins] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // 2. FETCH REAL DATA ON MOUNT
  useEffect(() => {
    loadAssignedData();
  }, []);

  const loadAssignedData = async () => {
    try {
      setIsLoading(true);
      const profileData = await AsyncStorage.getItem('userProfile');
      if (!profileData) return;
      const user = JSON.parse(profileData);
      setUserData(user);

      const assignment = await driverService.getAssignedRoute(user.user_id);
      
      if (assignment) {
        // --- 1. HANDLE POLYGON (ZONES) ---
        if (assignment.boundaries) {
          const boundaryData = typeof assignment.boundaries === 'string' 
            ? JSON.parse(assignment.boundaries) 
            : assignment.boundaries;

          let rawPoints = [];
          if (boundaryData.type === 'Polygon' && boundaryData.coordinates) {
             rawPoints = boundaryData.coordinates[0]; 
          } else if (Array.isArray(boundaryData)) {
             rawPoints = (Array.isArray(boundaryData[0]) || typeof boundaryData[0] === 'object') 
               ? boundaryData : [boundaryData];
             if (rawPoints.length === 1 && Array.isArray(rawPoints[0])) rawPoints = rawPoints[0];
          }

          const formattedPolygon = rawPoints.map(point => {
            let lat, lng;
            if (Array.isArray(point)) {
              lat = Number(point[1]); lng = Number(point[0]);
            } else {
              lat = Number(point.latitude || point.lat);
              lng = Number(point.longitude || point.lng);
            }
            if (Math.abs(lat) > 90) return { latitude: lng, longitude: lat }; 
            return { latitude: lat, longitude: lng };
          }).filter(p => !isNaN(p.latitude) && !isNaN(p.longitude));

          if (formattedPolygon.length > 0) {
            setAssignedZone({
              name: assignment.zone_name,
              polygon: formattedPolygon,
              color: assignment.zone_color || '#10B981',
              // REAL DATA FROM BACKEND JOIN
              vehicleName: assignment.vehicle_name,
              plateNumber: assignment.plate_number,
              vehicleStatus: assignment.vehicle_status,
              startTime: assignment.start_time,
              endTime: assignment.end_time
            });
            setRoutePath(formattedPolygon);
          }
        }

        // --- 2. HANDLE BINS ---
        if (assignment.bins && assignment.bins.length > 0) {
          const formattedBins = assignment.bins.map(bin => ({
            ...bin,
            lat: Number(bin.lat), 
            lng: Number(bin.lng)  
          }));
          setBins(formattedBins);
        }
      }
    } catch (error) {
      console.error("Error loading route data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  };

  // ✅ UI HELPER: Badge Styling
  const getBadgeStyle = (type) => {
    if (type === 'Residential') return { bg: '#F0FDF4', text: '#15803D' };
    if (type === 'Commercial') return { bg: '#EFF6FF', text: '#1D4ED8' };
    return { bg: '#FEFCE8', text: '#A16207' }; 
  };

  // CALCULATIONS
  const progressPercentage = bins.length > 0 
    ? (bins.filter(b => b.status === 'Collected').length / bins.length) * 100 : 0;
  const totalStops = bins.length;
  const collectedStops = bins.filter(b => b.status === 'Collected').length;

  const handleStartRoute = () => setViewMode('navigation');
  const handleAction = () => {
    if (currentStopIndex < bins.length - 1) setCurrentStopIndex(prev => prev + 1);
  };

  const RenderBinMarker = ({ status, isNext }) => {
    const bgColor = status === 'Collected' ? '#6B7280' : (isNext ? '#3B82F6' : '#047857');
    const pulseColor = isNext ? 'rgba(59, 130, 246, 0.3)' : 'rgba(4, 120, 87, 0.2)';
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
        {(isNext || status !== 'Collected') && (
          <View style={{ position: 'absolute', width: isNext ? 36 : 28, height: isNext ? 36 : 28, borderRadius: 20, backgroundColor: pulseColor, top: isNext ? 2 : 6 }} />
        )}
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bgColor, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          {status === 'Collected' ? <CheckCircle2 size={14} color="white" /> : <Trash2 size={14} color="white" />}
        </View>
        <View style={{ width: 8, height: 8, backgroundColor: bgColor, borderBottomWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.5)', transform: [{ rotate: '45deg' }], marginTop: -6, zIndex: 1 }} />
      </View>
    );
  };

  // ==========================================
  // VIEW 1: OVERVIEW MODE
  // ==========================================
  if (viewMode === 'overview') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
          
          {/* DASHBOARD CARD (REAL DATA) */}
          <View style={styles.dashboardCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.greetingText}>{getGreeting()},</Text>
                <Text style={styles.fullNameText}>{userData ? `${userData.first_name} ${userData.last_name}` : 'User'}</Text>
                <View style={styles.roleLabelBadge}>
                  <Text style={styles.roleLabelText}>{isDriver ? 'VEHICLE COMMANDER' : 'WASTE COLLECTOR'}</Text>
                </View>
              </View>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{userData ? `${userData.first_name[0]}${userData.last_name[0]}` : 'U'}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.scheduleSection}>
              <View style={styles.sectionTitleRow}>
                <ScanLine size={16} color="#64748b" />
                <Text style={styles.sectionTitleText}>TODAY'S SCHEDULE</Text>
              </View>
              
              <View style={styles.scheduleGrid}>
                <View style={styles.scheduleCol}>
                  <Text style={styles.scheduleLabel}>DATE</Text>
                  <View style={styles.scheduleValueRow}>
                    <Calendar size={18} color="#10B981" />
                    <Text style={styles.scheduleValueText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  </View>
                </View>

                <View style={styles.verticalDivider} />

                <View style={styles.scheduleCol}>
                  <Text style={styles.scheduleLabel}>SHIFT</Text>
                  <View style={styles.scheduleValueRow}>
                    <Clock size={18} color="#10B981" />
                    <Text style={styles.scheduleValueText}>
                      {assignedZone?.startTime ? `${assignedZone.startTime.slice(0,5)} - ${assignedZone.endTime.slice(0,5)}` : '08:00 - 17:00'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.assignedVehicleBox}>
              <View style={[styles.truckIconBg, { backgroundColor: assignedZone?.vehicleStatus === 'Maintenance' ? '#EF4444' : '#10B981' }]}>
                <Truck size={20} color="white" />
              </View>
              <View>
                <Text style={styles.vehicleLabel}>ASSIGNED VEHICLE • {assignedZone?.vehicleStatus?.toUpperCase() || 'ACTIVE'}</Text>
                <Text style={styles.vehicleNameText}>{assignedZone?.vehicleName || 'Isuzu Giga Compactor'}</Text>
                <Text style={styles.plateNumberText}>{assignedZone?.plateNumber || 'KAB-8821'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>Route Map</Text>
              <Text style={styles.sectionSubtitle}>{assignedZone?.name || 'No active assignment'}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: isDriver ? '#DBEAFE' : '#DCFCE7' }]}>
                <Text style={[styles.roleText, { color: isDriver ? '#1D4ED8' : '#15803D' }]}>{isDriver ? 'DRIVER' : 'COLLECTOR'}</Text>
            </View>
          </View>

          <View style={styles.mapPreviewCard}>
             {isLoading ? (
               <View style={styles.loaderContainer}><ActivityIndicator color="#10B981" /></View>
             ) : (
               <MapView
                  provider={PROVIDER_GOOGLE} style={styles.mapPreview}
                  initialRegion={assignedZone && assignedZone.polygon[0] ? {
                    latitude: assignedZone.polygon[0].latitude, longitude: assignedZone.polygon[0].longitude,
                    latitudeDelta: 0.02, longitudeDelta: 0.02,
                  } : { latitude: 8.4772, longitude: 124.6459, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
                  customMapStyle={mapStyle}
               >
                  {assignedZone && assignedZone.polygon.length > 0 && (
                    <Polygon coordinates={assignedZone.polygon} fillColor={`${assignedZone.color}40`} strokeColor={assignedZone.color} strokeWidth={0.1} zIndex={99} />
                  )}
                  {routePath.length > 0 && <Polyline coordinates={routePath} strokeColor="#3B82F6" strokeWidth={0.2} />}
                  {bins.map((bin, index) => {
                     const isNext = !bin.status?.includes('Collected') && bins.findIndex(b => b.status === 'Pending') === index;
                     return (
                        <Marker key={bin.bin_id || index} coordinate={{ latitude: bin.lat, longitude: bin.lng }}>
                           <RenderBinMarker status={bin.status} isNext={isNext} />
                        </Marker>
                     );
                  })}
               </MapView>
             )}
             <TouchableOpacity style={styles.expandMapBtn} onPress={handleStartRoute}><Maximize2 size={20} color="#1e293b" /></TouchableOpacity>
          </View>

          <View style={styles.progressCard}>
              <View style={styles.progressHeaderRow}>
                  <View>
                      <Text style={styles.progressTitle}>Route Progress</Text>
                      <Text style={styles.progressSubtitle}>{totalStops > 0 ? `${totalStops - collectedStops} stops remaining` : 'No stops assigned'}</Text>
                  </View>
                  <View style={styles.percentBadge}><Text style={styles.percentText}>{Math.round(progressPercentage)}%</Text></View>
              </View>
              <View style={styles.progressBarTrack}>
                  <LinearGradient colors={['#10B981', '#34D399']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
              </View>
          </View>

          <Text style={styles.sectionHeader}>Stop List</Text>
          <View style={styles.pointsListContainer}>
             {bins.length > 0 ? bins.map((item, index) => {
                 const isCompleted = item.status === 'Collected';
                 const isNext = !isCompleted && bins.findIndex(b => b.status === 'Pending') === index;
                 const badgeStyle = getBadgeStyle(item.type || 'General'); 
                 return (
                    <View key={item.bin_id || index} style={styles.pointRow}>
                        <View style={styles.timelineColumn}>
                            <View style={[styles.timelineLine, { backgroundColor: isCompleted ? '#10B981' : '#E2E8F0' }, index === bins.length - 1 && { display: 'none' }]} />
                            <View style={[styles.timelineDot, isCompleted ? styles.dotCollected : (isNext ? styles.dotNext : styles.dotPending)]}>
                                {isCompleted && <CheckCircle2 size={10} color="white" />}
                                {isNext && <View style={styles.innerDotNext} />}
                            </View>
                        </View>
                        <TouchableOpacity style={[styles.pointCard, isNext && styles.pointCardActive, isCompleted && styles.pointCardCompleted]} activeOpacity={0.9}>
                            <View style={styles.pointCardHeader}>
                                <View style={[styles.typeBadge, { backgroundColor: badgeStyle.bg }]}>
                                    <Text style={[styles.typeText, { color: badgeStyle.text }]}>{(item.type || 'General').toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.timeLabel, isCompleted ? styles.timeSuccess : styles.timeNeutral]}>{isCompleted ? 'Done' : 'Pending'}</Text>
                            </View>
                            <Text style={[styles.pointAddress, isCompleted && styles.textDimmed]}>{item.address || 'Point Location'}</Text>
                        </TouchableOpacity>
                    </View>
                 );
             }) : (
               <View style={styles.emptyContainer}><Text style={styles.emptyText}>No collection points assigned to this zone.</Text></View>
             )}
          </View>
        </ScrollView>

        <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 10 }]}>
             <TouchableOpacity activeOpacity={0.9} onPress={handleStartRoute} disabled={bins.length === 0}>
              <LinearGradient colors={bins.length > 0 ? ['#10B981', '#059669'] : ['#94a3b8', '#64748b']} style={styles.primaryBtn}>
                <Navigation size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>{isDriver ? 'START NAVIGATION' : 'START COLLECTION'}</Text>
              </LinearGradient>
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  // NAVIGATION VIEW (KEEP ORIGINAL)
  return (
    <View style={styles.navContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={bins[currentStopIndex] ? { latitude: bins[currentStopIndex].lat, longitude: bins[currentStopIndex].lng, latitudeDelta: 0.005, longitudeDelta: 0.005 } : { latitude: 8.4772, longitude: 124.6459, latitudeDelta: 0.005, longitudeDelta: 0.005 }} customMapStyle={mapStyle} showsUserLocation={true}>
        {assignedZone && assignedZone.polygon.length > 0 && (
          <Polygon coordinates={assignedZone.polygon} fillColor={`${assignedZone.color}40`} strokeColor={assignedZone.color} strokeWidth={4} />
        )}
        {routePath.length > 0 && <Polyline coordinates={routePath} strokeColor="#3B82F6" strokeWidth={6} />}
        {bins.map((bin, index) => {
          const isNext = index === currentStopIndex;
          return (
            <Marker key={bin.bin_id || index} coordinate={{ latitude: bin.lat, longitude: bin.lng }}><RenderBinMarker status={bin.status} isNext={isNext} /></Marker>
          );
        })}
      </MapView>
      <SafeAreaView style={styles.navOverlay} pointerEvents="box-none">
          <View style={styles.navHeader}>
             <TouchableOpacity style={styles.navIconBtn} onPress={() => setViewMode('overview')}><ArrowRight size={24} color="#1e293b" style={{transform: [{rotate: '180deg'}]}} /></TouchableOpacity>
             <TouchableOpacity style={styles.navIconBtn} onPress={() => setIsFullScreenNav(!isFullScreenNav)}>{isFullScreenNav ? <Minimize2 size={24} color="#1e293b" /> : <Maximize2 size={24} color="#1e293b" />}</TouchableOpacity>
          </View>
          <View style={styles.navBottom}>
              <View style={styles.activeCard}>
                <View style={styles.activeHeader}><View><Text style={styles.nextLabel}>{isDriver ? 'NAVIGATING TO' : 'CURRENT TARGET'}</Text><Text style={styles.nextAddress}>{bins[currentStopIndex]?.address || 'No destination'}</Text></View></View>
                <View style={styles.divider} />
                <View style={styles.activeActions}>
                  <TouchableOpacity style={styles.btnSkip}>{isDriver ? <XCircle size={20} color="#EF4444" /> : <AlertTriangle size={20} color="#F59E0B" />}</TouchableOpacity>
                  <TouchableOpacity style={styles.btnCollect} activeOpacity={0.8} onPress={handleAction}>
                    <LinearGradient colors={isDriver ? ['#3B82F6', '#2563EB'] : ['#10B981', '#059669']} style={styles.btnCollectGradient}><Text style={styles.btnCollectText}>{isDriver ? 'ARRIVED' : 'CONFIRM'}</Text></LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
          </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' }, 
  scrollContent: { padding: 20, paddingBottom: 120 },
  dashboardCard: { backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingText: { fontSize: 13, color: '#64748b', fontWeight: '700', letterSpacing: 0.5 },
  fullNameText: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  roleLabelBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  roleLabelText: { fontSize: 10, fontWeight: '800', color: '#3B82F6', letterSpacing: 0.5 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: 'white', fontSize: 20, fontWeight: '800' },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 },
  scheduleSection: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitleText: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  scheduleGrid: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scheduleCol: { flex: 1 },
  scheduleLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '800', marginBottom: 8 },
  scheduleValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleValueText: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  verticalDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9' },
  assignedVehicleBox: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  truckIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  vehicleLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 2 },
  vehicleNameText: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  plateNumberText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  sectionSubtitle: { fontSize: 13, color: '#64748b' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', height: 450, borderRadius: 24 },
  mapPreviewCard: { height: 500, borderRadius: 24, overflow: 'hidden', marginBottom: 24, backgroundColor: '#e2e8f0', elevation: 4 },
  mapPreview: { width: '100%', height: '100%' },
  expandMapBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'white', padding: 10, borderRadius: 12, elevation: 2 },
  progressCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 24, elevation: 3 },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  progressSubtitle: { fontSize: 12, color: '#64748b' },
  percentBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  percentText: { fontSize: 14, fontWeight: '800', color: '#059669' },
  progressBarTrack: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  pointRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 12 },
  timelineColumn: { width: 30, alignItems: 'center', marginRight: 10 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  timelineDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, zIndex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  dotCollected: { backgroundColor: '#10B981', borderColor: '#10B981' },
  dotNext: { borderColor: '#3B82F6', width: 22, height: 22, borderRadius: 11, borderWidth: 4 },
  dotPending: { borderColor: '#CBD5E1' },
  innerDotNext: { width: 8, height: 8, backgroundColor: '#3B82F6', borderRadius: 4 },
  pointCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 2 },
  pointCardActive: { borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  pointCardCompleted: { backgroundColor: '#F8FAFC', opacity: 0.8 },
  pointCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  typeText: { fontSize: 10, fontWeight: '700' },
  timeLabel: { fontSize: 11, fontWeight: '600' },
  timeSuccess: { color: '#10B981' },
  timeNeutral: { color: '#94a3b8' },
  pointAddress: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  textDimmed: { color: '#64748b' },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#E3F3DF', padding: 20 },
  primaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 16, elevation: 4 },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
  navContainer: { flex: 1, backgroundColor: '#1e293b' },
  navOverlay: { flex: 1, justifyContent: 'space-between' },
  map: { width: '100%', height: '100%', position: 'absolute' },
  navHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  navIconBtn: { width: 44, height: 44, backgroundColor: 'white', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  navBottom: { padding: 20 },
  activeCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 10 },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nextLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  nextAddress: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  activeActions: { flexDirection: 'row', gap: 12 },
  btnSkip: { width: 60, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FECACA' },
  btnCollect: { flex: 1 },
  btnCollectGradient: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  btnCollectText: { color: 'white', fontWeight: '800' },
});

const mapStyle = [ { "featureType": "poi", "stylers": [{ "visibility": "off" }] } ];

export default DriverRouteScreen;