import {
    chatWithAI,
    prepareFinancialContext,
    type ChatMessage,
    type FinancialContext
} from '@/app/services/aiService';
import { Card } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Bot, Mic, Send, Sparkles, User, ChevronRight, MessageSquare, Info } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, FadeIn, Layout, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const VoiceAssistantScreen: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [financialContext, setFinancialContext] = useState<FinancialContext | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const cardColor = useThemeColor({}, 'card');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const context = await prepareFinancialContext();
      setFinancialContext(context);
    } catch (error) {
      console.error('Error loading context:', error);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const finalPrompt = textOverride || prompt;
    if (!finalPrompt.trim() || !financialContext) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: finalPrompt,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setPrompt('');
    Keyboard.dismiss();

    try {
      const aiResponse = await chatWithAI(finalPrompt, financialContext);
      
      const botMessage: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (e: any) {
      console.error('AI Error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const ThinkingIndicator = () => {
    const opacity = useSharedValue(0.4);
    useEffect(() => {
      opacity.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0.4, { duration: 500 })), -1);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
      <View style={styles.thinkingContainer}>
        <Animated.View style={[styles.thinkingDot, { backgroundColor: primary }, animatedStyle]} />
        <Animated.View style={[styles.thinkingDot, { backgroundColor: primary, marginHorizontal: 4 }, animatedStyle]} />
        <Animated.View style={[styles.thinkingDot, { backgroundColor: primary }, animatedStyle]} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#4f46e5', '#3730a3']}
        style={styles.headerGradient}
      >
        <Typography variant="title" weight="bold" style={styles.headerTitle}>AI Assistant</Typography>
        <Typography style={styles.headerSubtitle}>Personalized financial guidance</Typography>
      </LinearGradient>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.chatArea}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <Animated.View entering={FadeIn.delay(300)} style={styles.welcomeContainer}>
            <View style={styles.sparkleIcon}>
              <Sparkles size={40} color="#818cf8" />
            </View>
            <Typography variant="subtitle" weight="bold" style={{ textAlign: 'center' }}>How can I help you today?</Typography>
            <Typography variant="small" style={{ color: mutedForeground, textAlign: 'center', marginTop: 8 }}>
              I can analyze your spending, help with budgeting, or provide saving tips.
            </Typography>

            <View style={styles.suggestionGrid}>
              {[
                "Analyze my spending this month",
                "Where can I save more?",
                "Am I on track with my budget?",
                "Give me a financial tip"
              ].map((suggestion, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.suggestionButton}
                  onPress={() => handleSend(suggestion)}
                >
                  <MessageSquare size={14} color={primary} />
                  <Typography variant="small" weight="medium" style={styles.suggestionText}>{suggestion}</Typography>
                  <ChevronRight size={14} color={mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {messages.map((message, index) => (
          <Animated.View 
            key={message.id} 
            entering={message.role === 'user' ? FadeInRight : FadeInUp}
            layout={Layout.springify()}
            style={[
              styles.messageWrapper,
              message.role === 'user' ? styles.userWrapper : styles.botWrapper
            ]}
          >
            {message.role === 'assistant' && (
              <View style={[styles.avatar, { backgroundColor: '#eef2ff' }]}>
                <Bot size={16} color={primary} />
              </View>
            )}
            <View style={[
              styles.messageBubble,
              message.role === 'user' ? [styles.userBubble, { backgroundColor: primary }] : [styles.botBubble, { backgroundColor: '#f8fafc' }]
            ]}>
              <Typography 
                style={[
                  styles.messageText, 
                  { color: message.role === 'user' ? '#FFFFFF' : '#1e293b' }
                ]}
              >
                {message.content}
              </Typography>
            </View>
            {message.role === 'user' && (
              <View style={[styles.avatar, { backgroundColor: '#f1f5f9' }]}>
                <User size={16} color={mutedForeground} />
              </View>
            )}
          </Animated.View>
        ))}

        {isLoading && (
          <Animated.View entering={FadeInUp} style={styles.botWrapper}>
            <View style={[styles.avatar, { backgroundColor: '#eef2ff' }]}>
              <Bot size={16} color={primary} />
            </View>
            <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: '#f8fafc' }]}>
              <ThinkingIndicator />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { borderTopColor: '#f1f5f9' }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Ask anything..."
            placeholderTextColor={mutedForeground}
            multiline
            maxHeight={100}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: prompt.trim() ? primary : '#f1f5f9' }]}
            onPress={() => handleSend()}
            disabled={!prompt.trim() || isLoading}
          >
            <Send size={20} color={prompt.trim() ? '#FFFFFF' : mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  chatArea: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  welcomeContainer: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sparkleIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  suggestionGrid: {
    marginTop: 32,
    width: '100%',
    gap: 12,
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  botWrapper: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  thinkingContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    color: '#1e293b',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default VoiceAssistantScreen;
