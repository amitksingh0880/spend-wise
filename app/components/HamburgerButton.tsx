/**
 * HamburgerButton.tsx
 *
 * A reusable menu/hamburger icon button that opens the sidebar drawer.
 * Drop this into any screen's header to enable sidebar navigation.
 */
import { useSidebar } from '@/app/contexts/SidebarContext';
import { Menu } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface HamburgerButtonProps {
  color?: string;
  size?: number;
}

export default function HamburgerButton({ color = '#f9fafb', size = 24 }: HamburgerButtonProps) {
  const { openDrawer } = useSidebar();
  return (
    <TouchableOpacity style={styles.btn} onPress={openDrawer} hitSlop={12}>
      <Menu size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
