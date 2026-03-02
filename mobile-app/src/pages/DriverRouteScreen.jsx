import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, 
  StatusBar, ActivityIndicator, Platform, RefreshControl, Image, Alert 
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { 
  Navigation, CheckCircle2, Trash2, ArrowRight, Maximize2, 
  Clock, Truck, ChevronRight, Layers, Map as MapIcon, AlertTriangle, LocateFixed, Target, Camera 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService } from '../services/driverService';
import { mobileService } from '../services/mobileService'; 

MapboxGL.setAccessToken('pk.eyJ1IjoiamVnby1ybyIsImEiOiJjbWx6dnZ6YmQwOW12NGtxd25vMmJldGZhIn0.uCCN-70t1ZZugt6h1ZoMOg');

const { width } = Dimensions.get('window');
const INITIAL_COORDINATES = [124.6459, 8.4772];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
};

const RenderBinMarker = ({ status, isNext }) => (
  <View style={styles.emeraldMarkerContainer}>
    <View style={[styles.emeraldPulse, isNext && styles.bluePulse]} />
    <View style={[styles.emeraldCore, isNext && styles.blueCore, status === 'Collected' && styles.collectedCore]}>
      {status === 'Collected' ? (
        <CheckCircle2 size={14} color="white" />
      ) : (
        <Trash2 size={14} color="white" />
      )}
    </View>
    <View style={[styles.emeraldTip, isNext && styles.blueTip, status === 'Collected' && styles.collectedTip]} />
  </View>
);

const RenderReportMarker = ({ isNext, showLabel, issueType, isCompleted }) => (
  <View style={{ alignItems: 'center' }}>
    {showLabel && !isCompleted && (
      <View style={{ alignItems: 'center', paddingBottom: 2 }}>
        <View style={styles.calloutBubble}>
          <Text style={styles.calloutText}>{issueType}</Text>
        </View>
        <View style={styles.calloutTriangle} />
      </View>
    )}
    <View style={styles.reportMarkerContainer}>
      <View style={[styles.reportPulse, isNext && styles.bluePulse]} />
      <View style={[
        styles.reportCore, 
        isNext && styles.blueCore, 
        isCompleted && styles.collectedCore 
      ]}>
        {isCompleted ? (
          <CheckCircle2 size={14} color="white" />
        ) : (
          <AlertTriangle size={14} color="white" />
        )}
      </View>
      <View style={[
        styles.reportTip, 
        isNext && styles.blueTip,
        isCompleted && styles.collectedTip 
      ]} />
    </View>
  </View>
);

const DriverRouteScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  
  const userRole = route.params?.role || 'driver';
  const isDriver = userRole === 'driver';

  const [viewMode, setViewMode] = useState('overview'); 
  const [userData, setUserData] = useState(null);
  const [assignedZones, setAssignedZones] = useState([]); 
  const [assignedReports, setAssignedReports] = useState([]); 
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [mapType, setMapType] = useState('standard'); 
  
  const [userLoc, setUserLoc] = useState(null);
  const [isTracking, setIsTracking] = useState(true);
  const [focusedReportId, setFocusedReportId] = useState(null);
  const mapCameraRef = useRef(null); 

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
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        await MapboxGL.requestAndroidLocationPermissions();
      }
    };
    requestPermissions();

    loadAssignedData();
    const interval = setInterval(loadAssignedData, 10000); 
    return () => clearInterval(interval);
  }, []);

  // ✅ FIXED: Navigation & Zoom logic
  useEffect(() => {
    if (route.params?.targetLocation) {
      const { lat, lng, reportId } = route.params.targetLocation;
      
      setFocusedReportId(reportId);
      setIsTracking(false);
      setViewMode('navigation');

      // Add a slight delay to allow the map to render if switching from overview mode
      setTimeout(() => {
        if (mapCameraRef.current) {
          mapCameraRef.current.setCamera({
            centerCoordinate: [Number(lng), Number(lat)],
            zoomLevel: 18.5,
            animationDuration: 2000
          });
        }
      }, 300);

      navigation.setParams({ targetLocation: null });
    }
  }, [route.params?.targetLocation]); // removed viewMode dependency so it doesn't clash

  useEffect(() => {
    if (route.params?.evidenceSubmittedForBin) {
      const capturedBinId = route.params.evidenceSubmittedForBin;
      setAssignedZones(prevZones => prevZones.map(zone => {
        if (zone.zone_id === activeZoneId) {
          return {
            ...zone,
            bins: zone.bins.map(b => 
              b.bin_id === capturedBinId 
                ? { ...b, evidence_submitted: true } 
                : b
            )
          };
        }
        return zone;
      }));
      navigation.setParams({ evidenceSubmittedForBin: null });
    }
  }, [route.params?.evidenceSubmittedForBin, activeZoneId, navigation]);

  useEffect(() => {
    if (route.params?.evidenceSubmittedForReport) {
      const capturedReportId = route.params.evidenceSubmittedForReport;
      setAssignedReports(prev => prev.map(r => 
        r.report_id === capturedReportId 
          ? { ...r, evidence_submitted: true } 
          : r
      ));
      navigation.setParams({ evidenceSubmittedForReport: null });
    }
  }, [route.params?.evidenceSubmittedForReport, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAssignedData();
    setRefreshing(false);
  }, []);

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

        const isToday = (dateString) => {
           if (!dateString) return false;
           const itemDate = new Date(dateString);
           const today = new Date();
           return itemDate.getDate() === today.getDate() &&
                  itemDate.getMonth() === today.getMonth() &&
                  itemDate.getFullYear() === today.getFullYear();
        };

        const formatted = assignments.map((a, zIdx) => {
          const boundaryData = typeof a.boundaries === 'string' ? JSON.parse(a.boundaries) : a.boundaries;
          let rawPoints = [];
          if (boundaryData?.type === 'Polygon') rawPoints = boundaryData.coordinates[0];
          else if (Array.isArray(boundaryData)) rawPoints = Array.isArray(boundaryData[0]) ? boundaryData[0] : boundaryData;
          
          const polygonCoords = rawPoints.map(p => {
            const lat = Number(Array.isArray(p) ? p[1] : (p.latitude || p.lat));
            const lng = Number(Array.isArray(p) ? p[0] : (p.longitude || p.lng));
            return [lng, lat];
          });

          const safeZoneId = a.zone_id || `temp-zone-${zIdx}`;

          return {
            ...a,
            zone_id: safeZoneId,
            polygonCoords,
            isActiveNow: isNowActive(a.start_time, a.end_time),
            bins: (a.bins || []).map((bin, bIdx) => {
              const dynamicStatus = (bin.status === 'Collected' && isToday(bin.last_collected_timestamp)) 
                  ? 'Collected' 
                  : 'Pending';

              return { 
                ...bin, 
                bin_id: bin.bin_id || `temp-bin-${safeZoneId}-${bIdx}`,
                lat: Number(bin.lat), 
                lng: Number(bin.lng),
                status: dynamicStatus, 
                evidence_submitted: bin.evidence_submitted || false 
              };
            })
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

        try {
          const reportsRes = await mobileService.getAllReports();
          if (reportsRes && reportsRes.success) {
            const taskIds = assignments.map(a => String(a.task_id));
            
            const myActiveReports = reportsRes.reports.filter(r => {
              if (!r.assigned_team_id || !taskIds.includes(String(r.assigned_team_id))) {
                return false;
              }
              if (r.status === 'Pending') {
                return false;
              }
              if (r.status === 'In Progress') {
                return true;
              }
              if (r.status === 'Resolved') {
                if (r.resolved_at) {
                  const resolvedTime = new Date(r.resolved_at).getTime();
                  const currentTime = new Date().getTime();
                  const hoursDifference = (currentTime - resolvedTime) / (1000 * 60 * 60);
                  
                  return hoursDifference <= 3; 
                }
                return true; 
              }
              
              return false;
            });
            
            setAssignedReports(myActiveReports);
          }
        } catch (reportErr) {
          console.log("Failed to load reports for map:", reportErr);
        }
      }
    } catch (e) { 
        console.error(e); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const getBoundingBox = (coords) => {
    if (!coords || coords.length === 0) return null;
    const lats = coords.map(p => p[1]);
    const lngs = coords.map(p => p[0]);
    return {
      ne: [Math.max(...lngs), Math.max(...lats)],
      sw: [Math.min(...lngs), Math.min(...lats)]
    };
  };

  const cameraBounds = useMemo(() => {
    const targetZone = assignedZones.find(z => z.zone_id === activeZoneId);
    if (targetZone?.polygonCoords?.length > 0) {
      return getBoundingBox(targetZone.polygonCoords);
    }
    return null;
  }, [activeZoneId, assignedZones]);

  useEffect(() => {
    // Only zoom to bounds if there's no target location being navigated to
    if (viewMode === 'navigation' && cameraBounds && mapCameraRef.current && !route.params?.targetLocation) {
      mapCameraRef.current.setCamera({
        bounds: {
          ne: cameraBounds.ne, sw: cameraBounds.sw, paddingTop: 120, paddingBottom: 250, paddingLeft: 40, paddingRight: 40
        },
        animationDuration: 1200
      });
    }
  }, [viewMode, cameraBounds, route.params?.targetLocation]);

  const currentMission = useMemo(() => {
    if (assignedZones.length === 0) return null;
    const active = assignedZones.find(z => z.isActiveNow);
    if (active) return active;
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const futureMissions = assignedZones
      .filter(z => timeToInt(z.start_time) > currentTime)
      .sort((a, b) => timeToInt(a.start_time) - timeToInt(b.start_time));
    return futureMissions.length > 0 ? futureMissions[0] : assignedZones[0];
  }, [assignedZones]);

  useEffect(() => {
    let syncInterval;
    
    if (isDriver && userLoc && currentMission?.vehicle_id) {
      syncInterval = setInterval(() => {
        driverService.updateTruckLocation(
          currentMission.vehicle_id, 
          userLoc[1], 
          userLoc[0]  
        );
      }, 4000); 
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [isDriver, userLoc, currentMission]);

  const missionBins = currentMission?.bins || [];

  const allStops = useMemo(() => {
    const formattedBins = missionBins.map(b => ({
      ...b,
      stopType: 'bin',
      targetId: b.bin_id,
      displayAddress: b.address || 'Point location',
      isCompleted: b.status === 'Collected',
      evidence_submitted: b.evidence_submitted || false
    }));

    const formattedReports = assignedReports.map(r => ({
      ...r,
      stopType: 'report',
      targetId: r.report_id,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      displayAddress: r.location_address || 'Citizen Report',
      isCompleted: r.status === 'Resolved',
      evidence_submitted: r.evidence_submitted || !!r.resolved_photo_url 
    }));

    return [...formattedBins, ...formattedReports];
  }, [missionBins, assignedReports]);

  const totalStops = allStops.length;
  const completedStops = allStops.filter(s => s.isCompleted).length;
  const progressPercentage = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  const nearestStop = useMemo(() => {
    if (!userLoc || !allStops || allStops.length === 0) return null;
    
    const pendingStops = allStops.filter(s => !s.isCompleted);
    if (pendingStops.length === 0) return null; 

    let closest = pendingStops[0];
    let minDistance = Infinity;

    pendingStops.forEach(stop => {
      const dist = getDistance(userLoc[1], userLoc[0], stop.lat, stop.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = stop;
      }
    });

    return closest;
  }, [userLoc, allStops]);

  const handleTakePhoto = () => {
    if (!nearestStop || !userLoc) return;

    const distanceKm = getDistance(userLoc[1], userLoc[0], nearestStop.lat, nearestStop.lng);
    const distanceMeters = distanceKm * 1000;

    if (distanceMeters > 15) {
      Alert.alert(
        "Too far away!", 
        `You are ${Math.round(distanceMeters)}m away from the target. Please get within 15 meters to take the photo.`
      );
      return;
    }

    if (nearestStop.stopType === 'report') {
      navigation.navigate('CameraCaptureScreen', { 
        reportId: nearestStop.targetId,
        taskId: currentMission?.task_id 
      });
    } else {
      navigation.navigate('CameraCaptureScreen', { 
        binId: nearestStop.targetId,
        zoneId: activeZoneId,
        taskId: currentMission?.task_id 
      });
    }
  };

  const handleAction = async () => { 
    if (!nearestStop || !userData) return;

    try {
      if (nearestStop.stopType === 'report') {
        await mobileService.confirmReportResolution(nearestStop.targetId);
        await loadAssignedData(); 
      } else {
        const token = await AsyncStorage.getItem('token');
        
        const dummyUrl = mobileService.getImageUrl('/dummy');
        const baseUrl = dummyUrl.replace('/dummy', '/api');
        
        const response = await fetch(`${baseUrl}/mobile/confirm-collection`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            bin_id: nearestStop.targetId,
            // ✅ FIXED: Safely grab the correct user ID just like we did in the Camera Screen
            driver_id: userData.user_id || userData.id 
          })
        });

        const result = await response.json();

        if (result.success) {
          const updatedZones = assignedZones.map(zone => {
            if (zone.zone_id === activeZoneId) {
              return {
                ...zone,
                bins: zone.bins.map(b => b.bin_id === nearestStop.targetId ? { ...b, status: 'Collected' } : b)
              };
            }
            return zone;
          });
          setAssignedZones(updatedZones);
          Alert.alert("Success", "Collection confirmed and recorded.");
        } else {
          Alert.alert("Error", result.error || "Failed to confirm collection.");
        }
      }
    } catch (error) {
      console.error("Action Error:", error);
      Alert.alert("Error", "Could not complete action. Please check your connection.");
    }
  };

  const bearingLine = useMemo(() => {
    if (!userLoc || !nearestStop) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [userLoc, [nearestStop.lng, nearestStop.lat]],
          },
        },
      ],
    };
  }, [userLoc, nearestStop]);

  const handleRecenter = () => {
    setIsTracking(true);
    setFocusedReportId(null);

    if (userLoc && mapCameraRef.current) {
      mapCameraRef.current.setCamera({
        centerCoordinate: userLoc,
        zoomLevel: 16,
        animationDuration: 1000,
      });
    } else if (cameraBounds && mapCameraRef.current) {
      mapCameraRef.current.setCamera({
        bounds: {
          ne: cameraBounds.ne, sw: cameraBounds.sw, paddingTop: 120, paddingBottom: 250, paddingLeft: 40, paddingRight: 40
        },
        animationDuration: 1000
      });
    }
  };

  const truckCoords = isDriver 
    ? userLoc 
    : (currentMission?.truck_lng && currentMission?.truck_lat 
        ? [currentMission.truck_lng, currentMission.truck_lat] 
        : null);
  
  const renderMapFeatures = (isNavigationMode) => {
    const currentView = isNavigationMode ? 'nav' : 'overview';

    return (
      <>
        {assignedZones.map((z, zIdx) => (
          <React.Fragment key={`zone-wrapper-${currentView}-${z.zone_id}-${zIdx}`}>
            {z.polygonCoords?.length > 0 && (
              <MapboxGL.ShapeSource 
                id={`source-${currentView}-${z.zone_id}-${zIdx}`} 
                shape={{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [z.polygonCoords] } }}
              >
                <MapboxGL.FillLayer 
                  id={`fill-${currentView}-${z.zone_id}-${zIdx}`} 
                  style={{ 
                    fillColor: z.zone_color || '#10B981', 
                    fillOpacity: z.zone_id === activeZoneId ? 0.25 : 0.08 
                  }} 
                />
                <MapboxGL.LineLayer 
                  id={`line-${currentView}-${z.zone_id}-${zIdx}`} 
                  style={{ lineColor: z.zone_color || '#10B981', lineWidth: 1 }} 
                />
              </MapboxGL.ShapeSource>
            )}

            {z.bins.map((b, bIdx) => {
              const isTarget = isNavigationMode && nearestStop?.targetId === b.bin_id && nearestStop?.stopType === 'bin';
              return (
                <MapboxGL.PointAnnotation 
                  key={`point-${currentView}-${z.zone_id}-${b.bin_id}-${bIdx}`} 
                  id={`ann-bin-${currentView}-${z.zone_id}-${b.bin_id}-${bIdx}`} 
                  coordinate={[b.lng, b.lat]}
                >
                  <RenderBinMarker status={b.status} isNext={isTarget} />
                </MapboxGL.PointAnnotation>
              );
            })}
          </React.Fragment>
        ))}

        {assignedReports.map((report, rIdx) => {
          const isTarget = isNavigationMode && nearestStop?.targetId === report.report_id && nearestStop?.stopType === 'report';
          const isFocused = focusedReportId === report.report_id;
          const displayIssue = report.issue_type === 'Other' ? report.issue_type_other : report.issue_type;
          
          const isCompleted = report.status === 'Resolved';

          return (
            <MapboxGL.PointAnnotation 
              key={`report-${currentView}-${report.report_id}-${rIdx}`} 
              id={`ann-report-${currentView}-${report.report_id}-${rIdx}`} 
              coordinate={[Number(report.longitude), Number(report.latitude)]}
            >
              <RenderReportMarker 
                isNext={isTarget} 
                showLabel={isFocused || isTarget} 
                issueType={displayIssue}
                isCompleted={isCompleted}
              />
            </MapboxGL.PointAnnotation>
          );
        })}
      </>
    );
  };

  if (viewMode === 'overview') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FBF8" />
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} tintColor="#10B981" />}
        >
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
               <MapboxGL.MapView 
                 style={styles.map} 
                 styleURL={mapType === 'hybrid' ? MapboxGL.StyleURL.SatelliteStreet : MapboxGL.StyleURL.Street}
                 logoEnabled={false}
                 attributionEnabled={false}
               >
                 <MapboxGL.Camera 
                   animationDuration={1000}
                   bounds={cameraBounds ? {
                     ne: cameraBounds.ne, sw: cameraBounds.sw, paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40
                   } : undefined}
                   centerCoordinate={!cameraBounds ? INITIAL_COORDINATES : undefined} 
                   zoomLevel={!cameraBounds ? 14 : undefined}
                 />
                 
                 <MapboxGL.UserLocation 
                   visible={false} 
                   onUpdate={(location) => setUserLoc([location.coords.longitude, location.coords.latitude])} 
                 />
                 
                 {truckCoords && (
                   <MapboxGL.MarkerView id="shared-truck-overview" coordinate={truckCoords}>
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

                 {renderMapFeatures(false)}
               </MapboxGL.MapView>
             )}
             <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapControlBtn} onPress={() => { setIsTracking(false); setViewMode('navigation'); }}><Maximize2 size={18} color="#1e293b" /></TouchableOpacity>
                <TouchableOpacity style={[styles.mapControlBtn, { marginTop: 10 }]} onPress={() => setMapType(mapType === 'standard' ? 'hybrid' : 'standard')}><Layers size={18} color={mapType === 'hybrid' ? '#10B981' : '#1e293b'} /></TouchableOpacity>
             </View>
          </View>

          <View style={styles.enhancedProgressCard}>
             <View style={styles.progressDataRow}>
                <View><Text style={styles.progressMainTitle}>Mission Progress</Text><Text style={styles.progressSubTitle}>{completedStops} of {totalStops} stops</Text></View>
                <View style={styles.progressCircleContainer}><Text style={styles.progressPercentageText}>{Math.round(progressPercentage)}%</Text></View>
             </View>
             <View style={styles.trackContainer}><View style={styles.trackBackground} /><LinearGradient colors={['#34D399', '#10B981']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.trackFill, {width: `${progressPercentage}%`}]} /></View>
          </View>

          <Text style={styles.sectionTitle}>Stop Schedule</Text>
          <View style={styles.timelineContainer}>
            {allStops.length > 0 ? (
                allStops.map((item, index) => {
                const isDone = item.isCompleted;
                const isNext = !isDone && nearestStop?.targetId === item.targetId;
                const isReport = item.stopType === 'report';
                
                return (
                    <View key={`timeline-row-${item.targetId}-${index}`} style={styles.timelineRow}>
                        <View style={styles.timelineGraphics}>
                            <View style={[styles.timelineLine, index === allStops.length - 1 && { opacity: 0 }, isDone && {backgroundColor: '#10B981'}]} />
                            <View style={[styles.timelineNode, isDone ? {backgroundColor: '#10B981'} : (isNext ? {backgroundColor: '#3B82F6'} : {backgroundColor: '#F1F5F9'})]}>
                                {isDone ? <CheckCircle2 size={14} color="white" /> : (isNext ? <Target size={14} color="white" /> : <Text style={{fontSize: 10, fontWeight: '900', color: '#94a3b8'}}>{index + 1}</Text>)}
                            </View>
                        </View>
                        <TouchableOpacity activeOpacity={0.7} style={[styles.enhancedStopCard, isNext && styles.activeStopGlow, isDone && {opacity: 0.6}, isReport && {borderColor: '#FECACA', borderWidth: 1}]}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={{flex: 1}}>
                                    <Text style={[styles.enhancedStopAddr, isDone && {textDecorationLine: 'line-through'}, isReport && {color: '#DC2626'}]}>
                                      {isReport ? `Citizen Report: ${item.displayAddress}` : item.displayAddress}
                                    </Text>
                                    <Text style={styles.stopDistText}>
                                      {isReport ? `Task #${item.targetId}` : `Mission: ${currentMission?.zone_name}`}
                                    </Text>
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
            <TouchableOpacity activeOpacity={0.9} onPress={() => { setIsTracking(false); setViewMode('navigation'); }}>
              <LinearGradient colors={['#10B981', '#059669']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.engageBtn}>
                 <Navigation size={22} color="white" style={{marginRight: 10}} />
                 <Text style={styles.engageBtnText}>START COLLECTION</Text>
              </LinearGradient>
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==========================================
  // VIEW: NAVIGATION/MISSION MODE
  // ==========================================
  return (
    <View style={styles.navContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.fullMap}>
        <MapboxGL.MapView 
          style={styles.fullMap} 
          styleURL={mapType === 'hybrid' ? MapboxGL.StyleURL.SatelliteStreet : MapboxGL.StyleURL.Street}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapboxGL.Camera 
            ref={mapCameraRef}
            animationDuration={1200}
            followUserLocation={isTracking}
            followZoomLevel={16}
            onUserTrackingModeChange={(event) => {
              if (!event.nativeEvent.payload.followUserLocation) {
                setIsTracking(false);
              }
            }}
            bounds={!isTracking && cameraBounds && !route.params?.targetLocation ? {
              ne: cameraBounds.ne, sw: cameraBounds.sw, paddingTop: 120, paddingBottom: 250, paddingLeft: 40, paddingRight: 40
            } : undefined}
            centerCoordinate={!isTracking && !cameraBounds && !route.params?.targetLocation ? INITIAL_COORDINATES : undefined} 
          />
          
          <MapboxGL.UserLocation 
            visible={false} 
            onUpdate={(location) => {
               setUserLoc([location.coords.longitude, location.coords.latitude]);
            }} 
          />

          {isDriver && bearingLine && (
            <MapboxGL.ShapeSource id="routeLineSource-nav" shape={bearingLine}>
              <MapboxGL.LineLayer
                id="routeLineLayer-nav"
                style={{ lineColor: '#3B82F6', lineWidth: 4, lineDasharray: [2, 2], lineOpacity: 0.8 }}
              />
            </MapboxGL.ShapeSource>
          )}

          {truckCoords && (
            <MapboxGL.MarkerView id="shared-truck-mission" coordinate={truckCoords}>
              <View style={[styles.customTruckPuck, !isTracking && { borderColor: '#94a3b8' }]}>
                <Image 
                  source={require('../../assets/truck.png')} 
                  style={styles.truckIconImage}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>
            </MapboxGL.MarkerView>
          )}

          {renderMapFeatures(true)}
        </MapboxGL.MapView>

        <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
           <LocateFixed size={22} color={isTracking ? "#10B981" : "#1e293b"} />
        </TouchableOpacity>
      </View>

      <SafeAreaView style={styles.navHeaderOverlay} pointerEvents="box-none">
         <View style={[styles.navHeaderContent, { marginTop: Platform.OS === 'android' ? 30 : 0 }]}>
            <TouchableOpacity style={styles.backCircle} onPress={() => setViewMode('overview')}><ArrowRight size={24} color="#1e293b" style={{transform: [{rotate: '180deg'}]}} /></TouchableOpacity>
            <View style={styles.navTitleBox}><Text style={styles.navTitle}>MISSION MODE</Text></View>
            <TouchableOpacity style={styles.backCircle} onPress={() => setMapType(mapType === 'standard' ? 'hybrid' : 'standard')}><MapIcon size={22} color={mapType === 'hybrid' ? '#10B981' : '#1e293b'} /></TouchableOpacity>
         </View>
      </SafeAreaView>

      <View style={[styles.navBottom, { paddingBottom: insets.bottom + 20 }]}>
         <View style={styles.instrCard}>
            <Text style={styles.instrNext}>NEAREST DESTINATION</Text>
            <Text style={styles.instrAddr} numberOfLines={1}>
              {nearestStop ? nearestStop.displayAddress : 'All Stops Completed'}
            </Text>
            <View style={styles.instrActions}>
                <TouchableOpacity style={styles.instrBtnAlert}>
                  <AlertTriangle size={22} color="#EF4444" />
                </TouchableOpacity>

                {isDriver ? (
                    <TouchableOpacity 
                        style={[styles.instrBtnMain, (!nearestStop || !nearestStop.evidence_submitted) && { opacity: 0.5 }]} 
                        disabled={!nearestStop || !nearestStop.evidence_submitted} 
                        onPress={handleAction}
                    >
                        <LinearGradient 
                            colors={nearestStop?.evidence_submitted ? ['#10B981', '#059669'] : ['#94a3b8', '#64748b']} 
                            style={styles.instrBtnGrad}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                               {nearestStop?.evidence_submitted && <CheckCircle2 size={18} color="white" style={{ marginRight: 8 }} />}
                               <Text style={styles.instrBtnText}>
                                   {!nearestStop 
                                       ? 'ROUTE CLEAR' 
                                       : nearestStop.evidence_submitted 
                                           ? (nearestStop.stopType === 'report' ? 'CONFIRM RESOLUTION' : 'CONFIRM COLLECTION') 
                                           : 'WAITING FOR PHOTO...'}
                               </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.instrBtnMain, !nearestStop && { opacity: 0.5 }]} 
                        disabled={!nearestStop} 
                        onPress={handleTakePhoto} 
                    >
                        <LinearGradient colors={nearestStop?.stopType === 'report' ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']} style={styles.instrBtnGrad}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {nearestStop && <Camera size={18} color="white" style={{ marginRight: 8 }} />}
                                <Text style={styles.instrBtnText}>
                                    {!nearestStop ? 'ALL DONE' : 'TAKE EVIDENCE PHOTO'}
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
         </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' },
  scrollContent: { padding: 20, paddingBottom: 150 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: -40 },
  dateText: { fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: 1 },
  smallGreeting: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  greetingText: { fontSize: 28, fontWeight: '900', color: '#1e293b', marginTop: -2 },
  avatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  avatarText: { color: 'white', fontWeight: '800', fontSize: 20 },
  dashCard: { backgroundColor: '#F6FBF6', borderRadius: 25, padding: 20, elevation: 8, marginBottom: 30 },
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
  mapControls: { position: 'absolute', right: 15, top: 15, zIndex: 5 },
  mapControlBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  enhancedProgressCard: { backgroundColor: '#F6FBF6', padding: 22, borderRadius: 28, marginBottom: 35, elevation: 4 },
  progressDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressMainTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  progressSubTitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  progressCircleContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  progressPercentageText: { fontSize: 14, fontWeight: '900', color: '#10B981' },
  trackContainer: { height: 12, width: '100%', borderRadius: 6, overflow: 'hidden' },
  trackBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#cbd5e1' },
  trackFill: { height: '100%', borderRadius: 6 },
  timelineContainer: { paddingLeft: 5 },
  timelineRow: { flexDirection: 'row', marginBottom: 15 },
  timelineGraphics: { width: 40, alignItems: 'center' },
  timelineLine: { width: 4, flex: 1, backgroundColor: '#cbd5e1', marginTop: 10 },
  timelineNode: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 2, elevation: 3 },
  enhancedStopCard: { flex: 1, backgroundColor: '#F6FBF6', borderRadius: 22, padding: 18, elevation: 2 },
  activeStopGlow: { shadowColor: '#3B82F6', shadowOpacity: 0.4, shadowRadius: 8, elevation: 5, borderWidth: 1.5, borderColor: '#3B82F6' },
  enhancedStopAddr: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  stopDistText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  goButton: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyBinsCard: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6FBF6', borderRadius: 22, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0' },
  emptyBinsText: { marginTop: 12, color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, backgroundColor: '#E3F3DF' },
  engageBtn: { height: 65, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  engageBtnText: { color: 'white', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  navContainer: { flex: 1, backgroundColor: '#0f172a' },
  fullMap: { flex: 1 },
  navHeaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  navHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  navTitleBox: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, elevation: 5 },
  navTitle: { color: '#1e293b', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  navBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, zIndex: 10 },
  instrCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, elevation: 20, marginBottom: 20 },
  instrNext: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 5, letterSpacing: 1 },
  instrAddr: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
  instrActions: { flexDirection: 'row', gap: 12 },
  instrBtnAlert: { width: 55, height: 55, borderRadius: 15, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  instrBtnMain: { flex: 1 },
  instrBtnGrad: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  instrBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
  markerContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emeraldMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  emeraldPulse: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
  },
  emeraldCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#065f46', 
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 2,
  },
  emeraldTip: {
    width: 10,
    height: 10,
    backgroundColor: '#065f46',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
    zIndex: 1,
  },
  bluePulse: { backgroundColor: 'rgba(59, 130, 246, 0.3)' },
  blueCore: { backgroundColor: '#1d4ed8' },
  blueTip: { backgroundColor: '#1d4ed8' },
  collectedCore: { backgroundColor: '#94a3b8' },
  collectedTip: { backgroundColor: '#94a3b8' },
  
  reportMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  reportPulse: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.3)', // RED Pulse
  },
  reportCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626', // RED Core
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 2,
  },
  reportTip: {
    width: 10,
    height: 10,
    backgroundColor: '#DC2626', // RED Tip
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
    zIndex: 1,
  },

  calloutBubble: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  calloutText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  calloutTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#DC2626',
    alignSelf: 'center',
    marginTop: -1
  },

  customTruckPuck: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'white',
    borderWidth: 2.5,
    borderColor: '#10B981',
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
  recenterBtn: {
    position: 'absolute',
    bottom: 230, 
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4.5,
  },
});

export default DriverRouteScreen;