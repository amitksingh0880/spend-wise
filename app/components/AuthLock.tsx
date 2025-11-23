import authService from '@/app/services/authService';
import { GhostButton, PrimaryButton } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AuthLock({ visible, onSuccess, onCancel, forceSetup }: { visible: boolean; onSuccess: () => void; onCancel?: () => void; forceSetup?: boolean }) {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [hasBiometric, setHasBiometric] = useState<boolean>(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const bg = useThemeColor({}, 'background');

  useEffect(() => {
    (async () => {
      const h = await authService.hasPin();
      setHasPin(h);
      setSetupMode(forceSetup ? true : !h);
      // check if biometric available
      try {
        const avail = await authService.isBiometricAvailable();
        setHasBiometric(avail);
      } catch (err) {
        setHasBiometric(false);
      }
    })();
  }, [visible]);

  useEffect(() => { if (!visible) { setPin(''); setConfirmPin(''); } }, [visible]);

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pin)) { Alert.alert('Invalid PIN', 'Please enter a 4 digit numeric PIN'); return; }
    if (pin !== confirmPin) { Alert.alert('Mismatch', 'PINs do not match'); return; }
    try {
      await authService.setPin(pin);
      Alert.alert('Success', 'PIN set successfully');
      setSetupMode(false);
      setHasPin(true);
      onSuccess();
    } catch (err) {
      console.error('setPin failed', err);
      Alert.alert('Error', 'Failed to set PIN');
    }
  };

  const handleVerifyPin = async () => {
    try {
      const ok = await authService.verifyPin(pin);
      if (ok) {
        setPin('');
        onSuccess();
      } else {
        Alert.alert('Invalid PIN', 'Please check and try again');
      }
    } catch (err) {
      console.error('verifyPin failed', err);
      Alert.alert('Error', 'Failed to verify PIN');
    }
  };

  const handleBiometric = async () => {
    try {
      const ok = await authService.authenticateBiometric();
      if (ok) onSuccess();
      else Alert.alert('Authentication failed', 'Biometric authentication not recognized');
    } catch (err) {
      Alert.alert('Biometric Failed', 'Biometric authentication not available');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.wrapper, { backgroundColor: `${bg}EE` }]}>
        <View style={styles.card}>
          <Text style={styles.title}>{setupMode ? 'Set a 4-digit PIN' : 'Unlock SpendWise'}</Text>
          {setupMode ? (
            <>
              <TextInput value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry style={styles.input} placeholder="Enter PIN" />
              <TextInput value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" maxLength={4} secureTextEntry style={styles.input} placeholder="Confirm PIN" />
              <PrimaryButton onPress={handleSetPin} style={{ marginTop: 10 }}>Set PIN</PrimaryButton>
            </>
          ) : (
            <>
              <TextInput value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry style={styles.input} placeholder="Enter PIN" />
              <PrimaryButton onPress={handleVerifyPin} style={{ marginTop: 10 }}>Unlock</PrimaryButton>
              {hasBiometric && <GhostButton style={{ marginTop: 8 }} onPress={handleBiometric}>Use Fingerprint/Face</GhostButton>}
            </>
          )}
          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <GhostButton onPress={onCancel}>Cancel</GhostButton>
            {!setupMode && <GhostButton onPress={() => setSetupMode(true)}>Set/Change PIN</GhostButton>}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: 320, padding: 16, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 4 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', padding: 10, borderRadius: 8, marginTop: 8 },
});
