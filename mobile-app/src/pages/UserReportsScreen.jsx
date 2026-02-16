import React, { 
  useState, 
  useMemo 
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Clock, 
  MapPin, 
  AlertCircle,
  AlertTriangle,
  Navigation 
} from 'lucide-react-native';

const UserReportsScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('My Reports');

  // --- MOCK USER HISTORY ---
  const [myHistory] = useState([
    {
      id: '1',
      type: 'OVERFLOWING BIN',
      status: 'In Progress',
      date: 'Feb 07, 2026 • 10:00 AM',
      location: 'Brgy. Carmen, Sector 2',
      description: 'The trash bin near the elementary school is overflowing and needs immediate collection.',
      imageUri: 'https://via.placeholder.com/400x250',
      needAttentionCount: 3,
    },
    {
      id: '2',
      type: 'ILLEGAL DUMPING',
      status: 'Completed',
      date: 'Feb 05, 2026 • 02:30 PM',
      location: 'Upper Balulang',
      description: 'Reported construction debris left by the roadside. Resolved by the collection team.',
      imageUri: 'https://via.placeholder.com/400x250',
      needAttentionCount: 8,
    },
    {
      id: '3',
      type: 'MISSED PICKUP',
      status: 'Completed',
      date: 'Feb 01, 2026 • 09:00 AM',
      location: 'Vamenta Boulevard',
      description: 'The collection truck missed our block this morning. Please check.',
      imageUri: 'https://via.placeholder.com/400x250',
      needAttentionCount: 2,
    },
  ]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    if (activeTab === 'Resolved') {
      return myHistory.filter((item) => item.status === 'Completed');
    }
    return myHistory;
  }, [activeTab, myHistory]);

  const HistoryCard = ({ item }) => {
    const getStatusStyle = (status) => {
      switch (status) {
        case 'Completed': 
          return { bg: '#DCFCE7', text: '#1B5E20' };
        case 'In Progress': 
          return { bg: '#FEF9C3', text: '#854D0E' };
        default: 
          return { bg: '#F1F5F9', text: '#64748b' };
      }
    };

    const statusStyle = getStatusStyle(item.status);

    return (
      <View 
        style={styles.reportCard}
      >
        <View 
          style={styles.cardHeader}
        >
          <View 
            style={styles.timeInfo}
          >
            <Clock 
              size={14} 
              color="#94a3b8" 
            />
            <Text 
              style={styles.dateText}
            >
              {item.date}
            </Text>
          </View>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: statusStyle.bg }
            ]}
          >
            <Text 
              style={[
                styles.statusText, 
                { color: statusStyle.text }
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Image 
          source={{ uri: item.imageUri }} 
          style={styles.reportImage} 
          resizeMode="cover" 
        />

        <View 
          style={styles.cardContent}
        >
          <Text 
            style={styles.issueTypeText}
          >
            {item.type}
          </Text>
          <View 
            style={styles.locationRow}
          >
            <MapPin 
              size={14} 
              color="#64748b" 
            />
            <Text 
              style={styles.locationText}
            >
              {item.location}
            </Text>
          </View>
          <Text 
            style={styles.descriptionText} 
            numberOfLines={2}
          >
            {item.description}
          </Text>
        </View>

        <View 
          style={styles.cardActions}
        >
          <TouchableOpacity 
            style={styles.attentionBtn} 
            activeOpacity={0.7}
          >
            <AlertTriangle 
              size={20} 
              color="#EF4444" 
            />
            <Text 
              style={styles.attentionText}
            >
              Attention ({item.needAttentionCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navigateBtn} 
            activeOpacity={0.7}
          >
            <Navigation 
              size={20} 
              color="#1B5E20" 
            />
            <Text 
              style={styles.navigateText}
            >
              Navigate
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View 
      style={styles.container}
    >
      <View 
        style={styles.filterSection}
      >
        <View 
          style={styles.filterContainer}
        >
          {['My Reports', 'Resolved'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[
                styles.filterTab, 
                activeTab === tab && styles.activeTab
              ]}
            >
              <Text 
                style={[
                  styles.filterTabText, 
                  activeTab === tab && styles.activeTabText
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryCard item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer, 
          { paddingBottom: insets.bottom + 20 }
        ]}
        ListEmptyComponent={
          <View 
            style={styles.emptyContainer}
          >
            <AlertCircle 
              size={50} 
              color="#cbd5e1" 
            />
            <Text 
              style={styles.emptyText}
            >
              No {activeTab.toLowerCase()} found.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E3F3DF' 
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: { 
    backgroundColor: '#1BC774' 
  },
  filterTabText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#64748b' 
  },
  activeTabText: { 
    color: '#fff' 
  },
  listContainer: { 
    padding: 15 
  },
  reportCard: { 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    marginBottom: 20, 
    overflow: 'hidden', 
    elevation: 4 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15 
  },
  timeInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  dateText: { 
    fontSize: 11, 
    color: '#94a3b8', 
    fontWeight: '600' 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '800', 
    textTransform: 'uppercase' 
  },
  reportImage: { 
    width: '100%', 
    height: 180, 
    backgroundColor: '#F1F5F9' 
  },
  cardContent: { 
    padding: 15 
  },
  issueTypeText: { 
    fontSize: 16, 
    fontWeight: '900', 
    color: '#000' 
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    marginTop: 4 
  },
  locationText: { 
    fontSize: 13, 
    color: '#64748b', 
    fontWeight: '600' 
  },
  descriptionText: { 
    fontSize: 13, 
    color: '#475569', 
    marginTop: 8, 
    lineHeight: 18 
  },
  cardActions: { 
    flexDirection: 'row', 
    padding: 15, 
    paddingTop: 0, 
    gap: 10, 
    marginBottom: 5 
  },
  attentionBtn: { 
    flex: 1.6, 
    flexDirection: 'row', 
    backgroundColor: '#FEE2E2', 
    height: 48, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8 
  },
  attentionText: { 
    color: '#EF4444', 
    fontSize: 12, 
    fontWeight: '800' 
  },
  navigateBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#DCFCE7', 
    height: 48, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8 
  },
  navigateText: { 
    color: '#1B5E20', 
    fontSize: 12, 
    fontWeight: '800' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 100 
  },
  emptyText: { 
    marginTop: 15, 
    color: '#94a3b8', 
    fontSize: 14, 
    fontWeight: '600' 
  },
});

export default UserReportsScreen;