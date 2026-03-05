import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { useAuth } from '../src/features/auth/authStore';
import { bodyText, pixelHeading, PixelKoala, Screen, theme } from '../src/ui';

const SPLASH_MS = Platform.OS === 'web' ? 1100 : 2500;
const FADE_MS = 500;

export default function StartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const fade = useRef(new Animated.Value(1)).current;
  const bob = useRef(new Animated.Value(0)).current;

  const koalaSize = width >= 900 ? 136 : width >= 700 ? 122 : 94;
  const availableWidth = Math.max(260, Math.min(width - 24, 720));
  const brandSize = Math.min(width >= 900 ? 66 : width >= 700 ? 58 : 48, Math.max(32, Math.floor(availableWidth / 8.4)));
  const subtitleSize = width >= 900 ? 22 : width >= 700 ? 19 : 15;

  const nextRoute = useMemo(() => (session ? '/home' : '/login'), [session]);

  useEffect(() => {
    let routed = false;
    const goNext = () => {
      if (routed) {
        return;
      }
      routed = true;
      router.replace(nextRoute);
    };

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -5,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    bobLoop.start();

    const fadeTimer = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) {
          goNext();
        }
      });

      // Web safety fallback: proceed even if animation callback does not fire.
      if (Platform.OS === 'web') {
        setTimeout(goNext, FADE_MS + 100);
      }
    }, SPLASH_MS);

    const hardFallbackTimer = setTimeout(goNext, SPLASH_MS + FADE_MS + 1200);

    return () => {
      bobLoop.stop();
      clearTimeout(fadeTimer);
      clearTimeout(hardFallbackTimer);
    };
  }, [bob, fade, nextRoute, router]);

  return (
    <Screen>
      <Animated.View style={[styles.container, { opacity: fade }]}>
        <Animated.View style={[styles.koalaWrap, { transform: [{ translateY: bob }] }]}>
          <PixelKoala size={koalaSize} />
        </Animated.View>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          numberOfLines={1}
          style={[styles.brand, pixelHeading, { fontSize: brandSize, lineHeight: brandSize + 6 }]}>
          MEDIASIS
        </Text>
        <Text style={[styles.subtitle, bodyText, { fontSize: subtitleSize }]}>Clinical terms, mastered daily.</Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.bg,
  },
  koalaWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brand: {
    color: theme.gold,
    textAlign: 'center',
    width: '92%',
  },
  subtitle: {
    color: theme.muted,
    letterSpacing: 0,
    fontWeight: '500',
    textAlign: 'center',
  },
});
