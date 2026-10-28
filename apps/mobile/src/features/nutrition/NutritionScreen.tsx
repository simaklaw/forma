import React, { useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { isProfileComplete, toDateKey } from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT, type StringKey } from '@/i18n/strings';
import {
  useFitPulseStore,
  selectDailyTotals,
  selectTodayMeals,
  selectYesterdayMealItems,
  DayMeals
} from '@/state/useFitPulseStore';
import { estimateWorkoutBurnKcal } from '@/engines/estimateWorkoutBurn';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import CalorieRing from '@/components/CalorieRing';
import DailyTipCard from '@/components/DailyTipCard';
import MacroBar from '@/components/MacroBar';
import ProfileGateBanner from '@/components/ProfileGateBanner';
import ScreenHeader from '@/components/ScreenHeader';
import AddFoodSheet from './AddFoodSheet';
import { MICRO_REFERENCE, hasAnyMicros, sumDailyMicros } from './dailyMicros';

const MEAL_LABEL_KEYS: Record<keyof DayMeals, StringKey> = {
  breakfast: 'mealBreakfast',
  lunch: 'mealLunch',
  snack: 'mealSnack',
  dinner: 'mealDinner'
};

const WATER_MAX = 8;

function formatClockTime(ms?: number): string {
  if (!ms) return '--:--';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Прошло с начала голодания: полные дни и часы:минуты. */
function fastingClock(startedAt: number, nowMs: number): { days: number; hhmm: string } {
  const totalMin = Math.max(0, Math.floor((nowMs - startedAt) / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  return {
    days,
    hhmm: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
}

export default function NutritionScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [activeMeal, setActiveMeal] = React.useState<keyof DayMeals>('breakfast');

  const allMeals = useFitPulseStore((s) => s.todayMeals);
  const meals = React.useMemo(() => selectTodayMeals(allMeals), [allMeals]);
  const removeFoodItem = useFitPulseStore((s) => s.removeFoodItem);
  const copyFoodItems = useFitPulseStore((s) => s.copyFoodItems);
  const savedMeals = useFitPulseStore((s) => s.savedMeals);
  const logSavedMeal = useFitPulseStore((s) => s.logSavedMeal);
  const waterGlasses = useFitPulseStore((s) => s.waterGlasses);
  const setWater = useFitPulseStore((s) => s.setWater);
  const fastingStartedAt = useFitPulseStore((s) => s.fastingStartedAt);
  const startFasting = useFitPulseStore((s) => s.startFasting);
  const stopFasting = useFitPulseStore((s) => s.stopFasting);
  const profile = useFitPulseStore((s) => s.profile);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const calculateTargets = useFitPulseStore((s) => s.calculateTargets);
  const totals = selectDailyTotals(meals);
  // Микронутриенты приходят из OFF; карточку прячем, пока данных нет.
  const micros = sumDailyMicros([
    ...meals.breakfast,
    ...meals.lunch,
    ...meals.snack,
    ...meals.dinner
  ]);
  const showMicros = hasAnyMicros(micros);

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
    ? t('nutritionFillProfile')
    : remainingKcal >= 0
      ? t('nutritionRemaining', { kcal: remainingKcal.toLocaleString(locale) })
      : t('nutritionOver', { kcal: Math.abs(remainingKcal).toLocaleString(locale) });

  // issue #160: хаптик при переходе дневного калоража за бюджет (один раз на переход).
  const overBudget = complete && remainingKcal < 0;
  const prevOverBudgetRef = React.useRef(overBudget);
  React.useEffect(() => {
    if (overBudget && !prevOverBudgetRef.current) {
      RestTimerEngine.hapticCalorieOver();
    }
    prevOverBudgetRef.current = overBudget;
  }, [overBudget]);

  function openAddFood(mealKey: keyof DayMeals) {
    setActiveMeal(mealKey);
    sheetRef.current?.expand();
  }

  function toggleWater(idx: number) {
    const next = waterGlasses === idx + 1 ? idx : idx + 1;
    setWater(Math.max(0, Math.min(WATER_MAX, next)));
    RestTimerEngine.hapticTabSwitch();
  }

  // Тикающие часы таймера голодания — обновляем раз в 30 с, только пока идёт.
  const [fastingNow, setFastingNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (fastingStartedAt == null) return;
    setFastingNow(Date.now());
    const id = setInterval(() => setFastingNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [fastingStartedAt]);

  /** Старт — только после диалога-предупреждения о здоровье. */
  function confirmStartFasting() {
    RestTimerEngine.hapticTabSwitch();
    Alert.alert(t('fastingWarningTitle'), t('fastingWarningBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('fastingConfirm'), style: 'default', onPress: startFasting }
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader eyebrow={t('today')} title={t('nutritionTitle')} subtitle={headerSubtitle} />

      <ScrollView contentContainerStyle={styles.body}>
        {!complete ? (
          <ProfileGateBanner
            inset
            body={t('nutritionGoalHint')}
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
              label={t('nutritionProtein')}
              value={totals.protein}
              target={targets.proteinTarget || 0}
              color={colors.macroProtein}
            />
            <MacroBar
              label={t('nutritionFats')}
              value={totals.fat}
              target={targets.fatTarget || 0}
              color={colors.macroFat}
            />
            <MacroBar
              label={t('nutritionCarbs')}
              value={totals.carbs}
              target={targets.carbTarget || 0}
              color={colors.macroCarb}
            />
            {complete ? (
              <View style={styles.budgetRow}>
                <View style={styles.budgetChip}>
                  <Text style={styles.budgetChipLabel}>{t('resultTarget')}</Text>
                  <Text style={styles.budgetChipVal}>
                    {targets.target.toLocaleString(locale)}
                  </Text>
                </View>
                {burned > 0 ? (
                  <View style={[styles.budgetChip, styles.budgetChipBurn]}>
                    <Text style={styles.budgetChipLabelBurn}>{t('workoutTitle')}</Text>
                    <Text style={styles.budgetChipValBurn}>
                      +{burned.toLocaleString(locale)}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.budgetChip, styles.budgetChipTotal]}>
                  <Text style={styles.budgetChipLabel}>{t('budgetLabel')}</Text>
                  <Text style={styles.budgetChipValLime}>
                    {budget.toLocaleString(locale)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.remainHint}>{t('nutritionTargetsAfterProfile')}</Text>
            )}
          </View>
        </View>

        {showMicros ? (
          <View style={styles.microCard}>
            <Text style={styles.microTitle}>{t('microCardTitle')}</Text>
            <MacroBar
              label={t('microFiber')}
              value={micros.fiber}
              target={MICRO_REFERENCE.fiber}
              color={colors.lime}
              tagWidth={92}
            />
            <MacroBar
              label={t('microSugars')}
              value={micros.sugars}
              target={MICRO_REFERENCE.sugars}
              color={colors.macroCarb}
              tagWidth={92}
            />
            <MacroBar
              label={t('microSatFat')}
              value={micros.saturatedFat}
              target={MICRO_REFERENCE.saturatedFat}
              color={colors.macroFat}
              tagWidth={92}
            />
            <MacroBar
              label={t('microSodium')}
              value={micros.sodiumMg}
              target={MICRO_REFERENCE.sodiumMg}
              color={colors.cyan}
              unit={t('microUnitMg')}
              tagWidth={92}
            />
            <Text style={styles.microHint}>{t('microHint')}</Text>
          </View>
        ) : null}

        <DailyTipCard inset />

        <View style={styles.waterCard}>
          <View style={styles.waterHead}>
            <Text style={styles.waterTitle}>{t('progressWater')}</Text>
            <Text style={styles.waterCount}>
              <Text style={{ color: colors.cyan }}>{waterGlasses}</Text> / {WATER_MAX} {t('glassesWord')}
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
                  accessibilityLabel={t('nutritionGlass', { number: i + 1 })}
                  accessibilityState={{ selected: filled }}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.fastingCard}>
          <View style={styles.waterHead}>
            <Text style={styles.waterTitle}>{t('fastingTitle')}</Text>
            {fastingStartedAt != null ? (
              <Text style={styles.fastingClock}>
                {(() => {
                  const { days, hhmm } = fastingClock(fastingStartedAt, fastingNow);
                  return days > 0 ? t('fastingElapsedDays', { days, time: hhmm }) : hhmm;
                })()}
              </Text>
            ) : null}
          </View>
          {fastingStartedAt != null ? (
            <TouchableOpacity
              style={styles.fastingStopBtn}
              onPress={() => {
                stopFasting();
                RestTimerEngine.hapticTabSwitch();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('fastingStop')}
            >
              <Text style={styles.fastingStopText}>{t('fastingStop')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.fastingStartBtn}
              onPress={confirmStartFasting}
              accessibilityRole="button"
              accessibilityLabel={t('fastingStart')}
            >
              <Text style={styles.fastingStartText}>{t('fastingStart')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {savedMeals.length > 0 ? (
          <View style={styles.savedMealsRow}>
            <Text style={styles.sectionTitle}>{t('nutritionMyDishes')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {savedMeals.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.savedMealChip}
                  onPress={() => logSavedMeal(activeMeal, m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('nutritionAddToMeal', {
                    name: m.name,
                    meal: t(MEAL_LABEL_KEYS[activeMeal])
                  })}
                >
                  <Text style={styles.savedMealChipText} numberOfLines={1}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('nutritionMeals')}</Text>
          <Text style={styles.sectionCount}>{totals.kcal.toLocaleString(locale)} {t('kcal')}</Text>
        </View>

        {(Object.keys(MEAL_LABEL_KEYS) as (keyof DayMeals)[]).map((key) => (
          <View key={key} style={styles.mealGroup}>
            <View style={styles.mealHead}>
              <Text style={styles.mealName}>{t(MEAL_LABEL_KEYS[key])}</Text>
              <Text style={styles.mealKcal}>
                {meals[key].reduce((sum, i) => sum + i.kcal, 0)} {t('kcal')}
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => openAddFood(key)}
                accessibilityRole="button"
                accessibilityLabel={t('nutritionAddToMealShort', { meal: t(MEAL_LABEL_KEYS[key]) })}
              >
                <Text style={styles.addBtnText}>{t('nutritionAdd')}</Text>
              </TouchableOpacity>
            </View>
            {meals[key].length === 0 && selectYesterdayMealItems(allMeals, key).length > 0 ? (
              <TouchableOpacity
                style={styles.repeatBtn}
                onPress={() => copyFoodItems(key, selectYesterdayMealItems(allMeals, key))}
                accessibilityRole="button"
                accessibilityLabel={t('nutritionRepeatYesterday', {
                  meal: t(MEAL_LABEL_KEYS[key]).toLowerCase()
                })}
              >
                <Text style={styles.repeatBtnText}>
                  ⟲ {t('nutritionRepeatYesterdayShort')} ·{' '}
                  {selectYesterdayMealItems(allMeals, key).reduce((sum, i) => sum + i.kcal, 0)}{' '}
                  {t('kcal')}
                </Text>
              </TouchableOpacity>
            ) : null}
            {meals[key].length === 0 ? (
              <TouchableOpacity onPress={() => openAddFood(key)} accessibilityRole="button">
                <Text style={styles.empty}>{t('nutritionNoEntries')}</Text>
              </TouchableOpacity>
            ) : (
              meals[key].map((item) => (
                <View key={item.id} style={styles.foodRow}>
                  <Text style={styles.foodTime}>{formatClockTime(item.loggedAt)}</Text>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.foodMacro}>
                    {t('foodMacroLine', {
                      protein: item.protein,
                      fat: item.fat,
                      carbs: item.carbs
                    })}
                  </Text>
                  <Text style={styles.foodKcal}>{item.kcal}</Text>
                  <TouchableOpacity
                    onPress={() => removeFoodItem(key, item.id)}
                    style={styles.foodDelBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('delete')}
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
        mealLabel={t(MEAL_LABEL_KEYS[activeMeal])}
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
      backgroundColor: colors.cyanDim
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
    microCard: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.panel,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line
    },
    microTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
    microHint: {
      marginTop: 2,
      color: colors.paperFaint,
      fontSize: 10.5,
      fontFamily: fonts.body
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
    fastingCard: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.panel,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line
    },
    fastingClock: { color: colors.lime, fontFamily: fonts.mono, fontSize: 13 },
    fastingStartBtn: {
      paddingVertical: 10,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.lime,
      backgroundColor: colors.limeDim,
      alignItems: 'center'
    },
    fastingStartText: { color: colors.lime, fontSize: 12, fontFamily: fonts.bodySemi },
    fastingStopBtn: {
      paddingVertical: 10,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      alignItems: 'center'
    },
    fastingStopText: { color: colors.paperDim, fontSize: 12, fontFamily: fonts.bodySemi },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
      marginBottom: 10
    },
    sectionTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
    savedMealsRow: { marginHorizontal: spacing.xl, marginTop: spacing.md },
    savedMealChip: {
      marginTop: 8,
      marginRight: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.panel,
      maxWidth: 160
    },
    savedMealChipText: { color: colors.paper, fontSize: 12, fontFamily: fonts.bodySemi },
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
      minHeight: 32,
      paddingVertical: 6,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.lime,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.limeDim
    },
    addBtnText: { color: colors.lime, fontSize: 12, fontFamily: fonts.bodySemi },
    repeatBtn: {
      marginBottom: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radius.control,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.lineStrong,
      alignItems: 'center'
    },
    repeatBtnText: { color: colors.paperDim, fontSize: 12, fontFamily: fonts.body },
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
    /** issue «микро-кнопки»: видимая зона нажатия 32×32 + hitSlop вместо ~22×18. */
    foodDelBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.control
    },
    foodDel: { fontSize: 18, lineHeight: 22, textAlign: 'center', color: colors.paperFaint }
  });
}
