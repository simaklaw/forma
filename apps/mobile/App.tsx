import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as Font from 'expo-font';
import { Platform, View } from 'react-native';
import { CoachEngine, isProfileComplete } from '@forma/core';
import { resolveColors } from '@/core/theme/tokens';
import { useThemeStore } from '@/state/useThemeStore';
import RootNavigator from '@/navigation/RootNavigator';
import OnboardingScreen from '@/features/onboarding/OnboardingScreen';
import { WorkoutErrorBoundary } from '@/features/workout/WorkoutErrorBoundary';
import { LlamaLocalAITrainer } from '@/ai/LlamaLocalAITrainer';
import { setMobileTrainerProgress } from '@/ai/trainerProgress';
import {
  configureSessionPersistence,
  getSessionPersistenceMode,
  WORKOUT_DB_NAME,
  type SqliteDatabase
} from '@/features/workout/data';
import { startOutboxDrainLifecycle } from '@/features/workout/data/bootstrapOutboxDrain';
import { hydrateSessionReadModel } from '@/features/workout/session/hydrateSessionReadModel';
import { useFitPulseStore } from '@/state/useFitPulseStore';

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
    void trainer.initialize((ratio) => setMobileTrainerProgress(ratio));

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
          <WorkoutErrorBoundary>
            <RootNavigator />
          </WorkoutErrorBoundary>
        ) : (
          <OnboardingScreen />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
