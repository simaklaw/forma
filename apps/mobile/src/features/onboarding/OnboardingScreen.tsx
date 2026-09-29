import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { ProfileForm } from './ProfileForm';

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const profile = useFitPulseStore((s) => s.profile);
  const updateProfile = useFitPulseStore((s) => s.updateProfile);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>FITPULSE</Text>
          <Text style={styles.title}>Профиль</Text>
          <Text style={styles.sub}>
            Чтобы считать нагрузку и калории по Миффлину–Сан Жеору, нужны ваши данные. Без них
            тренировка не стартует. Вес по умолчанию не подставляется.
          </Text>
          <View style={styles.card}>
            <ProfileForm
              initial={{
                weight: profile.weight,
                height: profile.height,
                age: profile.age,
                sex: profile.sex
              }}
              submitLabel="Сохранить и войти"
              onSubmit={(v) =>
                updateProfile({
                  weight: v.weight as number,
                  height: v.height as number,
                  age: v.age as number,
                  sex: v.sex as 'male' | 'female'
                })
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ink },
    flex: { flex: 1 },
    body: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
      gap: spacing.md
    },
    eyebrow: {
      color: colors.lime,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontFamily: fonts.bodySemi
    },
    title: {
      color: colors.paper,
      fontFamily: fonts.mono,
      fontSize: 40,
      lineHeight: 42
    },
    sub: { color: colors.paperDim, fontSize: 14, lineHeight: 21, fontFamily: fonts.body },
    card: {
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel
    }
  });
}
