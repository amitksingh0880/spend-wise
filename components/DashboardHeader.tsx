import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Typography } from './ui/text';
import { Bell } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export const DashboardHeader = ({ userName = 'Guest' }: { userName?: string }) => {
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  
  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <View>
        <Typography variant="title" weight="bold" style={{ color: text }}>
          Hello!
        </Typography>
        <Typography variant="large" weight="medium" style={{ color: text }}>
          {userName}
        </Typography>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconButton}>
          <Bell size={24} color={text} />
          <View style={styles.badge} />
        </TouchableOpacity>
        <Image 
          source={{ uri: 'https://i.pravatar.cc/150?img=11' }} 
          style={styles.avatar} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60, // Top margin for safe area
    paddingBottom: 20,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    backgroundColor: '#FF7A00', // Our primary orange
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  }
});
