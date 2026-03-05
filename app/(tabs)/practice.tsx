import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getCategories } from '../../src/features/lesson';
import { Banner, bodyText, Button, Card, pixelHeading, Screen, theme } from '../../src/ui';

export default function PracticeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getCategories()
      .then((rows) => {
        if (mounted) {
          setCategories(rows);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Could not load categories. Try again.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const openLearn = (mode: 'quick-review' | 'weak-areas' | 'category-drill', category?: string) => {
    router.push({
      pathname: '/learn',
      params: {
        mode,
        ...(category ? { category } : {}),
      },
    });
  };

  const isDesktop = width >= 980;
  const topCategory = categories[0]?.category;
  const headerSize = width >= 900 ? 50 : width >= 700 ? 42 : 30;
  const modeTitleSize = width >= 900 ? 42 : width >= 700 ? 34 : 24;
  const modeBodySize = width >= 900 ? 17 : width >= 700 ? 16 : 14;
  const modeCardHeight = width >= 900 ? 320 : width >= 700 ? 300 : 262;
  const modeIconSize = width >= 700 ? 30 : 26;

  return (
    <Screen scroll>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/home')}>
            <Ionicons name="arrow-back" size={26} color={theme.muted} />
          </Pressable>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.headerTitle, pixelHeading, { fontSize: headerSize, lineHeight: headerSize }]}>
            PRACTICE
          </Text>
        </View>

        {error ? <Banner kind="error" text={error} /> : null}

        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          <Card style={[styles.modeCard, { minHeight: modeCardHeight }]}>
            <View style={styles.modeIconWrap}>
              <Ionicons name="flash-outline" size={modeIconSize} color={theme.gold} />
            </View>
            <Text style={[styles.modeTitle, pixelHeading, { fontSize: modeTitleSize, lineHeight: modeTitleSize * 0.95 }]}>QUICK REVIEW</Text>
            <Text style={[styles.modeBody, bodyText, { fontSize: modeBodySize, lineHeight: modeBodySize * 1.5 }]}>
              A fast 5-minute session focusing on terms you need to review today.
            </Text>
            <Button label="START" onPress={() => openLearn('quick-review')} />
          </Card>

          <Card style={[styles.modeCard, { minHeight: modeCardHeight }]}>
            <View style={styles.modeIconWrap}>
              <Ionicons name="radio-button-on-outline" size={modeIconSize} color={theme.error} />
            </View>
            <Text style={[styles.modeTitle, styles.danger, pixelHeading, { fontSize: modeTitleSize, lineHeight: modeTitleSize * 0.95 }]}>
              WEAK AREAS
            </Text>
            <Text style={[styles.modeBody, bodyText, { fontSize: modeBodySize, lineHeight: modeBodySize * 1.5 }]}>
              Target the terms you've struggled with recently to build mastery.
            </Text>
            <Button label="START" onPress={() => openLearn('weak-areas')} variant="outline" />
          </Card>

          <Card style={[styles.modeCard, { minHeight: modeCardHeight }]}>
            <View style={styles.modeIconWrap}>
              <Ionicons name="layers-outline" size={modeIconSize} color={theme.cyan} />
            </View>
            <Text style={[styles.modeTitle, styles.cyan, pixelHeading, { fontSize: modeTitleSize, lineHeight: modeTitleSize * 0.95 }]}>
              CATEGORY DRILL
            </Text>
            <Text style={[styles.modeBody, bodyText, { fontSize: modeBodySize, lineHeight: modeBodySize * 1.5 }]}>
              Deep dive into specific medical categories and systems.
            </Text>
            <Button label="START" onPress={() => openLearn('category-drill', topCategory)} variant="cyan" />
          </Card>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 4,
    borderBottomColor: theme.border,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.gold,
  },
  grid: {
    gap: 14,
  },
  gridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  modeCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
  },
  modeIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.panelDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    color: theme.gold,
    textAlign: 'center',
  },
  danger: {
    color: theme.error,
  },
  cyan: {
    color: theme.cyan,
  },
  modeBody: {
    color: theme.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
});
