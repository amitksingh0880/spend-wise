import Card from '@/components/ui/card';
import { Bot, Send, Sparkles, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    chatWithAI,
    getFinancialInsights,
    prepareFinancialContext,
    type ChatMessage,
    type FinancialContext
} from '@/app/services/aiService';

const VoiceAssistantScreen: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [financialContext, setFinancialContext] = useState<FinancialContext | null>(null);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    loadFinancialContext();
    loadInsights();
  }, []);

  const loadFinancialContext = async () => {
    try {
      const context = await prepareFinancialContext();
      setFinancialContext(context);
    } catch (error) {
      console.error('Error loading financial context:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const insightsData = await getFinancialInsights(financialContext || {} as FinancialContext);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const handleSend = async () => {
    if (!prompt.trim() || !financialContext) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError('');
    const currentPrompt = prompt;
    setPrompt('');
    Keyboard.dismiss();

    try {
      const aiResponse = await chatWithAI(currentPrompt, financialContext);
      
      const botMessage: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        context: financialContext,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsightPress = (insight: any) => {
    setPrompt(`Tell me more about: ${insight.title}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Ask me anything about your finances.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.chatArea}>
        {messages.length === 0 && !isLoading && !error && (
          <>
            <Card>
              <View style={styles.centered}>
                <Sparkles color="#60a5fa" size={48} />
                <Text style={styles.exampleText}>Ask me about your finances:</Text>
                <TouchableOpacity 
                  style={styles.exampleButton}
                  onPress={() => setPrompt("Where did most of my money go this month?")}
                >
                  <Text style={styles.examples}>"Where did most of my money go this month?"</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.exampleButton}
                  onPress={() => setPrompt("How can I improve my savings rate?")}
                >
                  <Text style={styles.examples}>"How can I improve my savings rate?"</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.exampleButton}
                  onPress={() => setPrompt("What are my spending trends?")}
                >
                  <Text style={styles.examples}>"What are my spending trends?"</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {insights.length > 0 && (
              <Card style={styles.insightsCard}>
                <Text style={styles.insightsTitle}>💡 Quick Insights</Text>
                {insights.slice(0, 3).map((insight) => (
                  <TouchableOpacity 
                    key={insight.id}
                    style={styles.insightItem}
                    onPress={() => handleInsightPress(insight)}
                  >
                    <View style={[
                      styles.insightIndicator,
                      { backgroundColor: insight.priority === 'high' ? '#ef4444' : insight.priority === 'medium' ? '#f59e0b' : '#22c55e' }
                    ]} />
                    <View style={styles.insightContent}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={styles.insightDescription}>{insight.content}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </>
        )}

        {messages.map((message) => (
          <View 
            key={message.id}
            style={message.role === 'user' ? styles.messageUser : styles.messageBot}
          >
            {message.role === 'user' ? (
              <>
                <Text style={styles.userMessage}>{message.content}</Text>
                <User size={24} color="#60a5fa" />
              </>
            ) : (
              <>
                <Bot size={24} color="#60a5fa" />
                <Text style={styles.botMessage}>{message.content}</Text>
              </>
            )}
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Bot size={24} color="#60a5fa" />
            <Text style={styles.loadingText}>SpendWise is thinking...</Text>
          </View>
        )}

        {error && (
          <Card style={{ backgroundColor: '#fef2f2' }}>
            <Text style={{ color: '#dc2626' }}>{error}</Text>
          </Card>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={prompt}
          placeholder="e.g., How much did I spend on food?"
          placeholderTextColor="#9ca3af"
          onChangeText={setPrompt}
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, isLoading && styles.disabledButton]}
          disabled={isLoading}
        >
          <Send size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  chatArea: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  centered: {
    alignItems: 'center',
  },
  exampleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginTop: 8,
  },
  examples: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  exampleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  insightsCard: {
    marginTop: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  insightIndicator: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 8,
  },
  loadingText: {
    color: '#9ca3af',
  },
  messageUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  userMessage: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: 10,
    borderRadius: 16,
    maxWidth: '75%',
  },
  messageBot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  botMessage: {
    backgroundColor: '#1e293b',
    color: '#f9fafb',
    padding: 10,
    borderRadius: 16,
    maxWidth: '75%',
    // whiteSpace: 'pre-wrap',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#f9fafb',
    padding: 14,
    borderRadius: 24,
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#4f46e5',
    padding: 14,
    marginLeft: 8,
    borderRadius: 50,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});

export default VoiceAssistantScreen;
