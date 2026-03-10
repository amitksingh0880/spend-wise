/**
 * SidebarContext.tsx
 *
 * Global context that provides sidebar open/close state to any screen.
 * The actual sidebar UI renders inside SidebarLayout (which wraps the root app).
 */
import React, { createContext, useContext, useRef, useState } from 'react';
import { Animated } from 'react-native';

const SIDEBAR_WIDTH = 270;

interface SidebarContextValue {
  openDrawer: () => void;
  closeDrawer: () => void;
  isOpen: boolean;
  translateX: Animated.Value;
  backdropOpacity: Animated.Value;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 160,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: -SIDEBAR_WIDTH,
        useNativeDriver: true,
        damping: 20,
        stiffness: 160,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  };

  return (
    <SidebarContext.Provider value={{ openDrawer, closeDrawer, isOpen, translateX, backdropOpacity }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
