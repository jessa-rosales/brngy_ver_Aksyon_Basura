import React, {
  useState,
  useRef,
  useCallback,
  useEffect //  for navigation listeners
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  Modal,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; // for navigation useNavigation
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import MapboxGL from '@rnmapbox/maps';

import {
  Trash2,
  Truck,
  AlertTriangle,
  HelpCircle,
  Camera,
  MapPin,
  Check,
  X,
  Layers
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

import CustomAlert from '../components/CustomAlert';

MapboxGL.setAccessToken('pk.eyJ1IjoiamVnby1ybyIsImEiOiJjbWx6dnZ6YmQwOW12NGtxd25vMmJldGZhIn0.uCCN-70t1ZZugt6h1ZoMOg');

// --- 🔥 ROBUST PARSER FOR YOUR POSTGIS NESTED BOUNDARIES ---
const parseBoundariesForMapbox = (raw) => {
  if (!raw) return [];
  try {
    let data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.coordinates) data = data.coordinates;
    
    // Flatten deep nesting
    while (Array.isArray(data) && Array.isArray(data[0]) && Array.isArray(data[0][0])) {
      data = data[0];
    }
    if (Array.isArray(data[0]) && typeof data[0][0] !== 'object' && data[0].length === 2) {
      // Correct level
    } else if (Array.isArray(data[0])) {
      data = data[0];
    }

    let polygonCoords = data.map(point => {
      let lat, lng;
      if (point.lat !== undefined) {
        lat = point.lat; lng = point.lng;
      } else if (Array.isArray(point)) {
        // Mapbox expects [Longitude, Latitude]
        if (Number(point[0]) > 50) { 
          lat = Number(point[1]); lng = Number(point[0]);
        } else {
          lat = Number(point[0]); lng = Number(point[1]);
        }
      }
      return [Number(lng), Number(lat)];
    }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));

    // GeoJSON strictly requires the polygon to be closed (first and last point must match)
    if (polygonCoords.length > 0) {
      const first = polygonCoords[0];
      const last = polygonCoords[polygonCoords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        polygonCoords.push([...first]);
      }
    }
    return polygonCoords;
  } catch (err) {
    console.error("GeoJSON Parsing Error:", err);
    return [];
  }
};

const createGeoJSONFromZones = (zones) => {
  const features = zones.map(z => {
    const coords = parseBoundariesForMapbox(z.boundaries || z.coordinates);
    if (coords.length < 3) return null; // Skip invalid geometry

    return {
      type: 'Feature',
      properties: { id: z.zone_id, color: z.zone_color || '#1B5E20' },
      geometry: { type: 'Polygon', coordinates: [coords] }
    };
  }).filter(Boolean); // Remove nulls

  return { type: 'FeatureCollection', features };
};

const ReportScreen = () => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const navigation = useNavigation(); // navigation reference

  // --- FORM STATE ---
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [otherIssueType, setOtherIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  // Loading State for Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reference to allow navigation without warning when submission succeeds
  const isSuccessNavigating = useRef(false);

  // --- MAP STATE ---
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [mapType, setMapType] = useState('standard');

  // --- MAP DATA STATES ---
  const [zonesData, setZonesData] = useState({ type: 'FeatureCollection', features: [] });
  const [bins, setBins] = useState([]);
  const [existingReports, setExistingReports] = useState([]);

  // Custom Alert State
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Close',
    onConfirm: null,
    onCancel: null // handle custom cancel actions
  });

  const closeAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  const themeGreen = '#1B5E20';

  const issueTypes = [
    { id: 'missed', label: 'Missed Pickup', icon: Truck, color: '#1B5E20' },
    { id: 'overflow', label: 'Overflowing', icon: Trash2, color: '#F97316' },
    { id: 'dumping', label: 'Illegal Dumping', icon: AlertTriangle, color: '#EF4444' },
    { id: 'other', label: 'Other Issue', icon: HelpCircle, color: '#EAB308' },
  ];

  // Helper to reset the form
  const resetForm = () => {
    setSelectedIssue(null);
    setOtherIssueType('');
    setDescription('');
    setImage(null);
    setLocation(null);
    setAddress('');
  };

  // Check if there is any unsaved data
  const hasUnsavedChanges = selectedIssue !== null || otherIssueType.trim() !== '' || description.trim() !== '' || image !== null || location !== null;

  //  Navigation Interceptor (Unsaved Changes Warning)
  useEffect(() => {
    // 1. Intercept Back Buttons or Stack Navigation
    const handleBeforeRemove = (e) => {
      if (!hasUnsavedChanges || isSuccessNavigating.current) {
        return; // Allow navigation if no data or if we are navigating after a successful submit
      }
      e.preventDefault(); // Stop navigation
      setCustomAlert({
        visible: true,
        title: "Discard Report?",
        message: "You have filled out information. Are you sure you want to leave? Your progress will be lost.",
        type: "warning",
        confirmText: "Discard & Leave",
        cancelText: "Stay",
        onConfirm: () => {
          closeAlert();
          resetForm(); // Clear the form so it doesn't trigger again
          navigation.dispatch(e.data.action); // Proceed with the requested navigation
        }
      });
    };

    const unsubscribeRemove = navigation.addListener('beforeRemove', handleBeforeRemove);

    return () => {
      unsubscribeRemove();
    };
  }, [navigation, hasUnsavedChanges]);

  useFocusEffect(
    useCallback(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToPosition(0, 0, false);
      }
      // Reset the success flag when screen is focused again
      isSuccessNavigating.current = false;
    }, [])
  );

  // --- 🔥 FIXED: FETCH MAP DATA FROM MULTIPLE ENDPOINTS ---
  useEffect(() => {
    if (showMap) {
      const fetchMapData = async () => {
        try {
          // 1. Fetch Zones and Bins
          const zoneResponse = await mobileService.getZoneTrackingData();
          
          if (zoneResponse && zoneResponse.success && zoneResponse.data) {
            const fetchedZones = zoneResponse.data;
            setZonesData(createGeoJSONFromZones(fetchedZones));

            let rawBins = [];
            fetchedZones.forEach(zone => {
              if (zone.bins && Array.isArray(zone.bins)) {
                rawBins = [...rawBins, ...zone.bins];
              }
            });

            // Keep only unique bins to prevent duplicate key errors
            const uniqueBins = Array.from(new Map(rawBins.map(b => [b.id, b])).values());
            setBins(uniqueBins);
          }

          // 2. Fetch ALL Reports 
          // (Since getZoneTrackingData omits pending reports that aren't assigned to a truck yet)
          let reportsResponse = await mobileService.getUserReportHistory().catch(() => null);
          
          // Fallback if getUserReportHistory isn't responding
          if (!reportsResponse || !reportsResponse.success) {
             reportsResponse = await mobileService.getAllReports().catch(() => null);
          }

          if (reportsResponse && reportsResponse.success && reportsResponse.reports) {
            // Filter pending and standardize the object keys so Mapbox can read them
            const pendingReports = reportsResponse.reports
              .filter(r => r.status === 'Pending')
              .map(r => ({
                id: r.report_id,
                lat: r.latitude,
                lng: r.longitude
              }));
              
            setExistingReports(pendingReports);
          }
        } catch (error) {
          console.error("Map Context Error:", error);
        }
      };
      fetchMapData();
    }
  }, [showMap]);

  // --- HANDLERS ---
  const pickImage = async () => {
    setFocusedField('photo');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setCustomAlert({
        visible: true,
        title: "Permission Denied",
        message: "Camera permissions are required to take a photo of the issue.",
        type: "warning",
        confirmText: "OK",
        cancelText: "Close"
      });
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleMapPress = async (e) => {
    const [longitude, latitude] = e.geometry.coordinates;
    const coords = { latitude, longitude };
    
    setLocation(coords);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log("Location permission denied");
        return;
      }

      let response = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      if (response.length > 0) {
        const item = response[0];
        const formattedAddress = `${item.name || ''} ${item.street || ''}, ${item.district || ''}, ${item.city || ''}`.trim();
        setAddress(formattedAddress);
      }
    } catch (error) {
      console.error("Reverse Geocoding Error:", error);
    }
  };

  // --- HANDLE CLICKING A BIN ---
  const handleBinSelect = (bin) => {
    setLocation({ latitude: Number(bin.lat), longitude: Number(bin.lng) });
    setAddress(`Bin: ${bin.address || 'Selected Point'}`);
    
    // Auto-suggest 'overflow' if no issue selected yet
    if (!selectedIssue) {
        setSelectedIssue('overflow');
    }
  };

  const toggleMapType = () => {
    const types = ['standard', 'hybrid'];
    const nextIndex = (types.indexOf(mapType) + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  const handleSubmit = () => {
    if (!selectedIssue || (selectedIssue === 'other' && !otherIssueType.trim()) || !location) {
      setCustomAlert({
        visible: true,
        title: "Incomplete Form",
        message: "Please select an issue, specify type if 'Other', and pin the location.",
        type: "warning",
        confirmText: "OK",
        cancelText: "Close"
      });
      return;
    }

    setCustomAlert({
      visible: true,
      title: "Confirm Submission",
      message: "Are you sure you want to submit this report?",
      type: "info",
      confirmText: "Yes, Submit",
      cancelText: "Cancel",
      onConfirm: () => {
        closeAlert();
        processSubmit();
      }
    });
  };

  const processSubmit = async () => {
    setIsSubmitting(true);

    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (!profileData) {
        setCustomAlert({
          visible: true,
          title: "Session Error",
          message: "User session not found. Please log in again.",
          type: "danger",
          confirmText: "OK",
          cancelText: "Close"
        });
        setIsSubmitting(false);
        return;
      }
      const user = JSON.parse(profileData);

      const dbIssueMapping = {
        missed: 'Missed Pickup',
        overflow: 'Overflowing Bin',
        dumping: 'Illegal Dumping',
        other: 'Other'
      };

      const formData = new FormData();
      formData.append('reporter_id', user.user_id);
      formData.append('issue_type', dbIssueMapping[selectedIssue]);
      formData.append('issue_type_other', selectedIssue === 'other' ? otherIssueType : '');
      formData.append('description', description);
      
      formData.append('location_address', address || "Pinned via Mobile");
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);

      if (image) {
        const filename = image.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('photo', {
          uri: Platform.OS === 'ios' ? image.replace('file://', '') : image,
          name: filename,
          type: type,
        });
      }

      const result = await mobileService.submitCitizenReport(formData);

      if (result.success) {
        // Auto-Navigate to FeedScreen on Success
        const handleSuccessNavigation = () => {
          closeAlert();
          isSuccessNavigating.current = true; // Tell the beforeRemove listener to ignore this navigation
          resetForm();
          // Adjust 'FeedScreen' to match the exact name of your Feed route in AppNavigator if needed
          navigation.navigate('Feed');
        };

        setCustomAlert({
          visible: true,
          title: "Success!",
          message: "Your report has been submitted successfully.",
          type: "success",
          confirmText: "Go to Feed",
          cancelText: "Close",
          onConfirm: handleSuccessNavigation, // If they click the Confirm Button
          onCancel: handleSuccessNavigation   // If they click the Cancel/Close button
        });
      } else {
        setCustomAlert({
          visible: true,
          title: "Submission Failed",
          message: result.message || "Failed to save report.",
          type: "danger",
          confirmText: "OK",
          cancelText: "Close"
        });
      }
    } catch (error) {
      console.error("Submission Error:", error);
      setCustomAlert({
        visible: true,
        title: "Network Error",
        message: "Submission failed. Please check your connection to the server.",
        type: "danger",
        confirmText: "OK",
        cancelText: "Close"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scrollView}
        enableOnAndroid={true}
        extraScrollHeight={140}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 }
        ]}
      >
        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>Report an Issue</Text>
          <Text style={styles.cardSubtitle}>
            Help us improve waste management services by reporting community issues.
          </Text>

          <Text style={styles.sectionLabel}>Issue Type</Text>
          <View style={styles.gridContainer}>
            {issueTypes.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setSelectedIssue(item.id);
                  if (item.id !== 'other') setOtherIssueType('');
                }}
                style={[
                  styles.issueCard,
                  selectedIssue === item.id && {
                    borderColor: item.color,
                    backgroundColor: item.color + '10'
                  }
                ]}
              >
                <item.icon
                  size={28}
                  color={selectedIssue === item.id ? item.color : '#64748b'}
                />
                <Text
                  style={[
                    styles.issueLabel,
                    selectedIssue === item.id && {
                      color: item.color,
                      fontWeight: '700'
                    }
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CONDITIONAL "OTHER" INPUT */}
          {selectedIssue === 'other' && (
            <View style={styles.otherInputContainer}>
              <Text style={styles.sectionLabel}>Specify Issue Type</Text>
              <TextInput
                value={otherIssueType}
                onChangeText={setOtherIssueType}
                placeholder="E.g., Broken bin, Dead animal, etc."
                onFocus={() => setFocusedField('otherType')}
                onBlur={() => setFocusedField(null)}
                style={[
                  styles.singleInput,
                  focusedField === 'otherType' && { borderColor: themeGreen }
                ]}
              />
            </View>
          )}

          <Text style={styles.sectionLabel}>Photo Evidence</Text>
          <TouchableOpacity
            onPress={pickImage}
            style={[
              styles.photoBox,
              focusedField === 'photo' && { borderColor: themeGreen }
            ]}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.preview} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Camera size={40} color="#94a3b8" />
                <Text style={styles.photoActionText}>Take Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Location</Text>
          <TouchableOpacity
            onPress={() => setShowMap(true)}
            style={[
              styles.locationButton,
              location && { borderColor: themeGreen }
            ]}
          >
            <View
              style={[
                styles.pinIconBg,
                { backgroundColor: location ? '#F0F9ED' : '#F8FAFC' }
              ]}
            >
              <MapPin
                size={20}
                color={location ? themeGreen : "#64748b"}
              />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.locationButtonText}>
                {location ? "Location Pinned" : "Pin Location on Map"}
                </Text>
                {address !== '' && (
                    <Text numberOfLines={1} style={styles.addressSnippet}>
                        {address}
                    </Text>
                )}
            </View>
            {location ? (
              <Check size={20} color={themeGreen} />
            ) : (
              <Text style={styles.arrow}>→</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>
            Description <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Provide additional details..."
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
            style={[
              styles.input,
              focusedField === 'description' && { borderColor: themeGreen }
            ]}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitBtn,
              { backgroundColor: isSubmitting ? '#94A3B8' : themeGreen }
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* --- MAP MODAL WITH MAPBOX --- */}
      <Modal visible={showMap} animationType="slide">
        <View style={styles.mapModalContainer}>
          <MapboxGL.MapView
            style={styles.map}
            styleURL={mapType === 'hybrid' ? MapboxGL.StyleURL.SatelliteStreet : MapboxGL.StyleURL.Street}
            onPress={handleMapPress}
            logoEnabled={false}
            attributionEnabled={false}
          >
            <MapboxGL.Camera
              zoomLevel={14}
              centerCoordinate={location ? [location.longitude, location.latitude] : [124.6459, 8.4772]} // CDO Center Fallback
              animationMode="flyTo"
              animationDuration={1000}
            />

            {/* --- RENDER ZONES (POLYGONS) --- */}
            {zonesData.features.length > 0 && (
              <MapboxGL.ShapeSource id="zonesSource" shape={zonesData}>
                <MapboxGL.FillLayer id="zonesFill" style={{ fillColor: ['get', 'color'], fillOpacity: 0.15 }} />
                <MapboxGL.LineLayer id="zonesLine" style={{ lineColor: ['get', 'color'], lineWidth: 2, lineOpacity: 0.6 }} />
              </MapboxGL.ShapeSource>
            )}

            {/* --- RENDER EXISTING REPORTS (RED DOTS) --- */}
            {existingReports.map(report => (
               <MapboxGL.PointAnnotation 
                 key={`rep-${report.id}`} 
                 id={`rep-${report.id}`} 
                 coordinate={[Number(report.lng), Number(report.lat)]}
               >
                  <View style={styles.reportMarker}>
                     <AlertTriangle size={12} color="#fff" />
                  </View>
               </MapboxGL.PointAnnotation>
            ))}

            {/* --- RENDER BINS (CLICKABLE GREEN ICONS) --- */}
            {bins.map((bin) => (
              <MapboxGL.PointAnnotation
                key={`bin-${bin.id}`}
                id={`bin-${bin.id}`}
                coordinate={[Number(bin.lng), Number(bin.lat)]}
                onSelected={() => handleBinSelect(bin)} 
              >
                <View style={styles.binMarkerContainer}>
                  <View style={styles.binMarkerBg}>
                    <Trash2 size={14} color="#1B5E20" />
                  </View>
                </View>
              </MapboxGL.PointAnnotation>
            ))}

            {location && (
              <MapboxGL.PointAnnotation
                id="pinned-location"
                coordinate={[location.longitude, location.latitude]}
              >
                <View style={styles.customPinContainer}>
                  <MapPin size={36} color={themeGreen} fill="#F0F9ED" />
                </View>
              </MapboxGL.PointAnnotation>
            )}
          </MapboxGL.MapView>

          <View style={[styles.mapHeader, { paddingTop: insets.top + 10 }]}>
             <TouchableOpacity
               onPress={() => setShowMap(false)}
               style={styles.mapCloseBtn}
             >
                <X size={24} color="#000" />
             </TouchableOpacity>

             <TouchableOpacity onPress={toggleMapType} style={styles.layerBtn}>
                <Layers size={20} color={themeGreen} />
                <Text style={styles.layerText}>
                  {mapType === 'hybrid' ? 'SATELLITE' : 'STANDARD'}
                </Text>
             </TouchableOpacity>
          </View>

          {/* QUICK LEGEND */}
          <View style={styles.legendContainer}>
             <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#1B5E20' }]} /><Text style={styles.legendText}>Waste Bins</Text></View>
             <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={styles.legendText}>Reports</Text></View>
             <Text style={styles.legendHint}>Tap a bin to report it</Text>
          </View>

          <View style={[styles.mapFooter, { paddingBottom: insets.bottom + 20 }]}>
             {address !== '' && (
                 <View style={styles.addressPreviewContainer}>
                     <Text style={styles.addressPreviewTitle}>Detected Address:</Text>
                     <Text style={styles.addressPreviewText}>{address}</Text>
                 </View>
             )}
             <TouchableOpacity
               onPress={() => setShowMap(false)}
               style={[styles.confirmBtn, { backgroundColor: themeGreen }]}
             >
               <Text style={styles.confirmBtnText}>Confirm Location</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CUSTOM ALERT MODAL */}
      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        confirmText={customAlert.confirmText}
        cancelText={customAlert.cancelText}
        onConfirm={customAlert.onConfirm || closeAlert}
        onCancel={customAlert.onCancel || closeAlert}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E3F3DF' 
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    padding: 15 
  },
  mainCard: { 
    backgroundColor: '#F6FBF6', 
    borderRadius: 25, 
    padding: 20, 
    marginBottom: 20, 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 15 
  },
  cardTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#000' 
  },
  cardSubtitle: { 
    fontSize: 13, 
    color: '#64748b', 
    marginBottom: 15, 
    lineHeight: 18 
  },
  sectionLabel: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#334155', 
    marginBottom: 8, 
    marginTop: 10 
  },
  optional: { 
    fontWeight: '400', 
    color: '#94a3b8' 
  },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    gap: 10 
  },
  issueCard: { 
    width: '48%', 
    height: 85, 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  issueLabel: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#64748b', 
    marginTop: 6 
  },
  otherInputContainer: { 
    marginTop: 10, 
    width: '100%' 
  },
  singleInput: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderRadius: 15, 
    padding: 12, 
    fontSize: 14, 
    color: '#334155', 
    borderColor: '#E2E8F0' 
  },
  photoBox: { 
    width: '100%', 
    height: 180, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    overflow: 'hidden', 
    borderColor: '#E2E8F0' 
  },
  placeholderContainer: { 
    alignItems: 'center' 
  },
  photoActionText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#334155', 
    marginTop: 8 
  },
  preview: { 
    width: '100%', 
    height: '100%' 
  },
  locationButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderRadius: 15, 
    padding: 10, 
    backgroundColor: '#fff', 
    borderColor: '#E2E8F0' 
  },
  pinIconBg: { 
    padding: 8, 
    borderRadius: 10, 
    marginRight: 12 
  },
  locationButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#334155' 
  },
  addressSnippet: {
    fontSize: 10, 
    color: '#64748b', 
    fontWeight: '500'
  },
  arrow: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#cbd5e1' 
  },
  input: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderRadius: 15, 
    padding: 12, 
    height: 100, 
    textAlignVertical: 'top', 
    fontSize: 14, 
    color: '#334155', 
    borderColor: '#E2E8F0' 
  },
  submitBtn: { 
    borderRadius: 15, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 20 
  },
  submitText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '800' 
  },
  mapModalContainer: { 
    flex: 1 
  },
  map: { 
    flex: 1 
  },
  customPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -18 }] 
  },
  mapHeader: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  mapCloseBtn: { 
    backgroundColor: '#fff', 
    padding: 10, 
    borderRadius: 50, 
    elevation: 5 
  },
  layerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 20, 
    gap: 8, 
    elevation: 5 
  },
  layerText: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#1B5E20' 
  },
  mapFooter: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    paddingHorizontal: 20 
  },
  addressPreviewContainer: {
    backgroundColor: 'white', 
    padding: 10, 
    borderRadius: 10, 
    marginBottom: 10, 
    elevation: 5
  },
  addressPreviewTitle: {
    fontSize: 12, 
    fontWeight: '700', 
    color: '#1B5E20'
  },
  addressPreviewText: {
    fontSize: 11, 
    color: '#334155'
  },
  confirmBtn: { 
    paddingVertical: 16, 
    borderRadius: 15, 
    alignItems: 'center', 
    elevation: 10 
  },
  confirmBtnText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '900' 
  },
  // 🔥 MAP MARKER STYLES
  reportMarker: { 
    backgroundColor: '#EF4444', 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#fff', 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 3, 
    elevation: 5 
  },
  binMarkerContainer: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  binMarkerBg: { 
    backgroundColor: '#fff', 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#1B5E20', 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 4, 
    elevation: 6 
  },
  legendContainer: { 
    position: 'absolute', 
    bottom: 120, 
    right: 20, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: 12, 
    borderRadius: 12, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 5 
  },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  legendDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: 8 
  },
  legendText: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: '#334155' 
  },
  legendHint: { 
    fontSize: 9, 
    color: '#64748b', 
    fontStyle: 'italic', 
    marginTop: 4, 
    borderTopWidth: 1, 
    borderTopColor: '#e2e8f0', 
    paddingTop: 4 
  }
});

export default ReportScreen;