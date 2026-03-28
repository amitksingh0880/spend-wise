import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from './ui/text';
import { Bell } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as ImagePicker from 'expo-image-picker';
import { getUserPreferences, saveUserPreferences } from '@/services/preferencesService';
import { emitter } from '@/libs/emitter';

export const DashboardHeader = ({ userName: propUserName }: { userName?: string }) => {
  const background = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();
  const text = useThemeColor({}, 'text');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [userName, setUserName] = useState(propUserName || 'User');
  const [appName, setAppName] = useState('SpendWise');

  const loadPrefs = async () => {
    const prefs = await getUserPreferences();
    if (prefs.avatarUri) {
      setAvatarUri(prefs.avatarUri);
    }
    if (prefs.name) {
      setUserName(prefs.name);
    } else if (propUserName) {
      setUserName(propUserName);
    }
    if (prefs.appName) {
      setAppName(prefs.appName);
    }
  };

  useEffect(() => {
    loadPrefs();

    const unsub = emitter.addListener('preferences:changed', (prefs: any) => {
      if (prefs.name) setUserName(prefs.name);
      if (prefs.avatarUri) setAvatarUri(prefs.avatarUri);
      if (prefs.appName) setAppName(prefs.appName);
    });

    return () => { unsub(); };
  }, [propUserName]);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        await saveUserPreferences({ avatarUri: uri });
      }
    } catch (error) {
      console.error('Failed to pick avatar image:', error);
      Alert.alert('Error', 'Failed to save the image.');
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: Math.max(insets.top, 10) }]}>
      <View>
        <Typography variant="title" weight="bold" style={{ color: text }}>
          {appName}
        </Typography>
        <Typography variant="large" weight="medium" style={{ color: text }}>
          Hello, {userName}
        </Typography>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconButton}>
          <Bell size={24} color={text} />
          <View style={styles.badge} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickAvatar}>
          <Image 
            source={{ uri: avatarUri || 'https://i.pravatar.cc/150?img=11' }} 
            style={styles.avatar} 
          />
        </TouchableOpacity>
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
