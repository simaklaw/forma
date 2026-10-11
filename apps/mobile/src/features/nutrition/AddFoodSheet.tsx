import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import AppBottomSheet from '@/components/BottomSheet';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore, selectTodayMeals, DayMeals } from '@/state/useFitPulseStore';
import { OpenFoodFactsService, NormalizedFood } from '@/services/OpenFoodFactsService';

/** Offline-first RU presets — always visible when sheet opens / query empty. Values per 100g unless noted in name. */
const LOCAL_PRESETS: NormalizedFood[] = [
  { name: 'Куриная грудка варёная', kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
  { name: 'Куриное бедро без кожи', kcal: 185, protein: 27, fat: 8, carbs: 0 },
  { name: 'Индейка запечённая', kcal: 135, protein: 29, fat: 2, carbs: 0 },
  { name: 'Говядина тушёная', kcal: 232, protein: 24, fat: 14, carbs: 0 },
  { name: 'Говядина постная отварная', kcal: 175, protein: 28, fat: 6, carbs: 0 },
  { name: 'Свинина нежирная тушёная', kcal: 220, protein: 22, fat: 14, carbs: 0 },
  { name: 'Лосось на пару', kcal: 208, protein: 20, fat: 13, carbs: 0 },
  { name: 'Треска отварная', kcal: 78, protein: 17.5, fat: 0.6, carbs: 0 },
  { name: 'Тунец в собственном соку', kcal: 96, protein: 21, fat: 1, carbs: 0 },
  { name: 'Креветки варёные', kcal: 95, protein: 22, fat: 1, carbs: 0 },
  { name: 'Яйцо куриное, 1 шт.', kcal: 78, protein: 6.3, fat: 5.3, carbs: 0.6 },
  { name: 'Белок яичный, 1 шт.', kcal: 17, protein: 3.6, fat: 0.1, carbs: 0.2 },
  { name: 'Творог 5%', kcal: 121, protein: 17, fat: 5, carbs: 3 },
  { name: 'Творог 0%', kcal: 71, protein: 16, fat: 0.3, carbs: 1.8 },
  { name: 'Творог 9%', kcal: 159, protein: 16, fat: 9, carbs: 3 },
  { name: 'Греческий йогурт 2%', kcal: 73, protein: 10, fat: 2, carbs: 3.5 },
  { name: 'Молоко 2.5%', kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 },
  { name: 'Кефир 1%', kcal: 40, protein: 3, fat: 1, carbs: 4 },
  { name: 'Сыр гауда', kcal: 356, protein: 25, fat: 27, carbs: 2 },
  { name: 'Протеин сывороточный, порция 30 г', kcal: 120, protein: 24, fat: 1.5, carbs: 2 },
  { name: 'Рис отварной', kcal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  { name: 'Гречка отварная', kcal: 110, protein: 4, fat: 1.1, carbs: 21 },
  { name: 'Овсянка на воде', kcal: 88, protein: 3, fat: 1.7, carbs: 15 },
  { name: 'Макароны отварные', kcal: 131, protein: 5, fat: 0.5, carbs: 27 },
  { name: 'Картофель отварной', kcal: 82, protein: 2, fat: 0.1, carbs: 17 },
  { name: 'Батат запечённый', kcal: 90, protein: 2, fat: 0.1, carbs: 21 },
  { name: 'Киноа отварная', kcal: 120, protein: 4.4, fat: 1.9, carbs: 21 },
  { name: 'Хлеб ржаной', kcal: 214, protein: 6.6, fat: 1.2, carbs: 43 },
  { name: 'Хлеб цельнозерновой', kcal: 247, protein: 9, fat: 3.5, carbs: 41 },
  { name: 'Банан, 1 шт.', kcal: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  { name: 'Яблоко, 1 шт.', kcal: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  { name: 'Апельсин, 1 шт.', kcal: 47, protein: 0.9, fat: 0.1, carbs: 12 },
  { name: 'Черника', kcal: 57, protein: 0.7, fat: 0.3, carbs: 14 },
  { name: 'Брокколи отварная', kcal: 35, protein: 2.4, fat: 0.4, carbs: 7 },
  { name: 'Огурец', kcal: 15, protein: 0.7, fat: 0.1, carbs: 3.6 },
  { name: 'Помидор', kcal: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  { name: 'Салат айсберг', kcal: 14, protein: 0.9, fat: 0.1, carbs: 3 },
  { name: 'Авокадо', kcal: 160, protein: 2, fat: 15, carbs: 9 },
  { name: 'Миндаль', kcal: 579, protein: 21, fat: 50, carbs: 22 },
  { name: 'Арахисовая паста', kcal: 588, protein: 25, fat: 50, carbs: 20 },
  { name: 'Оливковое масло, 1 ст.л.', kcal: 119, protein: 0, fat: 13.5, carbs: 0 },
  { name: 'Масло сливочное', kcal: 717, protein: 0.5, fat: 81, carbs: 0.5 }
];

function matchesQuery(name: string, query: string): boolean {
  const n = name.toLowerCase();
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => n.includes(t));
}

type Tab = 'database' | 'custom';

interface Props {
  mealKey: keyof DayMeals;
  mealLabel: string;
  onClose: () => void;
}

const AddFoodSheet = forwardRef<GorhomBottomSheet, Props>(({ mealKey, mealLabel, onClose }, ref) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const addFoodItem = useFitPulseStore((s) => s.addFoodItem);
  const customFoods = useFitPulseStore((s) => s.customFoods);
  const addCustomFood = useFitPulseStore((s) => s.addCustomFood);
  const saveMealAsTemplate = useFitPulseStore((s) => s.saveMealAsTemplate);
  const allMeals = useFitPulseStore((s) => s.todayMeals);
  const mealItems = selectTodayMeals(allMeals)[mealKey];

  const [tab, setTab] = useState<Tab>('database');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedFood[]>(LOCAL_PRESETS);
  const [sourceLabel, setSourceLabel] = useState('Локальная база');
  const [loading, setLoading] = useState(false);
  const [portion, setPortion] = useState(100);

  const [name, setName] = useState('');
  const [kcal100, setKcal100] = useState('120');
  const [protein100, setProtein100] = useState('10');
  const [fat100, setFat100] = useState('5');
  const [carbs100, setCarbs100] = useState('10');
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

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
      const catalog = catalogPresets();
      const filtered = catalog.filter((f) => matchesQuery(f.name, q));
      setResults(filtered.length > 0 ? filtered : catalog);
      setSourceLabel(
        q.trim()
          ? filtered.length > 0
            ? 'Локальная база'
            : 'Нет точных совпадений — вся локальная база'
          : 'Локальная база'
      );
    },
    [catalogPresets]
  );

  useEffect(() => {
    if (tab !== 'database') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Always show local matches immediately (offline-first). Never blank the list.
    runLocalFilter(query);

    if (query.trim().length < 2) {
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const remote = await OpenFoodFactsService.searchProducts(query.trim());
        if (remote.length > 0) {
          const local = catalogPresets().filter((f) => matchesQuery(f.name, query));
          const localNames = new Set(local.map((f) => f.name.trim().toLowerCase()));
          const merged = [...local, ...remote.filter((r) => !localNames.has(r.name.trim().toLowerCase()))];
          setResults(merged);
          setSourceLabel('Локально + Open Food Facts');
        } else {
          runLocalFilter(query);
          setSourceLabel('OFF пусто — локальная база');
        }
      } catch {
        runLocalFilter(query);
        setSourceLabel('OFF недоступен — локальная база');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, runLocalFilter, catalogPresets]);

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
            placeholder="Поиск: рис, творог, курица…"
            placeholderTextColor={colors.paperFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Text style={styles.sourceLabel}>
            {loading ? `${sourceLabel} · ищу в Open Food Facts…` : sourceLabel}
          </Text>
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
            {results.length === 0 ? (
              <Text style={styles.empty}>Ничего не найдено — попробуйте «Свой продукт»</Text>
            ) : (
              results.slice(0, 24).map((item, i) => (
                <TouchableOpacity
                  key={`${item.name}-${i}`}
                  style={styles.presetRow}
                  onPress={() => logFromFood(item)}
                >
                  <Text style={styles.presetName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.presetKcal}>{item.kcal} ккал/100г</Text>
                </TouchableOpacity>
              ))
            )}
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

      {mealItems.length > 0 ? (
        <View style={styles.saveTemplateBox}>
          {!showSaveTemplate ? (
            <TouchableOpacity
              style={styles.saveTemplateBtn}
              onPress={() => setShowSaveTemplate(true)}
              accessibilityRole="button"
              accessibilityLabel="Сохранить как блюдо"
            >
              <Text style={styles.saveTemplateBtnText}>
                Сохранить как блюдо · {mealItems.length} поз. ·{' '}
                {mealItems.reduce((s, i) => s + i.kcal, 0)} ккал
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.label}>Название блюда</Text>
              <TextInput
                style={styles.input}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="Мой завтрак"
                placeholderTextColor={colors.paperFaint}
              />
              <View style={styles.saveTemplateActions}>
                <TouchableOpacity
                  style={styles.saveTemplateCancel}
                  onPress={() => {
                    setShowSaveTemplate(false);
                    setTemplateName('');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveTemplateCancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveTemplateConfirm}
                  onPress={() => {
                    saveMealAsTemplate(templateName, mealItems);
                    setShowSaveTemplate(false);
                    setTemplateName('');
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Сохранить блюдо"
                >
                  <Text style={styles.saveTemplateConfirmText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </AppBottomSheet>
  );
});

AddFoodSheet.displayName = 'AddFoodSheet';
export default AddFoodSheet;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
  empty: { color: colors.paperFaint, fontSize: 13, paddingVertical: 16, fontFamily: fonts.body },
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
  ctaText: { color: colors.ink, fontSize: 16, fontFamily: fonts.mono },
  saveTemplateBox: {
    marginTop: 8,
    marginBottom: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line
  },
  saveTemplateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    alignItems: 'center'
  },
  saveTemplateBtnText: { color: colors.paperDim, fontSize: 12, fontFamily: fonts.bodySemi },
  saveTemplateActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  saveTemplateCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  saveTemplateCancelText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 13 },
  saveTemplateConfirm: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.control,
    backgroundColor: colors.lime
  },
  saveTemplateConfirmText: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 13 }
});
}
