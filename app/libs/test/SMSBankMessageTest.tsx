import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { extractAmount, extractVendor, isBankSMS, isTransactionSMS, parseTransactionSMS, SMSMessage } from '../../services/smsService';

// Sample bank SMS messages for testing
const SAMPLE_BANK_MESSAGES: SMSMessage[] = [
  {
    _id: '1',
    address: 'SBI',
    body: 'Dear Customer, Rs.500.00 debited from A/c **1234 on 15-Jan-24 at 10:30 AM. Available balance: Rs.25,000.00. - SBI',
    date: Date.now(),
    type: 1
  },
  {
    _id: '2',
    address: 'HDFCBK',
    body: 'Your HDFC Bank Credit Card ending 5678 has been charged Rs.1,250.00 at AMAZON INDIA on 15-Jan-24. Available credit limit: Rs.45,000.00',
    date: Date.now(),
    type: 1
  },
  {
    _id: '3',
    address: 'ICICI',
    body: 'Rs.2,500.00 credited to your ICICI Bank A/c **9876 on 15-Jan-24. UPI Ref: 123456789012. Available balance: Rs.50,000.00',
    date: Date.now(),
    type: 1
  },
  {
    _id: '4',
    address: 'KOTAK',
    body: 'Kotak Bank: Rs.750.00 debited from your account **5432 for UPI payment to SWIGGY on 15-Jan-24. Balance: Rs.15,000.00',
    date: Date.now(),
    type: 1
  },
  {
    _id: '5',
    address: 'AXIS',
    body: 'Axis Bank: Your card ending 1234 was used for Rs.3,200.00 at FLIPKART on 15-Jan-24. Available limit: Rs.20,000.00',
    date: Date.now(),
    type: 1
  },
  {
    _id: '6',
    address: 'PAYTM',
    body: 'Payment of Rs.150.00 successful to UBER via Paytm UPI on 15-Jan-24. Transaction ID: PTM123456789',
    date: Date.now(),
    type: 1
  },
  {
    _id: '7',
    address: 'GOOGLEPAY',
    body: 'Rs.500.00 sent to ZOMATO via Google Pay UPI on 15-Jan-24. UPI Ref: 987654321098',
    date: Date.now(),
    type: 1
  },
  {
    _id: '8',
    address: 'PHONEPE',
    body: 'Rs.2,000.00 transferred to BOOKMYSHOW via PhonePe UPI on 15-Jan-24. Transaction successful.',
    date: Date.now(),
    type: 1
  },
  {
    _id: '9',
    address: 'BHIM',
    body: 'Rs.1,500.00 paid to NETFLIX via BHIM UPI on 15-Jan-24. UPI Ref: 112233445566',
    date: Date.now(),
    type: 1
  },
  {
    _id: '10',
    address: 'AMAZONPAY',
    body: 'Rs.800.00 added to Amazon Pay balance on 15-Jan-24. New balance: Rs.1,200.00',
    date: Date.now(),
    type: 1
  },
  {
    _id: '11',
    address: 'JIO',
    body: 'Rs.299.00 debited for Jio Postpaid bill payment on 15-Jan-24. Next due: 15-Feb-24',
    date: Date.now(),
    type: 1
  },
  {
    _id: '12',
    address: 'AIRTEL',
    body: 'Rs.199.00 recharged successfully to your Airtel number on 15-Jan-24. Validity: 28 days',
    date: Date.now(),
    type: 1
  },
  {
    _id: '13',
    address: 'SPOTIFY',
    body: 'Rs.99.00 charged for Spotify Premium subscription on 15-Jan-24. Next billing: 15-Feb-24',
    date: Date.now(),
    type: 1
  },
  {
    _id: '14',
    address: 'YOUTUBE',
    body: 'Rs.129.00 charged for YouTube Premium subscription on 15-Jan-24. Auto-renewal enabled.',
    date: Date.now(),
    type: 1
  },
  {
    _id: '15',
    address: 'UBER',
    body: 'Rs.180.00 charged for your Uber ride on 15-Jan-24. Trip completed successfully.',
    date: Date.now(),
    type: 1
  },
  {
    _id: '16',
    address: 'OLA',
    body: 'Rs.220.00 charged for your Ola ride on 15-Jan-24. Payment successful via UPI.',
    date: Date.now(),
    type: 1
  },
  {
    _id: '17',
    address: 'SWIGGY',
    body: 'Rs.350.00 charged for your Swiggy order on 15-Jan-24. Order delivered successfully.',
    date: Date.now(),
    type: 1
  },
  {
    _id: '18',
    address: 'ZOMATO',
    body: 'Rs.280.00 charged for your Zomato order on 15-Jan-24. Food delivered successfully.',
    date: Date.now(),
    type: 1
  },
  {
    _id: '19',
    address: 'FLIPKART',
    body: 'Rs.1,800.00 charged for your Flipkart purchase on 15-Jan-24. Order confirmed.',
    date: Date.now(),
    type: 1
  },
  {
    _id: '20',
    address: 'AMAZON',
    body: 'Rs.2,500.00 charged for your Amazon purchase on 15-Jan-24. Order shipped.',
    date: Date.now(),
    type: 1
  }
];

export default function SMSBankMessageTest() {
  const [results, setResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const testBankMessageParsing = async () => {
    setIsProcessing(true);
    const testResults: any[] = [];

    for (const message of SAMPLE_BANK_MESSAGES) {
      try {
        const isBank = isBankSMS(message.address, message.body);
        const isTransaction = isTransactionSMS(message.body);
        const amount = extractAmount(message.body);
        const vendor = extractVendor(message.body);
        const parsedExpense = parseTransactionSMS(message);

        testResults.push({
          id: message._id,
          sender: message.address,
          message: message.body,
          isBank,
          isTransaction,
          amount,
          vendor,
          parsedExpense,
          success: !!parsedExpense
        });
      } catch (error) {
        testResults.push({
          id: message._id,
          sender: message.address,
          message: message.body,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    setResults(testResults);
    setIsProcessing(false);
  };

  const renderResult = (result: any, index: number) => (
    <View key={index} style={styles.resultItem}>
      <Text style={styles.resultTitle}>Message {result.id}</Text>
      <Text style={styles.resultSender}>Sender: {result.sender}</Text>
      <Text style={styles.resultMessage}>{result.message}</Text>
      
      <View style={styles.resultDetails}>
        <Text style={styles.resultDetail}>
          Is Bank SMS: {result.isBank ? '✅' : '❌'}
        </Text>
        <Text style={styles.resultDetail}>
          Is Transaction: {result.isTransaction ? '✅' : '❌'}
        </Text>
        <Text style={styles.resultDetail}>
          Amount: {result.amount || 'Not found'}
        </Text>
        <Text style={styles.resultDetail}>
          Vendor: {result.vendor || 'Not found'}
        </Text>
        <Text style={styles.resultDetail}>
          Success: {result.success ? '✅' : '❌'}
        </Text>
      </View>

      {result.parsedExpense && (
        <View style={styles.parsedExpense}>
          <Text style={styles.parsedTitle}>Parsed Expense:</Text>
          <Text style={styles.parsedText}>Amount: ₹{result.parsedExpense.amount}</Text>
          <Text style={styles.parsedText}>Vendor: {result.parsedExpense.vendor}</Text>
          <Text style={styles.parsedText}>Type: {result.parsedExpense.type}</Text>
          <Text style={styles.parsedText}>Category: {result.parsedExpense.category}</Text>
          <Text style={styles.parsedText}>Confidence: {Math.round(result.parsedExpense.confidence * 100)}%</Text>
        </View>
      )}

      {result.error && (
        <Text style={styles.errorText}>Error: {result.error}</Text>
      )}
    </View>
  );

  const getSummary = () => {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const bankSMS = results.filter(r => r.isBank).length;
    const transactionSMS = results.filter(r => r.isTransaction).length;
    
    return {
      total,
      successful,
      bankSMS,
      transactionSMS,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0
    };
  };

  const summary = getSummary();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Bank Message Parser Test</Text>
      <Text style={styles.subtitle}>Testing improved SMS parsing with sample bank messages</Text>
      
      <TouchableOpacity
        style={styles.testButton}
        onPress={testBankMessageParsing}
        disabled={isProcessing}
      >
        <Text style={styles.testButtonText}>
          {isProcessing ? 'Processing...' : 'Test Bank Message Parsing'}
        </Text>
      </TouchableOpacity>

      {results.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Test Summary</Text>
          <Text style={styles.summaryText}>Total Messages: {summary.total}</Text>
          <Text style={styles.summaryText}>Bank SMS: {summary.bankSMS}</Text>
          <Text style={styles.summaryText}>Transaction SMS: {summary.transactionSMS}</Text>
          <Text style={styles.summaryText}>Successfully Parsed: {summary.successful}</Text>
          <Text style={styles.summaryText}>Success Rate: {summary.successRate}%</Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        {results.map(renderResult)}
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
  testButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summary: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  resultSender: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  resultDetails: {
    marginBottom: 8,
  },
  resultDetail: {
    fontSize: 12,
    marginBottom: 2,
    color: '#666',
  },
  parsedExpense: {
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  parsedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  parsedText: {
    fontSize: 12,
    marginBottom: 2,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginTop: 4,
  },
});
