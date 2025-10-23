import { useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    checkSMSAndroidAvailable,
    checkSMSPermission,
    readSMSMessages,
    requestSMSPermission
} from '../../services/smsService';

export default function SMSDebugTest() {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
  };

  const testSMSAndroidPackage = () => {
    addDebugInfo('Testing SMS Android package...');
    
    // Check platform
    addDebugInfo(`Platform: ${Platform.OS}`);
    
    // Check if package is available
    const isAvailable = checkSMSAndroidAvailable();
    addDebugInfo(`SMS Android package available: ${isAvailable}`);
    
    if (!isAvailable) {
      addDebugInfo('❌ SMS Android package is not available');
      addDebugInfo('Possible solutions:');
      addDebugInfo('1. Make sure you are running on Android device/emulator');
      addDebugInfo('2. Check if react-native-get-sms-android is installed');
      addDebugInfo('3. Try running: npx expo install react-native-get-sms-android');
      addDebugInfo('4. Try running: npx expo run:android');
    } else {
      addDebugInfo('✅ SMS Android package is available');
    }
  };

  const testSMSPermissions = async () => {
    addDebugInfo('Testing SMS permissions...');
    
    try {
      const hasPermission = await checkSMSPermission();
      addDebugInfo(`SMS permission granted: ${hasPermission}`);
      
      if (!hasPermission) {
        addDebugInfo('Requesting SMS permission...');
        const granted = await requestSMSPermission();
        addDebugInfo(`Permission request result: ${granted}`);
      }
    } catch (error) {
      addDebugInfo(`Permission error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testSMSReading = async () => {
    setIsLoading(true);
    addDebugInfo('Testing SMS reading...');
    
    try {
      // Calculate minDate for last 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const messages = await readSMSMessages({
        maxCount: 10,
        minDate: sevenDaysAgo,
      });
      
      addDebugInfo(`✅ Successfully read ${messages.length} SMS messages`);
      
      if (messages.length > 0) {
        addDebugInfo('Sample messages:');
        messages.slice(0, 3).forEach((msg, index) => {
          addDebugInfo(`Message ${index + 1}:`);
          addDebugInfo(`  From: ${msg.address}`);
          addDebugInfo(`  Body: ${msg.body.substring(0, 50)}...`);
          addDebugInfo(`  Date: ${new Date(msg.date).toLocaleString()}`);
        });
      } else {
        addDebugInfo('No SMS messages found in the last 7 days');
      }
    } catch (error) {
      addDebugInfo(`❌ SMS reading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullTest = async () => {
    clearDebugInfo();
    addDebugInfo('🚀 Starting full SMS test...');
    
    testSMSAndroidPackage();
    await testSMSPermissions();
    await testSMSReading();
    
    addDebugInfo('✅ Test completed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Debug Test</Text>
      <Text style={styles.subtitle}>Debug SMS package and permissions</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={testSMSAndroidPackage}
        >
          <Text style={styles.buttonText}>Test SMS Package</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={testSMSPermissions}
        >
          <Text style={styles.buttonText}>Test Permissions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={testSMSReading}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test SMS Reading'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.fullTestButton]}
          onPress={runFullTest}
        >
          <Text style={styles.buttonText}>Run Full Test</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearDebugInfo}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.debugContainer}>
        {debugInfo.map((info, index) => (
          <Text key={index} style={styles.debugText}>
            {info}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fullTestButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
    color: '#333',
    fontFamily: 'monospace',
  },
});
