import React, { useEffect } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Typography } from './ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BlurView } from 'expo-blur';
import { Compass, Sparkles, Settings, List, PieChart, BarChart2, AlertCircle } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { emitter } from '@/libs/emitter';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const translateY = useSharedValue(0);

  useEffect(() => {
    const hideUnsub = emitter.addListener('tab-bar:hide', () => {
      translateY.value = withSpring(150, { damping: 20, stiffness: 90 });
    });
    const showUnsub = emitter.addListener('tab-bar:show', () => {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
    });
    return () => {
      hideUnsub();
      showUnsub();
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const routes = [
    { name: 'index', label: 'Home', Icon: Compass },
    { name: 'transaction', label: 'Activity', Icon: List },
    { name: 'budget', label: 'Budget', Icon: PieChart },
    { name: 'voice', label: 'Assistant', Icon: Sparkles },
    { name: 'insights', label: 'Insights', Icon: BarChart2 },
    { name: 'suspicious', label: 'Alerts', Icon: AlertCircle },
    { name: 'settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <Animated.View style={[
      styles.container, 
      animatedStyle, 
      { 
        backgroundColor: isDark ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'
      }
    ]}>
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 0} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {routes.map((route, index) => {
            const isFocused = state.index === state.routes.findIndex(r => r.name === route.name);
            const { Icon, label, name } = route;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes.find(r => r.name === name)?.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: state.routes.find(r => r.name === name)?.key,
              });
            };

            const isAssistant = label === 'Assistant';
            const activeTextColor = isDark ? '#FFFFFF' : '#1e293b';

            return (
              <TouchableOpacity
                key={route.name}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[
                  styles.tabItem,
                  isAssistant && isFocused && [styles.activeAssistantItem, { backgroundColor: isDark ? '#27272a' : '#f1f5f9' }],
                  !isAssistant && isFocused && styles.activeItem
                ]}
              >
                <View style={[
                  styles.iconWrapper,
                  isAssistant && isFocused && styles.assistantActiveCircle
                ]}>
                    <Icon 
                        size={20} 
                        color={isFocused ? (isAssistant ? activeTextColor : primary) : mutedForeground} 
                        strokeWidth={isFocused ? 2.5 : 2}
                    />
                </View>
                <Typography 
                   variant="small" 
                  weight={isFocused ? "bold" : "medium"}
                  style={{ 
                    color: isFocused ? activeTextColor : mutedForeground,
                    marginTop: 4,
                    fontSize: 10
                  }}
                >
                  {label}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 25 : 15,
    alignSelf: 'center',
    width: width * 0.9,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
    zIndex: 1000,
    elevation: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
    }),
  },
  blurContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    minWidth: '100%',
  },
  tabItem: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 25,
  },
  activeAssistantItem: {
    borderRadius: 25,
    height: '85%',
  },
  activeItem: {
    // Optional
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantActiveCircle: {
      // Optional
  }
});

export default CustomTabBar;
