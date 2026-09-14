import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import AppBottomSheet from '@/components/BottomSheet';
import { colors, fonts, spacing } from '@/core/theme/tokens';
import { useFitPulseStore, DayMeals } from '@/state/useFitPulseStore';
import { OpenFoodFactsService, NormalizedFood } from '@/services/OpenFoodFactsService';

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

interface Props {
  mealKey: keyof DayMeals;
  mealLabel: string;
  onClose: () => void;
}

const AddFoodSheet = forwardRef<GorhomBottomSheet, Props>(({ mealKey, mealLabel, onClose }, ref) => {
  const addFoodItem = useFitPulseStore((s) => s.addFoodItem);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedFood[]>(LOCAL_PRESETS);
  const [sourceLabel, setSourceLabel] = useState('Локальная база:');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [kcal100, setKcal100] = useState('');
  const [protein100, setProtein100] = useState('');
  const [fat100, setFat100] = useState('');
  const [carbs100, setCarbs100] = useState('');
  const [portion, setPortion] = useState(100);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runLocalFilter = useCallback((q: string) => {
    const lower = q.toLowerCase();
    setResults(LOCAL_PRESETS.filter((f) => f.name.toLowerCase().includes(lower)));
    setSourceLabel('Локальная база:');
  }, []);

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function selectPreset(item: NormalizedFood) {
    setName(item.name);
    setKcal100(String(item.kcal));
    setProtein100(String(item.protein));
    setFat100(String(item.fat));
    setCarbs100(String(item.carbs));
  }

  function confirmAdd() {
    const mult = portion / 100;
    addFoodItem(mealKey, {
      name: name || 'Продукт',
      kcal: Math.round((parseFloat(kcal100) || 0) * mult),
      protein: Math.round((parseFloat(protein100) || 0) * mult),
      fat: Math.round((parseFloat(fat100) || 0) * mult),
      carbs: Math.round((parseFloat(carbs100) || 0) * mult)
    });
    setName('');
    setKcal100('');
    setProtein100('');
    setFat100('');
    setCarbs100('');
    setPortion(100);
    setQuery('');
    onClose();
  }

  return (
    <AppBottomSheet ref={ref} eyebrow="Дневник питания" title={`Добавить в ${mealLabel.toLowerCase()}`} onClose={onClose} snapPoints={['75%', '92%']}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск в базе продуктов…"
          placeholderTextColor={colors.paperFaint}
          value={query}
          onChangeText={setQuery}
        />
        <Text style={styles.sourceLabel}>{loading ? 'Ищу в Open Food Facts…' : sourceLabel}</Text>
        <View style={styles.presetList}>
          {results.slice(0, 8).map((item, i) => (
            <TouchableOpacity key={i} style={styles.presetRow} onPress={() => selectPreset(item)}>
              <Text style={styles.presetName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.presetKcal}>{item.kcal} ккал/100г</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Название</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Свой продукт" placeholderTextColor={colors.paperFaint} />
        </View>
        <View style={styles.formGrid}>
          <View style={styles.formCol}>
            <Text style={styles.label}>Ккал/100г</Text>
            <TextInput style={styles.input} value={kcal100} onChangeText={setKcal100} keyboardType="numeric" placeholder="120" placeholderTextColor={colors.paperFaint} />
          </View>
          <View style={styles.formCol}>
            <Text style={styles.label}>Белки</Text>
            <TextInput style={styles.input} value={protein100} onChangeText={setProtein100} keyboardType="numeric" placeholder="10" placeholderTextColor={colors.paperFaint} />
          </View>
          <View style={styles.formCol}>
            <Text style={styles.label}>Жиры</Text>
            <TextInput style={styles.input} value={fat100} onChangeText={setFat100} keyboardType="numeric" placeholder="3" placeholderTextColor={colors.paperFaint} />
          </View>
        </View>
        <View style={styles.formRow}>
          <Text style={styles.label}>Углеводы, г/100г</Text>
          <TextInput style={styles.input} value={carbs100} onChangeText={setCarbs100} keyboardType="numeric" placeholder="15" placeholderTextColor={colors.paperFaint} />
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

        <TouchableOpacity style={styles.cta} onPress={confirmAdd} accessibilityRole="button">
          <Text style={styles.ctaText}>Добавить в дневник</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppBottomSheet>
  );
});

AddFoodSheet.displayName = 'AddFoodSheet';
export default AddFoodSheet;

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    color: colors.paper,
    padding: 10,
    fontSize: 13.5,
    marginBottom: 4
  },
  sourceLabel: { color: colors.paperFaint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 6 },
  presetList: { maxHeight: 140, marginBottom: 8 },
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
  input: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.lineStrong, color: colors.paper, padding: 8, fontFamily: fonts.mono, fontSize: 14 },
  cta: { marginTop: 10, marginBottom: 30, padding: 14, backgroundColor: colors.lime, alignItems: 'center' },
  ctaText: { color: colors.ink, fontSize: 16, fontFamily: fonts.mono }
});
