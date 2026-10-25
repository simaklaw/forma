import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as Font from 'expo-font';
import { Platform, useColorScheme, View } from 'react-native';
import { CoachEngine, isProfileComplete, toDateKey } from '@forma/core';
import { resolveColors } from '@/core/theme/tokens';
import { useThemeStore } from '@/state/useThemeStore';
import RootNavigator from '@/navigation/RootNavigator';
import OnboardingScreen from '@/features/onboarding/OnboardingScreen';
import { AppErrorBoundary } from '@/features/workout/AppErrorBoundary';
import { LlamaLocalAITrainer } from '@/ai/LlamaLocalAITrainer';
import {
  configureSessionPersistence,
  getSessionPersistenceMode,
  WORKOUT_DB_NAME,
  type SqliteDatabase
} from '@/features/workout/data';
import { startOutboxDrainLifecycle } from '@/features/workout/data/bootstrapOutboxDrain';
import { hydrateSessionReadModel } from '@/features/workout/session/hydrateSessionReadModel';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { useVoiceCuesStore } from '@/state/useVoiceCuesStore';
import { VoiceCuesEngine } from '@/engines/VoiceCuesEngine';
import { reconcileStreakFreeze } from '@/engines/streakFreeze';
import { foodLogDates } from '@/engines/WorkoutStats';
import { useStreakFreezeStore } from '@/state/useStreakFreezeStore';

function enableSqliteSessions(): void {
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require('expo-sqlite') as {
      openDatabaseSync?: (name: string) => SqliteDatabase;
    };
    if (typeof SQLite.openDatabaseSync !== 'function') {
      throw new Error('expo-sqlite.openDatabaseSync is not available');
    }
    configureSessionPersistence('sqlite', SQLite.openDatabaseSync(WORKOUT_DB_NAME));
  } catch (err) {
    if (isNative) {
      console.error(
        '[FitPulse] SQLite session store failed to initialize. ' +
          'Install expo-sqlite, run pnpm install, rebuild the dev client. ' +
          'Using non-blocking memory fallback for this process.',
        err
      );
      if (getSessionPersistenceMode() !== 'sqlite') {
        configureSessionPersistence('memory');
      }
    }
  }
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(() => useFitPulseStore.persist.hasHydrated());
  const profile = useFitPulseStore((s) => s.profile);
  const themeMode = useThemeStore((s) => s.mode);
  const shell = resolveColors(themeMode);
  const voiceCuesEnabled = useVoiceCuesStore((s) => s.enabled);
  const voiceCueFlags = useVoiceCuesStore((s) => s.events);
  const systemScheme = useColorScheme();

  // issue #160: предпочтение «Как на устройстве» — store получает системную
  // схему и мгновенно переключает mode (а с ним StatusBar и все экраны).
  useEffect(() => {
    useThemeStore.getState().setSystemMode(systemScheme === 'dark' ? 'dark' : 'light');
  }, [systemScheme]);

  useEffect(() => {
    VoiceCuesEngine.setEnabled(voiceCuesEnabled);
  }, [voiceCuesEnabled]);

  // Гранулярные настройки «что озвучивать» из профиля: каждый announce-метод
  // движка проверяет свой флаг (мастер-тумблер включения — эффект выше).
  useEffect(() => {
    VoiceCuesEngine.configure(voiceCueFlags);
  }, [voiceCueFlags]);

  // Заморозка серии: после гидратации логов и при каждом их изменении
  // пересчитываем, какие пустые дни «съедают» заморозку (авто-режим, до
  // FREEZES_PER_MONTH в месяц — без ручных действий пользователя).
  useEffect(() => {
    if (!hydrated) return;
    const runFreezeReconcile = () => {
      const { setLogs, todayMeals } = useFitPulseStore.getState();
      const workoutDates = new Set(setLogs.map((e) => e.dateKey));
      const mealDates = foodLogDates(todayMeals, toDateKey(new Date()));
      const isActiveDay = (key: string) => workoutDates.has(key) || mealDates.has(key);
      useStreakFreezeStore
        .getState()
        .applyReconciled(
          reconcileStreakFreeze(useStreakFreezeStore.getState().frozenDates, isActiveDay)
        );
    };
    runFreezeReconcile();
    return useFitPulseStore.subscribe(runFreezeReconcile);
  }, [hydrated]);

  useEffect(() => {
    void Font.loadAsync({
      BarlowCondensed_600SemiBold,
      BarlowCondensed_700Bold,
      Inter_400Regular,
      Inter_600SemiBold
    })
      .catch(() => undefined)
      .finally(() => setFontsLoaded(true));

    enableSqliteSessions();
    void hydrateSessionReadModel();
    const stopOutbox = startOutboxDrainLifecycle();

    const trainer = new LlamaLocalAITrainer();
    CoachEngine.setTrainer(trainer);
    void trainer.initialize();

    const unsub = useFitPulseStore.persist.onFinishHydration(() => setHydrated(true));
    if (useFitPulseStore.persist.hasHydrated()) setHydrated(true);
    return () => {
      unsub();
      stopOutbox();
    };
  }, []);

  if (!fontsLoaded || !hydrated) {
    return <View style={{ flex: 1, backgroundColor: shell.ink }} />;
  }

  const complete = isProfileComplete({
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
    gender: profile.sex
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: shell.ink }}>
      <SafeAreaProvider>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        {complete ? (
          <AppErrorBoundary>
            <RootNavigator />
          </AppErrorBoundary>
        ) : (
          <OnboardingScreen />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
