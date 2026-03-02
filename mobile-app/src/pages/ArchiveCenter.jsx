import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Platform, FlatList, Image, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, MapPin, AlertTriangle, CheckCircle2, Calendar, X, ArchiveRestore, Navigation, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

import CustomAlert from '../components/CustomAlert';

const ArchiveCenter = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  const [archivedReports, setArchivedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchArchivedReports = async () => {
    try {
      const userData = await AsyncStorage.getItem('userProfile');
      if (!userData) return;
      const user = JSON.parse(userData);

      const result = await mobileService.getArchivedReports(); 
      
      if (result.success) {
        // Filter strictly to reports belonging to this user
        const myArchived = result.reports.filter(r => 
          String(r.reporter_id) === String(user.user_id) || String(r.user_id) === String(user.user_id)
        );
        setArchivedReports(myArchived);
      }
    } catch (error) {
      console.error("Fetch Archived Reports Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchArchivedReports(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchArchivedReports();
  };

  useFocusEffect(
    useCallback(() => {
      fetchArchivedReports();
    }, [])
  );

  // ✅ BULLETPROOF ATTENTION TOGGLE
  const handleAttentionPress = async (reportId) => {
    // 1. Optimistic UI Update (Instant visual feedback)
    setArchivedReports((prevReports) =>
      prevReports.map((report) => {
        if (report.report_id === reportId) {
          // Safely check current status
          const isCurrentlyActive = report.has_attended === true || report.has_attended === 'true' || report.has_attended === 1 || report.has_attended === 't';
          // Safely parse current count
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

    // 2. Background Sync with Database
    try {
      const userData = await AsyncStorage.getItem('userProfile');
      if (!userData) return;
      const user = JSON.parse(userData);

      const result = await mobileService.toggleAttention(reportId, user.user_id);
      if (!result || !result.success) {
        fetchArchivedReports(); // Rollback if server fails
      }
    } catch (error) {
      fetchArchivedReports(); // Rollback on network error
    }
  };

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

  const ReportCard = ({ item, onImagePress }) => {
    const fullName = item.reporter_name || "Citizen";
    const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
    
    const reportDate = new Date(item.created_at);
    const formattedDate = isNaN(reportDate.getTime()) ? 'Processing...' : reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = isNaN(reportDate.getTime()) ? '' : reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // ✅ SAFE PARSING FOR ATTENTION DATA
    const isAttended = item.has_attended === true || item.has_attended === 'true' || item.has_attended === 1 || item.has_attended === 't';
    const attentionCount = parseInt(item.attention_count) || 0;

    return (
      <View style={styles.reportCard}>
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
          <View style={styles.timeInfo}>
            <Clock size={12} color="#94a3b8" />
            <Text style={styles.dateText}>{formattedTime ? `${formattedDate} • ${formattedTime}` : formattedDate}</Text>
          </View>
        </View>

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
          <View style={styles.issueRow}>
            <Text style={styles.issueTypeText}>{displayIssue}</Text>
            <View style={styles.archivedBadge}>
              <ArchiveRestore size={12} color="#64748b" />
              <Text style={styles.archivedText}>ARCHIVED</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.locationText} numberOfLines={1}>{item.location_address}</Text>
          </View>

          {Boolean(item.description) ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Description:</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardActionsRow}>
          {/* ✅ UPDATED RENDER FOR ATTENTION BUTTON */}
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
      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 100 }} color="#1B5E20" size="large" />
      ) : (
        <FlatList
          ref={listRef}
          data={archivedReports}
          keyExtractor={(item) => item.report_id.toString()}
          renderItem={({ item }) => <ReportCard item={item} onImagePress={setSelectedImage} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.listContainer, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 20, paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <ArchiveRestore size={48} color="#cbd5e1" style={{ marginBottom: 15 }}/>
                <Text style={styles.emptyText}>No archived reports found.</Text>
            </View>
          }
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' },
  listContainer: { padding: 15 },
  reportCard: { backgroundColor: '#F6FBF6', borderRadius: 25, marginBottom: 20, elevation: 3, opacity: 0.95, overflow: 'hidden' }, 
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
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
  
  archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  archivedText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  locationText: { fontSize: 13, color: '#64748b', fontWeight: '600', flex: 1 },
  
  descriptionBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 15, borderLeftWidth: 4, borderLeftColor: '#CBD5E1', marginBottom: 5 },
  descriptionLabel: { fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 2, textTransform: 'uppercase' },
  descriptionText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  
  cardActionsRow: { flexDirection: 'row', padding: 15, paddingTop: 0, gap: 10 },
  attentionBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF' },
  attentionBtnActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  attentionText: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
  attentionTextActive: { color: '#FFF' },
  navigateBtnSmall: { flex: 0.7, backgroundColor: '#1B5E20', height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 2 },
  navigateTextSmall: { color: '#fff', fontSize: 14, fontWeight: '800' },

  emptyContainer: { alignItems: 'center', marginTop: 120 },
  emptyText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullScreenImage: { width: '100%', height: '80%' }
});

export default ArchiveCenter;