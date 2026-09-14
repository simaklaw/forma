import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { View } from 'react-native';
import { colors } from '@/core/theme/tokens';
import RootNavigator from '@/navigation/RootNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_600SemiBold
  });

  if (!fontsLoaded) {
    // Intentionally a bare, near-invisible view rather than a spinner — the
    // report's "no spinners, skeleton screens only" rule applies here too;
    // a real build should render the Workout screen's skeleton state
    // immediately instead of blocking on font load.
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
