import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { fonts } from '@/core/theme/tokens';
import { useThemeColors, useThemeMode } from '@/core/theme/useThemeColors';
import { RestTimerEngine } from '@/engines/RestTimerEngine';

import WorkoutScreen from '@/features/workout/WorkoutScreen';
import CatalogScreen from '@/features/workout/CatalogScreen';
import NutritionScreen from '@/features/nutrition/NutritionScreen';
import ProgressScreen from '@/features/analytics/ProgressScreen';
import ProfileScreen from '@/features/profile/ProfileScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/** Minimal, consistent line icons — no emoji rendering differences between Android devices. */
const ICONS: Record<string, 'workout' | 'catalog' | 'nutrition' | 'progress' | 'profile'> = {
  Тренировки: 'workout',
  Каталог: 'catalog',
  Питание: 'nutrition',
  Прогресс: 'progress',
  Профиль: 'profile'
};

function TabIcon({
  name,
  focused,
  active,
  inactive
}: {
  name: string;
  focused: boolean;
  active: string;
  inactive: string;
}) {
  const color = focused ? active : inactive;
  const icon = ICONS[name] ?? 'workout';
  return (
    <View style={{ alignItems: 'center', gap: 4, minWidth: 28 }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {icon === 'workout' ? (
          <>
            <Line x1="4" y1="9" x2="4" y2="15" />
            <Line x1="7" y1="7" x2="7" y2="17" />
            <Line x1="7" y1="12" x2="17" y2="12" />
            <Line x1="17" y1="7" x2="17" y2="17" />
            <Line x1="20" y1="9" x2="20" y2="15" />
          </>
        ) : icon === 'catalog' ? (
          <>
            <Rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <Rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <Rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <Rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </>
        ) : icon === 'nutrition' ? (
          <>
            <Circle cx="12" cy="12" r="8.2" />
            <Circle cx="12" cy="12" r="4.8" />
            <Line x1="3" y1="4" x2="3" y2="10" />
            <Line x1="1.5" y1="4" x2="1.5" y2="7" />
            <Line x1="4.5" y1="4" x2="4.5" y2="7" />
          </>
        ) : icon === 'progress' ? (
          <>
            <Path d="M3.5 18.5h17" />
            <Path d="M5 15.5l4.2-4.2 3.2 2.5 6-7" />
            <Path d="M14.8 6.8h3.8v3.8" />
          </>
        ) : (
          <>
            <Circle cx="12" cy="8" r="3.2" />
            <Path d="M5.2 20c.5-3.3 3.1-5.2 6.8-5.2s6.3 1.9 6.8 5.2" />
          </>
        )}
      </Svg>
      {focused ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: active }} /> : <View style={{ height: 4 }} />}
    </View>
  );
}

export default function RootNavigator() {
  const colors = useThemeColors();
  const mode = useThemeMode();

  const navTheme = useMemo(
    () => ({
      ...(mode === 'light' ? DefaultTheme : DarkTheme),
      colors: {
        ...(mode === 'light' ? DefaultTheme.colors : DarkTheme.colors),
        background: colors.ink,
        card: colors.ink,
        border: colors.line,
        primary: colors.lime,
        text: colors.paper
      }
    }),
    [colors, mode]
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        initialRouteName="Тренировки"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(11,15,20,0.96)',
            borderTopColor: colors.line,
            borderTopWidth: 1,
            height: 78,
            paddingBottom: 10,
            paddingTop: 8,
            elevation: 12,
            shadowColor: '#000000',
            shadowOpacity: 0.22,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: -5 }
          },
          tabBarActiveTintColor: colors.lime,
          tabBarInactiveTintColor: colors.paperDim,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: fonts.bodySemi,
            letterSpacing: 0.15,
            marginTop: 2
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={route.name}
              focused={focused}
              active={colors.lime}
              inactive={colors.paperDim}
            />
          )
        })}
        screenListeners={{
          tabPress: () => RestTimerEngine.hapticTabSwitch()
        }}
      >
        <Tab.Screen name="Тренировки" component={WorkoutScreen} />
        <Tab.Screen name="Каталог" component={CatalogScreen} />
        <Tab.Screen name="Питание" component={NutritionScreen} />
        <Tab.Screen name="Прогресс" component={ProgressScreen} />
        <Tab.Screen name="Профиль" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
