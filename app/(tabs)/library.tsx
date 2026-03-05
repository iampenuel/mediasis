import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { loadQueueSource, searchTerms } from '../../src/features/lesson';
import type { Term } from '../../src/features/lesson';
import { Banner, Card, pixelHeading, pixelLabel, pixelText, Screen, theme } from '../../src/ui';

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);
  const [masteryById, setMasteryById] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const isDesktop = width >= 900;
  const tablet = width >= 700;
  const titleSize = isDesktop ? 42 : tablet ? 36 : 26;
  const termTitleSize = isDesktop ? 34 : tablet ? 29 : 20;
  const definitionSize = isDesktop ? 16 : tablet ? 15 : 13;

  const loadTerms = useCallback(async (nextQuery: string) => {
    try {
      setError(null);
      const rows = await searchTerms(nextQuery);
      setTerms(rows);
    } catch {
      setError('Could not load terms. Retry in a moment.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void loadQueueSource()
      .then((source) => {
        if (!mounted) {
          return;
        }

        const mastery: Record<string, number> = {};
        source.stateMap.forEach((state, termId) => {
          mastery[termId] = state.mastery;
        });
        setMasteryById(mastery);
      })
      .catch(() => {
        if (mounted) {
          setError('Could not load mastery states.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTerms(query);
    }, 120);

    return () => clearTimeout(timer);
  }, [loadTerms, query]);

  const summary = useMemo(() => (query ? `${terms.length} results` : `${terms.length} terms loaded`), [query, terms.length]);

  const openCategoryPractice = (category: string) => {
    router.push({
      pathname: '/learn',
      params: {
        mode: 'category-drill',
        category,
      },
    });
  };

  return (
    <Screen scroll>
      <View style={styles.wrap}>
        <View style={styles.topRow}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/home')}>
            <Ionicons name="arrow-back" size={22} color={theme.muted} />
          </Pressable>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.title, pixelHeading, { fontSize: titleSize, lineHeight: titleSize }]}>
            Library
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={20} color={theme.muted} />
            <TextInput
              placeholder="Search terms or definitions..."
              placeholderTextColor={theme.muted}
              value={query}
              onChangeText={setQuery}
              style={[styles.searchInput, { fontSize: tablet ? 16 : 15 }]}
              autoCorrect={false}
            />
          </View>

        <Text style={styles.summary}>{summary}</Text>
        {error ? <Banner kind="error" text={error} /> : null}

        {terms.map((term) => {
          const mastery = masteryById[term.id] ?? 0;
          const known = mastery >= 0.8;

          return (
            <Pressable key={term.id} onPress={() => openCategoryPractice(term.category)}>
              <Card variant="compact" style={styles.termCard}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  numberOfLines={1}
                  style={[styles.termTitle, pixelHeading, { fontSize: termTitleSize, lineHeight: termTitleSize }]}>
                  {term.term}
                </Text>
                <Text numberOfLines={3} style={[styles.definition, { fontSize: definitionSize }]}>
                  {term.definition}
                </Text>
                <View style={[styles.badge, known ? styles.badgeKnown : styles.badgeNew]}>
                  <Text style={[styles.badgeText, pixelLabel]}>{known ? 'Known' : 'Needs Review'}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: theme.border,
    paddingBottom: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.gold,
    flex: 1,
  },
  searchWrap: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.panel,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    ...pixelText,
    textTransform: 'none',
    color: theme.muted,
    fontSize: 12,
    letterSpacing: 0,
    fontWeight: '600',
  },
  termCard: {
    gap: 8,
  },
  termTitle: {
    color: theme.gold,
  },
  definition: {
    ...pixelText,
    textTransform: 'none',
    color: theme.muted,
    lineHeight: 22,
    letterSpacing: 0,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 2,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  badgeKnown: {
    borderColor: theme.error,
    backgroundColor: 'rgba(238, 91, 91, 0.12)',
  },
  badgeNew: {
    borderColor: theme.cyan,
    backgroundColor: 'rgba(97, 205, 232, 0.12)',
  },
  badgeText: {
    fontSize: 12,
    color: theme.text,
  },
});
