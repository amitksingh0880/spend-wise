import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, Text, UIManager, View } from 'react-native';

interface StartupSplashProps {
  visible?: boolean;
  onFinish?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function StartupSplash({ visible = true, onFinish }: StartupSplashProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const rotation = useRef(new Animated.Value(-12)).current; // degrees
  const titleY = useRef(new Animated.Value(8)).current;
  const shimmerTranslate = useRef(new Animated.Value(0)).current;
  // UI enhancements
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoGlowScale = useRef(new Animated.Value(1)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [gradientAvailable, setGradientAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => setReduceMotion(!!rm));
    // detect if a native LinearGradient view manager exists to prevent IllegalViewManagerException
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

    // Sequence: fade + scale in -> hold -> fade out -> finish (slower transitions)
    const baseInDuration = reduceMotion ? 260 : 1200;
    const rotationDuration = reduceMotion ? 200 : 1000;
    const holdDuration = reduceMotion ? 900 : 2200;
    const baseOutDuration = reduceMotion ? 320 : 1000;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: baseInDuration, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 9, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0, duration: rotationDuration, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, friction: 7, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: baseInDuration, useNativeDriver: true }),
      ]),
      Animated.delay(holdDuration),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: baseOutDuration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.06, duration: baseOutDuration, useNativeDriver: true }),
      ]),
    ]).start(() => {
      onFinish?.();
    });

    // shimmer/pulse/glow animations
    let shimmerAnimation: Animated.CompositeAnimation | null = null;
    let logoPulseAnimation: Animated.CompositeAnimation | null = null;
    let logoGlowAnimation: Animated.CompositeAnimation | null = null;
    if (!reduceMotion) {
      shimmerTranslate.setValue(-1);
      shimmerAnimation = Animated.loop(
        Animated.timing(shimmerTranslate, {
          toValue: 1,
          duration: 4200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      );
      shimmerAnimation.start();

      // gentle logo pulse
      logoPulse.setValue(1);
      logoPulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, { toValue: 1.03, duration: 900, useNativeDriver: true }),
          Animated.timing(logoPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      logoPulseAnimation.start();

      // glow scale loop
      logoGlowScale.setValue(1);
      logoGlowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(logoGlowScale, { toValue: 1.14, duration: 1400, useNativeDriver: true }),
          Animated.timing(logoGlowScale, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ])
      );
      logoGlowAnimation.start();
    }

    return () => {
      shimmerAnimation?.stop?.();
      logoPulseAnimation?.stop?.();
      logoGlowAnimation?.stop?.();
    };
  }, [visible]);

  useEffect(() => {
    if (gradientAvailable === false) {
      console.warn('[StartupSplash] expo-linear-gradient/native LinearGradient view manager is not available.\n\tIf you just installed it, rebuild the native app (expo prebuild + expo run:android / ios) or use a dev client.\n\tFalling back to plain background.');
    }
  }, [gradientAvailable]);

  if (!visible) return null;

  const rotateInterpolate = rotation.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const shimmerWidth = Math.max(220, width * 0.78);
  const translateX = shimmerTranslate.interpolate({ inputRange: [-1, 1], outputRange: [-shimmerWidth, width + shimmerWidth] });

  return (
    <Animated.View style={[styles.root, { opacity }]}> 
      {gradientAvailable ? (
        <LinearGradient colors={["#061a3f", "#0b3954", "#025f63"]} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#071033' }]} />
      )}
      <Animated.View style={[styles.card, { transform: [{ scale: Animated.multiply(scale, logoPulse) }] }] }>
        <Animated.View style={[styles.logoGlow, { transform: [{ scale: logoGlowScale }], opacity: 0.9 }]} />
        <Animated.Image source={require('@/assets/images/splash-icon.png')} style={[styles.logo, { transform: [{ rotate: rotateInterpolate }] }]} />
        <Animated.Text style={[styles.title, { transform: [{ translateY: titleY }] }]}>SpendWise</Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>built by sher</Animated.Text>
        <Animated.View style={[styles.accentBar, { width: logoPulse.interpolate({ inputRange: [0.96, 1.06], outputRange: [36, 78] }) }]} />
      </Animated.View>

      {/* Shimmer Overlay - diagonal animated gradient */}
      {!reduceMotion && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerContainer,
            { transform: [{ translateX }], width: shimmerWidth, opacity: 0.6 },
          ]}
        >
          {gradientAvailable ? (
            <LinearGradient
              colors={["rgba(14,165,147,0.0)", "rgba(14,165,147,0.14)", "rgba(14,165,147,0.0)" ]}
              start={[0,0.25]}
              end={[1,0.75]}
              style={styles.shimmerGradient}
            />
          ) : (
            <View style={[styles.shimmerGradient, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    height,
    width,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'lowercase',
  },
  logoGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 150,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignSelf: 'center',
    zIndex: -1,
    shadowColor: '#22c55e',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  accentBar: {
    height: 4,
    borderRadius: 3,
    backgroundColor: '#60a5fa',
    marginTop: 12,
  },
  shimmerContainer: {
    position: 'absolute',
    left: -40,
    top: -10,
    height: height + 40,
    borderRadius: 6,
    transform: [{ rotate: '20deg' }],
  },
  shimmerGradient: {
    flex: 1,
    borderRadius: 6,
    height: '100%',
  },
});
