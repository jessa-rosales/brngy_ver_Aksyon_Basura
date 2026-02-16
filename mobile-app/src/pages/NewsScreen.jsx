import React, { 
  useRef, 
  useCallback, 
  useState 
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Clock, 
  UserCheck 
} from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { mobileService } from '../services/mobileService';

const NewsScreen = () => {
  const { markAsRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- API DATA FETCHING ---
  const fetchAnnouncements = async () => {
    try {
      const response = await mobileService.getAnnouncements();
      
      // We parse JSON here. If your service already parsed it, 
      // response.data will be used.
      const rawData = typeof response.json === 'function' 
        ? await response.json() 
        : response.data; 

      // Ensure we have an array before mapping
      if (Array.isArray(rawData)) {
        const formattedData = rawData.map(item => ({
          id: item.announcement_id?.toString() || Math.random().toString(),
          adminName: `Admin ${item.author_first || ''} ${item.author_last || ''}`,
          title: item.title || 'No Title',
          type: item.category,
          priority: item.priority, 
          description: item.content,
          isNew: (new Date() - new Date(item.date_published)) < 24 * 60 * 60 * 1000,
          date: new Date(item.date_published).toLocaleString('en-US', {
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
          }),
          imageUri: mobileService.getImageUrl(item.ann_photo),
        }));

        // Sorting by date (Newest first)
        setAnnouncements(formattedData.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (err) {
      console.error("Fetch announcements error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
      markAsRead();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  // --- INDIVIDUAL NEWS CARD ---
  const NewsCard = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLongText = item.description && item.description.length > 170;

    // --- COLOR LOGIC (Matching Admin Portal) ---
    const getCategoryStyles = (type) => {
      switch (type?.toUpperCase()) {
        case 'EMERGENCY': return { bg: '#FEE2E2', text: '#EF4444' }; // Red
        case 'SCHEDULE': return { bg: '#DBEAFE', text: '#2563EB' };  // Blue
        case 'MAINTENANCE': return { bg: '#FFEDD5', text: '#D97706' }; // Orange
        case 'INFORMATION': return { bg: '#DCFCE7', text: '#16A34A' }; // Green
        default: return { bg: '#F1F5F9', text: '#64748B' };
      }
    };

    const getPriorityStyles = (priority) => {
      switch (priority?.toLowerCase()) {
        case 'urgent': return { bg: '#FEF2F2', text: '#DC2626' }; // Bright Red
        case 'high': return { bg: '#FFF7ED', text: '#EA580C' };   // Deep Orange
        default: return { bg: '#F8FAFC', text: '#64748B' };
      }
    };

    const catStyle = getCategoryStyles(item.type);
    const prioStyle = getPriorityStyles(item.priority);

    return (
      <View style={styles.newsCard}>
        {item.imageUri && (
          <Image 
            source={{ uri: item.imageUri }} 
            style={styles.newsImage} 
            resizeMode="cover"
          />
        )}

        <View style={styles.cardContent}>
          {/* TAGS SECTION */}
          <View style={styles.tagRow}>
            {/* Category Badge */}
            <View style={[styles.tag, { backgroundColor: catStyle.bg }]}>
              <Text style={[styles.tagText, { color: catStyle.text }]}>
                {item.type}
              </Text>
            </View>

            {/* Priority Badge (NEW) */}
            <View style={[styles.tag, { backgroundColor: prioStyle.bg }]}>
              <Text style={[styles.tagText, { color: prioStyle.text }]}>
                {item.priority}
              </Text>
            </View>

            {/* NEW Badge */}
            {item.isNew && (
              <View style={[styles.tag, { backgroundColor: '#1B5E20' }]}>
                <Text style={[styles.tagText, { color: '#fff' }]}>
                  NEW
                </Text>
              </View>
            )}
          </View>

          {/* CONTENT SECTION */}
          <Text style={styles.newsTitle}>
            {item.title}
          </Text>
          
          <Text 
            style={styles.descriptionText}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {item.description}
          </Text>

          {isLongText && (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setIsExpanded(!isExpanded)}
              style={styles.readMoreBtn}
            >
              <Text style={styles.readMoreText}>
                {isExpanded ? "Show Less" : "Read More..."}
              </Text>
            </TouchableOpacity>
          )}

          {/* FOOTER SECTION */}
          <View style={styles.footerContainer}>
            <View style={styles.adminRow}>
              <UserCheck size={14} color="#1B5E20" />
              <Text style={styles.adminNameText}>
                {item.adminName}
              </Text>
            </View>
            
            <View style={styles.dateRow}>
              <Clock size={14} color="#94a3b8" />
              <Text style={styles.dateText}>
                {item.date}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // --- MAIN RENDER ---
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.headerSection, 
          { paddingTop: Platform.OS === 'ios' ? insets.top : 10 }
        ]}
      >
        <Text style={styles.headerTitle}>
          Office Announcements
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NewsCard item={item} />}
        contentContainerStyle={[
          styles.listContainer, 
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  headerSection: {
    backgroundColor: '#F6FBF6',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
  },
  headerTitle: { 
    fontSize: 19, 
    fontWeight: '900', 
    color: '#000', 
    marginTop: 10 
  },
  listContainer: { 
    padding: 15 
  },
  newsCard: { 
    backgroundColor: '#F6FBF6', 
    borderRadius: 20, 
    marginBottom: 20, 
    overflow: 'hidden', 
    elevation: 3 
  },
  newsImage: { 
    width: '100%', 
    aspectRatio: 16 / 9, 
    backgroundColor: '#F1F5F9' 
  },
  cardContent: { 
    padding: 15 
  },
  tagRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 8,
    flexWrap: 'wrap' // Ensures tags don't overflow horizontally
  },
  tag: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  tagText: { 
    fontSize: 10, 
    fontWeight: '900', // Made bolder to match badges
    textTransform: 'uppercase'
  },
  newsTitle: { 
    fontSize: 17, 
    fontWeight: '900', 
    color: '#000', 
    marginBottom: 8 
  },
  descriptionText: { 
    fontSize: 13, 
    color: '#475569', 
    lineHeight: 18, 
    marginBottom: 5 
  },
  readMoreBtn: { 
    marginBottom: 10, 
    alignSelf: 'flex-start' 
  },
  readMoreText: { 
    fontSize: 13, 
    fontWeight: '900', 
    color: '#1B5E20' 
  },
  footerContainer: { 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9', 
    paddingTop: 10, 
    marginTop: 5 
  },
  adminRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginBottom: 4 
  },
  adminNameText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#1B5E20' 
  },
  dateRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  dateText: { 
    fontSize: 11, 
    color: '#94a3b8', 
    fontWeight: '600' 
  },
});

export default NewsScreen;