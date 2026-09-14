import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '@/core/theme/tokens';
import { RestTimerEngine } from '@/engines/RestTimerEngine';

import WorkoutScreen from '@/features/workout/WorkoutScreen';
import NutritionScreen from '@/features/nutrition/NutritionScreen';
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

// Impact Light on every tab switch, per the report's micro-interaction spec.
function tabIcon(label: string) {
  return () => <Text style={{ fontSize: 10, color: colors.paperFaint }}>{label}</Text>;
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.ink, borderTopColor: colors.line, height: 78 },
          tabBarActiveTintColor: colors.lime,
          tabBarInactiveTintColor: colors.paperFaint,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }
        }}
        screenListeners={{
          tabPress: () => RestTimerEngine.hapticTabSwitch()
        }}
      >
        <Tab.Screen name="Тренировки" component={WorkoutScreen} options={{ tabBarIcon: tabIcon('●') }} />
        <Tab.Screen name="Питание" component={NutritionScreen} options={{ tabBarIcon: tabIcon('●') }} />
        <Tab.Screen name="Прогресс" component={ProgressScreen} options={{ tabBarIcon: tabIcon('●') }} />
        <Tab.Screen name="Профиль" component={ProfileScreen} options={{ tabBarIcon: tabIcon('●') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
