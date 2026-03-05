import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAuth } from '../../src/features/auth/authStore';
import { getDashboardStats, getPendingSyncCount } from '../../src/features/lesson';
import { resetTourSeen } from '../../src/features/tour/storage';
import { Banner, Button, Card, pixelHeading, pixelLabel, pixelText, Screen, theme } from '../../src/ui';

type Stats = {
  totalXp: number;
  masteredCount: number;
  lessonCount: number;
  pendingSync: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, authBusy, signOut } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalXp: 0, masteredCount: 0, lessonCount: 0, pendingSync: 0 });
  const [info, setInfo] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [dashboard, pendingSync] = await Promise.all([getDashboardStats(), getPendingSyncCount()]);
      setStats({
        totalXp: dashboard.totalXp,
        masteredCount: dashboard.masteredCount,
        lessonCount: dashboard.lessonCount,
        pendingSync,
      });
    } catch {
      setInfo('Could not refresh profile stats. Try again.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const streak = useMemo(() => Math.max(0, Math.floor(stats.lessonCount / 2)), [stats.lessonCount]);
  const username = useMemo(() => {
    const metadataName =
      typeof user?.user_metadata === 'object' && user?.user_metadata && 'username' in user.user_metadata
        ? String((user.user_metadata as Record<string, unknown>).username ?? '')
        : '';
    const trimmed = metadataName.trim();
    if (trimmed) {
      return trimmed;
    }

    const email = user?.email ?? '';
    if (!email) {
      return 'NOT SIGNED IN';
    }

    return email.includes('@') ? email.split('@')[0] : email;
  }, [user]);
  const displayName = useMemo(() => username.toUpperCase(), [username]);
  const avatarGlyph = useMemo(() => (displayName ? displayName.charAt(0) : 'M'), [displayName]);
  const isWide = width >= 700;
  const isDesktop = width >= 1000;
  const titleSize = isDesktop ? 44 : isWide ? 38 : 26;
  const nameSize = isDesktop ? 36 : isWide ? 30 : 22;
  const roleSize = isWide ? 18 : 15;
  const statValueSize = isDesktop ? 38 : isWide ? 34 : 26;
  const accountHeadingSize = isDesktop ? 20 : isWide ? 18 : 14;
  const footerSize = isWide ? 12 : 11;
  const avatarSize = isDesktop ? 108 : isWide ? 96 : 82;
  const avatarGlyphSize = isDesktop ? 60 : isWide ? 52 : 40;

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
            Profile
          </Text>
        </View>

        {info ? <Banner text={info} /> : null}

        <Card style={styles.identityCard}>
          <View style={[styles.avatarBox, { width: avatarSize, height: avatarSize }]}>
            <Text style={[styles.avatarText, pixelHeading, { fontSize: avatarGlyphSize, lineHeight: avatarGlyphSize }]}>
              {avatarGlyph}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.58}
            numberOfLines={2}
            style={[styles.name, pixelHeading, { fontSize: nameSize, lineHeight: nameSize * 1.05 }]}>
            {displayName}
          </Text>
          <Text style={[styles.role, { fontSize: roleSize }]}>Medical Student</Text>
        </Card>

        <View style={[styles.statsRow, isWide && styles.statsRowWide]}>
          <Card variant="stat" style={styles.statCard}>
            <Ionicons name="flame-outline" size={22} color={theme.accentSecondary} />
            <Text style={[styles.statValue, pixelHeading, { fontSize: statValueSize }]}>{streak}</Text>
            <Text style={[styles.statLabel, pixelLabel]}>Day Streak</Text>
          </Card>

          <Card variant="stat" style={styles.statCard}>
            <Ionicons name="trophy-outline" size={22} color={theme.gold} />
            <Text style={[styles.statValue, pixelHeading, { fontSize: statValueSize }]}>{stats.totalXp}</Text>
            <Text style={[styles.statLabel, pixelLabel]}>Total XP</Text>
          </Card>
        </View>

        <Card variant="compact" style={styles.accountCard}>
          <Text style={[styles.sectionHeading, pixelHeading, { fontSize: accountHeadingSize, lineHeight: accountHeadingSize }]}>
            Account
          </Text>
          <Button
            label={authBusy ? 'Signing out...' : 'Sign Out'}
            onPress={() => void signOut()}
            disabled={authBusy}
            variant="danger"
            size="compact"
          />
          <Button label="Open App Tour" onPress={() => router.push('/tour')} variant="secondary" size="compact" />
          <Button
            label="Reset Tour (Debug)"
            variant="outline"
            size="compact"
            onPress={() => {
              void resetTourSeen().then(() => setInfo('Tour reset. It will show again on next launch.'));
            }}
          />
          <Text style={[styles.footerNote, { fontSize: footerSize }]}>Pending sync: {stats.pendingSync}</Text>
        </Card>
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
  },
  identityCard: {
    alignItems: 'center',
    gap: 8,
  },
  avatarBox: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.panelDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.gold,
  },
  name: {
    color: theme.gold,
    textAlign: 'center',
  },
  role: {
    ...pixelText,
    textTransform: 'none',
    color: theme.muted,
    letterSpacing: 0,
    fontWeight: '600',
  },
  statsRow: {
    gap: 12,
  },
  statsRowWide: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: theme.gold,
  },
  statLabel: {
    color: theme.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeading: {
    color: theme.gold,
  },
  accountCard: {
    gap: 7,
    paddingTop: 12,
    paddingBottom: 10,
  },
  footerNote: {
    ...pixelText,
    textTransform: 'none',
    color: theme.muted,
    letterSpacing: 0,
    fontWeight: '600',
    marginTop: 2,
  },
});
