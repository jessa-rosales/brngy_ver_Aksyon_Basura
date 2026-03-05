import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Modal, Platform, TextInput 
} from 'react-native';
import { Clock, User, MapPin, Camera, Truck, X, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileService } from '../services/mobileService';

const CollectionHistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const result = await mobileService.getCollectionHistory();
      // Fetches directly from your PostgreSQL DB via version7.sql schema
      if (result.success) setHistory(result.data);
    } catch (error) {
      console.error("Load History Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ✅ Multi-parameter Search Logic: Zone, Collector, Driver, Type, or Title
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      return (
        item.zone_name?.toLowerCase().includes(searchLower) ||
        item.collector_name?.toLowerCase().includes(searchLower) ||
        item.driver_name?.toLowerCase().includes(searchLower) ||
        item.entry_type?.toLowerCase().includes(searchLower) || 
        item.title?.toLowerCase().includes(searchLower)
      );
    });
  }, [searchQuery, history]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeContainer}>
            <View style={[styles.typeBadge, { backgroundColor: item.entry_type === 'Report' ? '#FEF3C7' : '#DBEAFE' }]}>
                <Text style={[styles.typeText, { color: item.entry_type === 'Report' ? '#92400E' : '#1E40AF' }]}>
                    {item.entry_type.toUpperCase()}
                </Text>
            </View>
            <View style={styles.zoneBadge}>
                <Text style={styles.zoneText}>{item.zone_name}</Text>
            </View>
        </View>
        <Text style={styles.dateText}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      </View>

      {item.evidence_image ? (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setSelectedImage(mobileService.getImageUrl(item.evidence_image))}
        >
          <Image 
            source={{ uri: mobileService.getImageUrl(item.evidence_image) }} 
            style={styles.evidenceImage} 
            resizeMode="cover" 
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.noImageBox}><Camera color="#94a3b8" /><Text>No Evidence Uploaded</Text></View>
      )}

      <View style={styles.content}>
        <Text style={styles.issueText}>{item.title}</Text>
        
        <View style={styles.row}>
          <MapPin size={14} color="#64748b" />
          <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.personRow}>
          <User size={14} color="#1B5E20" />
          <Text style={styles.personLabel}>Personnel: <Text style={styles.nameText}>{item.collector_name}</Text></Text>
        </View>
        <View style={styles.personRow}>
          <Truck size={14} color="#1B5E20" />
          <Text style={styles.personLabel}>Assigned Driver: <Text style={styles.nameText}>{item.driver_name}</Text></Text>
        </View>

        <View style={styles.footer}>
          <Clock size={12} color="#94a3b8" />
          <Text style={styles.footerTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Report, Zone, or Personnel..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{marginTop: 50}} />
      ) : (
        <FlatList 
          data={filteredHistory} 
          renderItem={renderItem} 
          keyExtractor={(item, index) => `${item.entry_type}-${item.id || index}`} 
          contentContainerStyle={{padding: 15, paddingBottom: insets.bottom + 20}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 100 }}>
              <Text style={{ color: '#64748b', fontWeight: 'bold' }}>
                {searchQuery ? "No matches found." : "No collection history found."}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity 
            style={[styles.closeButton, { top: insets.top + 50 }]} 
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
  searchSection: {
    backgroundColor: '#F6FBF6',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  card: { backgroundColor: '#fff', borderRadius: 15, marginBottom: 20, elevation: 4, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  typeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 9, fontWeight: '900' },
  zoneBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  zoneText: { color: '#1B5E20', fontWeight: 'bold', fontSize: 12 },
  dateText: { color: '#64748b', fontSize: 12 },
  evidenceImage: { width: '100%', height: 200 },
  noImageBox: { height: 150, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  content: { padding: 15 },
  issueText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  addressText: { color: '#64748b', fontSize: 13, flex: 1 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  personLabel: { fontSize: 13, color: '#475569' },
  nameText: { fontWeight: '700', color: '#1B5E20' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  footerTime: { fontSize: 11, color: '#94a3b8' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullScreenImage: { width: '100%', height: '80%' }
});

export default CollectionHistoryScreen;