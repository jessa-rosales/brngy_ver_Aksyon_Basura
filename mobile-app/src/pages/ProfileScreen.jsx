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
  Calendar // Added Calendar icon
} from 'lucide-react-native';


// Import your mobile service for the logout function
import { mobileService } from '../services/mobileService';

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  // --- STATE MANAGEMENT ---
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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
          
          // --- UPDATED ROLE LOGIC ---
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

  // Refresh data every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ 
          y: 0, 
          animated: false 
        });
      }
    }, [])
  );

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          try {
            // 1. Clear AsyncStorage via mobileService
            await mobileService.logout(); 

            // 2. Reset navigation to the 'Login' route defined in AppNavigator.jsx
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }], 
            });
          } catch (error) {
            console.error("Logout Error:", error);
            Alert.alert("Error", "Sign out failed. Please try again.");
          }
        } 
      }
    ]);
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

  // --- LOADING RENDER ---
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  // --- MAIN RENDER ---
  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 40 
        }}
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
          {/* PERSONAL INFO CARD */}
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.card}>
            <ActionRow icon={Mail} label="Email" subLabel={userData?.email} />
            <ActionRow icon={Phone} label="Phone" subLabel={userData?.phone} />
            <ActionRow icon={MapPin} label="Location" subLabel={userData?.address} isLast />
          </View>

          {/* HISTORY & SETTINGS CARD */}
          <Text style={styles.sectionTitle}>Account & Activity</Text>
          <View style={styles.card}>
            <ActionRow 
              icon={History} 
              label="My Report History" 
              subLabel="Track your reported issues"
              onPress={() => navigation.navigate('UserReports')}
            />

            {/* CONDITIONAL SCHEDULE BUTTON FOR DRIVER/COLLECTOR */}
            {/* CONDITIONAL SCHEDULE BUTTON FOR DRIVER/COLLECTOR */}
            {(userData?.role === 'Verified Driver' || userData?.role === 'Verified Collector') && (
                <ActionRow 
                    icon={Calendar} 
                    label="My Schedule" 
                    subLabel="View your assigned shifts"
                    onPress={() => {
                        // Updated from Alert to navigate
                        navigation.navigate('Schedule'); 
                    }} 
                />
            )}
            
            <ActionRow 
              icon={Settings2} 
              label="Edit Account" 
              onPress={() => navigation.navigate('EditProfile')} 
            />

             <ActionRow icon={Info} label="App Information" onPress={() => {}} isLast />
          </View>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionLabel}>Aksyon Basura • 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E3F3DF' 
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSection: {
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
  },
  avatarGlow: {
    position: 'relative',
    marginBottom: 10,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
  },
  avatarMain: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: '#1B5E20',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  headerRole: {
    fontSize: 11,
    color: '#E3F3DF',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    paddingHorizontal: 20,
    marginTop: -5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 8,
    marginLeft: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#1B5E20',
    shadowOpacity: 0.08,
    shadowRadius: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  actionSubLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 25,
    paddingVertical: 14,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  versionLabel: {
    textAlign: 'center',
    color: '#1B5E20',
    fontSize: 10,
    marginTop: 25,
    fontWeight: '700',
    opacity: 0.4,
  },
});

export default ProfileScreen;