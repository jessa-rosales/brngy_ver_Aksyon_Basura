import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform, StatusBar } from 'react-native';
// 1. Remove SafeAreaView from 'react-native'
import { ChevronDown, MapPin, Truck, Clock, CheckCircle2, AlertCircle, Camera, Navigation, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
// 2. Import SafeAreaView from 'react-native-safe-area-context'
import { SafeAreaView } from 'react-native-safe-area-context';

const TrackScreen = ({ navigation }) => {
  const [selectedZone, setSelectedZone] = useState("Nazareth - Zone 1");
  const [modalVisible, setModalVisible] = useState(false);

  // Mock Data
  const zones = ["Nazareth - Zone 1", "Macasandig - Zone 4", "Carmen - Zone 2"];
  const collectionPoints = [
    { id: 1, street: "12th Street, Nazareth", status: "Collected", time: "8:30 AM", hasPhoto: true, collector: "Juan Dela Cruz" },
    { id: 2, street: "21st Street, Nazareth", status: "Collected", time: "8:45 AM", hasPhoto: true, collector: "Pedro Penduko" },
    { id: 3, street: "Ramonal Village", status: "Pending", time: "-", hasPhoto: false },
    { id: 4, street: "Fernandez St.", status: "Missed", time: "-", hasPhoto: false },
  ];

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setModalVisible(false);
  };

  return (
    // 3. Use the updated SafeAreaView here
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#E3F3DF" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER & DROPDOWN --- */}
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Waste Monitoring</Text>
          <Text style={styles.subTitle}>Select a zone to view active trucks</Text>
          
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MapPin size={20} color="#3B82F6" style={{marginRight: 10}} />
                <Text style={styles.dropdownText}>{selectedZone}</Text>
            </View>
            <ChevronDown size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* --- TRUCK DETAILS CARD --- */}
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.truckIconBg}>
                    <Truck size={20} color="#3B82F6" />
                </View>
                <View>
                    <Text style={styles.cardLabel}>Assigned Truck</Text>
                    <Text style={styles.plateNumber}>KAB-8821</Text>
                </View>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>ACTIVE</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Driver</Text>
                    <Text style={styles.detailValue}>Juan Dela Cruz</Text>
                </View>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Last Update</Text>
                    <Text style={styles.detailValue}>2 mins ago</Text>
                </View>
            </View>

            <View style={styles.locationContainer}>
                <MapPin size={16} color="#64748b" style={{ marginTop: 2 }} />
                <Text style={styles.locationText}>Currently near <Text style={{fontWeight: '700', color: '#1e293b'}}>18th-21st Street Intersection</Text></Text>
            </View>

            {/* TRACK ON MAP BUTTON */}
            <TouchableOpacity 
                style={styles.trackMapButton} 
                onPress={() => navigation.navigate('LiveMapScreen')} 
            >
                <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.gradientButton}
                >
                    <Navigation size={18} color="white" />
                    <Text style={styles.trackButtonText}>Track on Map</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>

        {/* --- KPI SECTION --- */}
        <View style={styles.kpiContainer}>
            <View style={[styles.kpiBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Trash2 size={24} color="#059669" style={styles.kpiIcon} />
                <Text style={[styles.kpiValue, { color: '#059669' }]}>45</Text>
                <Text style={styles.kpiLabel}>Collected</Text>
            </View>

            <View style={[styles.kpiBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Clock size={24} color="#D97706" style={styles.kpiIcon} />
                <Text style={[styles.kpiValue, { color: '#D97706' }]}>12</Text>
                <Text style={styles.kpiLabel}>Pending</Text>
            </View>

            <View style={[styles.kpiBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <AlertCircle size={24} color="#DC2626" style={styles.kpiIcon} />
                <Text style={[styles.kpiValue, { color: '#DC2626' }]}>2</Text>
                <Text style={styles.kpiLabel}>Missed</Text>
            </View>
        </View>

        {/* --- COLLECTION ZONE / PROOF LIST --- */}
        <Text style={styles.sectionHeader}>Collection Log</Text>
        
        <View style={styles.listContainer}>
            {collectionPoints.map((item) => (
                <View key={item.id} style={styles.listItem}>
                    {/* Status Indicator Line */}
                    <View style={[
                        styles.statusLine, 
                        { backgroundColor: item.status === 'Collected' ? '#10B981' : item.status === 'Pending' ? '#F59E0B' : '#EF4444' }
                    ]} />
                    
                    <View style={styles.listContent}>
                        <View style={styles.listHeader}>
                            <Text style={styles.streetName}>{item.street}</Text>
                            {getStatusIcon(item.status)}
                        </View>
                        
                        {/* Footer with Time and Collector Info */}
                        <View style={styles.listFooter}>
                            <View>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Clock size={12} color="#94a3b8" />
                                    <Text style={styles.timeText}>{item.time !== '-' ? item.time : 'Waiting'}</Text>
                                </View>
                                {item.status === 'Collected' && item.collector && (
                                    <Text style={styles.collectorText}>
                                        Collected By: <Text style={{fontWeight: '600', color: '#475569'}}>{item.collector}</Text>
                                    </Text>
                                )}
                            </View>

                            {item.hasPhoto && (
                                <TouchableOpacity style={styles.viewPhotoButton}>
                                    <Camera size={12} color="#3B82F6" />
                                    <Text style={styles.viewPhotoText}>View Photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            ))}
        </View>

      </ScrollView>

      {/* --- ZONE SELECTOR MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Zone</Text>
                {zones.map((zone) => (
                    <TouchableOpacity 
                        key={zone} 
                        style={[styles.modalItem, selectedZone === zone && styles.modalItemSelected]}
                        onPress={() => handleZoneSelect(zone)}
                    >
                        <Text style={[styles.modalItemText, selectedZone === zone && styles.modalItemTextSelected]}>{zone}</Text>
                        {selectedZone === zone && <CheckCircle2 size={20} color="#3B82F6" />}
                    </TouchableOpacity>
                ))}
            </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

// Helper for Icons
const getStatusIcon = (status) => {
    if (status === 'Collected') return <View style={[styles.statusBadge, {backgroundColor: '#ECFDF5'}]}><Text style={{color: '#059669', fontSize: 10, fontWeight: '700'}}>COLLECTED</Text></View>;
    if (status === 'Pending') return <View style={[styles.statusBadge, {backgroundColor: '#FFFBEB'}]}><Text style={{color: '#D97706', fontSize: 10, fontWeight: '700'}}>PENDING</Text></View>;
    return <View style={[styles.statusBadge, {backgroundColor: '#FEF2F2'}]}><Text style={{color: '#DC2626', fontSize: 10, fontWeight: '700'}}>MISSED</Text></View>;
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E3F3DF' 
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 40 
  },
  
  // Header
  headerSection: { 
    marginBottom: 20 
  },
  screenTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1e293b' 
  },
  subTitle: { 
    fontSize: 14, 
    color: '#64748b', 
    marginTop: 4, 
    marginBottom: 15 
  },
  dropdownButton: {
    backgroundColor: '#F6FBF6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05,
  },
  dropdownText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1e293b' 
  },

  // Card
  card: {
    backgroundColor: '#F6FBF6',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 4,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  truckIconBg: { 
    backgroundColor: '#EFF6FF', 
    padding: 10, 
    borderRadius: 12, 
    marginRight: 12 
  },
  cardLabel: { 
    fontSize: 12, 
    color: '#64748b', 
    fontWeight: '500' 
  },
  plateNumber: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1e293b' 
  },
  liveBadge: { 
    marginLeft: 'auto', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ecfdf5', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  liveDot: { 
    width: 6, 
    height: 6, 
    backgroundColor: '#10b981', 
    borderRadius: 3, 
    marginRight: 6 
  },
  liveText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: '#047857' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#f1f5f9', 
    marginBottom: 15 
  },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15 
  },
  detailItem: {
    // You can add styles here if needed
  },
  detailLabel: { 
    fontSize: 12, 
    color: '#94a3b8' 
  },
  detailValue: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1e293b', 
    marginTop: 2 
  },
  locationContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#f8fafc', 
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
  trackMapButton: { 
    overflow: 'hidden', 
    borderRadius: 12 
  },
  gradientButton: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 14 
  },
  trackButtonText: { 
    color: 'white', 
    fontWeight: '700', 
    marginLeft: 8, 
    fontSize: 15 
  },

  // KPI
  kpiContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 25 
  },
  kpiBox: { 
    flex: 1, 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 16, 
    marginHorizontal: 4, 
    borderWidth: 1 
  },
  kpiIcon: { 
    marginBottom: 8 
  },
  kpiValue: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginBottom: 2 
  },
  kpiLabel: { 
    fontSize: 12, 
    color: '#64748b', 
    fontWeight: '500' 
  },

  // List
  sectionHeader: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginBottom: 15 
  },
  listContainer: { 
    paddingBottom: 20 
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#F6FBF6',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statusLine: { 
    width: 6 
  },
  listContent: { 
    flex: 1, 
    padding: 15 
  },
  listHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  streetName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#334155' 
  },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 6 
  },
  listFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  timeText: { 
    fontSize: 12, 
    color: '#94a3b8', 
    marginLeft: 6 
  },
  collectorText: { 
    fontSize: 11, 
    color: '#94a3b8', 
    marginTop: 4, 
    marginLeft: 0 
  },
  viewPhotoButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  viewPhotoText: { 
    fontSize: 11, 
    color: '#3B82F6', 
    fontWeight: '600', 
    marginLeft: 6 
  },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 25, 
    borderTopRightRadius: 25, 
    padding: 25 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 20, 
    color: '#1e293b', 
    textAlign: 'center' 
  },
  modalItem: { 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  modalItemSelected: { 
    backgroundColor: '#f8fafc' 
  },
  modalItemText: { 
    fontSize: 16, 
    color: '#475569' 
  },
  modalItemTextSelected: { 
    color: '#3B82F6', 
    fontWeight: '700' 
  },
});

export default TrackScreen;