import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, StatusBar } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Truck, Bell, ChevronLeft, MapPin, Navigation } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const LiveMapScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Mock data
  const truckLocation = { latitude: 8.4772, longitude: 124.6459 };
  const routeCoordinates = [
    { latitude: 8.4750, longitude: 124.6440 },
    { latitude: 8.4765, longitude: 124.6455 },
    { latitude: 8.4772, longitude: 124.6459 },
    { latitude: 8.4790, longitude: 124.6470 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* --- FULL SCREEN MAP --- */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 8.4772,
          longitude: 124.6459,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        customMapStyle={mapStyle}
      >
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#3B82F6" 
          strokeWidth={5}
        />

        {/* Truck Marker */}
        <Marker coordinate={truckLocation}>
          <View style={styles.truckMarker}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.markerGradient}
            >
              <Truck color="white" size={20} />
            </LinearGradient>
            <View style={styles.markerArrow} />
          </View>
        </Marker>

        {/* User Home Marker (Optional) */}
        <Marker coordinate={{ latitude: 8.4790, longitude: 124.6470 }}>
           <View style={styles.homeMarker}>
              <MapPin size={24} color="#EF4444" fill="#EF4444" />
           </View>
        </Marker>
      </MapView>

      {/* --- FLOATING HEADER (Back Button & Zone) --- */}
      <View style={[styles.floatingHeader, { top: Platform.OS === 'ios' ? insets.top : 40 }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        
        <View style={styles.headerTag}>
          <View style={styles.liveDot} />
          <Text style={styles.headerText}>LIVE TRACKING</Text>
        </View>
      </View>

      {/* --- BOTTOM SHEET CARD --- */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.statusCard}>
          <View style={styles.dragHandle} />
          
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.truckId}>Vehicle #1247-CDO</Text>
              <Text style={styles.driverName}>Driver: Juan Luna</Text>
            </View>
            <View style={styles.etaContainer}>
              <Text style={styles.etaTime}>5 mins</Text>
              <Text style={styles.etaLabel}>Away</Text>
            </View>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.locationRow}>
             <Navigation size={16} color="#3B82F6" />
             <Text style={styles.locationText}>Approaching <Text style={{fontWeight: '700', color:'#1e293b'}}>18th St. Intersection</Text></Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#059669' }]}>85%</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#D97706' }]}>12</Text>
              <Text style={styles.statLabel}>Bins Left</Text>
            </View>
            
            <TouchableOpacity activeOpacity={0.9}>
                <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.notifyButton}
                >
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
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  map: { 
    width: width, 
    height: height 
  },
  
  // Floating Header
  floatingHeader: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1,
  },
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },

  // Map Markers
  truckMarker: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  markerGradient: { 
    padding: 10, 
    borderRadius: 25, 
    borderWidth: 3, 
    borderColor: 'white',
    elevation: 5,
  },
  markerArrow: { 
    width: 0, 
    height: 0, 
    backgroundColor: 'transparent', 
    borderStyle: 'solid', 
    borderLeftWidth: 6, 
    borderRightWidth: 6, 
    borderBottomWidth: 10, 
    borderLeftColor: 'transparent', 
    borderRightColor: 'transparent', 
    borderBottomColor: '#2563EB', 
    transform: [{ rotate: '180deg' }], 
    marginTop: -2 
  },
  homeMarker: {
    padding: 5,
  },

  // Bottom Card
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: '#F6FBF6', // Matching your dashboard theme
    borderRadius: 24,
    padding: 20,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  truckId: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1e293b' 
  },
  driverName: { 
    fontSize: 14, 
    color: '#64748b', 
    fontWeight: '500' 
  },
  etaContainer: { 
    alignItems: 'flex-end' 
  },
  etaTime: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#3B82F6' 
  },
  etaLabel: { 
    fontSize: 11, 
    color: '#64748b', 
    fontWeight: '600' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#e2e8f0', 
    marginVertical: 15 
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EFF6FF', 
    padding: 10, 
    borderRadius: 10, 
    marginBottom: 15 
  },
  locationText: { 
    marginLeft: 8, 
    fontSize: 13, 
    color: '#475569', 
    flex: 1 
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  statItem: { 
    alignItems: 'center' 
  },
  statValue: { 
    fontSize: 18, 
    fontWeight: '800' 
  },
  statLabel: { 
    fontSize: 12, 
    color: '#64748b', 
    fontWeight: '500' 
  },
  notifyButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 2
  },
  notifyText: { 
    color: 'white', 
    fontWeight: '700', 
    marginLeft: 8, 
    fontSize: 14 
  },
});

const mapStyle = [
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
]; 

export default LiveMapScreen;