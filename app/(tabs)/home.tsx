import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAuth } from '../../src/features/auth/authStore';
import { countNewTerms, getDashboardStats } from '../../src/features/lesson';
import { useOutboxSync } from '../../src/features/sync';
import { Banner, bodyText, Button, Card, pixelHeading, pixelLabel, Screen, theme } from '../../src/ui';

type HomeStats = {
  lessonCount: number;
  totalXp: number;
  masteredCount: number;
  dueCount: number;
  weakCount: number;
  newTodayCount: number;
};

const FALLBACK_STATS: HomeStats = {
  lessonCount: 0,
  totalXp: 0,
  masteredCount: 0,
  dueCount: 0,
  weakCount: 0,
  newTodayCount: 0,
};

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, signOut } = useAuth();
  const { syncMessage } = useOutboxSync();
  const [stats, setStats] = useState<HomeStats>(FALLBACK_STATS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isDesktop = width >= 980;
  const level = Math.floor(stats.totalXp / 500) + 1;
  const levelXp = stats.totalXp % 500;
  const progressValue = Math.min(1, levelXp / 500);
  const streak = Math.max(0, Math.floor(stats.lessonCount / 2));
  const titleScale = width >= 900 ? 1 : width >= 700 ? 0.9 : 0.72;
  const avatarSize = width >= 900 ? 76 : width >= 700 ? 70 : 62;
  const avatarTextSize = Math.round(34 * titleScale);
  const stripValueSize = width >= 900 ? 20 : width >= 700 ? 18 : 15;
  const dailyTitleSize = width >= 900 ? 52 : width >= 700 ? 46 : 32;
  const dailyBodySize = width >= 900 ? 18 : width >= 700 ? 17 : 15;
  const quickTitleSize = width >= 900 ? 34 : width >= 700 ? 30 : 21;
  const sectionTitleSize = width >= 900 ? 30 : width >= 700 ? 27 : 19;
  const levelLabelSize = width >= 900 ? 18 : width >= 700 ? 17 : 14;
  const levelValueSize = width >= 900 ? 22 : width >= 700 ? 20 : 15;
  const bodyLineHeight = width >= 900 ? 30 : width >= 700 ? 27 : 24;

  const username = useMemo(() => {
    const metadataName =
      typeof user?.user_metadata === 'object' && user?.user_metadata && 'username' in user.user_metadata
        ? String((user.user_metadata as Record<string, unknown>).username ?? '')
        : '';
    const trimmed = metadataName.trim();
    if (trimmed) {
      return trimmed.toUpperCase();
    }
    return 'MEDIASIS';
  }, [user?.user_metadata]);
  const usernameLength = username.length;
  const baseNameSize = width >= 900 ? 30 : width >= 700 ? 24 : 19;
  const usernamePenalty = Math.max(0, usernameLength - 8) * (width >= 700 ? 0.65 : 0.55);
  const nameSize = Math.max(width >= 700 ? 15 : 13, Math.round(baseNameSize - usernamePenalty));
  const nameLineHeight = nameSize + (width >= 700 ? 4 : 3);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, newTodayCount] = await Promise.all([getDashboardStats(), countNewTerms()]);
      setStats({ ...dashboard, newTodayCount });
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  return (
    <Screen scroll>
      <View style={styles.wrap}>
        {error ? <Banner kind="error" text={error} /> : null}

        <View style={styles.headerTop}>
          <View style={styles.identityRow}>
            <View style={[styles.avatarBox, { width: avatarSize, height: avatarSize }]}>
              <Text style={[styles.avatarText, pixelHeading, { fontSize: avatarTextSize, lineHeight: avatarTextSize }]}>
                {username.charAt(0)}
              </Text>
            </View>
            <View style={styles.identityText}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.65}
                numberOfLines={1}
                style={[styles.name, pixelHeading, { fontSize: nameSize, lineHeight: nameLineHeight }]}>
                {username}
              </Text>
              <Text style={[styles.role, bodyText]}>Medical Student</Text>
            </View>
          </View>
        </View>

        <Card variant="compact" style={styles.statsStripCard}>
          <View style={styles.statsStrip}>
            <Pressable style={styles.stripItem} onPress={() => router.push('/tour')}>
              <Ionicons name="help-circle-outline" color={theme.muted} size={22} />
            </Pressable>
            <View style={styles.stripItem}>
              <Ionicons name="flame" color={theme.accentSecondary} size={22} />
              <Text style={[styles.stripValue, pixelLabel, { fontSize: stripValueSize }]}>{streak}</Text>
            </View>
            <View style={styles.stripItem}>
              <Ionicons name="trophy" color={theme.gold} size={22} />
              <Text style={[styles.stripValue, pixelLabel, { fontSize: stripValueSize }]}>{stats.totalXp}</Text>
            </View>
            <Pressable
              style={styles.stripItem}
              onPress={() => {
                void signOut();
              }}>
              <Ionicons name="log-out-outline" color={theme.muted} size={22} />
            </Pressable>
          </View>
        </Card>

        <View style={styles.headerDivider} />

        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          <View style={styles.mainColumn}>
            <Card style={[styles.dailyCard, { minHeight: width >= 900 ? 300 : width >= 700 ? 280 : 242 }]}>
              <Text style={[styles.dailyTitle, pixelHeading, { fontSize: dailyTitleSize, lineHeight: dailyTitleSize }]}>DAILY LESSON</Text>
              <Text style={[styles.dailyBody, bodyText, { fontSize: dailyBodySize, lineHeight: bodyLineHeight }]}>
                Master 5 new terms today to keep your streak alive and earn 50 XP.
              </Text>
              <Button
                label={loading ? 'Preparing lesson...' : 'START LESSON'}
                onPress={() => router.push('/learn')}
              />
            </Card>

            <View style={[styles.quickGrid, width >= 700 && styles.quickGridWide]}>
              <Pressable style={width >= 700 && styles.quickGridItem} onPress={() => router.push('/library')}>
                <Card variant="compact" style={styles.quickCard}>
                  <Ionicons name="book-outline" color={theme.accentSecondary} size={34} />
                  <Text style={[styles.quickTitle, pixelHeading, styles.libraryTitle, { fontSize: quickTitleSize, lineHeight: quickTitleSize }]}>
                    LIBRARY
                  </Text>
                  <Text style={[styles.quickBody, bodyText]}>Review learned terms</Text>
                </Card>
              </Pressable>

              <Pressable style={width >= 700 && styles.quickGridItem} onPress={() => router.push('/profile')}>
                <Card variant="compact" style={styles.quickCard}>
                  <Ionicons name="trophy-outline" color={theme.gold} size={34} />
                  <Text style={[styles.quickTitle, pixelHeading, { fontSize: quickTitleSize, lineHeight: quickTitleSize }]}>
                    LEADERBOARD
                  </Text>
                  <Text style={[styles.quickBody, bodyText]}>See top students</Text>
                </Card>
              </Pressable>
            </View>
          </View>

          <View style={styles.sideColumn}>
            <Card variant="compact">
              <Text style={[styles.sectionTitle, pixelHeading, { fontSize: sectionTitleSize, lineHeight: sectionTitleSize }]}>
                PROGRESS
              </Text>
              <View style={styles.progressRow}>
                <Text style={[styles.levelLabel, bodyText, { fontSize: levelLabelSize }]}>Level {level}</Text>
                <Text style={[styles.levelValue, pixelLabel, { fontSize: levelValueSize }]}>{levelXp} / 500 XP</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progressValue * 100)}%` }]} />
              </View>
            </Card>

            <Card variant="compact">
              <Text
                style={[styles.sectionTitle, pixelHeading, styles.questTitleColor, { fontSize: sectionTitleSize, lineHeight: sectionTitleSize }]}>
                QUESTS
              </Text>
              <View style={styles.questRow}>
                <View style={[styles.questDot, stats.lessonCount > 0 && styles.questDotDone]} />
                <View>
                  <Text style={[styles.questMain, bodyText]}>Complete 1 lesson</Text>
                  <Text style={[styles.questSub, bodyText]}>Reward: 10 XP</Text>
                </View>
              </View>
              <View style={styles.questRow}>
                <View style={[styles.questDot, stats.masteredCount > 0 && styles.questDotDone]} />
                <View>
                  <Text style={[styles.questMain, bodyText]}>Score 100% accuracy</Text>
                  <Text style={[styles.questSub, bodyText]}>Reward: 20 XP</Text>
                </View>
              </View>
            </Card>

            <Card variant="compact">
              <Text style={[styles.sectionTitle, pixelHeading, { fontSize: sectionTitleSize, lineHeight: sectionTitleSize }]}>SYNC</Text>
              <Text style={[styles.syncText, bodyText]} numberOfLines={2}>
                {syncMessage ? syncMessage : 'Ready'}
              </Text>
            </Card>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  headerTop: {
    paddingHorizontal: 2,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.gold,
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: theme.gold,
  },
  role: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  statsStripCard: {
    paddingVertical: 10,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripItem: {
    minWidth: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stripValue: {
    color: theme.gold,
  },
  headerDivider: {
    height: 4,
    backgroundColor: theme.border,
    opacity: 0.9,
  },
  grid: {
    gap: 14,
  },
  gridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainColumn: {
    flex: 1.4,
    gap: 14,
  },
  sideColumn: {
    flex: 1,
    gap: 14,
  },
  dailyCard: {
    gap: 14,
    borderRadius: 24,
    minHeight: 300,
  },
  dailyTitle: {
    color: theme.gold,
  },
  dailyBody: {
    color: theme.muted,
    fontWeight: '600',
  },
  quickGrid: {
    gap: 12,
  },
  quickGridWide: {
    flexDirection: 'row',
  },
  quickGridItem: {
    flex: 1,
  },
  quickCard: {
    minHeight: 170,
    justifyContent: 'center',
  },
  quickTitle: {
    color: theme.gold,
  },
  libraryTitle: {
    color: theme.accentSecondary,
  },
  quickBody: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.gold,
  },
  questTitleColor: {
    color: theme.accentSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    color: theme.muted,
    fontWeight: '600',
  },
  levelValue: {
    color: theme.accentSecondary,
  },
  progressTrack: {
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.accentSecondary,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questDot: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 4,
    backgroundColor: theme.panelDeep,
  },
  questDotDone: {
    borderColor: theme.accentSecondary,
    backgroundColor: theme.accentSecondary,
  },
  questMain: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  questSub: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  syncText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
