/**
 * MenuButton.tsx
 *
 * A hamburger icon button that opens the sidebar from any screen.
 * Usage: import { MenuButton } from '@/app/components/MenuButton';
 */
import { useSidebar } from '@/app/contexts/SidebarContext';
import { Menu } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  /** Optional right-side element */
  right?: React.ReactNode;
}

/** Full screen header bar with hamburger + title */
export function ScreenHeader({ title, right }: ScreenHeaderProps) {
  const { openDrawer } = useSidebar();
  return (
    <View style={h.bar}>
      <TouchableOpacity onPress={openDrawer} style={h.menuBtn} hitSlop={12}>
        <Menu size={22} color="#f9fafb" />
      </TouchableOpacity>
      <Text style={h.title} numberOfLines={1}>{title}</Text>
      <View style={h.rightSlot}>{right ?? null}</View>
    </View>
  );
}

/** Standalone hamburger icon button */
export function MenuButton() {
  const { openDrawer } = useSidebar();
  return (
    <TouchableOpacity onPress={openDrawer} style={h.menuBtn} hitSlop={12}>
      <Menu size={22} color="#f9fafb" />
    </TouchableOpacity>
  );
}

const h = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#f9fafb',
    letterSpacing: 0.3,
    marginHorizontal: 8,
  },
  rightSlot: {
    width: 36,
    alignItems: 'flex-end',
  },
});
