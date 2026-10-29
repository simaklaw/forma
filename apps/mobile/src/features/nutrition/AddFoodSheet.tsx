import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import AppBottomSheet from '@/components/BottomSheet';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import Md3Button from '@/components/md3/Md3Button';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT } from '@/i18n/strings';
import {
  useFitPulseStore,
  selectTodayMeals,
  DayMeals,
  type FoodItem,
  type SavedMeal
} from '@/state/useFitPulseStore';
import { OpenFoodFactsService, NormalizedFood } from '@/services/OpenFoodFactsService';
import BarcodeScannerSheet from './BarcodeScannerSheet';
import LabelScanSheet from './LabelScanSheet';
import { barcodeEquals } from './ownFoods';
import { foodFingerprint, type LoggedFoodSummary } from './recentFoods';

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

function summaryToFood(f: LoggedFoodSummary): NormalizedFood {
  return {
    name: f.name,
    kcal: f.kcal,
    protein: f.protein,
    fat: f.fat,
    carbs: f.carbs,
    // Микронутриенты сохранены в недавних/избранном — возвращаем их в карточку.
    ...(f.fiber != null ? { fiber: f.fiber } : {}),
    ...(f.sugars != null ? { sugars: f.sugars } : {}),
    ...(f.saturatedFat != null ? { saturatedFat: f.saturatedFat } : {}),
    ...(f.sodiumMg != null ? { sodiumMg: f.sodiumMg } : {})
  };
}

function matchesQuery(name: string, query: string): boolean {
  const n = name.toLowerCase();
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => n.includes(t));
}

type Tab = 'database' | 'custom';

/** Результат поиска: продукт (на 100 г) или своё блюдо, найденное по штрихкоду. */
type FoodResult =
  | { kind: 'food'; food: NormalizedFood }
  | { kind: 'ownMeal'; meal: SavedMeal };

/** Режим сканера: поиск по коду или привязка кода к своему продукту/блюду. */
type ScanMode = 'search' | 'attachCustom' | 'attachTemplate';

interface Props {
  mealKey: keyof DayMeals;
  mealLabel: string;
  onClose: () => void;
}

const AddFoodSheet = forwardRef<GorhomBottomSheet, Props>(({ mealKey, mealLabel, onClose }, ref) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const addFoodItem = useFitPulseStore((s) => s.addFoodItem);
  const customFoods = useFitPulseStore((s) => s.customFoods);
  const addCustomFood = useFitPulseStore((s) => s.addCustomFood);
  const saveMealAsTemplate = useFitPulseStore((s) => s.saveMealAsTemplate);
  const logSavedMeal = useFitPulseStore((s) => s.logSavedMeal);
  const savedMeals = useFitPulseStore((s) => s.savedMeals);
  const recentFoods = useFitPulseStore((s) => s.recentFoods);
  const favoriteFoods = useFitPulseStore((s) => s.favoriteFoods);
  const toggleFavoriteFood = useFitPulseStore((s) => s.toggleFavoriteFood);
  const favoriteKeys = React.useMemo(
    () => new Set(favoriteFoods.map((f) => foodFingerprint(f))),
    [favoriteFoods]
  );
  const allMeals = useFitPulseStore((s) => s.todayMeals);
  const mealItems = selectTodayMeals(allMeals)[mealKey];

  const [tab, setTab] = useState<Tab>('database');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>(
    LOCAL_PRESETS.map((food) => ({ kind: 'food' as const, food }))
  );
  const [sourceLabel, setSourceLabel] = useState(() => t('foodLocalBase'));
  const [loading, setLoading] = useState(false);
  const [portion, setPortion] = useState(100);

  const [name, setName] = useState('');
  const [kcal100, setKcal100] = useState('120');
  const [protein100, setProtein100] = useState('10');
  const [fat100, setFat100] = useState('5');
  const [carbs100, setCarbs100] = useState('10');
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [labelScanVisible, setLabelScanVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('search');
  const [customBarcode, setCustomBarcode] = useState('');
  const [templateBarcode, setTemplateBarcode] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickKcal, setQuickKcal] = useState('');

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
      const asResults = (list: NormalizedFood[]): FoodResult[] =>
        list.map((food) => ({ kind: 'food' as const, food }));
      setResults(filtered.length > 0 ? asResults(filtered) : asResults(catalog));
      setSourceLabel(
        q.trim()
          ? filtered.length > 0
            ? t('foodLocalBase')
            : t('foodLocalBaseAll')
          : t('foodLocalBase')
      );
    },
    [catalogPresets, t]
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
        const q = query.trim();
        if (/^\d{8,14}$/.test(q)) {
          // Свои привязки важнее OFF: блюдо или продукт по этому штрихкоду.
          const ownMeal = savedMeals.find((m) => barcodeEquals(m.barcode, q));
          if (ownMeal) {
            setResults([{ kind: 'ownMeal', meal: ownMeal }]);
            setSourceLabel(t('foodOwnDishHit'));
            setLoading(false);
            return;
          }
          const ownCustom = customFoods.find((f) => barcodeEquals(f.barcode, q));
          if (ownCustom) {
            setResults([
              {
                kind: 'food',
                food: {
                  name: ownCustom.name,
                  kcal: ownCustom.kcal,
                  protein: ownCustom.protein,
                  fat: ownCustom.fat,
                  carbs: ownCustom.carbs
                }
              }
            ]);
            setSourceLabel(t('foodOwnProductHit'));
            setLoading(false);
            return;
          }
          const byCode = await OpenFoodFactsService.getNormalizedByBarcode(q);
          if (byCode) {
            setResults([{ kind: 'food', food: byCode }]);
            setSourceLabel(t('foodBarcode'));
            setLoading(false);
            return;
          }
        }
        // lc просит OFF отдавать локализованные названия продуктов.
        const remote = await OpenFoodFactsService.searchProducts(
          q,
          8,
          lang === 'en' ? 'en' : 'ru'
        );
        if (remote.length > 0) {
          const local = catalogPresets().filter((f) => matchesQuery(f.name, query));
          const localNames = new Set(local.map((f) => f.name.trim().toLowerCase()));
          const merged = [
            ...local,
            ...remote.filter((r) => !localNames.has(r.name.trim().toLowerCase()))
          ];
          setResults(merged.map((food) => ({ kind: 'food' as const, food })));
          setSourceLabel(t('foodLocalAndOff'));
        } else {
          runLocalFilter(query);
          setSourceLabel(t('foodOffEmpty'));
        }
      } catch {
        runLocalFilter(query);
        setSourceLabel(t('foodOffUnavailable'));
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, runLocalFilter, catalogPresets, t, savedMeals, customFoods, lang]);

  function logFromFood(item: NormalizedFood) {
    const mult = portion / 100;
    const entry: Omit<FoodItem, 'id'> = {
      name: item.name,
      kcal: Math.round((item.kcal || 0) * mult),
      protein: Math.round((item.protein || 0) * mult),
      fat: Math.round((item.fat || 0) * mult),
      carbs: Math.round((item.carbs || 0) * mult)
    };
    // Микронутриенты масштабируются порцией; чего OFF не отдал — не записываем.
    if (item.fiber != null) entry.fiber = Math.round(item.fiber * mult * 10) / 10;
    if (item.sugars != null) entry.sugars = Math.round(item.sugars * mult * 10) / 10;
    if (item.saturatedFat != null) {
      entry.saturatedFat = Math.round(item.saturatedFat * mult * 10) / 10;
    }
    if (item.sodiumMg != null) entry.sodiumMg = Math.round(item.sodiumMg * mult);
    addFoodItem(mealKey, entry);
    setQuery('');
    setPortion(100);
    onClose();
  }

  /** Quick add: название + kcal, без поиска и макросов (паттерн OpenNutriTracker). */
  function logQuickAdd() {
    const kcal = Math.round(parseFloat(quickKcal.replace(',', '.')) || 0);
    if (kcal <= 0) return;
    addFoodItem(mealKey, {
      name: quickName.trim() || t('foodQuickAddUntitled'),
      kcal,
      protein: 0,
      fat: 0,
      carbs: 0
    });
    setQuickName('');
    setQuickKcal('');
    onClose();
  }

  function confirmCustom() {
    const def = {
      name: name.trim() || t('foodCustomProduct'),
      kcal: parseFloat(kcal100) || 0,
      protein: parseFloat(protein100) || 0,
      fat: parseFloat(fat100) || 0,
      carbs: parseFloat(carbs100) || 0,
      ...(customBarcode ? { barcode: customBarcode } : {})
    };
    addCustomFood(def);
    logFromFood(def);
    setName('');
    setKcal100('120');
    setProtein100('10');
    setFat100('5');
    setCarbs100('10');
    setCustomBarcode('');
  }

  return (
    <AppBottomSheet
      ref={ref}
      eyebrow={t('foodDiary')}
      title={t('foodAddToMealLower', { meal: mealLabel.toLowerCase() })}
      onClose={onClose}
      snapPoints={['75%', '92%']}
    >
      <View style={styles.tabs}>
        {(['database', 'custom'] as const).map((tabId) => (
          <TouchableOpacity
            key={tabId}
            style={[styles.tab, tab === tabId && styles.tabOn]}
            onPress={() => setTab(tabId)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === tabId }}
          >
            <Text style={[styles.tabText, tab === tabId && styles.tabTextOn]}>
              {tabId === 'database' ? t('foodFromBase') : t('foodCustomProduct')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'database' ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, styles.searchInputFlex]}
              placeholder={t('foodSearchPlaceholder')}
              placeholderTextColor={colors.paperFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => {
                setScanMode('search');
                setScannerVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('scanButtonA11y')}
            >
              <Text style={styles.scanBtnText}>{t('scanBtn')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickAddRow}>
            <TextInput
              style={[styles.searchInput, styles.quickAddNameInput]}
              placeholder={t('foodQuickAddName')}
              placeholderTextColor={colors.paperFaint}
              value={quickName}
              onChangeText={setQuickName}
              autoCorrect={false}
            />
            <TextInput
              style={[styles.searchInput, styles.quickAddKcalInput]}
              placeholder={t('kcal')}
              placeholderTextColor={colors.paperFaint}
              value={quickKcal}
              onChangeText={setQuickKcal}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={logQuickAdd}
              accessibilityRole="button"
              accessibilityLabel={t('foodQuickAddA11y')}
            >
              <Text style={styles.scanBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sourceLabel}>
            {loading ? t('foodSearchingOff', { source: sourceLabel }) : sourceLabel}
          </Text>
          <Text style={styles.label}>{t('foodPortion', { portion })}</Text>
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
          {query.trim().length === 0 ? (
            <View>
              {favoriteFoods.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>{t('favoritesChip')}</Text>
                  {favoriteFoods.slice(0, 8).map((f) => (
                    <View key={foodFingerprint(f)} style={styles.presetRow}>
                      <TouchableOpacity
                        style={styles.rowMain}
                        onPress={() => logFromFood(summaryToFood(f))}
                        accessibilityRole="button"
                        accessibilityLabel={t('nutritionAddToMealShort', { meal: mealLabel })}
                      >
                        <Text style={styles.presetName} numberOfLines={1}>
                          {f.name}
                        </Text>
                        <Text style={styles.presetKcal}>
                          {Math.round(f.kcal)} {t('kcal')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.starBtn}
                        onPress={() => toggleFavoriteFood(f)}
                        accessibilityRole="button"
                        accessibilityLabel={t('favoriteRemove')}
                      >
                        <Text style={styles.starOn}>★</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
              {recentFoods.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>{t('foodRecentTitle')}</Text>
                  {recentFoods.slice(0, 10).map((f) => {
                    const starred = favoriteKeys.has(foodFingerprint(f));
                    return (
                      <View key={foodFingerprint(f)} style={styles.presetRow}>
                        <TouchableOpacity
                          style={styles.rowMain}
                          onPress={() => logFromFood(summaryToFood(f))}
                          accessibilityRole="button"
                          accessibilityLabel={t('nutritionAddToMealShort', { meal: mealLabel })}
                        >
                          <Text style={styles.presetName} numberOfLines={1}>
                            {f.name}
                          </Text>
                          <Text style={styles.presetKcal}>
                            {Math.round(f.kcal)} {t('kcal')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.starBtn}
                          onPress={() => toggleFavoriteFood(f)}
                          accessibilityRole="button"
                          accessibilityLabel={starred ? t('favoriteRemove') : t('favoriteAdd')}
                        >
                          <Text style={starred ? styles.starOn : styles.starOff}>
                            {starred ? '★' : '☆'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.presetList}>
            {results.length === 0 ? (
              <Text style={styles.empty}>{t('foodNothingFound')}</Text>
            ) : (
              results.slice(0, 24).map((r, i) =>
                r.kind === 'ownMeal' ? (
                  <TouchableOpacity
                    key={`own-${r.meal.id}`}
                    style={styles.presetRow}
                    onPress={() => {
                      logSavedMeal(mealKey, r.meal.id);
                      setQuery('');
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('nutritionAddToMealShort', { meal: mealLabel })}
                  >
                    <Text style={styles.presetName} numberOfLines={1}>
                      {r.meal.name}
                    </Text>
                    <Text style={styles.presetKcal}>
                      {r.meal.items.reduce((s, it) => s + it.kcal, 0)} {t('kcal')} ·{' '}
                      {r.meal.items.length} {t('foodItemsWord')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    key={`${r.food.name}-${i}`}
                    style={styles.presetRow}
                    onPress={() => logFromFood(r.food)}
                  >
                    <Text style={styles.presetName} numberOfLines={1}>
                      {r.food.name}
                    </Text>
                    <Text style={styles.presetKcal}>
                      {t('foodKcalPer100', { kcal: r.food.kcal })}
                    </Text>
                  </TouchableOpacity>
                )
              )
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <Text style={styles.label}>{t('foodName')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('foodCustomProduct')}
              placeholderTextColor={colors.paperFaint}
            />
          </View>
          <View style={styles.formGrid}>
            <View style={styles.formCol}>
              <Text style={styles.label}>{t('foodKcal100Label')}</Text>
              <TextInput style={styles.input} value={kcal100} onChangeText={setKcal100} keyboardType="numeric" />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>{t('foodProtein')}</Text>
              <TextInput style={styles.input} value={protein100} onChangeText={setProtein100} keyboardType="numeric" />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>{t('foodFats')}</Text>
              <TextInput style={styles.input} value={fat100} onChangeText={setFat100} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.label}>{t('foodCarbs')}</Text>
            <TextInput style={styles.input} value={carbs100} onChangeText={setCarbs100} keyboardType="numeric" />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.label}>{t('foodBarcodeAttach')}</Text>
            <View style={styles.barcodeRow}>
              <Text style={styles.barcodeValue}>{customBarcode || '—'}</Text>
              {customBarcode ? (
                <TouchableOpacity
                  style={styles.barcodeClear}
                  onPress={() => setCustomBarcode('')}
                  accessibilityRole="button"
                  accessibilityLabel={t('foodBarcodeDetach')}
                >
                  <Text style={styles.barcodeClearText}>×</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => {
                  setScanMode('attachCustom');
                  setScannerVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('scanButtonA11y')}
              >
                <Text style={styles.scanBtnText}>{t('scanBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, styles.labelScanBtn]}
            onPress={() => setLabelScanVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('labelScanButtonA11y')}
          >
            <Text style={styles.scanBtnText}>{t('labelScanButton')}</Text>
          </TouchableOpacity>
          <View style={styles.formRow}>
            <Text style={styles.label}>{t('foodPortion', { portion })}</Text>
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
          <View style={styles.ctaWrap}>
            <Md3Button
              variant="filled"
              size="md"
              label={t('foodSaveAndAdd')}
              onPress={confirmCustom}
            />
          </View>
        </ScrollView>
      )}

      {mealItems.length > 0 ? (
        <View style={styles.saveTemplateBox}>
          {!showSaveTemplate ? (
            <TouchableOpacity
              style={styles.saveTemplateBtn}
              onPress={() => setShowSaveTemplate(true)}
              accessibilityRole="button"
              accessibilityLabel={t('foodSaveAsDish')}
            >
              <Text style={styles.saveTemplateBtnText}>
                {t('foodSaveAsDish')} · {mealItems.length} {t('foodItemsWord')} ·{' '}
                {mealItems.reduce((s, i) => s + i.kcal, 0)} {t('kcal')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.label}>{t('foodDishName')}</Text>
              <TextInput
                style={styles.input}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder={t('foodMyDish')}
                placeholderTextColor={colors.paperFaint}
              />
              <Text style={[styles.label, styles.barcodeLabel]}>{t('foodBarcodeAttach')}</Text>
              <View style={styles.barcodeRow}>
                <Text style={styles.barcodeValue}>{templateBarcode || '—'}</Text>
                {templateBarcode ? (
                  <TouchableOpacity
                    style={styles.barcodeClear}
                    onPress={() => setTemplateBarcode('')}
                    accessibilityRole="button"
                    accessibilityLabel={t('foodBarcodeDetach')}
                  >
                    <Text style={styles.barcodeClearText}>×</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => {
                    setScanMode('attachTemplate');
                    setScannerVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('scanButtonA11y')}
                >
                  <Text style={styles.scanBtnText}>{t('scanBtn')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.saveTemplateActions}>
                <Md3Button
                  variant="outlined"
                  size="md"
                  label={t('cancel')}
                  onPress={() => {
                    setShowSaveTemplate(false);
                    setTemplateName('');
                    setTemplateBarcode('');
                  }}
                />
                <Md3Button
                  variant="filled"
                  size="md"
                  label={t('save')}
                  onPress={() => {
                    saveMealAsTemplate(templateName, mealItems, templateBarcode || undefined);
                    setShowSaveTemplate(false);
                    setTemplateName('');
                    setTemplateBarcode('');
                    onClose();
                  }}
                />
              </View>
            </View>
          )}
        </View>
      ) : null}
      <LabelScanSheet
        visible={labelScanVisible}
        onClose={() => setLabelScanVisible(false)}
        onParsed={(result) => {
          setLabelScanVisible(false);
          setKcal100(String(result.kcal));
          setProtein100(String(result.protein));
          setFat100(String(result.fat));
          setCarbs100(String(result.carbs));
        }}
      />
      <BarcodeScannerSheet
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={(code) => {
          setScannerVisible(false);
          if (scanMode === 'attachCustom') {
            setCustomBarcode(code);
          } else if (scanMode === 'attachTemplate') {
            setTemplateBarcode(code);
          } else {
            setQuery(code);
          }
        }}
      />
    </AppBottomSheet>
  );
});

AddFoodSheet.displayName = 'AddFoodSheet';
export default AddFoodSheet;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceContainer,
      borderRadius: radius.control,
      padding: 4,
      marginBottom: 12,
      gap: 4
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabOn: { backgroundColor: colors.primaryContainer },
    tabText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 13 },
    tabTextOn: { color: colors.onPrimaryContainer },
    searchInput: {
      backgroundColor: colors.surfaceContainer,
      color: colors.paper,
      padding: 10,
      fontSize: 13.5,
      marginBottom: 4
    },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInputFlex: { flex: 1, marginBottom: 0 },
    scanBtn: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.control,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4
    },
    scanBtnText: { color: colors.onPrimaryContainer, fontFamily: fonts.bodySemi, fontSize: 13 },
    labelScanBtn: { alignSelf: 'flex-start', marginTop: 4 },
    quickAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    quickAddNameInput: { flex: 1, marginBottom: 0 },
    quickAddKcalInput: { width: 72, marginBottom: 0, textAlign: 'center', fontFamily: fonts.mono },
    sectionBlock: { marginTop: 12 },
    sectionTitle: {
      fontSize: 10,
      color: colors.paperFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
      fontFamily: fonts.bodySemi
    },
    rowMain: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    starBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    starOn: { color: colors.lime, fontSize: 16 },
    starOff: { color: colors.paperFaint, fontSize: 16 },
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
    barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    barcodeLabel: { marginTop: 10 },
    barcodeValue: { flex: 1, color: colors.paperDim, fontFamily: fonts.mono, fontSize: 12 },
    barcodeClear: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    barcodeClearText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 14 },
    input: {
      backgroundColor: colors.surfaceContainer,
      color: colors.paper,
      padding: 8,
      fontFamily: fonts.mono,
      fontSize: 14
    },
    ctaWrap: { marginTop: 10, marginBottom: 30 },
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
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center'
    },
    saveTemplateBtnText: { color: colors.paperDim, fontSize: 12, fontFamily: fonts.bodySemi },
    saveTemplateActions: { flexDirection: 'row', gap: 8, marginTop: 8 }
  });
}
