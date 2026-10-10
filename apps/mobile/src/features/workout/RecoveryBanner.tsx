import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { analyzeRecovery, isProfileComplete } from '@forma/core';
import { fonts } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { selectDailyTotals, selectTodayMeals, useFitPulseStore } from '@/state/useFitPulseStore';

const GLASS_ML = 250;
const WATER_GOAL_ML = 2500;

function statusTint(
  status: string,
  colors: { lime: string; ember: string; paper: string }
): string {
  if (status === 'peak' || status === 'ready') return colors.lime;
  if (status === 'active_recovery_recommended') return colors.ember;
  if (status === 'rest_required') return colors.ember;
  return colors.lime;
}

/** Compact recovery strip for Workout tab (pure RecoveryEngine). */
export function RecoveryBanner() {
  const colors = useThemeColors();
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profile = useFitPulseStore((s) => s.profile);
  const metabolic = useFitPulseStore((s) => s.metabolic);
  const waterGlasses = useFitPulseStore((s) => s.waterGlasses);
  const allMeals = useFitPulseStore((s) => s.todayMeals);
  const todayMeals = useMemo(() => selectTodayMeals(allMeals), [allMeals]);
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

  const tint = statusTint(recovery.status, colors);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.panel,
        flexDirection: 'row',
        alignItems: 'stretch',
        overflow: 'hidden'
      }}
      accessibilityRole="summary"
      accessibilityLabel={`Восстановление ${recovery.recoveryScore} процентов, ${recovery.statusLabel}`}
    >
      <View style={{ width: 3, backgroundColor: tint }} />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 10
        }}
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
        <Text style={{ color: tint, fontFamily: fonts.mono, fontSize: 22 }}>
          {recovery.recoveryScore}%
        </Text>
      </View>
    </View>
  );
}
