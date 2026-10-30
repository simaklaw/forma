import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import Md3Card from '@/components/md3/Md3Card';
import { useT } from '@/i18n/strings';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { ProfileForm } from './ProfileForm';

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
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
          <Text style={styles.title}>{t('onboardingTitle')}</Text>
          <Text style={styles.sub}>{t('onboardingSub')}</Text>
          <Md3Card variant="flat" padding="lg" style={styles.card}>
            <ProfileForm
              initial={{
                weight: profile.weight,
                height: profile.height,
                age: profile.age,
                sex: profile.sex,
                focusAreas: profile.focusAreas ?? []
              }}
              submitLabel={t('onboardingSubmit')}
              onSubmit={(v) =>
                updateProfile({
                  weight: v.weight as number,
                  height: v.height as number,
                  age: v.age as number,
                  sex: v.sex as 'male' | 'female',
                  focusAreas: v.focusAreas
                })
              }
            />
          </Md3Card>
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
    card: { marginTop: spacing.md }
  });
}
