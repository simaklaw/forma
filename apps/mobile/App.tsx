import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { View } from 'react-native';
import { CoachEngine } from '@forma/core';
import { colors } from '@/core/theme/tokens';
import RootNavigator from '@/navigation/RootNavigator';
import { LlamaLocalAITrainer } from '@/ai/LlamaLocalAITrainer';
import { setMobileTrainerProgress } from '@/ai/trainerProgress';
import {
  configureSessionPersistence,
  WORKOUT_DB_NAME
} from '@/features/workout/data';

function tryEnableSqliteSessions(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require('expo-sqlite') as {
      openDatabaseSync?: (name: string) => unknown;
    };
    if (typeof SQLite.openDatabaseSync === 'function') {
      configureSessionPersistence(
        'sqlite',
        SQLite.openDatabaseSync(WORKOUT_DB_NAME) as Parameters<
          typeof configureSessionPersistence
        >[1] extends infer _ ? any : never
      );
    }
  } catch {
    // Expo Go / missing native binary → keep MemorySessionRepository
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
    tryEnableSqliteSessions();
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
