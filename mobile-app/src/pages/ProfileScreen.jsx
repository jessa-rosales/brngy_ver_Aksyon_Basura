import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Image as RNImage,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  LogOut, 
  ChevronRight, 
  Settings2,
  ShieldCheck,
  History,
  Info,
  Calendar,
  Archive 
} from 'lucide-react-native';

import { mobileService } from '../services/mobileService';
import CustomAlert from '../components/CustomAlert';

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  // --- STATE MANAGEMENT ---
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // --- DATA LOADING LOGIC ---
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const jsonValue = await AsyncStorage.getItem('userProfile');
      
      if (jsonValue != null) {
        const parsed = JSON.parse(jsonValue);
        
        setUserData({
          fullName: `${parsed.first_name} ${parsed.last_name}`,
          email: parsed.email,
          phone: parsed.contact_number || 'No contact number', 
          address: parsed.address || 'No address provided',
          
          role: parsed.role === 'Admin' ? 'Administrator' : 
                parsed.role === 'Driver' ? 'Verified Driver' : 
                parsed.role === 'Collector' ? 'Verified Collector' : 'Verified Citizen',
          
          profilePic: parsed.profile_picture ? mobileService.getImageUrl(parsed.profile_picture) : null
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [])
  );

  // --- LOGOUT LOGIC ---
  const handleLogoutPress = () => setLogoutModalVisible(true);

  const executeLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await mobileService.logout(); 
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], 
      });
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Error", "Sign out failed. Please try again.");
    }
  };

  // --- HELPER COMPONENT ---
  const ActionRow = ({ icon: Icon, label, subLabel, onPress, color = "#1B5E20", isLast }) => (
    <TouchableOpacity 
      style={[styles.actionRow, !isLast && styles.rowBorder]} 
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.actionIconBg, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} strokeWidth={2.5} />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionLabel}>{label}</Text>
        {subLabel && <Text style={styles.actionSubLabel}>{subLabel}</Text>}
      </View>
      <ChevronRight size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  const isCitizen = userData?.role === 'Verified Citizen';

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <LinearGradient
          colors={['#1BC774', '#1B5E20']}
          style={[
            styles.topSection, 
            { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 20 }
          ]}
        >
          <View style={styles.avatarGlow}>
            <View style={styles.avatarMain}>
              {userData?.profilePic ? (
                <RNImage 
                  source={{ uri: userData.profilePic }} 
                  style={{ width: 74, height: 74, borderRadius: 37 }} 
                />
              ) : (
                <User size={38} color="#1B5E20" strokeWidth={2} />
              )}
            </View>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.headerName}>{userData?.fullName}</Text>
          <Text style={styles.headerRole}>{userData?.role}</Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.card}>
            <ActionRow icon={Mail} label="Email" subLabel={userData?.email} />
            <ActionRow icon={Phone} label="Phone" subLabel={userData?.phone} />
            <ActionRow icon={MapPin} label="Location" subLabel={userData?.address} isLast />
          </View>

          <Text style={styles.sectionTitle}>Account & Activity</Text>
          <View style={styles.card}>
            <ActionRow 
              icon={History} 
              label={isCitizen ? "My Report History" : "My Collection History"} 
              subLabel={isCitizen ? "Track your reported issues" : "View your past collections and tasks"}
              onPress={() => navigation.navigate(isCitizen ? 'UserReports' : 'CollectionHistory')} 
            />

            {!isCitizen && (
              <ActionRow 
                icon={Calendar} 
                label="My Schedule" 
                subLabel="View your assigned shifts"
                onPress={() => navigation.navigate('Schedule')} 
              />
            )}
            
            <ActionRow 
              icon={Settings2} 
              label="Edit Account" 
              onPress={() => navigation.navigate('EditProfile')} 
            />

            <ActionRow 
              icon={Archive} 
              label={isCitizen ? "Archive Center" : "Archive History"} 
              subLabel={isCitizen ? "View previously archived reports" : "View archived collection logs"}
              onPress={() => navigation.navigate(isCitizen ? 'ArchiveCenter' : 'ArchiveHistory')} 
            />

             <ActionRow 
               icon={Info} 
               label="App Information" 
               onPress={() => setInfoModalVisible(true)} 
               isLast 
             />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionLabel}>Aksyon Basura • 1.0.0</Text>
        </View>
      </ScrollView>

      {/* --- APP INFORMATION MODAL --- */}
      <Modal
        visible={infoModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoContent}>
            <View style={styles.infoHeader}>
              <View style={styles.logoCircle}>
                <RNImage 
                  source={require('../../assets/logo6.png')} 
                  style={{ width: 80, height: 80 }} 
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.infoTitle}>Aksyon Basura</Text>
              <Text style={styles.infoVersion}>Version 1.0.0 (Stable)</Text>
            </View>

            <ScrollView style={styles.infoScroll}>
              <Text style={styles.infoSubtitle}>Our Mission</Text>
              <Text style={styles.infoBody}>
                Aksyon Basura is an integrated waste management system designed to streamline garbage collection and empower citizens.
                Our mission is to foster a cleaner, greener community through technology-driven solutions and active participation.
              </Text>

              <View style={styles.devSection}>
                <Text style={styles.devTitle}>How It Works</Text>
                <Text style={styles.devItem}>• Citizens report waste issues with photo evidence.</Text>
                <Text style={styles.devItem}>• Teams (Drivers/Collectors) manage tasks in real-time.</Text>
                <Text style={styles.devItem}>• Collections are verified with high-fidelity photo proof.</Text>
                <Text style={styles.devItem}>• Live vehicle tracking optimizes daily collection routes.</Text>
              </View>

              <View style={styles.devSection}>
                <Text style={styles.devTitle}>Privacy & Security</Text>
                <Text style={styles.infoBodySmall}>
                  Your privacy is our priority. Location data is used strictly for waste tracking and navigation. 
                  All personal records are encrypted and stored in our secure database.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeInfoBtn} 
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.closeInfoText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- LOGOUT ALERT --- */}
      <CustomAlert 
        visible={logoutModalVisible}
        title="Sign Out"
        message="Are you sure you want to log out of your account?"
        type="danger"
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
        onConfirm={executeLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' },
  center: { justifyContent: 'center', alignItems: 'center' },
  topSection: { paddingBottom: 25, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8 },
  avatarGlow: { position: 'relative', marginBottom: 10, padding: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50 },
  avatarMain: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3b82f6', borderRadius: 10, padding: 4, borderWidth: 2, borderColor: '#1B5E20' },
  headerName: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerRole: { fontSize: 11, color: '#E3F3DF', fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  body: { paddingHorizontal: 20, marginTop: -5 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#1B5E20', marginBottom: 8, marginLeft: 10, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 },
  card: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 15, elevation: 4, shadowColor: '#1B5E20', shadowOpacity: 0.08, shadowRadius: 15 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actionIconBg: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionTextContainer: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  actionSubLabel: { fontSize: 11, color: '#64748b', marginTop: 1, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginTop: 25, paddingVertical: 14, borderRadius: 18, gap: 10, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  versionLabel: { textAlign: 'center', color: '#1B5E20', fontSize: 10, marginTop: 25, fontWeight: '700', opacity: 0.4, paddingBottom: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoContent: { backgroundColor: '#fff', borderRadius: 25, width: '100%', maxHeight: '75%', padding: 25, alignItems: 'center' },
  infoHeader: { alignItems: 'center', marginBottom: 20 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E3F3DF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  infoTitle: { fontSize: 22, fontWeight: '900', color: '#1B5E20' },
  infoVersion: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  infoScroll: { width: '100%' },
  infoSubtitle: { fontSize: 16, fontWeight: '800', color: '#1B5E20', marginBottom: 10 },
  infoBody: { fontSize: 14, color: '#475569', lineHeight: 22, textAlign: 'justify' },
  infoBodySmall: { fontSize: 12, color: '#64748b', lineHeight: 18, textAlign: 'justify' },
  devSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  devTitle: { fontSize: 14, fontWeight: '800', color: '#1B5E20', marginBottom: 10 },
  devItem: { fontSize: 13, color: '#64748b', marginBottom: 5, fontWeight: '500' },
  closeInfoBtn: { marginTop: 25, backgroundColor: '#1B5E20', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 15 },
  closeInfoText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

export default ProfileScreen;