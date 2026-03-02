// src/components/CustomAlert.jsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { AlertTriangle, LogOut, Info, CheckCircle2 } from 'lucide-react-native';

const CustomAlert = ({ 
  visible, 
  title, 
  message, 
  onCancel, 
  onConfirm, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "danger" // 'danger', 'warning', 'info', 'success'
}) => {
  if (!visible) return null;

  // Determine icon and colors based on the type of alert
  const getConfig = () => {
    switch (type) {
      case 'danger':
        return { icon: LogOut, color: '#EF4444', bg: '#FEF2F2' };
      case 'warning':
        return { icon: AlertTriangle, color: '#F59E0B', bg: '#FFFBEB' };
      case 'success':
        return { icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' };
      case 'info':
      default:
        return { icon: Info, color: '#3B82F6', bg: '#EFF6FF' };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          
          {/* Icon Header */}
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <Icon size={28} color={config.color} strokeWidth={2.5} />
          </View>

          {/* Text Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: config.color }]} 
              onPress={onConfirm} 
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Dark slate blur
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default CustomAlert;