import React, {
  useRef,
  useCallback,
  useState,
  useEffect
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  User,
  Clock,
  MapPin,
  AlertTriangle,
  Navigation,
  CheckCircle2
} from 'lucide-react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

// ✅ Extracted ReportCard outside to prevent state resets and improve performance
const ReportCard = ({ item, onAttentionPress, onNavigate }) => {
  // Add state to track image loading
  const [isImageLoading, setIsImageLoading] = useState(true);

  const fullName = item.reporter_name || "Citizen";
  const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
  const reportDate = new Date(item.created_at);
  const formattedDate = reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const isAttended =
    item.has_attended === true ||
    item.has_attended === 'true' ||
    item.has_attended === 1 ||
    item.has_attended === 't';

  const statusStyles = {
    'Pending': { color: '#EF4444', bg: '#FEE2E2', icon: AlertTriangle },
    'In Progress': { color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
    'Resolved': { color: '#10B981', bg: '#D1FAE5', icon: CheckCircle2 }
  };
  const currentStatus = statusStyles[item.status] || statusStyles['Pending'];

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
          <Text style={styles.dateText}>{`${formattedDate} • ${formattedTime}`}</Text>
        </View>
      </View>

      {/* ✅ Image Wrapper with Loading Overlay */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: mobileService.getImageUrl(item.photo_evidence_url) || 'https://via.placeholder.com/400x250' }}
          style={styles.reportImage}
          resizeMode="cover"
          onLoadStart={() => setIsImageLoading(true)}
          onLoadEnd={() => setIsImageLoading(false)}
        />
        {isImageLoading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.issueRow}>
          <Text style={styles.issueTypeText}>{displayIssue}</Text>
          <View style={[styles.statusBadgeSmall, { backgroundColor: currentStatus.bg }]}>
            <currentStatus.icon size={12} color={currentStatus.color} />
            <Text style={[styles.statusTextSmall, { color: currentStatus.color }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={14} color="#64748b" />
          <Text style={styles.locationText} numberOfLines={1}>{item.location_address}</Text>
        </View>

        {item.description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardActionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.attentionBtn,
            isAttended && styles.attentionBtnActive
          ]}
          onPress={() => onAttentionPress(item.report_id)}
        >
          <AlertTriangle
            size={18}
            color={isAttended ? "#FFFFFF" : "#EF4444"}
          />
          <Text style={[
            styles.attentionText,
            isAttended && styles.attentionTextActive
          ]}>
            {isAttended ? 'Attended' : 'Need Attention'} {item.attention_count > 0 ? `(${item.attention_count})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navigateBtnSmall}
          onPress={() => onNavigate(item)}
        >
          <Navigation size={18} color="#fff" />
          <Text style={styles.navigateTextSmall}>Navigate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FeedScreen = () => {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const navigation = useNavigation();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Pending');

  const fetchReports = async () => {
    try {
      const result = await mobileService.getAllReports();
      if (result.success) {
        setReports(result.reports);
      }
    } catch (error) {
      console.error("Fetch Reports Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

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

  const handleAttentionPress = async (reportId) => {
    // 1. Optimistic UI Change
    setReports((prevReports) =>
      prevReports.map((report) => {
        if (report.report_id === reportId) {
          const isCurrentlyActive =
            report.has_attended === true ||
            report.has_attended === 'true' ||
            report.has_attended === 1 ||
            report.has_attended === 't';
          return {
            ...report,
            has_attended: !isCurrentlyActive,
            attention_count: isCurrentlyActive
              ? parseInt(report.attention_count || 0) - 1
              : parseInt(report.attention_count || 0) + 1,
          };
        }
        return report;
      })
    );

    // 2. Background Sync
    try {
      const userData = await AsyncStorage.getItem('userProfile');
      if (!userData) return;
      const user = JSON.parse(userData);

      const result = await mobileService.toggleAttention(reportId, user.user_id);

      if (!result || !result.success) {
        fetchReports(); // Rollback if server fails
      }
    } catch (error) {
      fetchReports(); // Rollback on network error
    }
  };

  const filteredReports = reports
    .filter(report => report.status === activeFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <View style={styles.container}>
      <View style={[styles.headerSection, { paddingTop: Platform.OS === 'ios' ? insets.top : 15 }]}>
        <Text style={styles.headerTitle}>Community Feed</Text>
        <View style={styles.filterContainer}>
          {['Pending', 'In Progress', 'Resolved'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[styles.filterTab, activeFilter === tab && styles.activeTab]}
            >
              <Text style={[styles.filterTabText, activeFilter === tab && styles.activeTabText]}>
                {tab}
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
          // ✅ Passing the necessary functions as props to our extracted component
          renderItem={({ item }) => (
            <ReportCard 
              item={item} 
              onAttentionPress={handleAttentionPress}
              onNavigate={handleNavigate}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No reports found.</Text>}
        />
      )}
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
  filterTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#fff' },
  listContainer: { padding: 15 },
  reportCard: { backgroundColor: '#F6FBF6', borderRadius: 25, marginBottom: 20, overflow: 'hidden', elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  citizenNameText: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  
  // ✅ New Styles for Image Loading
  imageWrapper: { width: '100%', height: 230, backgroundColor: '#F1F5F9', position: 'relative' },
  reportImage: { width: '100%', height: '100%' },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 12, color: '#64748b', fontWeight: '600' },
  
  cardContent: { padding: 15 },
  issueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueTypeText: { fontSize: 18, fontWeight: '900', color: '#0F172A', flex: 1 },
  statusBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusTextSmall: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  locationText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  descriptionBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 15, borderLeftWidth: 4, borderLeftColor: '#CBD5E1' },
  descriptionLabel: { fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 2, textTransform: 'uppercase' },
  descriptionText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  cardActionsRow: { flexDirection: 'row', padding: 15, paddingTop: 0, gap: 10 },
  attentionBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF' },
  attentionBtnActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  attentionText: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
  attentionTextActive: { color: '#FFF' },
  navigateBtnSmall: { flex: 0.7, backgroundColor: '#1B5E20', height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 2 },
  navigateTextSmall: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#64748b', fontWeight: '700' }
});

export default FeedScreen;