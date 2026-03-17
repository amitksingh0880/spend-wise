import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Typography } from './ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BlurView } from 'expo-blur';
import { Compass, Sparkles, Settings, List, PieChart, BarChart2, AlertCircle } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const primary = useThemeColor({}, 'primary');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

  // Map routes to our three buttons
  // index -> Explore
  // voice -> Assistant
  // settings -> Configs
  
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
    <View style={styles.container}>
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={styles.blurContainer}>
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

            return (
              <TouchableOpacity
                key={route.name}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[
                  styles.tabItem,
                  isAssistant && isFocused && styles.activeAssistantItem,
                  !isAssistant && isFocused && styles.activeItem
                ]}
              >
                <View style={[
                  styles.iconWrapper,
                  isAssistant && isFocused && styles.assistantActiveCircle
                ]}>
                    <Icon 
                        size={20} 
                        color={isFocused ? (isAssistant ? '#1e293b' : primary) : mutedForeground} 
                        strokeWidth={isFocused ? 2.5 : 2}
                    />
                </View>
                <Typography 
                  variant="small" 
                  weight={isFocused ? "bold" : "medium"}
                  style={{ 
                    color: isFocused ? '#1e293b' : mutedForeground,
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    alignSelf: 'center',
    width: width * 0.9,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // More opaque for better visibility
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
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
    width: 60, // Fixed width for scrollable tabs
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 25,
  },
  activeAssistantItem: {
    backgroundColor: '#f1f5f9',
    borderRadius: 25,
    height: '85%',
  },
  activeItem: {
    // Optional: add subtle background for other active items if needed
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantActiveCircle: {
      // Styling for the assistant icon specifically if needed
  }
});

export default CustomTabBar;
