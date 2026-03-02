import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Circle, 
  Eye, 
  EyeOff,
  ShieldCheck,
  UserPlus,
  Phone,
  Contact,
  Mail,
  X 
} from 'lucide-react-native';
import { mobileService } from '../services/mobileService';

// ✅ IMPORT CUSTOM ALERT
import CustomAlert from '../components/CustomAlert';

const { width, height } = Dimensions.get('window');

const MobileLogin = ({ navigation }) => {
  // --- HOOKS & BASIC STATES ---
  const insets = useSafeAreaInsets();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false); 
  
  // --- INPUT STATES ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // --- UI STATES ---
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // ✅ NEW: CUSTOM ALERT STATE
  const [customAlert, setCustomAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'info',
    confirmText: 'OK',
    onConfirm: null 
  });

  const closeAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  // --- ANIMATION LOGIC ---
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isSignUp ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 50
    }).start();
  }, [isSignUp]);

  // --- AUTO-CLEAN EFFECT ---
  useEffect(() => {
    resetFields();
  }, [isSignUp]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, (width - 50 - 10) / 2],
  });

  const themeColor = '#1B5E20'; 

  // --- STATE RESET HELPER ---
  const resetFields = () => {
    setFirstName('');
    setLastName('');
    setContactNumber('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAgreeToTerms(false);
  };

  // --- AUTHENTICATION HANDLER ---
  const handleAuthAction = async () => {
    if (!email || !password) {
      setCustomAlert({
        visible: true, title: "Missing Fields", message: "Please fill in all required fields.", type: "warning",
        confirmText: "OK", onConfirm: closeAlert
      });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        
        // VALIDATION: Check if email ends with @gmail.com
        if (!email.toLowerCase().endsWith('@gmail.com')) {
          setCustomAlert({
            visible: true, title: "Invalid Email", message: "Please use a valid @gmail.com email address to register.", type: "warning",
            confirmText: "OK", onConfirm: closeAlert
          });
          setLoading(false);
          return;
        }

        // VALIDATION: Check if phone number starts with 09 and is exactly 11 digits
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(contactNumber)) {
          setCustomAlert({
            visible: true, title: "Invalid Number", message: "Contact number must start with '09' and be exactly 11 digits long.", type: "warning",
            confirmText: "OK", onConfirm: closeAlert
          });
          setLoading(false);
          return;
        }

        // VALIDATION: Passwords & Terms
        if (password !== confirmPassword) {
          setCustomAlert({
            visible: true, title: "Password Mismatch", message: "Your passwords do not match. Please try again.", type: "danger",
            confirmText: "OK", onConfirm: closeAlert
          });
          setPassword('');
          setConfirmPassword('');
          setLoading(false);
          return;
        }

        if (!agreeToTerms) {
          setCustomAlert({
            visible: true, title: "Terms & Conditions", message: "Please agree to the Terms & Privacy Policy to continue.", type: "info",
            confirmText: "OK", onConfirm: closeAlert
          });
          setLoading(false);
          return;
        }

        // Registration API Call
        const response = await mobileService.register({
          firstName,
          lastName,
          phone: contactNumber,
          email,
          password
        });

        const data = await response.json();

        if (response.ok) {
          setCustomAlert({
            visible: true, title: "Success!", message: "Account created successfully! Please log in.", type: "success",
            confirmText: "Login Now", 
            onConfirm: () => { 
              closeAlert(); 
              resetFields(); 
              setIsSignUp(false); 
            }
          });
        } else {
          // Duplicate Email Check handling
          const errorMsg = data.message ? data.message.toLowerCase() : "";
          if (errorMsg.includes('email') || errorMsg.includes('duplicate') || errorMsg.includes('exist')) {
             setCustomAlert({
               visible: true, title: "Email Taken", message: "This Gmail account already exists. Please use a different one.", type: "danger",
               confirmText: "OK", onConfirm: closeAlert
             });
          } else {
             setCustomAlert({
               visible: true, title: "Registration Failed", message: data.message || "Account creation failed.", type: "danger",
               confirmText: "OK", onConfirm: closeAlert
             });
          }
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        // Login API Call
        const response = await mobileService.login(email, password);
        const data = await response.json();

        if (response.ok) {
          if (data.user.status === 'Inactive') {
            setCustomAlert({
              visible: true, title: "Account Inactive", message: "Your account is currently inactive. Please contact the administrator.", type: "warning",
              confirmText: "OK", onConfirm: closeAlert
            });
            resetFields();
            setLoading(false);
            return;
          }
          // Role-based Navigation
          const role = data.user.role;
          switch (role) {
            case 'Driver': navigation.replace('DriverDashboard'); break;
            case 'Collector': navigation.replace('CollectorDashboard'); break;
            case 'Citizen': navigation.replace('Dashboard'); break;
            default: 
              setCustomAlert({
                visible: true, title: "Access Denied", message: "Unauthorized role detected.", type: "danger",
                confirmText: "OK", onConfirm: closeAlert
              });
              break;
          }
        } else {
          setCustomAlert({
            visible: true, title: "Login Failed", message: typeof data === 'string' ? data : data.message, type: "danger",
            confirmText: "OK", onConfirm: closeAlert
          });
          setPassword('');
          setShowPassword(false);
        }
      }
    } catch (err) {
      setCustomAlert({
        visible: true, title: "Connection Error", message: "Could not connect to the server. Please check your internet connection.", type: "danger",
        confirmText: "OK", onConfirm: closeAlert
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
        >

          {/* --- 1. BRANDING GROUP --- */}
          <View style={styles.headerSection}>
            <View style={styles.logoWrapper}>
              <Image 
                source={require('../../assets/Logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            </View>
            <Text style={styles.brandTitle}>AksyonBasura</Text>
            <Text style={styles.brandTagline}>
              Integrated Waste Management &{"\n"}
              Mobile Collection Monitoring System
            </Text>
          </View>

          {/* --- 2. MAIN AUTH CARD GROUP --- */}
          <View style={styles.loginCard}>
            
            {/* --- 2A. TOGGLE SWITCH GROUP --- */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleBackground}>
                <Animated.View 
                  style={[
                    styles.slidingIndicator, 
                    { 
                      transform: [{ translateX }], 
                      backgroundColor: themeColor 
                    }
                  ]} 
                />
                <TouchableOpacity 
                  style={styles.toggleBtn} 
                  onPress={() => setIsSignUp(false)} 
                  activeOpacity={1}
                >
                  <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
                    Login
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.toggleBtn} 
                  onPress={() => setIsSignUp(true)} 
                  activeOpacity={1}
                >
                  <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              {/* --- 2B. MODE INDICATOR --- */}
              <View style={styles.modeIndicator}>
                {isSignUp ? (
                  <UserPlus size={18} color={themeColor} />
                ) : (
                  <ShieldCheck size={18} color={themeColor} />
                )}
                <Text style={[styles.modeTitle, { color: themeColor }]}>
                  {isSignUp ? "Citizen Registration" : "Authorized Access"}
                </Text>
              </View>

              {/* --- 2C. FORM INPUT GROUP --- */}
              {isSignUp && (
                <>
                  <View style={styles.inputContainer}>
                    <Contact size={18} color="#94a3b8" />
                    <TextInput 
                      placeholder="First Name" 
                      placeholderTextColor="#94a3b8" 
                      style={styles.textInput} 
                      value={firstName} 
                      onChangeText={setFirstName} 
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Contact size={18} color="#94a3b8" />
                    <TextInput 
                      placeholder="Last Name" 
                      placeholderTextColor="#94a3b8" 
                      style={styles.textInput} 
                      value={lastName} 
                      onChangeText={setLastName} 
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Phone size={18} color="#94a3b8" />
                    <TextInput 
                      placeholder="Contact Number (e.g. 09XXXXXXXXX)" 
                      placeholderTextColor="#94a3b8" 
                      style={styles.textInput} 
                      keyboardType="phone-pad" 
                      maxLength={11} 
                      value={contactNumber} 
                      onChangeText={setContactNumber} 
                    />
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Mail size={18} color="#94a3b8" />
                <TextInput 
                  placeholder="Email Address" 
                  placeholderTextColor="#94a3b8" 
                  style={styles.textInput} 
                  value={email} 
                  onChangeText={setEmail} 
                  autoCapitalize="none" 
                  keyboardType="email-address" 
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={18} color="#94a3b8" />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor="#94a3b8" 
                  style={styles.textInput} 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry={!showPassword} 
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>

              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Lock size={18} color="#94a3b8" />
                  <TextInput 
                    placeholder="Confirm Password" 
                    placeholderTextColor="#94a3b8" 
                    style={styles.textInput} 
                    value={confirmPassword} 
                    onChangeText={setConfirmPassword} 
                    secureTextEntry={!showPassword} 
                  />
                </View>
              )}

              {/* --- 2D. POLICY & ACTIONS GROUP --- */}
              {!isSignUp ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    onPress={() => setRememberMe(!rememberMe)} 
                    style={styles.checkboxContainer}
                  >
                    {rememberMe ? (
                      <CheckCircle2 size={18} color={themeColor} />
                    ) : (
                      <Circle size={18} color="#cbd5e1" />
                    )}
                    <Text style={styles.checkboxLabel}>Remember me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={[styles.forgotText, { color: themeColor }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.termsRow}>
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => setAgreeToTerms(!agreeToTerms)} 
                    style={styles.checkboxOnly}
                  >
                      {agreeToTerms ? (
                        <CheckCircle2 size={18} color={themeColor} />
                      ) : (
                        <Circle size={18} color="#cbd5e1" />
                      )}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>
                    I agree to the{" "}
                    <Text 
                      onPress={() => setShowTermsModal(true)} 
                      style={styles.termsLink}
                    >
                      Terms & Privacy Policy
                    </Text>
                  </Text>
                </View>
              )}

              {/* --- 2E. SUBMIT BUTTON GROUP --- */}
              <TouchableOpacity 
                activeOpacity={0.9} 
                disabled={loading} 
                style={[
                  styles.submitBtn, 
                  { backgroundColor: themeColor }, 
                  loading && { opacity: 0.7 }
                ]} 
                onPress={handleAuthAction}
              > 
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      {isSignUp ? 'Create Account' : 'Login'}
                    </Text>
                    <ArrowRight size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              {/* --- 2F. SOCIAL AUTH GROUP --- */}
              <View style={styles.dividerArea}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.line} />
              </View>
              <TouchableOpacity activeOpacity={0.7} style={styles.googleBtn}>
                <Image 
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
                  style={styles.googleIcon} 
                />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.footerPolicy}>LGU Environmental Service Portal © 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- 3. OVERLAY MODAL GROUP --- */}
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={showTermsModal} 
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Privacy Policy</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <X size={24} color="#334155" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.policyHeading}>1. Collection Service</Text>
              <Text style={styles.policyText}>
                AksyonBasura provides waste collection monitoring. Users must 
                ensure waste is segregated according to LGU guidelines 
                before the collection vehicle arrives.
              </Text>
              <Text style={styles.policyHeading}>2. Data Privacy</Text>
              <Text style={styles.policyText}>
                We collect your name, contact number, and location data 
                to improve collection efficiency. Your data is protected 
                and never sold to third parties.
              </Text>
              <Text style={styles.policyHeading}>3. User Conduct</Text>
              <Text style={styles.policyText}>
                Reporting false waste locations or misusing the platform 
                may lead to account deactivation by the administrator.
              </Text>
              <Text style={styles.policyHeading}>4. Notifications</Text>
              <Text style={styles.policyText}>
                By creating an account, you agree to receive SMS or App 
                notifications regarding garbage collection schedules 
                and environmental announcements.
              </Text>
              <View style={{ height: 40 }} />
            </ScrollView>
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: themeColor, marginBottom: 20 }]} 
              onPress={() => { setAgreeToTerms(true); setShowTermsModal(false); }}
            >
              <Text style={styles.submitBtnText}>I Understand & Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ NEW: CUSTOM ALERT RENDER */}
      <CustomAlert 
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        confirmText={customAlert.confirmText}
        onConfirm={customAlert.onConfirm || closeAlert}
        onCancel={closeAlert}
      />
    </View>
  );
};

// --- STYLING GROUP ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#EAF5E8' 
  },
  scrollContainer: { 
    paddingHorizontal: 25, 
    paddingBottom: 40, 
    alignItems: 'center' 
  },
  headerSection: { 
    alignItems: 'center', 
    marginBottom: 30 
  },
  logoWrapper: { 
    width: 120, 
    height: 120, 
    backgroundColor: '#fff', 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowOffset: { width: 0, height: 4 } 
  },
  logoImage: { 
    width: 100, 
    height: 100 
  },
  brandTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#0f172a', 
    letterSpacing: -1 
  },
  brandTagline: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: '#64748b', 
    textAlign: 'center', 
    marginTop: 8, 
    lineHeight: 15, 
    textTransform: 'uppercase' 
  },
  loginCard: { 
    width: '100%', 
    backgroundColor: '#fff', 
    borderRadius: 35, 
    padding: 10, 
    elevation: 20, 
    shadowColor: '#1B5E20', 
    shadowOpacity: 0.12, 
    shadowRadius: 30 
  },
  toggleContainer: { 
    width: '100%', 
    paddingHorizontal: 5, 
    marginTop: 5 
  },
  toggleBackground: { 
    height: 60, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 30, 
    flexDirection: 'row', 
    position: 'relative', 
    padding: 4, 
    alignItems: 'center' 
  },
  slidingIndicator: { 
    position: 'absolute', 
    width: '50%', 
    height: 52, 
    borderRadius: 26, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowOffset: { width: 0, height: 2 } 
  },
  toggleBtn: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100%', 
    zIndex: 2 
  },
  toggleText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#94a3b8' 
  },
  toggleTextActive: { 
    color: '#fff' 
  },
  formSection: { 
    padding: 22 
  },
  modeIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    marginBottom: 20 
  },
  modeTitle: { 
    fontSize: 12, 
    fontWeight: '900', 
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#f1f5f9' 
  },
  textInput: { 
    flex: 1, 
    paddingVertical: 14, 
    paddingHorizontal: 10, 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#334155' 
  },
  eyeBtn: { 
    padding: 5 
  },
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingHorizontal: 8 
  },
  checkboxContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  checkboxLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#64748b' 
  },
  forgotText: { 
    fontSize: 12, 
    fontWeight: '900' 
  },
  termsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingHorizontal: 8, 
    gap: 10 
  },
  checkboxOnly: { 
    padding: 2 
  },
  termsText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#64748b', 
    flex: 1 
  },
  termsLink: { 
    color: '#1B5E20', 
    textDecorationLine: 'underline' 
  },
  submitBtn: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 18, 
    borderRadius: 22, 
    gap: 12, 
    elevation: 4, 
    marginTop: 10 
  },
  submitBtnText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '900', 
    textTransform: 'uppercase' 
  },
  dividerArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 20 
  },
  line: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#f1f5f9' 
  },
  dividerText: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#cbd5e1', 
    paddingHorizontal: 15 
  },
  googleBtn: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderRadius: 22, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    backgroundColor: '#fff', 
    gap: 12 
  },
  googleIcon: { 
    width: 20, 
    height: 20 
  },
  googleBtnText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#334155' 
  },
  footerPolicy: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#94a3b8', 
    marginTop: 40, 
    textTransform: 'uppercase', 
    textAlign: 'center', 
    letterSpacing: 1 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    paddingHorizontal: 25, 
    maxHeight: height * 0.8 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#0f172a' 
  },
  modalBody: { 
    marginBottom: 20 
  },
  policyHeading: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#1B5E20', 
    marginTop: 15, 
    marginBottom: 5 
  },
  policyText: { 
    fontSize: 13, 
    color: '#64748b', 
    lineHeight: 20, 
    fontWeight: '600' 
  }
});

export default MobileLogin;