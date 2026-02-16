import React, { 
  useState, 
  useRef, 
  useCallback 
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  TextInput,
  Modal,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; // Added for Address detection
import MapView, { 
  Marker, 
  PROVIDER_GOOGLE 
} from 'react-native-maps';
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

const ReportScreen = () => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  // --- FORM STATE ---
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [otherIssueType, setOtherIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  
  // --- MAP STATE ---
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState(null); 
  const [address, setAddress] = useState(''); // New state for auto-address
  const [mapType, setMapType] = useState('standard'); 
  
  const themeGreen = '#1B5E20';

  const issueTypes = [
    { id: 'missed', label: 'Missed Pickup', icon: Truck, color: '#1B5E20' },
    { id: 'overflow', label: 'Overflowing', icon: Trash2, color: '#F97316' },
    { id: 'dumping', label: 'Illegal Dumping', icon: AlertTriangle, color: '#EF4444' },
    { id: 'other', label: 'Other Issue', icon: HelpCircle, color: '#EAB308' },
  ];

  useFocusEffect(
    useCallback(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToPosition(0, 0, false);
      }
    }, [])
  );

  // --- HANDLERS ---
  const pickImage = async () => {
    setFocusedField('photo'); 
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permissions are required.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Updated to include Reverse Geocoding
  const handleMapPress = async (e) => {
    const coords = e.nativeEvent.coordinate;
    setLocation(coords);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log("Location permission denied");
        return;
      }

      // Reverse Geocoding: Coords -> Address
      let response = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      if (response.length > 0) {
        const item = response[0];
        // Format the address into a single string
        const formattedAddress = `${item.name || ''} ${item.street || ''}, ${item.district || ''}, ${item.city || ''}`.trim();
        setAddress(formattedAddress);
      }
    } catch (error) {
      console.error("Reverse Geocoding Error:", error);
    }
  };

  const toggleMapType = () => {
    const types = ['standard', 'hybrid']; 
    const nextIndex = (types.indexOf(mapType) + 1) % types.length;
    setMapType(types[nextIndex]);
  };

// --- Updated handleSubmit Logic ---
const handleSubmit = async () => {
  // 1. Validation
  if (!selectedIssue || (selectedIssue === 'other' && !otherIssueType.trim()) || !location) {
    Alert.alert("Error", "Please select an issue, specify type if 'Other', and pin the location.");
    return;
  }

  try {
    // 2. Get User Info from Storage
    const profileData = await AsyncStorage.getItem('userProfile');
    if (!profileData) {
      Alert.alert("Error", "User session not found. Please log in again.");
      return;
    }
    const user = JSON.parse(profileData);

    // 3. Map Frontend IDs to Backend ENUM values
    const dbIssueMapping = {
      missed: 'Missed Pickup',
      overflow: 'Overflowing Bin',
      dumping: 'Illegal Dumping',
      other: 'Other'
    };

    // 4. Construct FormData
    const formData = new FormData();
    formData.append('reporter_id', user.user_id);
    formData.append('issue_type', dbIssueMapping[selectedIssue]);
    formData.append('issue_type_other', selectedIssue === 'other' ? otherIssueType : '');
    formData.append('description', description);
    
    // Updated: Send the detected address instead of static text
    formData.append('location_address', address || "Pinned via Mobile");
    formData.append('latitude', location.latitude);
    formData.append('longitude', location.longitude);

    // 5. Handle Image Attachment
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

    // 6. Send to Service
    const result = await mobileService.submitCitizenReport(formData);

    if (result.success) {
      Alert.alert("Success", "Report Submitted successfully!");
      
      // 7. Reset Form
      setSelectedIssue(null);
      setOtherIssueType('');
      setDescription('');
      setImage(null);
      setLocation(null);
      setAddress(''); 
    } else {
      Alert.alert("Error", result.message || "Failed to save report.");
    }
  } catch (error) {
    console.error("Submission Error:", error);
    Alert.alert("Error", "Submission failed. Please check your connection to the server.");
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
                {/* Display Address Snippet in Main UI */}
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
            style={[
              styles.submitBtn, 
              { backgroundColor: themeGreen }
            ]} 
          >
            <Text style={styles.submitText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* --- MAP MODAL --- */}
      <Modal visible={showMap} animationType="slide">
        <View style={styles.mapModalContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            mapType={mapType}
            onPress={handleMapPress}
            style={styles.map}
            initialRegion={{
              latitude: 8.4772, 
              longitude: 124.6459,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {location && (
              <Marker coordinate={location} pinColor={themeGreen} />
            )}
          </MapView>

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

          <View style={[styles.mapFooter, { paddingBottom: insets.bottom + 20 }]}>
             {/* Address Preview in Modal */}
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
  }
});

export default ReportScreen;