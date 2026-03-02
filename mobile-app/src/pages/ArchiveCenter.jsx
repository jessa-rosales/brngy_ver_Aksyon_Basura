import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Platform, FlatList, Image, ActivityIndicator, RefreshControl, TouchableOpacity, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, MapPin, AlertTriangle, CheckCircle2, ChevronLeft, Calendar, X, ArchiveRestore } from 'lucide-react-native';
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

  const ReportCard = ({ item, onImagePress }) => {
    const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
    
    const formatFullDate = (date) => {
        if (!date) return 'Processing...';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
      <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
          <View style={styles.issueRow}>
            <Text style={styles.issueTypeText}>{displayIssue}</Text>
            <View style={styles.archivedBadge}>
              <ArchiveRestore size={12} color="#64748b" />
              <Text style={styles.archivedText}>ARCHIVED</Text>
            </View>
          </View>
          <View style={styles.timeInfo}>
            <Calendar size={12} color="#94a3b8" />
            <Text style={styles.dateText}>Originally Reported: {formatFullDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.imageContainer}>
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
        </View>

        <View style={styles.cardContent}>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.locationText} numberOfLines={2}>{item.location_address}</Text>
          </View>

          {item.description ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerSection, { paddingTop: Platform.OS === 'ios' ? insets.top : 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#1B5E20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archive Center</Text>
        <View style={{width: 24}} /> {/* Spacer to center title */}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 100 }} color="#1B5E20" size="large" />
      ) : (
        <FlatList
          ref={listRef}
          data={archivedReports}
          keyExtractor={(item) => item.report_id.toString()}
          renderItem={({ item }) => <ReportCard item={item} onImagePress={setSelectedImage} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <ArchiveRestore size={48} color="#cbd5e1" style={{ marginBottom: 15 }}/>
                <Text style={styles.emptyText}>No archived reports found.</Text>
            </View>
          }
        />
      )}

      {/* Full Screen Image Modal */}
      <Modal
        visible={!!selectedImage}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' },
  headerSection: { 
    backgroundColor: '#F6FBF6', paddingHorizontal: 20, paddingBottom: 15, 
    borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1B5E20' },
  backBtn: { padding: 5 },
  listContainer: { padding: 15 },
  reportCard: { backgroundColor: '#F6FBF6', borderRadius: 25, marginBottom: 20, elevation: 3, opacity: 0.85 }, // Slight opacity for "archived" look
  cardHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  issueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueTypeText: { fontSize: 18, fontWeight: '900', color: '#64748b' },
  archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  archivedText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  imageContainer: { paddingHorizontal: 15, paddingTop: 10 },
  reportImage: { width: '100%', height: 160, borderRadius: 12, backgroundColor: '#F1F5F9' },
  cardContent: { padding: 15 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 15 },
  locationText: { fontSize: 13, color: '#64748b', fontWeight: '600', flex: 1, lineHeight: 18 },
  descriptionBox: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12 },
  descriptionText: { fontSize: 13, color: '#64748b', fontStyle: 'italic' },
  emptyContainer: { alignItems: 'center', marginTop: 120 },
  emptyText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullScreenImage: { width: '100%', height: '80%' }
});

export default ArchiveCenter;