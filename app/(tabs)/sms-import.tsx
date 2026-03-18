import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import SMSImport from '@/components/SMSImport';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SMSImportScreen() {
  const background = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.content}>
        <SMSImport
          onImportComplete={(result) => {
            console.log('SMS Import completed:', result);
            // You can add navigation back or other completion actions here
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});