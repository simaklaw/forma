import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { ProfileForm } from './ProfileForm';

export default function OnboardingScreen() {
  const profile = useFitPulseStore((s) => s.profile);
  const updateProfile = useFitPulseStore((s) => s.updateProfile);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>FitPulse</Text>
        <Text style={styles.title}>Домашний тренер</Text>
        <Text style={styles.sub}>
          Чтобы считать нагрузку и калории по Миффлину–Сан Жеору, нужны ваши данные. Без них
          тренировка не стартует.
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
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
