import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import AppBottomSheet from '@/components/BottomSheet';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import { useFitPulseStore, DayMeals, type FoodItem } from '@/state/useFitPulseStore';
import { OpenFoodFactsService, NormalizedFood } from '@/services/OpenFoodFactsService';
import { uuidv7 } from '@/features/workout/data/ids';

const LOCAL_PRESETS: NormalizedFood[] = [
  { name: 'Куриная грудка варёная', kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
  { name: 'Рис отварной', kcal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  { name: 'Гречка отварная', kcal: 110, protein: 4, fat: 1.1, carbs: 21 },
  { name: 'Яйцо куриное, 1 шт.', kcal: 78, protein: 6.3, fat: 5.3, carbs: 0.6 },
  { name: 'Творог 5%', kcal: 121, protein: 17, fat: 5, carbs: 3 },
  { name: 'Лосось на пару', kcal: 208, protein: 20, fat: 13, carbs: 0 },
  { name: 'Овсянка на воде', kcal: 88, protein: 3, fat: 1.7, carbs: 15 },
  { name: 'Банан, 1 шт.', kcal: 89, protein: 1.1, fat: 0.3, carbs: 23 }
];

type Tab = 'database' | 'custom';

interface Props {
  mealKey: keyof DayMeals;
  mealLabel: string;
  onClose: () => void;
}

const AddFoodSheet = forwardRef<GorhomBottomSheet, Props>(({ mealKey, mealLabel, onClose }, ref) => {
  const addFoodItem = useFitPulseStore((s) => s.addFoodItem);
  const customFoods = useFitPulseStore((s) => s.customFoods);
  const addCustomFood = useFitPulseStore((s) => s.addCustomFood);

  const [tab, setTab] = useState<Tab>('database');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedFood[]>(LOCAL_PRESETS);
  const [sourceLabel, setSourceLabel] = useState('Локальная база:');
  const [loading, setLoading] = useState(false);
  const [portion, setPortion] = useState(100);

  const [name, setName] = useState('');
  const [kcal100, setKcal100] = useState('120');
  const [protein100, setProtein100] = useState('10');
  const [fat100, setFat100] = useState('5');
  const [carbs100, setCarbs100] = useState('10');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const catalogPresets = useCallback((): NormalizedFood[] => {
    const custom: NormalizedFood[] = (customFoods ?? []).map((f) => ({
      name: f.name,
      kcal: f.kcal,
      protein: f.protein,
      fat: f.fat,
      carbs: f.carbs
    }));
    const names = new Set(custom.map((c) => c.name.trim().toLowerCase()));
    return [...LOCAL_PRESETS.filter((p) => !names.has(p.name.trim().toLowerCase())), ...custom];
  }, [customFoods]);

  const runLocalFilter = useCallback(
    (q: string) => {
      const lower = q.toLowerCase();
      setResults(catalogPresets().filter((f) => f.name.toLowerCase().includes(lower)));
      setSourceLabel('Локальная база:');
    },
    [catalogPresets]
  );

  useEffect(() => {
    if (tab !== 'database') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      runLocalFilter(query);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const remote = await OpenFoodFactsService.searchProducts(query.trim());
      setLoading(false);
      if (remote.length > 0) {
        setResults(remote);
        setSourceLabel('Open Food Facts:');
      } else {
        runLocalFilter(query);
        setSourceLabel('OFF пусто — локальная база:');
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, runLocalFilter]);

  function logFromFood(item: NormalizedFood) {
    const mult = portion / 100;
    addFoodItem(mealKey, {
      name: item.name,
      kcal: Math.round((item.kcal || 0) * mult),
      protein: Math.round((item.protein || 0) * mult),
      fat: Math.round((item.fat || 0) * mult),
      carbs: Math.round((item.carbs || 0) * mult)
    });
    setQuery('');
    setPortion(100);
    onClose();
  }

  function confirmCustom() {
    const def = {
      name: name.trim() || 'Свой продукт',
      kcal: parseFloat(kcal100) || 0,
      protein: parseFloat(protein100) || 0,
      fat: parseFloat(fat100) || 0,
      carbs: parseFloat(carbs100) || 0
    };
    addCustomFood(def);
    logFromFood(def);
    setName('');
    setKcal100('120');
    setProtein100('10');
    setFat100('5');
    setCarbs100('10');
  }

  return (
    <AppBottomSheet
      ref={ref}
      eyebrow="Дневник питания"
      title={`Добавить в ${mealLabel.toLowerCase()}`}
      onClose={onClose}
      snapPoints={['75%', '92%']}
    >
      <View style={styles.tabs}>
        {(['database', 'custom'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabOn]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'database' ? 'Из базы' : 'Свой продукт'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'database' ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск в базе продуктов…"
            placeholderTextColor={colors.paperFaint}
            value={query}
            onChangeText={setQuery}
          />
          <Text style={styles.sourceLabel}>{loading ? 'Ищу в Open Food Facts…' : sourceLabel}</Text>
          <Text style={styles.label}>Порция: {portion} г</Text>
          <Slider
            minimumValue={25}
            maximumValue={400}
            step={25}
            value={portion}
            onValueChange={setPortion}
            minimumTrackTintColor={colors.lime}
            maximumTrackTintColor={colors.lineStrong}
            thumbTintColor={colors.lime}
          />
          <View style={styles.presetList}>
            {results.slice(0, 12).map((item, i) => (
              <TouchableOpacity key={`${item.name}-${i}`} style={styles.presetRow} onPress={() => logFromFood(item)}>
                <Text style={styles.presetName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.presetKcal}>{item.kcal} ккал/100г</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <Text style={styles.label}>Название</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Свой продукт"
              placeholderTextColor={colors.paperFaint}
            />
          </View>
          <View style={styles.formGrid}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Ккал/100г</Text>
              <TextInput style={styles.input} value={kcal100} onChangeText={setKcal100} keyboardType="numeric" />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Белки</Text>
              <TextInput style={styles.input} value={protein100} onChangeText={setProtein100} keyboardType="numeric" />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Жиры</Text>
              <TextInput style={styles.input} value={fat100} onChangeText={setFat100} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.label}>Углеводы, г/100г</Text>
            <TextInput style={styles.input} value={carbs100} onChangeText={setCarbs100} keyboardType="numeric" />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.label}>Порция: {portion} г</Text>
            <Slider
              minimumValue={25}
              maximumValue={400}
              step={25}
              value={portion}
              onValueChange={setPortion}
              minimumTrackTintColor={colors.lime}
              maximumTrackTintColor={colors.lineStrong}
              thumbTintColor={colors.lime}
            />
          </View>
          <TouchableOpacity style={styles.cta} onPress={confirmCustom} accessibilityRole="button">
            <Text style={styles.ctaText}>Сохранить и добавить</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </AppBottomSheet>
  );
});

AddFoodSheet.displayName = 'AddFoodSheet';
export default AddFoodSheet;

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: radius.control,
    padding: 4,
    marginBottom: 12,
    gap: 4
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabOn: { backgroundColor: colors.lime },
  tabText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 13 },
  tabTextOn: { color: colors.ink },
  searchInput: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    color: colors.paper,
    padding: 10,
    fontSize: 13.5,
    marginBottom: 4
  },
  sourceLabel: {
    color: colors.paperFaint,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 6
  },
  presetList: { marginBottom: 8 },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  presetName: { flex: 1, color: colors.paper, fontSize: 13, marginRight: 8 },
  presetKcal: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 12 },
  formRow: { marginBottom: 10 },
  formGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  formCol: { flex: 1 },
  label: { fontSize: 11, color: colors.paperFaint, marginBottom: 4 },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    color: colors.paper,
    padding: 8,
    fontFamily: fonts.mono,
    fontSize: 14
  },
  cta: { marginTop: 10, marginBottom: 30, padding: 14, backgroundColor: colors.lime, alignItems: 'center' },
  ctaText: { color: colors.ink, fontSize: 16, fontFamily: fonts.mono }
});
