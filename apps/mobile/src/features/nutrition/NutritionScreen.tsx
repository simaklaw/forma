import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { isProfileComplete, toDateKey } from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore, selectDailyTotals, DayMeals } from '@/state/useFitPulseStore';
import { estimateWorkoutBurnKcal } from '@/engines/estimateWorkoutBurn';
import CalorieRing from '@/components/CalorieRing';
import DailyTipCard from '@/components/DailyTipCard';
import MacroBar from '@/components/MacroBar';
import ProfileGateBanner from '@/components/ProfileGateBanner';
import ScreenHeader from '@/components/ScreenHeader';
import AddFoodSheet from './AddFoodSheet';

const MEAL_LABELS: Record<keyof DayMeals, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  snack: 'Перекус',
  dinner: 'Ужин'
};

const WATER_MAX = 8;

function formatClockTime(ms?: number): string {
  if (!ms) return '--:--';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NutritionScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [activeMeal, setActiveMeal] = React.useState<keyof DayMeals>('breakfast');

  const meals = useFitPulseStore((s) => s.todayMeals);
  const removeFoodItem = useFitPulseStore((s) => s.removeFoodItem);
  const waterGlasses = useFitPulseStore((s) => s.waterGlasses);
  const setWater = useFitPulseStore((s) => s.setWater);
  const profile = useFitPulseStore((s) => s.profile);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const calculateTargets = useFitPulseStore((s) => s.calculateTargets);
  const totals = selectDailyTotals(meals);

  const complete = isProfileComplete({
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
    gender: profile.sex
  });
  const targets = complete
    ? calculateTargets()
    : { target: 0, proteinTarget: 0, fatTarget: 0, carbTarget: 0, bmr: 0, tdee: 0, protocolActive: false };

  const burned = complete
    ? estimateWorkoutBurnKcal(setLogs, toDateKey(new Date()), profile.weight)
    : 0;
  const budget = Math.round(targets.target + burned);
  const remainingKcal = complete ? Math.round(budget - totals.kcal) : 0;

  const headerSubtitle = !complete
    ? 'Заполните профиль для целей КБЖУ'
    : remainingKcal >= 0
      ? `Осталось ${remainingKcal.toLocaleString('ru-RU')} ккал`
      : `Сверх на ${Math.abs(remainingKcal).toLocaleString('ru-RU')} ккал`;

  function openAddFood(mealKey: keyof DayMeals) {
    setActiveMeal(mealKey);
    sheetRef.current?.expand();
  }

  function toggleWater(idx: number) {
    const next = waterGlasses === idx + 1 ? idx : idx + 1;
    setWater(Math.max(0, Math.min(WATER_MAX, next)));
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader eyebrow="Сегодня" title="Питание" subtitle={headerSubtitle} />

      <ScrollView contentContainerStyle={styles.body}>
        {!complete ? (
          <ProfileGateBanner
            inset
            body="Цели по ккал и БЖУ считаются из веса, роста, возраста и пола. Без этого кольцо и макросы не подставят фиктивные числа."
          />
        ) : null}

        <View style={styles.heroCard}>
          <CalorieRing
            eaten={totals.kcal}
            target={targets.target || 0}
            burned={burned}
            ready={complete}
          />
          <View style={styles.macroCol}>
            <MacroBar
              label="Белок"
              value={totals.protein}
              target={targets.proteinTarget || 0}
              color={colors.macroProtein}
            />
            <MacroBar
              label="Жиры"
              value={totals.fat}
              target={targets.fatTarget || 0}
              color={colors.macroFat}
            />
            <MacroBar
              label="Углев."
              value={totals.carbs}
              target={targets.carbTarget || 0}
              color={colors.macroCarb}
            />
            {complete ? (
              <View style={styles.budgetRow}>
                <View style={styles.budgetChip}>
                  <Text style={styles.budgetChipLabel}>Цель</Text>
                  <Text style={styles.budgetChipVal}>
                    {targets.target.toLocaleString('ru-RU')}
                  </Text>
                </View>
                {burned > 0 ? (
                  <View style={[styles.budgetChip, styles.budgetChipBurn]}>
                    <Text style={styles.budgetChipLabelBurn}>Тренировка</Text>
                    <Text style={styles.budgetChipValBurn}>
                      +{burned.toLocaleString('ru-RU')}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.budgetChip, styles.budgetChipTotal]}>
                  <Text style={styles.budgetChipLabel}>Бюджет</Text>
                  <Text style={styles.budgetChipValLime}>
                    {budget.toLocaleString('ru-RU')}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.remainHint}>Цели появятся после профиля</Text>
            )}
          </View>
        </View>

        <DailyTipCard inset />

        <View style={styles.waterCard}>
          <View style={styles.waterHead}>
            <Text style={styles.waterTitle}>Вода</Text>
            <Text style={styles.waterCount}>
              <Text style={{ color: colors.cyan }}>{waterGlasses}</Text> / {WATER_MAX} стаканов
            </Text>
          </View>
          <View style={styles.waterCells}>
            {Array.from({ length: WATER_MAX }).map((_, i) => {
              const filled = i < waterGlasses;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.waterCell, filled && styles.waterCellFilled]}
                  onPress={() => toggleWater(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Стакан ${i + 1}`}
                  accessibilityState={{ selected: filled }}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Приёмы пищи</Text>
          <Text style={styles.sectionCount}>{totals.kcal.toLocaleString('ru-RU')} ккал</Text>
        </View>

        {(Object.keys(MEAL_LABELS) as (keyof DayMeals)[]).map((key) => (
          <View key={key} style={styles.mealGroup}>
            <View style={styles.mealHead}>
              <Text style={styles.mealName}>{MEAL_LABELS[key]}</Text>
              <Text style={styles.mealKcal}>
                {meals[key].reduce((sum, i) => sum + i.kcal, 0)} ккал
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => openAddFood(key)}
                accessibilityRole="button"
                accessibilityLabel={`Добавить в ${MEAL_LABELS[key]}`}
              >
                <Text style={styles.addBtnText}>+ Добавить</Text>
              </TouchableOpacity>
            </View>
            {meals[key].length === 0 ? (
              <TouchableOpacity onPress={() => openAddFood(key)} accessibilityRole="button">
                <Text style={styles.empty}>Нет записей · нажмите «Добавить»</Text>
              </TouchableOpacity>
            ) : (
              meals[key].map((item) => (
                <View key={item.id} style={styles.foodRow}>
                  <Text style={styles.foodTime}>{formatClockTime(item.loggedAt)}</Text>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.foodMacro}>
                    Б{item.protein} Ж{item.fat} У{item.carbs}
                  </Text>
                  <Text style={styles.foodKcal}>{item.kcal}</Text>
                  <TouchableOpacity
                    onPress={() => removeFoodItem(key, item.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Удалить"
                  >
                    <Text style={styles.foodDel}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>

      <AddFoodSheet
        ref={sheetRef}
        mealKey={activeMeal}
        mealLabel={MEAL_LABELS[activeMeal]}
        onClose={() => sheetRef.current?.close()}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ink },
    body: { paddingBottom: 120 },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
      padding: spacing.lg,
      backgroundColor: colors.panel,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line
    },
    macroCol: { flex: 1, minWidth: 0 },
    remainHint: {
      marginTop: 4,
      color: colors.paperFaint,
      fontFamily: fonts.mono,
      fontSize: 11
    },
    budgetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4
    },
    budgetChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.control,
      backgroundColor: colors.ink,
      borderWidth: 1,
      borderColor: colors.lineStrong
    },
    budgetChipBurn: {
      borderColor: colors.cyan,
      backgroundColor: 'rgba(45,212,191,0.08)'
    },
    budgetChipTotal: {
      borderColor: colors.lime,
      backgroundColor: colors.limeDim
    },
    budgetChipLabel: {
      color: colors.paperFaint,
      fontSize: 9,
      fontFamily: fonts.body,
      letterSpacing: 0.3
    },
    budgetChipLabelBurn: {
      color: colors.cyan,
      fontSize: 9,
      fontFamily: fonts.body,
      letterSpacing: 0.3
    },
    budgetChipVal: {
      color: colors.paperDim,
      fontFamily: fonts.mono,
      fontSize: 12,
      marginTop: 1
    },
    budgetChipValBurn: {
      color: colors.cyan,
      fontFamily: fonts.mono,
      fontSize: 12,
      marginTop: 1
    },
    budgetChipValLime: {
      color: colors.lime,
      fontFamily: fonts.mono,
      fontSize: 12,
      marginTop: 1
    },
    waterCard: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.panel,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line
    },
    waterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    waterTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
    waterCount: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 13 },
    waterCells: { flexDirection: 'row', gap: 6 },
    waterCell: {
      flex: 1,
      height: 32,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.ink
    },
    waterCellFilled: {
      backgroundColor: colors.cyan,
      opacity: 0.85,
      borderColor: colors.cyan
    },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
      marginBottom: 10
    },
    sectionTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
    sectionCount: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 13 },
    mealGroup: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.panel,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line
    },
    mealHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    mealName: { flex: 1, color: colors.paper, fontSize: 15, fontFamily: fonts.bodySemi },
    mealKcal: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 13 },
    addBtn: {
      paddingHorizontal: 12,
      height: 32,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.lime,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.limeDim
    },
    addBtnText: { color: colors.lime, fontSize: 12, fontFamily: fonts.bodySemi },
    empty: { color: colors.paperFaint, fontSize: 12, paddingVertical: 4 },
    foodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    foodTime: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11, width: 34 },
    foodName: { flex: 1, color: colors.paper, fontSize: 13 },
    foodMacro: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 },
    foodKcal: {
      width: 40,
      textAlign: 'right',
      color: colors.lime,
      fontFamily: fonts.mono,
      fontWeight: '700'
    },
    foodDel: { width: 22, textAlign: 'center', color: colors.paperFaint, fontSize: 16 }
  });
}
