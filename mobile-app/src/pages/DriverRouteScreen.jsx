import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, Polyline, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { 
  Navigation, CheckCircle2, Trash2, ArrowRight, Maximize2, Minimize2, 
  MapPin, Clock, Truck, ChevronRight, Layers, Map as MapIcon, AlertTriangle 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from '../services/driverService';

const { width } = Dimensions.get('window');

// DEFAULT CENTER (Cagayan de Oro) to prevent jumping to other countries
const INITIAL_REGION = {
  latitude: 8.4772,
  longitude: 124.6459,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const DriverRouteScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  
  const userRole = route.params?.role || 'driver';
  const isDriver = userRole === 'driver';

  const [viewMode, setViewMode] = useState('overview'); 
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [userData, setUserData] = useState(null);
  const [assignedZones, setAssignedZones] = useState([]); 
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapType, setMapType] = useState('standard'); 

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  };

  const timeToInt = (t) => t ? parseInt(t.replace(/:/g, '').substring(0, 4)) : 0;

  const isNowActive = (start, end) => {
    const now = new Date();
    const cur = now.getHours() * 100 + now.getMinutes();
    return cur >= timeToInt(start) && cur <= timeToInt(end);
  };

  useEffect(() => {
    navigation.setOptions({ headerShown: viewMode === 'overview' });
  }, [viewMode, navigation]);

  useEffect(() => {
    loadAssignedData();
    const interval = setInterval(loadAssignedData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ GLITCH FIX: Only fit coordinates if assignedZones is populated and not loading
  useEffect(() => {
    if (!isLoading && assignedZones.length > 0 && mapRef.current && activeZoneId) {
      const targetZone = assignedZones.find(z => z.zone_id === activeZoneId);
      if (targetZone && targetZone.polygon && targetZone.polygon.length > 0) {
        const timer = setTimeout(() => {
          mapRef.current?.fitToCoordinates(targetZone.polygon, {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          });
        }, 500); // Reduced delay for snappier feel
        return () => clearTimeout(timer);
      }
    }
  }, [activeZoneId, viewMode, isLoading]);

  const loadAssignedData = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (!profileData) return;
      const user = JSON.parse(profileData);
      setUserData(user);

      const assignments = await driverService.getAssignedRoute(user.user_id);
      
      if (assignments && Array.isArray(assignments)) {
        const now = new Date();
        const curTime = now.getHours() * 100 + now.getMinutes();

        const formatted = assignments.map(a => {
          const boundaryData = typeof a.boundaries === 'string' ? JSON.parse(a.boundaries) : a.boundaries;
          let rawPoints = [];
          if (boundaryData?.type === 'Polygon') rawPoints = boundaryData.coordinates[0];
          else if (Array.isArray(boundaryData)) rawPoints = Array.isArray(boundaryData[0]) ? boundaryData[0] : boundaryData;
          
          const polygon = rawPoints.map(p => {
            const lat = Number(Array.isArray(p) ? p[1] : (p.latitude || p.lat));
            const lng = Number(Array.isArray(p) ? p[0] : (p.longitude || p.lng));
            return Math.abs(lat) > 90 ? { latitude: lng, longitude: lat } : { latitude: lat, longitude: lng };
          }).filter(p => !isNaN(p.latitude));

          return {
            ...a,
            polygon,
            isActiveNow: isNowActive(a.start_time, a.end_time),
            bins: (a.bins || []).map(bin => ({ ...bin, lat: Number(bin.lat), lng: Number(bin.lng) }))
          };
        });

        setAssignedZones(formatted);

        const active = formatted.find(z => z.isActiveNow);
        if (active) {
          setActiveZoneId(active.zone_id);
        } else {
          const next = formatted
            .filter(z => timeToInt(z.start_time) > curTime)
            .sort((a, b) => timeToInt(a.start_time) - timeToInt(b.start_time))[0];
          setActiveZoneId(next ? next.zone_id : (formatted[0]?.zone_id || null));
        }
      }
    } catch (e) { 
        console.error(e); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const getDisplayMission = () => {
    if (assignedZones.length === 0) return null;
    const active = assignedZones.find(z => z.isActiveNow);
    if (active) return active;
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const futureMissions = assignedZones
      .filter(z => timeToInt(z.start_time) > currentTime)
      .sort((a, b) => timeToInt(a.start_time) - timeToInt(b.start_time));
    return futureMissions.length > 0 ? futureMissions[0] : assignedZones[0];
  };

  const currentMission = getDisplayMission();
  const missionBins = currentMission?.bins || [];
  const progressPercentage = missionBins.length > 0 ? (missionBins.filter(b => b.status === 'Collected').length / missionBins.length) * 100 : 0;

  const handleAction = () => { if (currentStopIndex < missionBins.length - 1) setCurrentStopIndex(prev => prev + 1); };

  const RenderBinMarker = ({ status, isNext, color }) => (
    <View style={styles.markerContainer}>
      {isNext && <View style={styles.markerHalo} />}
      <View style={[styles.markerCore, { backgroundColor: status === 'Collected' ? '#94a3b8' : (isNext ? '#3B82F6' : (color || '#10B981')) }]}>
        {status === 'Collected' ? <CheckCircle2 size={12} color="white" /> : <Trash2 size={12} color="white" />}
      </View>
    </View>
  );

  if (viewMode === 'overview') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FBF8" />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.topHeader}>
             <View>
                <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                <Text style={styles.smallGreeting}>{getGreeting()}</Text>
                <Text style={styles.greetingText}>Hello, {userData?.first_name || 'User'}</Text>
             </View>
             <TouchableOpacity style={styles.profileBtn}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.avatar}><Text style={styles.avatarText}>{userData?.first_name ? userData.first_name[0] : 'U'}</Text></LinearGradient>
             </TouchableOpacity>
          </View>

          <View style={styles.dashCard}>
            <View style={styles.vehicleInfoRow}>
                <View style={styles.truckIconCircle}><Truck size={22} color="#10B981" /></View>
                <View style={{flex: 1, marginLeft: 12}}>
                    <Text style={styles.vehicleSub}>{currentMission?.isActiveNow ? 'CURRENT MISSION' : 'NEXT SCHEDULE'}</Text>
                    <Text style={styles.vehicleMain}>{currentMission?.zone_name || 'Standby'}</Text>
                    <Text style={styles.vehicleNameText}>{currentMission?.vehicle_name || 'No Vehicle Assigned'}</Text>
                </View>
                <View style={styles.plateContainer}>
                    <Text style={styles.plateLabel}>PLATE NO.</Text>
                    <View style={styles.plateBadgeTop}><Text style={styles.plateText}>{currentMission?.plate_number || '---'}</Text></View>
                </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.timeGrid}>
               <View style={styles.timeItem}><Clock size={16} color="#64748b" /><Text style={styles.timeVal}>{currentMission?.start_time?.slice(0,5)} - {currentMission?.end_time?.slice(0,5)}</Text></View>
               <View style={[styles.statusBadgeInline, { backgroundColor: currentMission?.isActiveNow ? '#F0FDF4' : '#FFF7ED' }]}>
                    <View style={[styles.statusDot, { backgroundColor: currentMission?.isActiveNow ? '#10B981' : '#F97316' }]} />
                    <Text style={[styles.statusText, { color: currentMission?.isActiveNow ? '#10B981' : '#F97316' }]}>{currentMission?.isActiveNow ? 'ON SCHEDULE' : 'STANDBY'}</Text>
                </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Route Intelligence</Text>
          <View style={styles.mapWrapper}>
             {isLoading ? (
               <View style={styles.mapLoading}><ActivityIndicator color="#10B981" /><Text style={styles.loadingText}>Syncing Map Data...</Text></View>
             ) : (
               <MapView 
                  ref={mapRef} 
                  provider={PROVIDER_GOOGLE} 
                  style={styles.map} 
                  mapType={mapType} 
                  scrollEnabled={false} 
                  zoomEnabled={false}
                  initialRegion={INITIAL_REGION} // ✅ FIX: Initial local view
               >
                 {assignedZones.map((z, idx) => (
                   <React.Fragment key={idx}>
                     {z.polygon?.length > 0 && (
                        <Polygon coordinates={z.polygon} fillColor={z.zone_id === activeZoneId ? `${z.zone_color}25` : `${z.zone_color}08`} strokeColor={z.zone_color || '#10B981'} strokeWidth={z.zone_id === activeZoneId ? 3 : 1} />
                     )}
                     {z.bins.map(b => <Marker key={b.bin_id} coordinate={{ latitude: b.lat, longitude: b.lng }}><RenderBinMarker status={b.status} isNext={false} color={z.zone_color} /></Marker>)}
                   </React.Fragment>
                 ))}
               </MapView>
             )}
             <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapControlBtn} onPress={() => setViewMode('navigation')}><Maximize2 size={18} color="#1e293b" /></TouchableOpacity>
                <TouchableOpacity style={[styles.mapControlBtn, { marginTop: 10 }]} onPress={() => setMapType(mapType === 'standard' ? 'hybrid' : 'standard')}><Layers size={18} color={mapType === 'hybrid' ? '#10B981' : '#1e293b'} /></TouchableOpacity>
             </View>
          </View>

          <View style={styles.enhancedProgressCard}>
             <View style={styles.progressDataRow}>
                <View><Text style={styles.progressMainTitle}>Mission Progress</Text><Text style={styles.progressSubTitle}>{missionBins.filter(b => b.status === 'Collected').length} of {missionBins.length} stops</Text></View>
                <View style={styles.progressCircleContainer}><Text style={styles.progressPercentageText}>{Math.round(progressPercentage)}%</Text></View>
             </View>
             <View style={styles.trackContainer}><View style={styles.trackBackground} /><LinearGradient colors={['#34D399', '#10B981']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.trackFill, {width: `${progressPercentage}%`}]} /></View>
          </View>

          <Text style={styles.sectionTitle}>Stop Schedule</Text>
          <View style={styles.timelineContainer}>
            {missionBins.length > 0 ? (
                missionBins.map((item, index) => {
                const isDone = item.status === 'Collected';
                const isNext = !isDone && missionBins.findIndex(b => b.status !== 'Collected') === index;
                return (
                    <View key={index} style={styles.timelineRow}>
                        <View style={styles.timelineGraphics}>
                            <View style={[styles.timelineLine, index === missionBins.length - 1 && { opacity: 0 }, isDone && {backgroundColor: '#10B981'}]} />
                            <View style={[styles.timelineNode, isDone ? {backgroundColor: '#10B981'} : (isNext ? {backgroundColor: '#3B82F6'} : {backgroundColor: '#F1F5F9'})]}>
                                {isDone ? <CheckCircle2 size={14} color="white" /> : <Text style={{fontSize: 10, fontWeight: '900', color: isNext ? 'white' : '#94a3b8'}}>{index + 1}</Text>}
                            </View>
                        </View>
                        <TouchableOpacity activeOpacity={0.7} style={[styles.enhancedStopCard, isNext && styles.activeStopGlow, isDone && {opacity: 0.6}]}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={{flex: 1}}>
                                    <Text style={[styles.enhancedStopAddr, isDone && {textDecorationLine: 'line-through'}]}>{item.address || 'Point location'}</Text>
                                    <Text style={styles.stopDistText}>Mission: {currentMission?.zone_name}</Text>
                                </View>
                                {isNext ? (<LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.goButton}><Navigation size={16} color="white" /></LinearGradient>) : (<ChevronRight size={20} color="#cbd5e1" />)}
                            </View>
                        </TouchableOpacity>
                    </View>
                );
                })
            ) : (
                <View style={styles.emptyBinsCard}>
                    <AlertTriangle size={32} color="#94a3b8" />
                    <Text style={styles.emptyBinsText}>No stops detected for this schedule</Text>
                </View>
            )}
          </View>
        </ScrollView>
        <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 15 }]}>
           <TouchableOpacity activeOpacity={0.9} onPress={() => setViewMode('navigation')}>
              <LinearGradient colors={['#10B981', '#059669']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.engageBtn}>
                 <Navigation size={22} color="white" style={{marginRight: 10}} />
                 <Text style={styles.engageBtnText}>START COLLECTION</Text>
              </LinearGradient>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.navContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.fullMap} mapType={mapType} showsUserLocation scrollEnabled zoomEnabled initialRegion={INITIAL_REGION}>
        {assignedZones.map((z, idx) => (
          <React.Fragment key={idx}>
            {z.polygon?.length > 0 && (
              <Polygon coordinates={z.polygon} fillColor={`${z.zone_color}15`} strokeColor={z.zone_color} strokeWidth={z.zone_id === activeZoneId ? 4 : 1} />
            )}
            {z.bins.map(b => (
              <Marker key={b.bin_id} coordinate={{ latitude: b.lat, longitude: b.lng }}>
                <RenderBinMarker status={b.status} isNext={missionBins.findIndex(bin => bin.bin_id === b.bin_id) === currentStopIndex} color={z.zone_color} />
              </Marker>
            ))}
          </React.Fragment>
        ))}
      </MapView>
      <SafeAreaView style={styles.navHeaderOverlay} pointerEvents="box-none">
         <View style={[styles.navHeaderContent, { marginTop: Platform.OS === 'android' ? 30 : 0 }]}>
            <TouchableOpacity style={styles.backCircle} onPress={() => setViewMode('overview')}><ArrowRight size={24} color="#1e293b" style={{transform: [{rotate: '180deg'}]}} /></TouchableOpacity>
            <View style={styles.navTitleBox}><Text style={styles.navTitle}>MISSION MODE</Text></View>
            <TouchableOpacity style={styles.backCircle} onPress={() => setMapType(mapType === 'standard' ? 'hybrid' : 'standard')}><MapIcon size={22} color={mapType === 'hybrid' ? '#10B981' : '#1e293b'} /></TouchableOpacity>
         </View>
      </SafeAreaView>
      <View style={[styles.navBottom, { paddingBottom: insets.bottom + 20 }]}>
         <View style={styles.instrCard}>
            <Text style={styles.instrNext}>NEXT DESTINATION</Text>
            <Text style={styles.instrAddr} numberOfLines={1}>{missionBins[currentStopIndex]?.address || 'Searching...'}</Text>
            <View style={styles.instrActions}>
               <TouchableOpacity style={styles.instrBtnAlert}><AlertTriangle size={22} color="#EF4444" /></TouchableOpacity>
               <TouchableOpacity style={styles.instrBtnMain} onPress={handleAction}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.instrBtnGrad}><Text style={styles.instrBtnText}>CONFIRM</Text></LinearGradient>
               </TouchableOpacity>
            </View>
         </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBF8' },
  scrollContent: { padding: 20, paddingBottom: 150 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  dateText: { fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: 1 },
  smallGreeting: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  greetingText: { fontSize: 28, fontWeight: '900', color: '#1e293b', marginTop: -2 },
  avatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  avatarText: { color: 'white', fontWeight: '800', fontSize: 20 },
  dashCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, elevation: 8, marginBottom: 30 },
  vehicleInfoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  truckIconCircle: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  vehicleSub: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  vehicleMain: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  vehicleNameText: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 2 },
  plateContainer: { alignItems: 'flex-end' },
  plateLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 },
  plateBadgeTop: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0' },
  plateText: { fontSize: 12, fontWeight: '900', color: '#334155', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  timeGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeVal: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  statusBadgeInline: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '900' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
  mapWrapper: { height: 280, borderRadius: 30, overflow: 'hidden', elevation: 12, marginBottom: 30, backgroundColor: '#f1f5f9' },
  map: { flex: 1 },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  mapControls: { position: 'absolute', right: 15, top: 15 },
  mapControlBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  enhancedProgressCard: { backgroundColor: 'white', padding: 22, borderRadius: 28, marginBottom: 35, elevation: 4 },
  progressDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressMainTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  progressSubTitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  progressCircleContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  progressPercentageText: { fontSize: 14, fontWeight: '900', color: '#10B981' },
  trackContainer: { height: 12, width: '100%', borderRadius: 6, overflow: 'hidden' },
  trackBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F1F5F9' },
  trackFill: { height: '100%', borderRadius: 6 },
  timelineContainer: { paddingLeft: 5 },
  timelineRow: { flexDirection: 'row', marginBottom: 15 },
  timelineGraphics: { width: 40, alignItems: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 10 },
  timelineNode: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 2, elevation: 3 },
  enhancedStopCard: { flex: 1, backgroundColor: 'white', borderRadius: 22, padding: 18, elevation: 2 },
  activeStopGlow: { shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  enhancedStopAddr: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  stopDistText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  goButton: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyBinsCard: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 22, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0' },
  emptyBinsText: { marginTop: 12, color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, backgroundColor: 'rgba(248, 251, 248, 0.95)' },
  engageBtn: { height: 65, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  engageBtnText: { color: 'white', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  navContainer: { flex: 1, backgroundColor: '#0f172a' },
  fullMap: { flex: 1 },
  navHeaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  navHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, gap: 15 },
  backCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  navTitleBox: { backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, elevation: 5 },
  navTitle: { color: '#1e293b', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  navBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  instrCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, elevation: 20 },
  instrAddr: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
  instrActions: { flexDirection: 'row', gap: 12 },
  instrBtnAlert: { width: 55, height: 55, borderRadius: 15, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  instrBtnMain: { flex: 1 },
  instrBtnGrad: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  instrBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
  markerContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  markerHalo: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  markerCore: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: 'white', justifyContent: 'center', alignItems: 'center' }
});

const mapStyle = [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }];

export default DriverRouteScreen;