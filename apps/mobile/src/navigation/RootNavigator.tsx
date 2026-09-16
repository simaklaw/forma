import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { colors, fonts } from '@/core/theme/tokens';
import { RestTimerEngine } from '@/engines/RestTimerEngine';

import WorkoutScreen from '@/features/workout/WorkoutScreen';
import NutritionScreen from '@/features/nutrition/NutritionScreen';
import CoachScreen from '@/features/coach/CoachScreen';
import ProgressScreen from '@/features/analytics/ProgressScreen';
import ProfileScreen from '@/features/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink,
    card: colors.ink,
    border: colors.line,
    primary: colors.lime,
    text: colors.paper
  }
};

/** Glyph-only icons keep the bar light without adding icon packs. */
const ICONS: Record<string, string> = {
  Тренировки: '🏋️',
  Питание: '🍽',
  Тренер: '💬',
  Прогресс: '📊',
  Профиль: '👤'
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 16, opacity: focused ? 1 : 0.45 }}>{ICONS[name] ?? '•'}</Text>
      {focused ? (
        <View
          style={{
            width: 18,
            height: 2,
            borderRadius: 1,
            backgroundColor: colors.lime,
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
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(11,15,20,0.96)',
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
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />
        })}
        screenListeners={{
          tabPress: () => RestTimerEngine.hapticTabSwitch()
        }}
      >
        <Tab.Screen name="Тренировки" component={WorkoutScreen} />
        <Tab.Screen name="Питание" component={NutritionScreen} />
        <Tab.Screen name="Тренер" component={CoachScreen} />
        <Tab.Screen name="Прогресс" component={ProgressScreen} />
        <Tab.Screen name="Профиль" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
