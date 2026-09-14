import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { colors, fonts, spacing } from '@/core/theme/tokens';
import { useFitPulseStore, selectDailyTotals, DayMeals } from '@/state/useFitPulseStore';
import CalorieRing from '@/components/CalorieRing';
import MacroBar from '@/components/MacroBar';
import AddFoodSheet from './AddFoodSheet';

const MEAL_LABELS: Record<keyof DayMeals, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  snack: 'Перекус',
  dinner: 'Ужин'
};

/** Real HH:MM for a food item's loggedAt, or a dash for items imported/added
 *  before that field existed. Replaces the fixed MEAL_TIMES constant, which
 *  labelled every item in a meal group with the same constant clock time
 *  (e.g. every "Обед" item said "13:20") regardless of when it was actually
 *  added — see HANDOFF.md. */
function formatClockTime(ms?: number): string {
  if (!ms) return '--:--';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NutritionScreen() {
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [activeMeal, setActiveMeal] = React.useState<keyof DayMeals>('breakfast');

  const meals = useFitPulseStore((s) => s.todayMeals);
  const removeFoodItem = useFitPulseStore((s) => s.removeFoodItem);
  const targets = useFitPulseStore((s) => s.calculateTargets());
  const totals = selectDailyTotals(meals);

  function openAddFood(mealKey: keyof DayMeals) {
    setActiveMeal(mealKey);
    sheetRef.current?.expand();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Сегодня</Text>
        <Text style={styles.title}>Питание</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.calBlock}>
          <CalorieRing eaten={totals.kcal} target={targets.target} />
          <View style={{ flex: 1 }}>
            <MacroBar label="Б" value={totals.protein} target={targets.proteinTarget} color={colors.cyan} />
            <MacroBar label="Ж" value={totals.fat} target={targets.fatTarget} color={colors.cyan} />
            <MacroBar label="У" value={totals.carbs} target={targets.carbTarget} color={colors.cyan} />
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
              <TouchableOpacity style={styles.addBtn} onPress={() => openAddFood(key)} accessibilityLabel={`Добавить в ${MEAL_LABELS[key]}`}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {meals[key].length === 0 ? (
              <Text style={styles.empty}>Нет записей</Text>
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
                  <TouchableOpacity onPress={() => removeFoodItem(key, item.id)} accessibilityLabel={`Удалить ${item.name}`}>
                    <Text style={styles.foodDel}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>

      <AddFoodSheet ref={sheetRef} mealKey={activeMeal} mealLabel={MEAL_LABELS[activeMeal]} onClose={() => sheetRef.current?.close()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.line },
  eyebrow: { color: colors.paperFaint, fontSize: 11, fontFamily: fonts.body },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono },
  body: { paddingBottom: 120 },
  calBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    margin: spacing.xxl,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xxl,
    marginTop: spacing.md,
    marginBottom: 10
  },
  sectionTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
  sectionCount: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 13 },
  mealGroup: { marginHorizontal: spacing.xxl, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  mealName: { flex: 1, color: colors.paper, fontSize: 14.5, fontFamily: fonts.bodySemi },
  mealKcal: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 14 },
  addBtn: { width: 24, height: 24, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: colors.paperDim, fontSize: 15, lineHeight: 15 },
  empty: { color: colors.paperFaint, fontSize: 11.5, fontStyle: 'italic', paddingVertical: 4 },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  foodTime: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11, width: 34 },
  foodName: { flex: 1, color: colors.paper, fontSize: 12.5 },
  foodMacro: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11.5 },
  foodKcal: { width: 44, textAlign: 'right', color: colors.cyan, fontFamily: fonts.mono, fontWeight: '700' },
  foodDel: { width: 20, textAlign: 'center', color: colors.paperFaint, fontSize: 16 }
});
