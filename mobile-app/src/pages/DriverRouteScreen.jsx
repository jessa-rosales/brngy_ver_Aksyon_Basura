import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, Polyline, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { 
  Navigation, CheckCircle2, XCircle, Trash2, ArrowRight, Maximize2, Minimize2, 
  MapPin, ScanLine, AlertTriangle, Clock, Calendar, Truck, ChevronRight, Layers, Map as MapIcon 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from '../services/driverService';

const { width } = Dimensions.get('window');

const DriverRouteScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  
  const userRole = route.params?.role || 'driver';
  const isDriver = userRole === 'driver';

  const [viewMode, setViewMode] = useState('overview'); 
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [userData, setUserData] = useState(null);
  const [assignedZone, setAssignedZone] = useState(null);
  const [routePath, setRoutePath] = useState([]); 
  const [bins, setBins] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // SATELLITE VIEW STATE
  const [mapType, setMapType] = useState('standard'); 

  // LOGIC TO REMOVE GREEN PORTAL HEADER
  useEffect(() => {
    navigation.setOptions({
      headerShown: viewMode === 'overview',
    });
  }, [viewMode, navigation]);

  useEffect(() => {
    loadAssignedData();
  }, []);

  useEffect(() => {
    if (assignedZone?.polygon && assignedZone.polygon.length > 0 && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current.fitToCoordinates(assignedZone.polygon, {
          edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
          animated: true,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [assignedZone, viewMode, isLoading]);

  const loadAssignedData = async () => {
    try {
      setIsLoading(true);
      const profileData = await AsyncStorage.getItem('userProfile');
      if (!profileData) return;
      const user = JSON.parse(profileData);
      setUserData(user);

      const assignment = await driverService.getAssignedRoute(user.user_id);
      
      if (assignment) {
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
              vehicleName: assignment.vehicle_name,
              plateNumber: assignment.plate_number,
              vehicleStatus: assignment.vehicle_status,
              startTime: assignment.start_time,
              endTime: assignment.end_time
            });
            setRoutePath(formattedPolygon);
          }
        }

        if (assignment.bins && assignment.bins.length > 0) {
          setBins(assignment.bins.map(bin => ({
            ...bin,
            lat: Number(bin.lat), 
            lng: Number(bin.lng)  
          })));
        }
      }
    } catch (error) {
      console.error("Error loading route data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'hybrid' : 'standard');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  };

  const progressPercentage = bins.length > 0 
    ? (bins.filter(b => b.status === 'Collected').length / bins.length) * 100 : 0;

  const handleAction = () => {
    if (currentStopIndex < bins.length - 1) setCurrentStopIndex(prev => prev + 1);
  };

  const RenderBinMarker = ({ status, isNext }) => {
    const color = status === 'Collected' ? '#94a3b8' : (isNext ? '#3B82F6' : '#10B981');
    return (
      <View style={styles.markerContainer}>
        {isNext && <View style={styles.markerHalo} />}
        <View style={[styles.markerCore, { backgroundColor: color }]}>
          {status === 'Collected' ? <CheckCircle2 size={12} color="white" /> : <Trash2 size={12} color="white" />}
        </View>
      </View>
    );
  };

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
                <LinearGradient colors={['#10B981', '#059669']} style={styles.avatar}>
                   <Text style={styles.avatarText}>{userData?.first_name ? userData.first_name[0] : 'U'}{userData?.last_name ? userData.last_name[0] : ''}</Text>
                </LinearGradient>
             </TouchableOpacity>
          </View>

          <View style={styles.dashCard}>
            <View style={styles.vehicleInfoRow}>
                <View style={styles.truckIconCircle}><Truck size={22} color="#10B981" /></View>
                <View style={{flex: 1, marginLeft: 12}}>
                    <Text style={styles.vehicleSub}>{assignedZone?.plateNumber || 'ASSIGNED VEHICLE'}</Text>
                    <Text style={styles.vehicleMain}>{assignedZone?.vehicleName || 'Isuzu Compactor'}</Text>
                </View>
                <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>ACTIVE</Text>
                </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.timeGrid}>
               <View style={styles.timeItem}><Clock size={16} color="#64748b" /><Text style={styles.timeVal}>{assignedZone?.startTime?.slice(0,5) || '08:00'} - {assignedZone?.endTime?.slice(0,5) || '17:00'}</Text></View>
               <View style={styles.timeItem}><MapPin size={16} color="#64748b" /><Text style={styles.timeVal}>{assignedZone?.name || 'Assigned Zone'}</Text></View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Route Intelligence</Text>
          <View style={styles.mapWrapper}>
             {isLoading ? <ActivityIndicator style={{flex: 1}} color="#10B981" /> : (
               <MapView
                 ref={mapRef}
                 provider={PROVIDER_GOOGLE} 
                 style={styles.map}
                 mapType={mapType}
                 scrollEnabled={false}
                 zoomEnabled={false}
                 initialRegion={{ latitude: 8.4772, longitude: 124.6459, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
                 customMapStyle={mapType === 'standard' ? mapStyle : []}
               >
                 {assignedZone && <Polygon coordinates={assignedZone.polygon} fillColor="rgba(16, 185, 129, 0.12)" strokeColor="#10B981" strokeWidth={2} />}
                 {bins.map((bin, i) => <Marker key={i} coordinate={{ latitude: bin.lat, longitude: bin.lng }}><RenderBinMarker status={bin.status} isNext={i === currentStopIndex} /></Marker>)}
               </MapView>
             )}
             <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapControlBtn} onPress={() => setViewMode('navigation')}>
                   <Maximize2 size={18} color="#1e293b" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mapControlBtn, { marginTop: 10 }]} onPress={toggleMapType}>
                   <Layers size={18} color={mapType === 'hybrid' ? '#10B981' : '#1e293b'} />
                </TouchableOpacity>
             </View>
          </View>

          <View style={styles.enhancedProgressCard}>
             <View style={styles.progressDataRow}>
                <View>
                   <Text style={styles.progressMainTitle}>Collection Progress</Text>
                   <Text style={styles.progressSubTitle}>{bins.filter(b => b.status === 'Collected').length} of {bins.length} stops cleared</Text>
                </View>
                <View style={styles.progressCircleContainer}>
                   <Text style={styles.progressPercentageText}>{Math.round(progressPercentage)}%</Text>
                </View>
             </View>
             <View style={styles.trackContainer}>
                <View style={styles.trackBackground} />
                <LinearGradient colors={['#34D399', '#10B981']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.trackFill, {width: `${progressPercentage}%`}]} />
             </View>
          </View>

          <Text style={styles.sectionTitle}>Stop Schedule</Text>
          <View style={styles.timelineContainer}>
            {bins.map((item, index) => {
               const isDone = item.status === 'Collected';
               const isNext = !isDone && bins.findIndex(b => b.status === 'Pending') === index;
               return (
                 <View key={index} style={styles.timelineRow}>
                    <View style={styles.timelineGraphics}>
                       <View style={[styles.timelineLine, index === bins.length - 1 && { opacity: 0 }, isDone && styles.timelineLineDone]} />
                       <View style={[styles.timelineNode, isDone ? styles.nodeDone : (isNext ? styles.nodeNext : styles.nodeWait)]}>
                          {isDone ? <CheckCircle2 size={14} color="white" /> : <Text style={[styles.nodeText, isNext && {color: 'white'}]}>{index + 1}</Text>}
                       </View>
                    </View>
                    <TouchableOpacity activeOpacity={0.7} style={[styles.enhancedStopCard, isNext && styles.activeStopGlow, isDone && styles.doneStopOpacity]}>
                       <View style={styles.stopCardContent}>
                          <View style={{flex: 1}}>
                             <Text style={[styles.enhancedStopAddr, isDone && styles.textStrikethrough]}>{item.address || 'Point location'}</Text>
                             <Text style={styles.stopDistText}>Zone: {assignedZone?.name}</Text>
                          </View>
                          {isNext ? (<LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.goButton}><Navigation size={16} color="white" /></LinearGradient>) : (<ChevronRight size={20} color="#cbd5e1" />)}
                       </View>
                    </TouchableOpacity>
                 </View>
               );
            })}
          </View>
        </ScrollView>

        <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 15 }]}>
           <TouchableOpacity activeOpacity={0.9} onPress={() => setViewMode('navigation')}>
              <LinearGradient colors={['#10B981', '#059669']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.engageBtn}>
                 <Navigation size={22} color="white" style={{marginRight: 10}} />
                 <Text style={styles.engageBtnText}>{isDriver ? 'START NAVIGATION' : 'START COLLECTION'}</Text>
              </LinearGradient>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  // NAVIGATION VIEW
  return (
    <View style={styles.navContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <MapView 
        ref={mapRef} 
        provider={PROVIDER_GOOGLE} 
        style={styles.fullMap} 
        mapType={mapType}
        initialRegion={{ latitude: 8.4772, longitude: 124.6459, latitudeDelta: 0.005, longitudeDelta: 0.005 }} 
        customMapStyle={mapType === 'standard' ? mapStyle : []} 
        showsUserLocation scrollEnabled zoomEnabled
      >
        {assignedZone && <Polygon coordinates={assignedZone.polygon} fillColor="rgba(16, 185, 129, 0.1)" strokeColor="#10B981" strokeWidth={3} />}
        {bins.map((bin, i) => <Marker key={i} coordinate={{ latitude: bin.lat, longitude: bin.lng }}><RenderBinMarker status={bin.status} isNext={i === currentStopIndex} /></Marker>)}
      </MapView>

      <SafeAreaView style={styles.navHeaderOverlay} pointerEvents="box-none">
         <View style={[styles.navHeaderContent, { marginTop: Platform.OS === 'android' ? 30 : 0 }]}>
            <TouchableOpacity style={styles.backCircle} onPress={() => setViewMode('overview')}>
               <ArrowRight size={24} color="#1e293b" style={{transform: [{rotate: '180deg'}]}} />
            </TouchableOpacity>
            <View style={styles.navTitleBox}><Text style={styles.navTitle}>MISSION MODE</Text></View>
            <TouchableOpacity style={styles.backCircle} onPress={toggleMapType}>
               <MapIcon size={22} color={mapType === 'hybrid' ? '#10B981' : '#1e293b'} />
            </TouchableOpacity>
         </View>
      </SafeAreaView>

      <View style={[styles.navBottom, { paddingBottom: insets.bottom + 20 }]}>
         <View style={styles.instrCard}>
            <Text style={styles.instrNext}>NEXT DESTINATION</Text>
            <Text style={styles.instrAddr} numberOfLines={1}>{bins[currentStopIndex]?.address || '...'}</Text>
            <View style={styles.instrActions}>
               <TouchableOpacity style={styles.instrBtnAlert}><AlertTriangle size={22} color="#EF4444" /></TouchableOpacity>
               <TouchableOpacity style={styles.instrBtnMain} onPress={handleAction}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.instrBtnGrad}>
                     <Text style={styles.instrBtnText}>{isDriver ? 'ARRIVED' : 'CONFIRM'}</Text>
                  </LinearGradient>
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
  dashCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, elevation: 8, shadowColor: '#10B981', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 30 },
  vehicleInfoRow: { flexDirection: 'row', alignItems: 'center' },
  truckIconCircle: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  vehicleSub: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  vehicleMain: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  statusBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 5 },
  statusText: { fontSize: 10, fontWeight: '900', color: '#10B981' },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  timeGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeVal: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
  mapWrapper: { height: 280, borderRadius: 30, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.2, marginBottom: 30 },
  map: { flex: 1 },
  mapControls: { position: 'absolute', right: 15, top: 15 },
  mapControlBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  enhancedProgressCard: { backgroundColor: 'white', padding: 22, borderRadius: 28, marginBottom: 35, elevation: 4 },
  progressDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressMainTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  progressSubTitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  progressCircleContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#DCFCE7' },
  progressPercentageText: { fontSize: 14, fontWeight: '900', color: '#10B981' },
  trackContainer: { height: 12, width: '100%', borderRadius: 6, overflow: 'hidden' },
  trackBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F1F5F9' },
  trackFill: { height: '100%', borderRadius: 6 },
  timelineContainer: { paddingLeft: 5 },
  timelineRow: { flexDirection: 'row', marginBottom: 15 },
  timelineGraphics: { width: 40, alignItems: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 10 },
  timelineLineDone: { backgroundColor: '#10B981' },
  timelineNode: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 2, elevation: 3 },
  nodeDone: { backgroundColor: '#10B981' },
  nodeNext: { backgroundColor: '#3B82F6' },
  nodeWait: { backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0' },
  nodeText: { fontSize: 12, fontWeight: '900', color: '#94a3b8' },
  enhancedStopCard: { flex: 1, backgroundColor: 'white', borderRadius: 22, padding: 18, elevation: 2 },
  activeStopGlow: { shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  doneStopOpacity: { opacity: 0.6, backgroundColor: '#F8FAFC' },
  stopCardContent: { flexDirection: 'row', alignItems: 'center' },
  enhancedStopAddr: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  stopDistText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#94a3b8' },
  goButton: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
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
  instrNext: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  instrAddr: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginVertical: 8 },
  instrActions: { flexDirection: 'row', gap: 12 },
  instrBtnAlert: { width: 55, height: 55, borderRadius: 15, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  instrBtnMain: { flex: 1 },
  instrBtnGrad: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  instrBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
  markerContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  markerHalo: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  markerCore: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: 'white', justifyContent: 'center', alignItems: 'center' }
});

const mapStyle = [ { "featureType": "poi", "stylers": [{ "visibility": "off" }] } ];

export default DriverRouteScreen;