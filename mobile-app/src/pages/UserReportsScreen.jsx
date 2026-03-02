import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Platform, FlatList, Image, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, MapPin, AlertTriangle, CheckCircle2, Truck, User, Camera, Calendar, X, MoreVertical, Archive, Navigation } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

import CustomAlert from '../components/CustomAlert';

const UserReportsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('My Reports');
  const [selectedImage, setSelectedImage] = useState(null);

  const [customAlert, setCustomAlert] = useState({ 
    visible: false, title: '', message: '', type: 'info', 
    confirmText: 'OK', cancelText: 'Close', onConfirm: null, onCancel: null 
  });
  const closeAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  const fetchReports = async () => {
    try {
      const userData = await AsyncStorage.getItem('userProfile');
      if (!userData) return;
      const user = JSON.parse(userData);

      const result = await mobileService.getUserReportHistory(); 
      
      if (result.success) {
        const myReports = result.reports.filter(r => 
          String(r.reporter_id) === String(user.user_id) || String(r.user_id) === String(user.user_id)
        );
        setReports(myReports);
      }
    } catch (error) {
      console.error("Fetch User Reports Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  useFocusEffect(
    useCallback(() => {
      fetchReports();
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }, [])
  );

  const processArchive = async (reportId) => {
    try {
      const result = await mobileService.archiveReport(reportId);
      if (result.success) {
        setCustomAlert({
          visible: true, title: "Success", message: "Report has been archived.", type: "success",
          confirmText: "OK", onConfirm: () => { closeAlert(); fetchReports(); }
        });
      } else {
        setCustomAlert({
          visible: true, title: "Error", message: "Failed to archive report.", type: "danger",
          confirmText: "OK", onConfirm: closeAlert
        });
      }
    } catch (error) {
      setCustomAlert({
        visible: true, title: "Network Error", message: "Could not connect to server.", type: "danger",
        confirmText: "OK", onConfirm: closeAlert
      });
    }
  };

  // ✅ ADDED: Need Attention Toggle Logic
  const handleAttentionPress = async (reportId) => {
    setReports((prevReports) =>
      prevReports.map((report) => {
        if (report.report_id === reportId) {
          const isCurrentlyActive = report.has_attended === true || report.has_attended === 'true' || report.has_attended === 1 || report.has_attended === 't';
          const currentCount = parseInt(report.attention_count) || 0;
          return {
            ...report,
            has_attended: !isCurrentlyActive,
            attention_count: isCurrentlyActive ? Math.max(0, currentCount - 1) : currentCount + 1,
          };
        }
        return report;
      })
    );

    try {
      const userData = await AsyncStorage.getItem('userProfile');
      if (!userData) return;
      const user = JSON.parse(userData);

      const result = await mobileService.toggleAttention(reportId, user.user_id);
      if (!result || !result.success) {
        fetchReports(); 
      }
    } catch (error) {
      fetchReports(); 
    }
  };

  // ✅ ADDED: Navigate Logic
  const handleNavigate = (item) => {
    if (!item.latitude || !item.longitude) {
      Alert.alert("Error", "Location coordinates not available.");
      return;
    }
    navigation.navigate('LiveMapScreen', {
      focusLocation: {
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
      },
      reportId: item.report_id,
      targetReport: item 
    });
  };

  const filteredReports = reports
    .filter(report => {
      if (activeFilter === 'My Reports') return true;
      return report.status === activeFilter;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const ReportCard = ({ item, onImagePress }) => {
    const fullName = item.reporter_name || "Citizen";
    const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
    
    const [menuVisible, setMenuVisible] = useState(false);
    
    // Date & Time formatting
    const reportDate = new Date(item.created_at);
    const formattedDate = isNaN(reportDate.getTime()) ? 'Processing...' : reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = isNaN(reportDate.getTime()) ? '' : reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const calculateTimeTaken = (start, end) => {
        if (!start || !end) return null;
        const diff = new Date(end) - new Date(start);
        if (isNaN(diff) || diff < 0) return null;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
    };

    const statusStyles = {
      'Pending': { color: '#EF4444', bg: '#FEE2E2', icon: AlertTriangle },
      'In Progress': { color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
      'Resolved': { color: '#10B981', bg: '#D1FAE5', icon: CheckCircle2 }
    };
    const currentStatus = statusStyles[item.status] || statusStyles['Pending'];

    const driverDisplay = item.driver_name && item.driver_name !== 'Assigning Driver...' 
        ? item.driver_name : (item.assigned_team_id ? `Team Assigned (#${item.assigned_team_id})` : 'System User');
        
    const collectorDisplay = item.collector_name && item.collector_name !== 'Pending Collection'
        ? item.collector_name : (item.photo_uploaded_by ? `Collector ID #${item.photo_uploaded_by}` : 'System User');

    const isResolvedOrHasEvidence = Boolean(item.status === 'Resolved' || item.resolved_photo_url || item.photo_uploaded_by);
    const canArchive = Boolean(item.status === 'Pending' || item.status === 'Resolved');
    
    // Attention data parsing
    const isAttended = Boolean(item.has_attended === true || item.has_attended === 'true' || item.has_attended === 1 || item.has_attended === 't');
    const attentionCount = parseInt(item.attention_count) || 0;

    const handleArchiveClick = () => {
      setMenuVisible(false);
      setCustomAlert({
        visible: true,
        title: "Archive Report",
        message: "Are you sure you want to move this report to the archives?",
        type: "warning",
        confirmText: "Yes, Archive",
        cancelText: "Cancel",
        onConfirm: () => {
          closeAlert();
          processArchive(item.report_id);
        }
      });
    };

    return (
      <View style={styles.reportCard}>
        {/* ✅ UPDATED: User Profile Header */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarCircle}>
              {item.profile_picture ? (
                <Image
                  source={{ uri: mobileService.getImageUrl(item.profile_picture) }}
                  style={styles.avatarImage}
                />
              ) : (
                <User size={18} color="#94a3b8" />
              )}
            </View>
            <Text style={styles.citizenNameText}>{fullName}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.timeInfo}>
              <Clock size={12} color="#94a3b8" />
              <Text style={styles.dateText}>{formattedTime ? `${formattedDate} • ${formattedTime}` : formattedDate}</Text>
            </View>
            
            {/* 3 Dots Menu Button aligned correctly next to time */}
            {canArchive ? (
              <TouchableOpacity 
                style={{ padding: 4, marginLeft: 8 }} 
                onPress={() => setMenuVisible(!menuVisible)}
              >
                <MoreVertical size={20} color="#64748b" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Dropdown Menu for Archive */}
        {menuVisible ? (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleArchiveClick}>
              <Archive size={16} color="#EF4444" />
              <Text style={styles.dropdownItemText}>Archive</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ✅ UPDATED: Full Width Image */}
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => onImagePress(mobileService.getImageUrl(item.photo_evidence_url || item.photo_url) || 'https://via.placeholder.com/400x250')}
        >
          <Image
            source={{ uri: mobileService.getImageUrl(item.photo_evidence_url || item.photo_url) || 'https://via.placeholder.com/400x250' }}
            style={styles.reportImage}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <View style={styles.cardContent}>
          {/* ✅ UPDATED: Issue Type & Status below the image */}
          <View style={styles.issueRow}>
            <Text style={styles.issueTypeText}>{displayIssue}</Text>
            <View style={[styles.statusBadgeSmall, { backgroundColor: currentStatus.bg }]}>
              <currentStatus.icon size={12} color={currentStatus.color} />
              <Text style={[styles.statusTextSmall, { color: currentStatus.color }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.locationText} numberOfLines={2}>{item.location_address}</Text>
          </View>

          {Boolean(item.description) ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Description:</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          ) : null}

          {/* STATUS VIEWS */}
          {item.status === 'In Progress' ? (
            <View style={styles.progressBox}>
              <Text style={styles.progressTitle}>Dispatch Status</Text>
              <View style={styles.teamRow}>
                <Truck size={16} color="#F59E0B" />
                <Text style={styles.teamText}>Assigned Driver: <Text style={{fontWeight: '700'}}>{driverDisplay}</Text></Text>
              </View>
            </View>
          ) : null}

          {isResolvedOrHasEvidence ? (
            <View style={styles.resolvedBox}>
              <View style={styles.resolvedHeaderRow}>
                  <Text style={styles.resolvedTitle}>Resolution Details</Text>
                  <View style={styles.responseBadge}>
                    <Clock size={10} color="#059669" />
                    <Text style={styles.resolvedTime}>
                      {item.resolved_at ? `Took: ${calculateTimeTaken(item.created_at, item.resolved_at)}` : 'Pending Time Sync'}
                    </Text>
                  </View>
              </View>
              
              <View style={styles.teamRow}>
                <Truck size={16} color="#10B981" />
                <Text style={styles.teamText}>Driver: <Text style={{fontWeight: '700'}}>{driverDisplay}</Text></Text>
              </View>
              
              <View style={styles.teamRow}>
                <User size={16} color="#10B981" />
                <Text style={styles.teamText}>Collector: <Text style={{fontWeight: '700'}}>{collectorDisplay}</Text></Text>
              </View>

              <View style={styles.evidenceSection}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                  <Camera size={14} color="#10B981" />
                  <Text style={styles.evidenceLabel}>Cleared Area Evidence:</Text>
                </View>
                {item.resolved_photo_url ? (
                    <TouchableOpacity 
                        activeOpacity={0.8} 
                        onPress={() => onImagePress(mobileService.getImageUrl(item.resolved_photo_url))}
                    >
                        <Image
                          source={{ uri: mobileService.getImageUrl(item.resolved_photo_url) }}
                          style={styles.resolvedImage}
                          resizeMode="cover"
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.noPhotoBox}>
                        <ActivityIndicator color="#10B981" />
                        <Text style={styles.noPhotoText}>Photo processing...</Text>
                    </View>
                )}
                <Text style={styles.resolvedTimeBottom}>
                  {item.resolved_at ? `Resolved on ${formatFullDate(item.resolved_at)}` : 'Awaiting Driver Confirmation'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ✅ ADDED: Card Actions Row (Need Attention & Navigate) */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.attentionBtn,
              isAttended && styles.attentionBtnActive
            ]}
            onPress={() => handleAttentionPress(item.report_id)}
          >
            <AlertTriangle
              size={18}
              color={isAttended ? "#FFFFFF" : "#EF4444"}
            />
            <Text style={[
              styles.attentionText,
              isAttended && styles.attentionTextActive
            ]}>
              {isAttended ? 'Attended' : 'Need Attention'} {attentionCount > 0 ? `(${attentionCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navigateBtnSmall}
            onPress={() => handleNavigate(item)}
          >
            <Navigation size={18} color="#fff" />
            <Text style={styles.navigateTextSmall}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerSection, { paddingTop: Platform.OS === 'ios' ? insets.top : 15 }]}>
        <Text style={styles.headerTitle}>My Report History</Text>
        <View style={styles.filterContainer}>
          {['My Reports', 'Pending', 'In Progress', 'Resolved'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[styles.filterTab, activeFilter === tab && styles.activeTab]}
            >
              <Text style={[styles.filterTabText, activeFilter === tab && styles.activeTabText]}>
                {tab === 'My Reports' ? 'All' : tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 100 }} color="#1B5E20" size="large" />
      ) : (
        <FlatList
          ref={listRef}
          data={filteredReports}
          keyExtractor={(item) => item.report_id.toString()}
          renderItem={({ item }) => <ReportCard item={item} onImagePress={setSelectedImage} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>You haven't made any reports yet.</Text>}
        />
      )}

      {Boolean(selectedImage) ? (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.modalBackground}>
            <TouchableOpacity 
              style={[styles.closeButton, { top: Platform.OS === 'ios' ? insets.top + 10 : 20 }]} 
              onPress={() => setSelectedImage(null)}
            >
              <X size={30} color="#FFFFFF" />
            </TouchableOpacity>
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage} 
              resizeMode="contain" 
            />
          </View>
        </Modal>
      ) : null}

      <CustomAlert 
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        confirmText={customAlert.confirmText}
        cancelText={customAlert.cancelText}
        onConfirm={customAlert.onConfirm || closeAlert}
        onCancel={closeAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' },
  headerSection: { backgroundColor: '#F6FBF6', paddingHorizontal: 20, paddingBottom: 15, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1B5E20', marginBottom: 15 },
  filterContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 15, padding: 5 },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#1B5E20' },
  filterTabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#fff' },
  listContainer: { padding: 15 },
  
  // ✅ UPDATED REPORT CARD STYLES
  reportCard: { backgroundColor: '#F6FBF6', borderRadius: 25, marginBottom: 20, elevation: 3, overflow: 'hidden' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 2 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  citizenNameText: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  
  reportImage: { width: '100%', height: 230, backgroundColor: '#F1F5F9' },
  
  cardContent: { padding: 15, paddingBottom: 10 }, 
  issueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueTypeText: { fontSize: 18, fontWeight: '900', color: '#0F172A', flex: 1 },
  statusBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusTextSmall: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  dropdownMenu: {
    position: 'absolute',
    top: 55, // Adjusted to sit nicely below the header dots
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 100, 
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    gap: 8,
  },
  dropdownItemText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },

  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 12 },
  locationText: { fontSize: 13, color: '#475569', fontWeight: '600', flex: 1, lineHeight: 18 },
  
  descriptionBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 15, borderLeftWidth: 4, borderLeftColor: '#CBD5E1', marginBottom: 15 },
  descriptionLabel: { fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 2, textTransform: 'uppercase' },
  descriptionText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  
  // ✅ NEW BUTTON STYLES
  cardActionsRow: { flexDirection: 'row', padding: 15, paddingTop: 0, gap: 10 },
  attentionBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF' },
  attentionBtnActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  attentionText: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
  attentionTextActive: { color: '#FFF' },
  navigateBtnSmall: { flex: 0.7, backgroundColor: '#1B5E20', height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 2 },
  navigateTextSmall: { color: '#fff', fontSize: 14, fontWeight: '800' },

  progressBox: { backgroundColor: '#FEF3C7', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 15 },
  progressTitle: { fontSize: 12, fontWeight: '800', color: '#D97706', marginBottom: 8, textTransform: 'uppercase' },
  
  resolvedBox: { backgroundColor: '#ECFDF5', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 15 },
  resolvedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resolvedTitle: { fontSize: 12, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  responseBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(5, 150, 105, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  resolvedTime: { fontSize: 10, color: '#059669', fontWeight: '800' },
  teamRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  teamText: { fontSize: 13, color: '#334155' },
  evidenceSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#D1FAE5' },
  evidenceLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginLeft: 5, textTransform: 'uppercase' },
  resolvedImage: { width: '100%', height: 180, borderRadius: 12, marginTop: 5, backgroundColor: '#E2E8F0' },
  resolvedTimeBottom: { fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 8, fontStyle: 'italic' },
  noPhotoBox: { width: '100%', height: 100, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  noPhotoText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#64748b', fontWeight: '700' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullScreenImage: { width: '100%', height: '80%' }
});

export default UserReportsScreen;