import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts } from '@/constants/theme';

export default function SplashScreen() {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      router.replace('/onboarding');
    });
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>M</Text>
          </View>
          <View style={styles.logoDot} />
        </View>

        <Text style={styles.appName}>M-Pesa Analytics</Text>
        <Text style={styles.tagline}>Financial Architect</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
          <Text style={styles.statusText}>Initializing Secure Core</Text>
        </View>

        <View style={styles.badge}>
          <MaterialIcons name="security" size={12} color={Colors.primaryFixed} />
          <Text style={styles.badgeText}>ENCRYPTED ANALYTICS ENGINE</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  logoContainer: {
    marginBottom: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoLetter: {
    fontFamily: Fonts.manrope.extraBold,
    fontSize: 40,
    color: Colors.white,
    lineHeight: 46,
  },
  logoDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.brand,
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  appName: {
    fontFamily: Fonts.manrope.extraBold,
    fontSize: 28,
    color: Colors.white,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.outlineVariant,
    marginBottom: 48,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressTrack: {
    width: 180,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.brand,
    borderRadius: 1,
  },
  statusText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: Colors.outlineVariant,
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(149, 250, 138, 0.2)',
  },
  badgeText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 9,
    color: Colors.primaryFixed,
    letterSpacing: 1.5,
  },
});
