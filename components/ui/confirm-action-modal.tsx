import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  message: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: 'destructive' | 'primary';
  blurIntensity?: number;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  visible,
  title,
  message,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'destructive',
  blurIntensity = 90,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const destructive = useThemeColor({}, 'destructive');
  const primary = useThemeColor({}, 'primary');
  const confirmButtonColor = confirmTone === 'primary' ? primary : destructive;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={[styles.overlayTint, { backgroundColor: 'rgba(2,6,23,0.35)' }]} />

        <View style={[styles.container, { backgroundColor: card, borderColor: border }]}> 
          <Typography variant="bold" style={[styles.title, { color: text }]}>{title}</Typography>

          <Typography variant="small" style={{ color: mutedForeground, textAlign: 'center', marginBottom: 10 }}>
            {message}
          </Typography>

          {!!warning && (
            <View style={[styles.warningBox, { borderColor: `${destructive}55`, backgroundColor: `${destructive}14` }]}> 
              <Typography variant="small" weight="bold" style={{ color: destructive, textAlign: 'center' }}>
                {warning}
              </Typography>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: muted, borderColor: border }]}
              onPress={onCancel}
              disabled={loading}
            >
              <Typography variant="bold" style={{ color: text }}>{cancelLabel}</Typography>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: confirmButtonColor }]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Typography variant="bold" style={{ color: '#FFFFFF' }}>
                {loading ? 'Please wait...' : confirmLabel}
              </Typography>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 14,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
});

export default ConfirmActionModal;
