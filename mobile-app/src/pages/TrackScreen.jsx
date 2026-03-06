import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform, StatusBar, ActivityIndicator, RefreshControl, Image, Dimensions } from 'react-native';
import { ChevronDown, MapPin, Truck, Clock, CheckCircle2, AlertCircle, Camera, Navigation, Trash2, AlertTriangle, Map as MapIcon, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mobileService } from '../services/mobileService'; 
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

const TrackScreen = ({ navigation }) => {
  const [zonesData, setZonesData] = useState([]);
  
  const [selectedIdentifier, setSelectedIdentifier] = useState({ zone_id: 'all', task_id: null });
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [evidencePhoto, setEvidencePhoto] = useState(null);

  // State to control the Custom Alert
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

  const isToday = (dateString) => {
    if (!dateString) return false;
    const itemDate = new Date(dateString);
    const today = new Date();
    return itemDate.getDate() === today.getDate() &&
           itemDate.getMonth() === today.getMonth() &&
           itemDate.getFullYear() === today.getFullYear();
  };

  // Determines if the timestamp is within the last 5 hours
  const isWithin5Hours = (dateString) => {
    if (!dateString) return false;
    const itemTime = new Date(dateString).getTime();
    const currentTime = new Date().getTime();
    const hoursDiff = (currentTime - itemTime) / (1000 * 60 * 60);
    return hoursDiff <= 5;
  };

  const fetchTrackingData = async () => {
    try {
      const result = await mobileService.getZoneTrackingData();
      if (result && result.success) {
        
        const processedData = result.data.map(zone => ({
            ...zone,
            // Reset old bins to Pending for today's route
            bins: (zone.bins || []).map(bin => ({
                ...bin,
                status: isToday(bin.updated_at) ? bin.status : 'Pending'
            })),
            // FILTER REPORTS: Keep if Pending/In Progress, or if Resolved within the last 5 hours!
            reports: (zone.reports || []).filter(report => {
                if (report.status === 'Resolved') {
                    return isWithin5Hours(report.updated_at);
                }
                return true; 
            })
        }));

        setZonesData(processedData);
      }
    } catch (error) {
      console.error("Fetch Tracking Data Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    const interval = setInterval(fetchTrackingData, 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrackingData();
  }, []);

  const handleZoneSelect = (zone) => {
    setSelectedIdentifier({ zone_id: zone.zone_id, task_id: zone.task_id || null });
    setModalVisible(false);
  };

  const selectedZone = useMemo(() => {
      if (selectedIdentifier.zone_id === 'all') {
          return { zone_id: 'all', zone_name: 'All Zones' };
      }
      
      const found = zonesData.find(z => 
          z.zone_id === selectedIdentifier.zone_id && 
          z.task_id === selectedIdentifier.task_id
      );
      
      if (!found) {
         return zonesData.find(z => z.zone_id === selectedIdentifier.zone_id) || { zone_id: 'all', zone_name: 'All Zones' };
      }
      return found;
  }, [zonesData, selectedIdentifier]);


  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    return `${Math.floor(diffMins / 60)} hrs ago`;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Loading Tracking Data...</Text>
      </SafeAreaView>
    );
  }

  const isAllZones = selectedZone?.zone_id === 'all';
  const bins = isAllZones ? zonesData.flatMap(z => z.bins || []) : (selectedZone?.bins || []);
  const reports = isAllZones ? zonesData.flatMap(z => z.reports || []) : (selectedZone?.reports || []);
  const combinedLog = [...bins, ...reports];

  const collectedCount = combinedLog.filter(item => item.status === 'Collected' || item.status === 'Resolved').length;
  const pendingCount = combinedLog.filter(item => item.status === 'Pending').length;
  const missedCount = combinedLog.filter(item => item.status === 'Missed').length;

  const nextTask = combinedLog.find(item => item.status === 'Pending');
  const currentDestinationText = nextTask ? nextTask.address : 'Route Completed / Standby';

  const getDropdownDisplayName = (zone) => {
      if (!zone) return 'Select Zone';
      if (zone.zone_id === 'all') return 'All Zones';
      return zone.vehicle_name ? `${zone.zone_name} (${zone.vehicle_name})` : zone.zone_name;
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#E3F3DF" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
      >
        
        {/* HEADER & DROPDOWN */}
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Waste Monitoring</Text>
          <Text style={styles.subTitle}>Select a zone to view active trucks</Text>
          
          <TouchableOpacity 
            style={[styles.dropdownButton, zonesData.length === 0 && { opacity: 0.5 }]} 
            onPress={() => setModalVisible(true)}
            disabled={zonesData.length === 0}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                <MapPin size={20} color="#3B82F6" style={{marginRight: 10}} />
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {getDropdownDisplayName(selectedZone)}
                </Text>
            </View>
            <ChevronDown size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!selectedZone ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Truck size={48} color="#94a3b8" opacity={0.5} />
            <Text style={{ color: '#64748b', marginTop: 15, fontWeight: '600' }}>Please select a zone to monitor.</Text>
          </View>
        ) : (
          <>
            {/* DYNAMIC CARD OVERVIEW */}
            <View style={styles.card}>
                {isAllZones ? (
                    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                        <MapIcon size={40} color="#3B82F6" style={{ marginBottom: 10 }} />
                        <Text style={styles.truckId}>City Wide Monitoring</Text>
                        <Text style={[styles.detailLabel, { textAlign: 'center', marginTop: 5 }]}>Viewing all zones, active trucks, and collection points across the city.</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.cardHeader}>
                            <View style={styles.truckIconBg}>
                                <Truck size={20} color="#3B82F6" />
                            </View>
                            <View>
                                <Text style={styles.cardLabel}>Assigned Truck: {selectedZone?.vehicle_name || 'N/A'}</Text>
                                <Text style={styles.plateNumber}>{selectedZone?.plate_number || 'NO TRUCK ASSIGNED'}</Text>
                            </View>
                            {selectedZone?.plate_number && (
                                <View style={styles.liveBadge}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveText}>ACTIVE</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Driver</Text>
                                <Text style={styles.detailValue}>{selectedZone?.driver_name || 'Unassigned'}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Last Update</Text>
                                <Text style={styles.detailValue}>{selectedZone?.last_update ? getTimeAgo(selectedZone.last_update) : '-'}</Text>
                            </View>
                        </View>

                        {selectedZone?.plate_number && (
                            <View style={styles.locationContainer}>
                                <MapPin size={16} color="#64748b" style={{ marginTop: 2 }} />
                                <Text style={styles.locationText}>
                                  Currently near <Text style={{fontWeight: '700', color: '#1e293b'}}>{currentDestinationText}</Text>
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* TRACK ON MAP BUTTON */}
                <TouchableOpacity 
                    style={styles.trackMapButton} 
                    onPress={() => navigation.navigate('LiveMapScreen', { 
                        zoneData: selectedZone,
                        allZonesData: isAllZones ? zonesData : [selectedZone]
                    })} 
                >
                    <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradientButton}>
                        {isAllZones ? <MapIcon size={18} color="white" /> : <Navigation size={18} color="white" />}
                        <Text style={styles.trackButtonText}>{isAllZones ? 'Open Map' : 'Track on Map'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* KPI SECTION */}
            <View style={styles.kpiContainer}>
                <View style={[styles.kpiBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Trash2 size={24} color="#059669" style={styles.kpiIcon} />
                    <Text style={[styles.kpiValue, { color: '#059669' }]}>{collectedCount}</Text>
                    <Text style={styles.kpiLabel}>Collected</Text>
                </View>

                <View style={[styles.kpiBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                    <Clock size={24} color="#D97706" style={styles.kpiIcon} />
                    <Text style={[styles.kpiValue, { color: '#D97706' }]}>{pendingCount}</Text>
                    <Text style={styles.kpiLabel}>Pending</Text>
                </View>

                <View style={[styles.kpiBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <AlertCircle size={24} color="#DC2626" style={styles.kpiIcon} />
                    <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{missedCount}</Text>
                    <Text style={styles.kpiLabel}>Missed</Text>
                </View>
            </View>

            {/* COLLECTION ZONE / PROOF LIST*/}
            <Text style={styles.sectionHeader}>Collection Log</Text>
            
            <View style={styles.listContainer}>
                {combinedLog.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 20 }}>No bins or reports available.</Text>
                ) : (
                    combinedLog.map((item, index) => {
                        const displayStatus = item.status === 'Resolved' ? 'Collected' : item.status;
                        const isReport = item.type === 'report';

                        return (
                            <View key={`log-${item.type}-${item.id || 'new'}-${index}`} style={styles.listItem}>
                                <View style={[
                                    styles.statusLine, 
                                    { backgroundColor: displayStatus === 'Collected' ? '#10B981' : displayStatus === 'Pending' ? '#F59E0B' : '#EF4444' }
                                ]} />
                                
                                <View style={styles.listContent}>
                                    <View style={styles.listHeader}>
                                        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                                            {isReport && <AlertTriangle size={14} color="#DC2626" style={{marginRight: 6}} />}
                                            <Text style={styles.streetName} numberOfLines={1}>{item.address || 'Unknown Location'}</Text>
                                        </View>
                                        {getStatusIcon(displayStatus)}
                                    </View>
                                    
                                    <View style={styles.listFooter}>
                                        <View>
                                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                <Clock size={12} color="#94a3b8" />
                                                <Text style={styles.timeText}>{displayStatus === 'Collected' ? formatTime(item.updated_at) : 'Waiting'}</Text>
                                            </View>
                                            {displayStatus === 'Collected' && item.collector_name && (
                                                <Text style={styles.collectorText}>
                                                    {isReport ? 'Resolved By: ' : 'Collected By: '} 
                                                    <Text style={{fontWeight: '600', color: '#475569'}}>{item.collector_name}</Text>
                                                </Text>
                                            )}
                                        </View>

                                        <TouchableOpacity 
                                            style={[
                                                styles.viewPhotoButton, 
                                                !item.has_photo && { backgroundColor: '#F1F5F9' } 
                                            ]}
                                            onPress={() => {
                                                if (!item.has_photo) {
                                                    setCustomAlert({
                                                      visible: true,
                                                      title: "No Photo Available",
                                                      message: "This location has not been collected yet, or no photo evidence was submitted.",
                                                      type: "info"
                                                    });
                                                    return;
                                                }

                                                const url = item.photo_url || item.evidence_url || item.resolved_photo_url || item.photo || item.evidence_photo;
                                                
                                                if (url && typeof url === 'string') {
                                                    setEvidencePhoto(mobileService.getImageUrl(url));
                                                } else {
                                                    setCustomAlert({
                                                      visible: true,
                                                      title: "Missing URL",
                                                      message: "The app knows a photo exists, but the server didn't send the URL string.",
                                                      type: "warning"
                                                    });
                                                }
                                            }}
                                        >
                                            <Camera size={12} color={item.has_photo ? "#3B82F6" : "#94A3B8"} />
                                            <Text style={[
                                                styles.viewPhotoText, 
                                                !item.has_photo && { color: '#94A3B8' } 
                                            ]}>
                                                View Photo
                                            </Text>
                                        </TouchableOpacity>
                                        
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
          </>
        )}
      </ScrollView>

      {/* --- QUICK REPORT FLOATING BUTTON --- */}
      <TouchableOpacity 
        style={styles.quickReportFab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Report')}
      >
        <AlertTriangle size={26} color="#FFF" />
      </TouchableOpacity>

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
                <ScrollView style={{ maxHeight: 400 }}>
                    <TouchableOpacity 
                        style={[styles.modalItem, selectedIdentifier.zone_id === 'all' && styles.modalItemSelected]}
                        onPress={() => handleZoneSelect({ zone_id: 'all', zone_name: 'All Zones' })}
                    >
                        <Text style={[styles.modalItemText, selectedIdentifier.zone_id === 'all' && styles.modalItemTextSelected]}>All Zones</Text>
                        {selectedIdentifier.zone_id === 'all' && <CheckCircle2 size={20} color="#3B82F6" />}
                    </TouchableOpacity>

                    {Array.from(new Map(zonesData.map(z => [z.zone_id, z])).values()).map((zone, index) => {
                        const isSelected = selectedIdentifier.zone_id === zone.zone_id;
                        
                        return (
                            <TouchableOpacity 
                                key={`unique-zone-${zone.zone_id}`} 
                                style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                                onPress={() => handleZoneSelect(zone)}
                            >
                                <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]} numberOfLines={1}>
                                  {zone.zone_name}
                                </Text>
                                {isSelected && <CheckCircle2 size={20} color="#3B82F6" />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </TouchableOpacity>
      </Modal>

      {/* FULL SCREEN EVIDENCE PHOTO MODAL */}
      <Modal
        visible={!!evidencePhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEvidencePhoto(null)}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setEvidencePhoto(null)}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          {evidencePhoto && (
            <Image 
              source={{ uri: evidencePhoto }} 
              style={styles.fullScreenPhoto} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

      {/* CUSTOM ALERT OVERLAY */}
      <CustomAlert 
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        confirmText="OK"
        cancelText="Close"
        onConfirm={() => setCustomAlert({ ...customAlert, visible: false })}
        onCancel={() => setCustomAlert({ ...customAlert, visible: false })}
      />

    </SafeAreaView>
  );
};

const getStatusIcon = (status) => {
    if (status === 'Collected' || status === 'Resolved') return <View style={[styles.statusBadge, {backgroundColor: '#ECFDF5'}]}><Text style={{color: '#059669', fontSize: 10, fontWeight: '700'}}>COLLECTED</Text></View>;
    if (status === 'Pending') return <View style={[styles.statusBadge, {backgroundColor: '#FFFBEB'}]}><Text style={{color: '#D97706', fontSize: 10, fontWeight: '700'}}>PENDING</Text></View>;
    return <View style={[styles.statusBadge, {backgroundColor: '#FEF2F2'}]}><Text style={{color: '#DC2626', fontSize: 10, fontWeight: '700'}}>MISSED</Text></View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' },
  scrollContent: { padding: 20, paddingBottom: 100 }, // ✅ Increased to ensure bottom log items are visible above the FAB
  headerSection: { marginTop: -15, marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  subTitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 15 },
  dropdownButton: { backgroundColor: '#F6FBF6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  dropdownText: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1 },
  card: { backgroundColor: '#F6FBF6', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  truckIconBg: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 12, marginRight: 12 },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  plateNumber: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  liveBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  liveDot: { width: 6, height: 6, backgroundColor: '#10b981', borderRadius: 3, marginRight: 6 },
  liveText: { fontSize: 10, fontWeight: '700', color: '#047857' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#94a3b8' },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  locationContainer: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginBottom: 15 },
  locationText: { marginLeft: 8, fontSize: 13, color: '#475569', flex: 1 },
  trackMapButton: { overflow: 'hidden', borderRadius: 12 },
  gradientButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
  trackButtonText: { color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 15 },
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  kpiBox: { flex: 1, alignItems: 'center', padding: 15, borderRadius: 16, marginHorizontal: 4, borderWidth: 1 },
  kpiIcon: { marginBottom: 8 },
  kpiValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 15 },
  listContainer: { paddingBottom: 20 },
  listItem: { flexDirection: 'row', backgroundColor: '#F6FBF6', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  statusLine: { width: 6 },
  listContent: { flex: 1, padding: 15 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  streetName: { fontSize: 15, fontWeight: '700', color: '#334155' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  listFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#94a3b8', marginLeft: 6 },
  collectorText: { fontSize: 11, color: '#94a3b8', marginTop: 4, marginLeft: 0 },
  viewPhotoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewPhotoText: { fontSize: 11, color: '#3B82F6', fontWeight: '600', marginLeft: 6 },
  
  // --- ✅ ALIGNED FAB STYLES ---
  quickReportFab: { 
    position: 'absolute', 
    right: 20, 
    bottom: Platform.OS === 'ios' ? 30 : 20, // Places it cleanly above the bottom tabs
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#1B5E20', // Matches your exact App theme color from AppNavigator
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8, 
    shadowColor: '#1B5E20', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 6, 
    zIndex: 100,
    borderWidth: 2,
    borderColor: '#E3F3DF' // Blends with the screen background
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 15, color: '#1e293b', textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemSelected: { backgroundColor: '#f8fafc' },
  modalItemText: { fontSize: 16, color: '#475569', flex: 1 },
  modalItemTextSelected: { color: '#3B82F6', fontWeight: '700' },

  // Photo Modal Styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closePhotoBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25
  },
  fullScreenPhoto: {
    width: width,
    height: '80%'
  }
});

export default TrackScreen;