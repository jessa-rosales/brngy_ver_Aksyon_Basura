import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Platform, FlatList, Image, ActivityIndicator, RefreshControl, Alert, TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, MapPin, AlertTriangle, CheckCircle2, Truck, User, Camera, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

const UserReportsScreen = () => {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('My Reports');

  const fetchReports = async () => {
    try {
      const userData = await AsyncStorage.getItem('userProfile');
      if (!userData) return;
      const user = JSON.parse(userData);

      // Using the new service function we discussed
      const result = await mobileService.getUserReportHistory(); 
      
      if (result.success) {
        // ✅ Updated to check both reporter_id and user_id just in case
        // ✅ Use reporter_id based on your SQL schema
      const myReports = result.reports.filter(r => 
        String(r.reporter_id) === String(user.user_id)
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

  // ✅ 2. FILTER BY TAB AND SORT NEWEST TO OLDEST
  const filteredReports = reports
    .filter(report => {
      if (activeFilter === 'My Reports') return true;
      return report.status === activeFilter;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const ReportCard = ({ item }) => {
    const displayIssue = item.issue_type === 'Other' ? item.issue_type_other : item.issue_type;
    
    // Formatting Timestamps helper
    const formatFullDate = (date) => {
        if (!date) return 'Processing...';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
               ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // ⏱️ NEW: Calculate total time taken to resolve
    const calculateTimeTaken = (start, end) => {
        if (!start || !end) return null;
        const diff = new Date(end) - new Date(start);
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

    return (
      <View style={styles.reportCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.issueRow}>
            <Text style={styles.issueTypeText}>{displayIssue}</Text>
            <View style={[styles.statusBadgeSmall, { backgroundColor: currentStatus.bg }]}>
              <currentStatus.icon size={12} color={currentStatus.color} />
              <Text style={[styles.statusTextSmall, { color: currentStatus.color }]}>{item.status}</Text>
            </View>
          </View>
          <View style={styles.timeInfo}>
            <Calendar size={12} color="#94a3b8" />
            <Text style={styles.dateText}>Reported: {formatFullDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Initial Reported Photo (The "Before" image) */}
        <View style={styles.imageContainer}>
          <Text style={styles.imageLabel}>Reported Issue Photo:</Text>
          <Image
            source={{ uri: mobileService.getImageUrl(item.photo_evidence_url || item.photo_url) || 'https://via.placeholder.com/400x250' }}
            style={styles.reportImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.locationText} numberOfLines={2}>{item.location_address}</Text>
          </View>

          {item.description ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Your Description:</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          ) : null}

          {/* ✅ IN PROGRESS VIEW (Shows assigned driver) */}
          {item.status === 'In Progress' && (
            <View style={styles.progressBox}>
              <Text style={styles.progressTitle}>Dispatch Status</Text>
              <View style={styles.teamRow}>
                <Truck size={16} color="#F59E0B" />
                <Text style={styles.teamText}>Assigned Driver: <Text style={{fontWeight: '700'}}>{item.driver_name || 'En Route'}</Text></Text>
              </View>
            </View>
          )}

          {/* ✅ RESOLVED VIEW (Shows Correct After Photo, Driver, Collector & Timestamps) */}
          {item.status === 'Resolved' && (
            <View style={styles.resolvedBox}>
              <View style={styles.resolvedHeaderRow}>
                  <Text style={styles.resolvedTitle}>Resolution Details</Text>
                  <View style={styles.responseBadge}>
                    <Clock size={10} color="#059669" />
                    <Text style={styles.resolvedTime}>Took: {calculateTimeTaken(item.created_at, item.resolved_at)}</Text>
                  </View>
              </View>
              
              <View style={styles.teamRow}>
                <Truck size={16} color="#10B981" />
                <Text style={styles.teamText}>Driver: <Text style={{fontWeight: '700'}}>{item.driver_name || 'System User'}</Text></Text>
              </View>
              
              <View style={styles.teamRow}>
                <User size={16} color="#10B981" />
                <Text style={styles.teamText}>Collector: <Text style={{fontWeight: '700'}}>{item.collector_name || 'System User'}</Text></Text>
              </View>

              <View style={styles.evidenceSection}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                  <Camera size={14} color="#10B981" />
                  <Text style={styles.evidenceLabel}>Cleared Area Evidence:</Text>
                </View>
                {item.resolved_photo_url ? (
                    <Image
                      source={{ uri: mobileService.getImageUrl(item.resolved_photo_url) }}
                      style={styles.resolvedImage}
                      resizeMode="cover"
                    />
                ) : (
                    <View style={styles.noPhotoBox}>
                        <ActivityIndicator color="#10B981" />
                        <Text style={styles.noPhotoText}>Photo processing...</Text>
                    </View>
                )}
                <Text style={styles.resolvedTimeBottom}>Resolved on {formatFullDate(item.resolved_at)}</Text>
              </View>
            </View>
          )}
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
          renderItem={({ item }) => <ReportCard item={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>You haven't made any reports yet.</Text>}
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
  filterTabText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#fff' },
  listContainer: { padding: 15 },
  reportCard: { backgroundColor: '#F6FBF6', borderRadius: 25, marginBottom: 20, overflow: 'hidden', elevation: 3 },
  cardHeader: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  issueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueTypeText: { fontSize: 18, fontWeight: '900', color: '#0F172A', flex: 1 },
  statusBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusTextSmall: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  imageContainer: { paddingHorizontal: 15, paddingTop: 10 },
  imageLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase' },
  reportImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F1F5F9' },
  cardContent: { padding: 15 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 15 },
  locationText: { fontSize: 13, color: '#475569', fontWeight: '600', flex: 1, lineHeight: 18 },
  descriptionBox: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginBottom: 15 },
  descriptionLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 4, textTransform: 'uppercase' },
  descriptionText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  progressBox: { backgroundColor: '#FEF3C7', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#FDE68A' },
  progressTitle: { fontSize: 12, fontWeight: '800', color: '#D97706', marginBottom: 8, textTransform: 'uppercase' },
  resolvedBox: { backgroundColor: '#ECFDF5', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#A7F3D0' },
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
  emptyText: { textAlign: 'center', marginTop: 100, color: '#64748b', fontWeight: '700' }
});

export default UserReportsScreen;