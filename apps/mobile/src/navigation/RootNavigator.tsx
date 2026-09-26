import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { fonts } from '@/core/theme/tokens';
import { useThemeColors, useThemeMode } from '@/core/theme/useThemeColors';
import { RestTimerEngine } from '@/engines/RestTimerEngine';

import WorkoutScreen from '@/features/workout/WorkoutScreen';
import CatalogScreen from '@/features/workout/CatalogScreen';
import NutritionScreen from '@/features/nutrition/NutritionScreen';
import CoachScreen from '@/features/coach/CoachScreen';
import ProgressScreen from '@/features/analytics/ProgressScreen';
import ProfileScreen from '@/features/profile/ProfileScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/** Letter marks — no emoji chrome on the tab bar. */
const ICONS: Record<string, string> = {
  Тренировки: 'Тр',
  Каталог: 'Ка',
  Питание: 'Пт',
  Тренер: 'Тн',
  Прогресс: 'Пр',
  Профиль: 'Пф'
};

function TabIcon({ name, focused, active, inactive }: { name: string; focused: boolean; active: string; inactive: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: fonts.mono,
          color: focused ? active : inactive,
          letterSpacing: 0.4
        }}
      >
        {ICONS[name] ?? '·'}
      </Text>
      {focused ? (
        <View
          style={{
            width: 18,
            height: 2,
            borderRadius: 1,
            backgroundColor: active,
            marginTop: 2
          }}
        />
      ) : (
        <View style={{ height: 4 }} />
      )}
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
        initialRouteName="Профиль"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(11,15,20,0.96)',
            borderTopColor: colors.line,
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 8,
            paddingTop: 6
          },
          tabBarActiveTintColor: colors.lime,
          tabBarInactiveTintColor: colors.paperFaint,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: fonts.bodySemi,
            marginTop: 2
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={route.name}
              focused={focused}
              active={colors.lime}
              inactive={colors.paperFaint}
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
        <Tab.Screen name="Тренер" component={CoachScreen} />
        <Tab.Screen name="Прогресс" component={ProgressScreen} />
        <Tab.Screen name="Профиль" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
