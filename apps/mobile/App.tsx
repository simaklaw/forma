import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Platform, View } from 'react-native';
import { CoachEngine } from '@forma/core';
import { colors } from '@/core/theme/tokens';
import RootNavigator from '@/navigation/RootNavigator';
import { LlamaLocalAITrainer } from '@/ai/LlamaLocalAITrainer';
import { setMobileTrainerProgress } from '@/ai/trainerProgress';
import {
  configureSessionPersistence,
  getSessionPersistenceMode,
  WORKOUT_DB_NAME,
  type SqliteDatabase
} from '@/features/workout/data';

/**
 * Native (iOS/Android) requires SQLite for durable sessions.
 * In __DEV__, failure to open expo-sqlite is loud (no silent memory fallback).
 * Memory is only for Jest / explicit configureSessionPersistence('memory').
 */
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
    if (isNative && typeof __DEV__ !== 'undefined' && __DEV__) {
      // Fail fast in development so missing native module / lockfile is visible.
      console.error(
        '[FitPulse] SQLite session store failed to initialize. ' +
          'Install expo-sqlite and rebuild the dev client. Falling back to memory only for this process.',
        err
      );
      // Still allow UI to boot, but mode stays memory unless configure was called.
      if (getSessionPersistenceMode() !== 'sqlite') {
        configureSessionPersistence('memory');
      }
    }
    // Production native: leave default memory only if configure never ran — still log.
    if (isNative) {
      console.warn('[FitPulse] workout persistence is memory-only; sessions will not survive process death');
    }
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_600SemiBold
  });

  useEffect(() => {
    enableSqliteSessions();
    const trainer = new LlamaLocalAITrainer();
    CoachEngine.setTrainer(trainer);
    void trainer.initialize((ratio) => setMobileTrainerProgress(ratio));
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.ink }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
