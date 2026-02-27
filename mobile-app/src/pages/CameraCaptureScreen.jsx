import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Camera as CameraIcon, Check, RefreshCcw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverService } from '../services/driverService';

const CameraCaptureScreen = ({ navigation, route }) => {
  const { binId, zoneId } = route.params || {};
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null); // 🔥 Holds the photo for preview

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 📸 STEP 1: Take the photo and show the preview
  const takePicture = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5, 
          // Removed base64: true here so the camera processes the photo much faster!
        });

        // Don't navigate yet! Just save the photo to state so they can preview it.
        setCapturedPhoto(photo);
      } catch (error) {
        console.error("Failed to take photo:", error);
        alert("Failed to capture photo. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 🗑 STEP 2A: Trash the photo and try again
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // 🚀 STEP 2B: Confirm the photo looks good and submit it!
  const handleSubmit = async () => {
    // 1. Extract the taskId you passed over!
    const { binId, taskId } = route.params || {};
    
    setIsProcessing(true);
    try {
      // 2. Fire the API call using the URI for multer! 
      await driverService.uploadEvidence(binId, taskId, capturedPhoto.uri);
      console.log("Photo submitted successfully to the database!");

      // 3. Navigate back to the nested Route tab
      navigation.navigate('CollectorDashboard', {
        screen: 'Route',
        params: { evidenceSubmittedForBin: binId },
        merge: true,
      });
    } catch (error) {
      console.error("Submit Error:", error);
      alert("Failed to submit evidence to the server. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // VIEW: PREVIEW MODE (Photo is taken)
  // ==========================================
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />
        
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            {/* Optional: Add a top close button here too if you want */}
          </View>
          
          <View style={styles.previewBottomBar}>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} disabled={isProcessing}>
              <RefreshCcw size={24} color="white" style={{ marginBottom: 5 }} />
              <Text style={styles.previewBtnText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Check size={28} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==========================================
  // VIEW: CAMERA MODE (Live feed)
  // ==========================================
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <X size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.captureBtn, isProcessing && styles.captureBtnDisabled]} 
            onPress={takePicture}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="large" />
            ) : (
              <View style={styles.innerCaptureBtn}>
                <CameraIcon size={32} color="black" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.helperText}>Ensure the cleared bin is visible</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  permissionText: { color: 'white', marginBottom: 20, fontSize: 16 },
  btn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  // Camera Styles
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { padding: 20, alignItems: 'flex-start' },
  closeBtn: { width: 45, height: 45, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  bottomBar: { paddingBottom: 50, paddingTop: 30, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'white' },
  captureBtnDisabled: { opacity: 0.5 },
  innerCaptureBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  helperText: { color: 'white', marginTop: 15, fontWeight: '600', fontSize: 14, letterSpacing: 0.5 },

  // Preview Styles
  previewImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'cover' },
  previewBottomBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 30, 
    paddingBottom: 40, 
    paddingTop: 30, 
    backgroundColor: 'rgba(0,0,0,0.7)' 
  },
  retakeBtn: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  previewBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  submitBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#10B981', 
    paddingHorizontal: 30, 
    paddingVertical: 15, 
    borderRadius: 30, 
    alignItems: 'center', 
    elevation: 5 
  },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

export default CameraCaptureScreen;