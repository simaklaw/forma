import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { MUSCLE_LABELS, type MuscleKey } from '@/components/MuscleMap';
import { type TrainingMode } from './catalog';
import {
  buildCatalogItems,
  EQUIPMENT_LABELS,
  filterCatalogItems,
  inferEquipment,
  type CatalogItem,
  type Equipment
} from './catalogBrowser';
import ExerciseDetailModal from './ExerciseDetailModal';
import { favoriteKey, loadFavorites, loadRecent, parseFavoriteKey } from './exerciseFavorites';

const EQUIPMENT_ORDER: Equipment[] = [
  'none',
  'bands',
  'dumbbells',
  'barbell',
  'machine',
  'pullup-bar',
  'bench'
];

export default function CatalogScreen() {
  const colors = useThemeColors();
  const [mode, setMode] = useState<TrainingMode>('gym');
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleKey | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const refreshLists = useCallback(async () => {
    const [fav, recent] = await Promise.all([loadFavorites(), loadRecent()]);
    setFavoriteKeys(fav);
    setRecentKeys(recent);
  }, []);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  const items = useMemo(() => buildCatalogItems(mode), [mode]);
  const muscles = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.targetMuscles))),
    [items]
  );
  const equipmentOptions = useMemo(() => {
    const present = new Set(items.map((item) => inferEquipment(item)));
    return EQUIPMENT_ORDER.filter((key) => present.has(key));
  }, [items]);

  const byKey = useMemo(
    () => new Map(items.map((item) => [favoriteKey(item.mode, item.id), item])),
    [items]
  );

  const favoriteItems = useMemo(() => {
    return favoriteKeys
      .map((key) => {
        const parsed = parseFavoriteKey(key);
        if (!parsed || parsed.mode !== mode) return null;
        return byKey.get(key) ?? null;
      })
      .filter((item): item is CatalogItem => item != null);
  }, [favoriteKeys, byKey, mode]);

  const recentItems = useMemo(() => {
    return recentKeys
      .map((key) => {
        const parsed = parseFavoriteKey(key);
        if (!parsed || parsed.mode !== mode) return null;
        return byKey.get(key) ?? null;
      })
      .filter((item): item is CatalogItem => item != null)
      .slice(0, 8);
  }, [recentKeys, byKey, mode]);

  const filtered = useMemo(() => {
    const base = filterCatalogItems(items, query, muscle, equipment);
    if (!showFavoritesOnly) return base;
    const set = new Set(favoriteKeys);
    return base.filter((item) => set.has(favoriteKey(item.mode, item.id)));
  }, [items, muscle, query, equipment, showFavoritesOnly, favoriteKeys]);

  function changeMode(next: TrainingMode) {
    setMode(next);
    setMuscle(null);
    setEquipment(null);
    setShowFavoritesOnly(false);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>FITPULSE · БИБЛИОТЕКА</Text>
        <Text style={[styles.title, { color: colors.paper }]}>Каталог</Text>
        <Text style={[styles.subtitle, { color: colors.paperDim }]}>
          Офлайн-список упражнений для дома и зала
        </Text>
      </View>
      <View style={styles.modeTabs} accessibilityRole="tablist">
        {(['gym', 'home'] as const).map((item) => {
          const active = mode === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => changeMode(item)}
              style={[
                styles.modeTab,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.modeText, { color: active ? colors.lime : colors.paperDim }]}>
                {item === 'gym' ? 'Зал' : 'Дом'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Найти упражнение или группу мышц"
        placeholderTextColor={colors.paperFaint}
        style={[
          styles.search,
          { backgroundColor: colors.panel, borderColor: colors.lineStrong, color: colors.paper }
        ]}
        accessibilityLabel="Поиск упражнений"
        returnKeyType="search"
      />
      <View style={styles.favRow}>
        <TouchableOpacity
          onPress={() => setShowFavoritesOnly((value) => !value)}
          style={[
            styles.chip,
            { borderColor: colors.lineStrong, backgroundColor: colors.panel },
            showFavoritesOnly && { borderColor: colors.lime, backgroundColor: colors.limeDim }
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: showFavoritesOnly }}
          accessibilityLabel="Показать только избранное"
        >
          <Text
            style={[
              styles.chipText,
              { color: showFavoritesOnly ? colors.lime : colors.paperDim }
            ]}
          >
            ★ Избранное{favoriteItems.length ? ` (${favoriteItems.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {recentItems.length > 0 && !showFavoritesOnly && !query && !muscle && !equipment ? (
        <View style={styles.recentBlock}>
          <Text style={[styles.recentLabel, { color: colors.paperFaint }]}>НЕДАВНИЕ</Text>
          <FlatList
            data={recentItems}
            horizontal
            keyExtractor={(item) => `recent-${item.mode}-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelected(item)}
                style={[
                  styles.recentChip,
                  { borderColor: colors.lineStrong, backgroundColor: colors.panel }
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}. Недавнее упражнение`}
              >
                <Text style={[styles.chipText, { color: colors.paper }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      <FlatList
        data={equipmentOptions}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        ListHeaderComponent={
          <TouchableOpacity
            onPress={() => setEquipment(null)}
            style={[
              styles.chip,
              { borderColor: colors.lineStrong, backgroundColor: colors.panel },
              equipment === null && { borderColor: colors.lime, backgroundColor: colors.limeDim }
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: equipment === null }}
            accessibilityLabel="Все виды оборудования"
          >
            <Text
              style={[
                styles.chipText,
                { color: equipment === null ? colors.lime : colors.paperDim }
              ]}
            >
              Всё оборудование
            </Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const active = equipment === item;
          return (
            <TouchableOpacity
              onPress={() => setEquipment(active ? null : item)}
              style={[
                styles.chip,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={EQUIPMENT_LABELS[item]}
            >
              <Text style={[styles.chipText, { color: active ? colors.lime : colors.paperDim }]}>
                {EQUIPMENT_LABELS[item]}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <FlatList
        data={muscles}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = muscle === item;
          return (
            <TouchableOpacity
              onPress={() => setMuscle(active ? null : item)}
              style={[
                styles.chip,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.cyan, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? colors.cyan : colors.paperDim }]}>
                {MUSCLE_LABELS[item]}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.mode}-${item.id}-${item.dayName}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isFav = favoriteKeys.includes(favoriteKey(item.mode, item.id));
          return (
            <TouchableOpacity
              onPress={() => setSelected(item)}
              style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}. Открыть детали`}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.index, { color: colors.lime }]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={styles.cardCopy}>
                  <Text style={[styles.name, { color: colors.paper }]}>
                    {isFav ? '★ ' : ''}
                    {item.name}
                  </Text>
                  <Text style={[styles.meta, { color: colors.paperFaint }]}>
                    {item.dayName} · {EQUIPMENT_LABELS[inferEquipment(item)]}
                  </Text>
                </View>
                <Text style={[styles.load, { color: colors.paperDim }]}>
                  {item.workingWeight > 0 ? `${item.workingWeight} кг` : 'свой вес'}
                </Text>
              </View>
              <Text style={[styles.muscles, { color: colors.paperDim }]}>
                {item.targetMuscles.map((key) => MUSCLE_LABELS[key]).join(' · ')}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.paperFaint }]}>
            {showFavoritesOnly
              ? 'В избранном пока пусто. Откройте упражнение и нажмите «В избранное».'
              : 'Ничего не найдено. Измените запрос или фильтр.'}
          </Text>
        }
        keyboardShouldPersistTaps="handled"
      />

      <ExerciseDetailModal
        item={selected}
        visible={selected != null}
        onClose={() => {
          setSelected(null);
          void refreshLists();
        }}
        onFavoriteChange={() => {
          void refreshLists();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1
  },
  eyebrow: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  title: { fontSize: 30, fontFamily: fonts.mono },
  subtitle: { fontSize: 13, fontFamily: fonts.body, marginTop: 3 },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  modeTab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    paddingVertical: 11
  },
  modeText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  search: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontFamily: fonts.body,
    fontSize: 14
  },
  favRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  recentBlock: { marginTop: 4 },
  recentLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemi,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: 4
  },
  recentChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 200
  },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 110, gap: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  index: { fontFamily: fonts.mono, fontSize: 14, width: 24 },
  cardCopy: { flex: 1 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
  load: { fontFamily: fonts.mono, fontSize: 12 },
  muscles: { fontFamily: fonts.body, fontSize: 12, marginTop: 9 },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24
  }
});
