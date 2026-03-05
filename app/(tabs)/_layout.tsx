import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { pixelFontFamily, theme } from '../../src/ui';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const tablet = width >= 700;
  const tabHeight = tablet ? 94 : compact ? 84 : 88;
  const labelSize = width >= 1100 ? 14 : tablet ? 12 : compact ? 8 : 10;
  const iconSize = tablet ? 24 : compact ? 21 : 22;
  const labelSpacing = compact ? 0.08 : 0.2;
  const iconWrapWidth = tablet ? 30 : 26;
  const iconWrapHeight = tablet ? 24 : 22;

  const renderTabLabel = (label: string, color: string) => (
    <Text
      allowFontScaling={false}
      adjustsFontSizeToFit
      minimumFontScale={0.58}
      numberOfLines={1}
      style={[styles.tabLabel, { color, fontSize: labelSize, letterSpacing: labelSpacing }]}>
      {label}
    </Text>
  );

  const renderTabIcon = (iconName: ComponentProps<typeof Ionicons>['name'], color: string) => (
    <View style={[styles.iconWrap, { width: iconWrapWidth, height: iconWrapHeight }]}>
      <Ionicons color={color} size={iconSize} name={iconName} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.panel,
          borderTopColor: theme.border,
          borderTopWidth: 4,
          height: tabHeight,
          paddingTop: compact ? 4 : 6,
          paddingBottom: 8,
          paddingHorizontal: compact ? 4 : 6,
        },
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: {
          marginTop: 1,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: compact ? 1 : 3,
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sceneStyle: {
          backgroundColor: theme.bg,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }) => renderTabIcon('home-outline', color),
          tabBarLabel: ({ color }) => renderTabLabel('HOME', color),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'PRACTICE',
          tabBarIcon: ({ color }) => renderTabIcon('barbell-outline', color),
          tabBarLabel: ({ color }) => renderTabLabel('PRACTICE', color),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'LIBRARY',
          tabBarIcon: ({ color }) => renderTabIcon('book-outline', color),
          tabBarLabel: ({ color }) => renderTabLabel('LIBRARY', color),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color }) => renderTabIcon('person-outline', color),
          tabBarLabel: ({ color }) => renderTabLabel('PROFILE', color),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: pixelFontFamily,
    fontWeight: '400',
    textTransform: 'uppercase',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
