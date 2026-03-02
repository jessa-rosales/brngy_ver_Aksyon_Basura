import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Image as RNImage,
  Alert,
  RefreshControl, 
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Truck, 
  Calendar, 
  Clock, 
  ShieldCheck,
  CircleDot,
  User,
  RefreshCw,
  Map, 
  Star,
  BellRing,
  Users,
  Timer,
  ArrowDownCircle,
  ChevronRight
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

const ScheduleScreen = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [userProfile, setUserProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchAssignment = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const jsonValue = await AsyncStorage.getItem('userProfile');
      if (!jsonValue) return;
      const currentUser = JSON.parse(jsonValue);
      setUserProfile(currentUser);

      const data = await mobileService.getStaffSchedule(currentUser.user_id);
      
      if (data && !data.message) {
        const dataArray = Array.isArray(data) ? data : [data];
        const processedAssignments = dataArray.map(task => {
          const start = task.start_date ? new Date(task.start_date) : null;
          const end = task.end_date ? new Date(task.end_date) : null;
          
          return {
            id: task.task_id,
            team: {
              driver: { id: task.driver_id, name: `${task.driver_first} ${task.driver_last}`, avatar: task.driver_photo },
              collectors: task.collector_details || [] 
            },
            vehicle: {
              name: task.vehicle_name,
              plateNumber: task.plate_number,
              type: task.truck_status === 'Active' ? 'Operational' : task.truck_status
            },
            zone: { name: task.zone_name || 'No Zone Assigned' },
            work: {
              days: Array.isArray(task.work_days) ? task.work_days : JSON.parse(task.work_days || "[]"),
              shift: `${task.start_time} — ${task.end_time}`,
              start_time: task.start_time,
              end_time: task.end_time,
              start_date: start,
              end_date: end,
              range: start && end ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : null
            }
          };
        });
        setAssignments(processedAssignments);
      } else {
        setAssignments([]); 
      }
    } catch (error) {
      console.error("Schedule Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getShiftStatus = (startTime, endTime) => {
    const now = new Date();
    const currentDayStr = now.toDateString();
    
    // Status only applies to the current calendar day
    if (selectedDate.toDateString() !== currentDayStr) return 'FUTURE';

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const start = new Date(currentDayStr); start.setHours(startH, startM, 0);
    const end = new Date(currentDayStr); end.setHours(endH, endM, 0);

    if (now >= start && now <= end) return 'ACTIVE';
    if (now < start) return 'UPCOMING';
    return 'COMPLETED';
  };

  // --- LOGIC: Sort everything by time first, then split ---
  const categorizedAssignments = useMemo(() => {
    const dayShort = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
    const selectedMidnight = new Date(selectedDate).setHours(0,0,0,0);

    const filtered = assignments.filter(item => {
      const isRoutine = item.work.days.includes(dayShort);
      const isWithinRange = item.work.start_date && item.work.end_date && 
                           selectedMidnight >= new Date(item.work.start_date).setHours(0,0,0,0) && 
                           selectedMidnight <= new Date(item.work.end_date).setHours(0,0,0,0);
      return isRoutine || isWithinRange;
    }).sort((a, b) => a.work.start_time.localeCompare(b.work.start_time));

    return {
      active: filtered.filter(item => getShiftStatus(item.work.start_time, item.work.end_time) === 'ACTIVE'),
      upcoming: filtered.filter(item => getShiftStatus(item.work.start_time, item.work.end_time) === 'UPCOMING'),
      completed: filtered.filter(item => getShiftStatus(item.work.start_time, item.work.end_time) === 'COMPLETED'),
      allSorted: filtered
    };
  }, [selectedDate, assignments]);

  useEffect(() => { fetchAssignment(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignment(true);
  }, []);

  const isUser = (id) => userProfile?.user_id === id;

  const AvatarDisplay = ({ id, avatarUrl, isDriver }) => {
    const isCurrentUser = isUser(id);
    const sourceUri = isCurrentUser && userProfile?.profile_picture 
      ? mobileService.getImageUrl(userProfile.profile_picture) 
      : (avatarUrl ? mobileService.getImageUrl(avatarUrl) : null);

    return (
      <View style={[styles.avatarContainer, { borderColor: isDriver ? '#1B5E20' : '#cbd5e1' }]}>
        {sourceUri ? (
          <RNImage source={{ uri: sourceUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.fallbackAvatar}><User size={16} color="#94a3b8" /></View>
        )}
      </View>
    );
  };

  const AssignmentCard = ({ item, status }) => (
    <View style={styles.assignmentBlock}>
      <View style={styles.shiftLabelContainer}>
        <View style={[styles.shiftBadge, status === 'ACTIVE' && styles.shiftBadgeActive]}>
           <Clock size={12} color="#fff" />
           <Text style={styles.shiftBadgeText}>{item.work.shift}</Text>
        </View>
        
        {status === 'ACTIVE' && (
          <View style={styles.activeLabel}>
            <CircleDot size={12} color="#15803D" />
            <Text style={styles.activeLabelText}>CURRENT DUTY</Text>
          </View>
        )}
        {status === 'UPCOMING' && (
          <View style={styles.upcomingLabel}>
            <Timer size={12} color="#1D4ED8" />
            <Text style={styles.upcomingLabelText}>NEXT SHIFT</Text>
          </View>
        )}
      </View>

      <View style={[styles.mainCard, status === 'ACTIVE' && styles.activeCardBorder]}>
        {/* ZONE */}
        <View style={styles.detailRow}>
          <View style={styles.iconBoxGreen}><Map size={20} color="#1B5E20" /></View>
          <View style={styles.detailTextContent}>
            <Text style={styles.detailLabel}>Assign Zone</Text>
            <Text style={styles.detailValue}>{item.zone.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* TEAM */}
        <Text style={styles.innerHeader}>Collection Team</Text>
        <View style={styles.teamMember}>
          <AvatarDisplay id={item.team.driver.id} avatarUrl={item.team.driver.avatar} isDriver />
          <View style={styles.teamMemberInfo}>
            <Text style={styles.teamName}>{item.team.driver.name}</Text>
            <View style={styles.roleTag}><ShieldCheck size={10} color="#1565C0" /><Text style={styles.roleTagText}>Lead Driver</Text></View>
          </View>
          {isUser(item.team.driver.id) && <View style={styles.youBadge}><Text style={styles.youBadgeText}>YOU</Text></View>}
        </View>

        <View style={styles.collectorsList}>
          {item.team.collectors.map((collector, cIndex) => (
            <View key={`${item.id}-col-${collector.id}`} style={styles.collectorItem}>
              <View style={styles.subLine} />
              <AvatarDisplay id={collector.id} avatarUrl={collector.avatar} isDriver={false} />
              <View style={styles.teamMemberInfo}>
                <Text style={styles.collectorName}>{collector.name}</Text>
                <Text style={styles.collectorRole}>Collector {cIndex + 1}</Text>
              </View>
              {isUser(collector.id) && <View style={styles.youBadge}><Text style={styles.youBadgeText}>YOU</Text></View>}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* VEHICLE */}
        <View style={styles.vehicleSection}>
           <View style={styles.iconBoxGray}><Truck size={20} color="#475569" /></View>
           <View style={styles.vehicleInfo}>
              <Text style={styles.detailLabel}>Vehicle Asset</Text>
              <Text style={styles.vehicleNameText}>{item.vehicle.name}</Text>
              <View style={styles.plateRow}>
                 <Text style={styles.plateLabel}>Plate Number:</Text>
                 <Text style={styles.plateValue}>{item.vehicle.plateNumber}</Text>
              </View>
           </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1B5E20" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Duty Timeline</Text>
            <Text style={styles.headerSub}>Real-time shift management</Text>
          </View>
          <TouchableOpacity onPress={() => fetchAssignment(true)} style={styles.headerRefreshBtn}>
            <RefreshCw size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.dateStrip}>
           {[0, 1, 2, 3, 4].map((offset) => {
             const d = new Date(); d.setDate(d.getDate() + offset);
             const isSelected = d.toDateString() === selectedDate.toDateString();
             return (
               <TouchableOpacity key={offset} onPress={() => setSelectedDate(d)} style={[styles.dateItem, isSelected && styles.dateItemSelected]}>
                 <Text style={[styles.dateDay, isSelected && styles.textGreen]}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                 <Text style={[styles.dateNum, isSelected && styles.textGreen]}>{d.getDate()}</Text>
               </TouchableOpacity>
             );
           })}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1B5E20']} tintColor={'#1B5E20'} />}>
        
        {categorizedAssignments.allSorted.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={60} color="#cbd5e1" strokeWidth={1} />
            <Text style={styles.noDataText}>No duties for this date.</Text>
          </View>
        ) : (
          <>
            {/* 1. ONGOING GROUP */}
            {categorizedAssignments.active.length > 0 && (
              <View>
                <View style={styles.categoryHeader}><Text style={styles.categoryTitle}>Ongoing Duty</Text></View>
                {categorizedAssignments.active.map((item) => <AssignmentCard key={item.id} item={item} status="ACTIVE" />)}
                <View style={styles.timelineConnector}><ArrowDownCircle size={20} color="#cbd5e1" /></View>
              </View>
            )}

            {/* 2. UPCOMING GROUP (This is where your 1:30 AM shift will go if it is currently 12:30 AM) */}
            {categorizedAssignments.upcoming.length > 0 && (
              <View>
                <View style={styles.categoryHeader}><Text style={[styles.categoryTitle, {color: '#1D4ED8'}]}>Upcoming Schedule</Text></View>
                {categorizedAssignments.upcoming.map((item) => <AssignmentCard key={item.id} item={item} status="UPCOMING" />)}
              </View>
            )}

            {/* 3. COMPLETED/OTHER */}
            {selectedDate.toDateString() !== new Date().toDateString() ? (
              categorizedAssignments.allSorted.map((item) => <AssignmentCard key={item.id} item={item} status="FUTURE" />)
            ) : (
              categorizedAssignments.completed.length > 0 && (
                <View style={styles.completedSection}>
                  <Text style={styles.completedText}>You have finished {categorizedAssignments.completed.length} shift(s) today.</Text>
                </View>
              )
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAF9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 25, marginTop: -50, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: '#E8F5E9', opacity: 0.8 },
  headerRefreshBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  dateStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  dateItem: { width: 62, height: 75, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' },
  dateItemSelected: { backgroundColor: '#fff', elevation: 4 },
  dateDay: { fontSize: 11, fontWeight: '700', color: '#E8F5E9', textTransform: 'uppercase' },
  dateNum: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 2 },
  textGreen: { color: '#1B5E20' },
  scrollView: { paddingHorizontal: 20, marginTop: 15 },
  categoryHeader: { paddingVertical: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  categoryTitle: { fontSize: 13, fontWeight: '800', color: '#15803D', textTransform: 'uppercase', letterSpacing: 1 },
  timelineConnector: { alignItems: 'center', marginVertical: 15 },
  assignmentBlock: { marginBottom: 30 },
  shiftLabelContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  shiftBadge: { backgroundColor: '#475569', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  shiftBadgeActive: { backgroundColor: '#1B5E20' },
  shiftBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', marginLeft: 6 },
  activeLabel: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5, borderWidth: 1, borderColor: '#86EFAC' },
  activeLabelText: { color: '#15803D', fontSize: 9, fontWeight: '900' },
  upcomingLabel: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5, borderWidth: 1, borderColor: '#93C5FD' },
  upcomingLabelText: { color: '#1D4ED8', fontSize: 9, fontWeight: '900' },
  mainCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 3 },
  activeCardBorder: { borderWidth: 2, borderColor: '#1B5E20' },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  iconBoxGreen: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EAF5E8', justifyContent: 'center', alignItems: 'center' },
  detailTextContent: { marginLeft: 15 },
  detailLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 18, fontWeight: '900', color: '#1B5E20' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
  innerHeader: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 15, textTransform: 'uppercase' },
  teamMember: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  collectorItem: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  subLine: { width: 2, height: 20, backgroundColor: '#F1F5F9', position: 'absolute', left: 18, top: -20 },
  avatarContainer: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, padding: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 19 },
  fallbackAvatar: { width: '100%', height: '100%', borderRadius: 19, backgroundColor: '#F8FAF8', justifyContent: 'center', alignItems: 'center' },
  teamMemberInfo: { flex: 1, marginLeft: 12 },
  teamName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  collectorName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  collectorRole: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  youBadge: { backgroundColor: '#EAF5E8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  youBadgeText: { fontSize: 9, fontWeight: '900', color: '#1B5E20' },
  roleTag: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  roleTagText: { fontSize: 10, fontWeight: '700', color: '#64748b', marginLeft: 4 },
  vehicleSection: { flexDirection: 'row', alignItems: 'center' },
  iconBoxGray: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  vehicleInfo: { flex: 1, marginLeft: 15 },
  vehicleNameText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  plateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  plateLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  plateValue: { fontSize: 11, color: '#1B5E20', fontWeight: '900', marginLeft: 5 },
  completedSection: { padding: 20, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  completedText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  noDataText: { fontSize: 18, fontWeight: '800', color: '#cbd5e1', marginTop: 20 },
});

export default ScheduleScreen;