import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Image as RNImage, 
  ActivityIndicator, Platform, TextInput 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Calendar, User, Mail, Save } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import { mobileService } from '../services/mobileService';

import CustomAlert from '../components/CustomAlert';

const EditProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userRef, setUserRef] = useState(null);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    gender: '', birthday: null, address: '', profile_picture: null,
  });

  const [customAlert, setCustomAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Close',
    onConfirm: null
  });

  const closeAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  useEffect(() => { loadCurrentData(); }, []);

  const loadCurrentData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('userProfile');
      if (jsonValue) {
        const user = JSON.parse(jsonValue);
        setUserRef(user);
        setFormData({
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          phone: user.contact_number || '',
          gender: user.gender || '',
          birthday: user.birthday ? new Date(user.birthday) : null,
          address: user.address || '',
          profile_picture: user.profile_picture ? mobileService.getImageUrl(user.profile_picture) : null,
        });
      }
    } catch (e) { console.error(e); }
  };

  const handlePhotoUpload = async (uri) => {
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;
    
    const uploadData = new FormData();
    uploadData.append('profile_image', { 
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), 
      name: filename, 
      type 
    });

    try {
      const res = await mobileService.uploadProfilePic(uploadData);
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      if (data.user) {
        await AsyncStorage.setItem('userProfile', JSON.stringify(data.user));
        setFormData(prev => ({ 
          ...prev, 
          profile_picture: mobileService.getImageUrl(data.user.profile_picture) 
        }));
      }
    } catch (e) { 
      setCustomAlert({
        visible: true,
        title: "Upload Error",
        message: "Failed to upload photo. Please try again.",
        type: "danger",
        confirmText: "OK",
        onConfirm: closeAlert
      });
    }
  };

  const handleSave = async () => {
    if (!formData.phone.trim()) {
      setCustomAlert({
        visible: true,
        title: "Required Field",
        message: "Phone number is required.",
        type: "warning",
        confirmText: "OK",
        onConfirm: closeAlert
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        contact_number: formData.phone.trim(), 
        gender: formData.gender,
        birthday: formData.birthday ? formData.birthday.toISOString().split('T')[0] : null,
        address: formData.address,
      };

      const response = await mobileService.updateMobileProfile(userRef.user_id, payload);
      const result = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('userProfile', JSON.stringify(result));
        setCustomAlert({
          visible: true,
          title: "Success",
          message: "Profile updated successfully!",
          type: "success",
          confirmText: "OK",
          onConfirm: () => {
            closeAlert();
            navigation.goBack();
          }
        });
      } else {
        setCustomAlert({
          visible: true,
          title: "Update Failed",
          message: result.message || "Something went wrong.",
          type: "danger",
          confirmText: "OK",
          onConfirm: closeAlert
        });
      }
    } catch (error) {
      setCustomAlert({
        visible: true,
        title: "Connection Error",
        message: "Failed to connect to the server.",
        type: "danger",
        confirmText: "OK",
        onConfirm: closeAlert
      });
    } finally { setLoading(false); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      // ✅ FIXED: Using the new array format to resolve the Expo deprecation warning
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      setFormData(prev => ({ ...prev, profile_picture: uri }));
      handlePhotoUpload(uri);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView ref={scrollRef} enableOnAndroid extraScrollHeight={160}>
        <LinearGradient colors={['#1BC774', '#1B5E20']} style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
            <View style={styles.imageContainer}>
              {formData.profile_picture ? (
                <RNImage source={{ uri: formData.profile_picture }} style={styles.profilePic} />
              ) : (
                <User size={50} color="#1B5E20" />
              )}
            </View>
            <View style={styles.cameraIcon}><Camera size={14} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.nameHeader}>{formData.firstName} {formData.lastName}</Text>
          <Text style={styles.emailHeader}>{formData.email}</Text>
        </LinearGradient>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address (Read-only)</Text>
          <View style={styles.disabledInput}>
            <Mail size={18} color="#94a3b8" style={{ marginRight: 10 }} />
            <Text style={styles.disabledText}>{formData.email}</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledText}>{formData.firstName}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledText}>{formData.lastName}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Contact Number</Text>
          <TextInput 
            style={styles.input} value={formData.phone} 
            onChangeText={(val) => setFormData({...formData, phone: val})}
            keyboardType="phone-pad" placeholder="09XXXXXXXXX"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['Male', 'Female'].map(g => (
              <TouchableOpacity 
                key={g} 
                style={[styles.genderBtn, formData.gender === g && styles.genderBtnActive]}
                onPress={() => setFormData({...formData, gender: g})}
              >
                <Text style={formData.gender === g ? styles.whiteText : styles.greenText}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Birthday</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <View style={styles.rowAlign}>
              <Calendar size={18} color={formData.birthday ? "#1B5E20" : "#94a3b8"} style={{ marginRight: 10 }} />
              <Text style={styles.inputText}>{formData.birthday ? formData.birthday.toLocaleDateString() : "MM/DD/YYYY"}</Text>
            </View>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={formData.birthday || new Date(2000, 0, 1)}
              mode="date" maximumDate={new Date()}
              onChange={(e, date) => { setShowDatePicker(false); if(date) setFormData({...formData, birthday: date}); }}
            />
          )}

          <Text style={styles.label}>Residential Address</Text>
          <TextInput 
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
            value={formData.address} onChangeText={(val) => setFormData({...formData, address: val})}
            multiline placeholder="Enter address"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <CustomAlert 
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        confirmText={customAlert.confirmText}
        cancelText={customAlert.cancelText}
        onConfirm={customAlert.onConfirm || closeAlert}
        onCancel={closeAlert}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F3DF' },
  header: { 
    alignItems: 'center', 
    paddingVertical: 35, 
    backgroundColor: '#fff', 
    borderBottomLeftRadius: 35, 
    borderBottomRightRadius: 35,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  imageWrapper: { position: 'relative' },
  imageContainer: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    backgroundColor: '#f8fafc', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  profilePic: { width: 110, height: 110, borderRadius: 55 },
  cameraIcon: { 
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    backgroundColor: '#1B5E20', 
    padding: 8, 
    borderRadius: 20, 
    borderWidth: 3, 
    borderColor: '#fff' 
  },
  nameHeader: { marginTop: 12, fontSize: 22, fontWeight: '900', color: '#fff' },
  emailHeader: { fontSize: 13, color: '#fff', fontWeight: '600' },
  form: { padding: 20 },
  label: { 
    fontWeight: '800', 
    marginBottom: 6, 
    color: '#1B5E20', 
    fontSize: 11, 
    textTransform: 'uppercase', 
    opacity: 0.7,
    letterSpacing: 0.5
  },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 18, 
    fontSize: 14, 
    fontWeight: '600',
    color: '#334155',
  },
  inputText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  disabledInput: { 
    backgroundColor: '#f1f5f9', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 18, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  disabledText: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row' },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  genderBtn: { 
    flex: 1, 
    padding: 15, 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: '#1B5E20' },
  whiteText: { color: '#fff', fontWeight: '800' },
  greenText: { color: '#1B5E20', fontWeight: '800' },
  saveBtn: { 
    backgroundColor: '#1B5E20', 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginTop: 15, 
    shadowColor: '#1B5E20', 
    shadowOpacity: 0.3, 
    shadowRadius: 10,
    elevation: 5
  },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }
});

export default EditProfileScreen;