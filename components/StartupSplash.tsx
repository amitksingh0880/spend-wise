import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, UIManager, View, StatusBar } from 'react-native';
import { Typography } from './ui/text';

interface StartupSplashProps {
  visible?: boolean;
  onFinish?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function StartupSplash({ visible = true, onFinish }: StartupSplashProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [gradientAvailable, setGradientAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => setReduceMotion(!!rm));
    
    if (gradientAvailable === null) {
      try {
        const config =
          (UIManager.getViewManagerConfig && UIManager.getViewManagerConfig('ExpoLinearGradient')) ||
          (UIManager.getViewManagerConfig && UIManager.getViewManagerConfig('RNLinearGradient')) ||
          (UIManager.getViewManagerConfig && UIManager.getViewManagerConfig('LinearGradient'));
        setGradientAvailable(!!config);
      } catch (e) {
        setGradientAvailable(false);
      }
    }

    if (!visible) return;

    const inDuration = reduceMotion ? 300 : 800;
    const holdDuration = 1800;
    const outDuration = 600;

    Animated.sequence([
      // Stage 1: Fade and scale in
      Animated.parallel([
        Animated.timing(opacity, { 
            toValue: 1, 
            duration: inDuration, 
            useNativeDriver: true,
            easing: Easing.out(Easing.quad)
        }),
        Animated.timing(scale, { 
            toValue: 1, 
            duration: inDuration, 
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1))
        }),
        Animated.spring(logoScale, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
        })
      ]),
      // Stage 2: Reveal Title
      Animated.parallel([
        Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.exp)
        })
      ]),
      Animated.delay(holdDuration),
      // Stage 3: Fade and scale out
      Animated.parallel([
        Animated.timing(opacity, { 
            toValue: 0, 
            duration: outDuration, 
            useNativeDriver: true 
        }),
        Animated.timing(scale, { 
            toValue: 1.1, 
            duration: outDuration, 
            useNativeDriver: true 
        }),
      ]),
    ]).start(() => {
      onFinish?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity }]}>
      <StatusBar barStyle="light-content" />
      {gradientAvailable ? (
        <LinearGradient 
          colors={["#09090b", "#1c1917", "#09090b"]} 
          style={StyleSheet.absoluteFill} 
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#09090b' }]} />
      )}
      
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <View style={styles.logoContainer}>
            <Animated.View style={[styles.glow, { transform: [{ scale: logoScale }] }]} />
            <Animated.Image 
                source={require('@/assets/images/splash-icon.png')} 
                style={[styles.logo, { transform: [{ scale: logoScale }] }]}
                resizeMode="contain"
            />
        </View>

        <Animated.View style={{ 
            opacity: titleOpacity, 
            transform: [{ translateY: titleTranslateY }],
            alignItems: 'center'
        }}>
            <Typography style={styles.title}>SpendWise</Typography>
            <View style={styles.divider} />
            <Typography style={styles.subtitle}>built by divanox</Typography>
        </Animated.View>
      </Animated.View>

      {/* Modern accent dots */}
      <View style={styles.dotsContainer}>
         {[0, 1, 2].map(i => (
             <View key={i} style={[styles.dot, { opacity: 0.2 + (i * 0.1) }]} />
         ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    paddingBottom: 4,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: '#f97316',
    borderRadius: 2,
    marginVertical: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  dotsContainer: {
     position: 'absolute',
     bottom: 60,
     flexDirection: 'row',
     gap: 8,
  },
  dot: {
     width: 6,
     height: 6,
     borderRadius: 3,
     backgroundColor: '#FFFFFF',
  }
});
