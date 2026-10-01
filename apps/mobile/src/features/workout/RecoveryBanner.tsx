import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { analyzeRecovery, isProfileComplete } from '@forma/core';
import { fonts } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { selectDailyTotals, useFitPulseStore } from '@/state/useFitPulseStore';

const GLASS_ML = 250;
const WATER_GOAL_ML = 2500;

/** Compact recovery strip for Workout tab (pure RecoveryEngine). */
export function RecoveryBanner() {
  const colors = useThemeColors();
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profile = useFitPulseStore((s) => s.profile);
  const metabolic = useFitPulseStore((s) => s.metabolic);
  const waterGlasses = useFitPulseStore((s) => s.waterGlasses);
  const todayMeals = useFitPulseStore((s) => s.todayMeals);
  const calcTargets = useFitPulseStore((s) => s.calculateTargets);

  const recovery = useMemo(() => {
    const dates = [...new Set(setLogs.map((e) => e.dateKey))].sort();
    const workouts = dates.map((date) => ({ date, completed: true as const }));
    const meals = selectDailyTotals(todayMeals);
    const complete = isProfileComplete({
      weightKg: profile.weight,
      heightCm: profile.height,
      age: profile.age,
      gender: profile.sex
    });
    const targets = complete ? calcTargets() : null;
    return analyzeRecovery({
      workouts,
      intakeKcal: meals.kcal,
      intakeProteinG: meals.protein,
      targetKcal: targets?.target,
      targetProteinG: targets?.proteinTarget,
      waterLogsMl: waterGlasses * GLASS_ML,
      waterGoalMl: WATER_GOAL_ML
    });
  }, [setLogs, todayMeals, profile, waterGlasses, calcTargets, metabolic]);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.panel,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}
      accessibilityRole="summary"
      accessibilityLabel={`Восстановление ${recovery.recoveryScore} процентов, ${recovery.statusLabel}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 }}>
          ВОССТАНОВЛЕНИЕ
        </Text>
        <Text
          style={{
            color: colors.paper,
            fontFamily: fonts.bodySemi,
            fontSize: 14,
            marginTop: 2
          }}
        >
          {recovery.statusLabel}
        </Text>
      </View>
      <Text style={{ color: colors.lime, fontFamily: fonts.mono, fontSize: 22 }}>
        {recovery.recoveryScore}%
      </Text>
    </View>
  );
}
