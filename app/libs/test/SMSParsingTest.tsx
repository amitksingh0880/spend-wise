import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { MessageCircle, TestTube, CheckCircle } from 'lucide-react-native';
import Card from '@/components/ui/card';
import {
  parseTransactionSMS,
  extractAmount,
  extractVendor,
  categorizeTransaction,
  determineTransactionType,
  isTransactionSMS,
} from '@/app/services/smsService';

export default function SMSTestScreen() {
  const [testResults, setTestResults] = useState<any[]>([]);

  // Sample SMS messages for testing
  const sampleSMSMessages = [
    {
      _id: '1',
      address: 'HD-SBIINB',
      body: 'Dear Customer, Rs.2,500.00 debited from A/c XX1234 on 08-Oct-24 to SWIGGY DELHI for UPI transaction. Avl Bal Rs.15,000.00',
      date: Date.now(),
      type: 1,
    },
    {
      _id: '2',
      address: 'AX-HDFCBK',
      body: 'Rs 1200 spent at AMAZON INDIA using HDFC Card ending 5678 on 08-Oct-24. Available limit Rs 85000. SMS BLOCK 5678 to 5676712 to block card.',
      date: Date.now(),
      type: 1,
    },
    {
      _id: '3',
      address: 'VM-ICICIBC',
      body: 'Amount of Rs.500.00 credited to A/c XX9876 on 08-Oct-24. Salary credited by COMPANY ABC. Available Balance Rs.50,000.00',
      date: Date.now(),
      type: 1,
    },
    {
      _id: '4',
      address: 'BP-KOTAKB',
      body: 'Your UPI payment of Rs.150 to UBER INDIA has been successful. Transaction ID: 123456789. Balance: Rs.25,000',
      date: Date.now(),
      type: 1,
    },
    {
      _id: '5',
      address: 'VM-SBICARD',
      body: 'Purchase of Rs.3500 made using SBI Card 1234 at BIG BAZAAR on 08-OCT-24. Outstanding: Rs.15000. Min due: Rs.500',
      date: Date.now(),
      type: 1,
    },
  ];

  const testSMSParsing = () => {
    const results = [];
    
    for (const sms of sampleSMSMessages) {
      const isTransaction = isTransactionSMS(sms.body);
      const amount = extractAmount(sms.body);
      const vendor = extractVendor(sms.body);
      const category = categorizeTransaction(vendor, sms.body);
      const type = determineTransactionType(sms.body);
      const expense = parseTransactionSMS(sms);
      
      results.push({
        original: sms.body,
        isTransaction,
        amount,
        vendor,
        category,
        type,
        expense,
        sender: sms.address,
      });
    }
    
    setTestResults(results);
    
    Alert.alert(
      'Test Complete',
      `Processed ${sampleSMSMessages.length} SMS messages. Check results below.`,
      [{ text: 'OK' }]
    );
  };

  const renderTestResult = (result: any, index: number) => (
    <Card key={index} style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.senderText}>{result.sender}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: result.isTransaction ? '#10b981' : '#ef4444' }
        ]}>
          <Text style={styles.statusText}>
            {result.isTransaction ? 'Transaction' : 'Not Transaction'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.originalText} numberOfLines={3}>
        {result.original}
      </Text>
      
      {result.expense && (
        <View style={styles.extractedInfo}>
          <Text style={styles.extractedTitle}>Extracted Information:</Text>
          <Text style={styles.extractedDetail}>
            Amount: ₹{result.expense.amount}
          </Text>
          <Text style={styles.extractedDetail}>
            Vendor: {result.expense.vendor}
          </Text>
          <Text style={styles.extractedDetail}>
            Category: {result.expense.category}
          </Text>
          <Text style={styles.extractedDetail}>
            Type: {result.expense.type}
          </Text>
          <Text style={styles.extractedDetail}>
            Confidence: {Math.round(result.expense.confidence * 100)}%
          </Text>
        </View>
      )}
      
      {!result.expense && result.isTransaction && (
        <Text style={styles.noExtractionText}>
          Could not extract transaction details
        </Text>
      )}
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MessageCircle size={32} color="#3b82f6" />
        <Text style={styles.title}>SMS Parsing Test</Text>
      </View>
      
      <Text style={styles.description}>
        Test the SMS parsing functionality with sample bank SMS messages to see how the expense extraction works.
      </Text>
      
      {Platform.OS !== 'android' && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ Note: SMS reading is only supported on Android devices. This test uses sample data.
          </Text>
        </Card>
      )}
      
      <TouchableOpacity style={styles.testButton} onPress={testSMSParsing}>
        <TestTube size={20} color="#ffffff" />
        <Text style={styles.testButtonText}>Run SMS Parsing Test</Text>
      </TouchableOpacity>
      
      {testResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.map(renderTestResult)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginBottom: 20,
  },
  warningCard: {
    backgroundColor: '#fef3cd',
    borderColor: '#fbbf24',
    borderWidth: 1,
    marginBottom: 16,
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsSection: {
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  resultCard: {
    marginBottom: 16,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  originalText: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  extractedInfo: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
  },
  extractedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  extractedDetail: {
    fontSize: 12,
    color: '#d1d5db',
    marginBottom: 4,
  },
  noExtractionText: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
  },
});