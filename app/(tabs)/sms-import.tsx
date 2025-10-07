import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import SMSImport from '../components/SMSImport';

export default function SMSImportScreen() {
  return (
    <SafeAreaView style={styles.container}>
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
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
  },
});