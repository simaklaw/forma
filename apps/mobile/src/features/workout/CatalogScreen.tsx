import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { type MuscleKey } from '@/components/MuscleMap';
import ScreenHeader from '@/components/ScreenHeader';
import { type TrainingMode } from './catalog';
import {
  buildCatalogItems,
  filterCatalogItems,
  inferEquipment,
  type CatalogItem,
  type Equipment
} from './catalogBrowser';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT, equipmentLabel, muscleLabel } from '@/i18n/strings';
import ExerciseDetailModal from './ExerciseDetailModal';
import ImportedLibraryPanel from './ImportedLibraryPanel';
import ProgramsPanel from './ProgramsPanel';
import TabataPanel from './tabata/TabataPanel';
import { favoriteKey, loadFavorites, loadRecent, parseFavoriteKey } from './exerciseFavorites';
import {
  clearReplaceTarget,
  getReplaceTarget,
  subscribeReplaceTarget,
  type ReplaceTarget
} from './replaceTarget';

const EQUIPMENT_ORDER: Equipment[] = [
  'none',
  'bands',
  'dumbbells',
  'barbell',
  'machine',
  'pullup-bar',
  'bench'
];

/** Временно скрыт — home-only product decision (см. WorkoutScreen). */
const SHOW_GYM_MODE_TOGGLE = false;

export default function CatalogScreen() {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const [mode, setMode] = useState<TrainingMode>('home');
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleKey | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [catalogScope, setCatalogScope] = useState<'plans' | 'library' | 'tabata' | 'programs'>(
    'plans'
  );
  const [replaceTarget, setReplaceTargetState] = useState<ReplaceTarget | null>(getReplaceTarget());

  useEffect(() => subscribeReplaceTarget(() => setReplaceTargetState(getReplaceTarget())), []);

  useEffect(() => {
    if (replaceTarget) {
      setMode(replaceTarget.mode);
      setCatalogScope('plans');
    }
  }, [replaceTarget]);

  const refreshLists = useCallback(async () => {
    const [fav, recent] = await Promise.all([loadFavorites(), loadRecent()]);
    setFavoriteKeys(fav);
    setRecentKeys(recent);
  }, []);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  const gymCount = useMemo(() => buildCatalogItems('gym').length, []);
  const homeCount = useMemo(() => buildCatalogItems('home').length, []);
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
      <ScreenHeader
        eyebrow={t('catalogSegmentPlansFull')}
        title={t('catalogHeaderLibrary')}
        subtitle={
          catalogScope === 'programs'
            ? t('catalogHintPrograms')
            : catalogScope === 'library'
              ? t('catalogHintLibrary')
              : catalogScope === 'tabata'
                ? t('catalogHintTabata')
                : t('catalogHintOffline', { shown: filtered.length, total: items.length })
        }
      />

      {replaceTarget ? (
        <View
          style={[
            styles.replaceBanner,
            { borderColor: colors.lime, backgroundColor: colors.limeDim }
          ]}
        >
          <Text style={[styles.replaceBannerTitle, { color: colors.lime }]}>
            {t('catalogReplaceTitle', { day: replaceTarget.dayName })}
          </Text>
          <Text style={[styles.replaceBannerBody, { color: colors.paper }]}>
            {t('catalogReplaceBody', {
              name: replaceTarget.currentName,
              slot: replaceTarget.slotIndex + 1
            })}
          </Text>
          <TouchableOpacity
            onPress={() => clearReplaceTarget()}
            accessibilityRole="button"
            accessibilityLabel={t('catalogReplaceBanner')}
          >
            <Text style={[styles.replaceBannerCancel, { color: colors.paperDim }]}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeTabs}
        accessibilityRole="tablist"
      >
        {(
          [
            { id: 'plans' as const, label: t('catalogSegmentPlans') },
            { id: 'library' as const, label: t('catalogSegmentLibrary') },
            { id: 'tabata' as const, label: t('catalogSegmentTabata') },
            { id: 'programs' as const, label: t('catalogSegmentPrograms') }
          ] as const
        ).map((item) => {
          const active = catalogScope === item.id;
          const disabled = Boolean(replaceTarget && item.id !== 'plans');
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                if (!disabled) setCatalogScope(item.id);
              }}
              disabled={disabled}
              style={[
                styles.segmentTab,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.lime, backgroundColor: colors.limeDim },
                disabled && { opacity: 0.5 }
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled }}
            >
              <Text style={[styles.modeText, { color: active ? colors.lime : colors.paperDim }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {catalogScope === 'programs' ? (
        <ProgramsPanel />
      ) : catalogScope === 'library' ? (
        <ImportedLibraryPanel />
      ) : catalogScope === 'tabata' ? (
        <TabataPanel />
      ) : (
        <>
          {SHOW_GYM_MODE_TOGGLE && (
            <View style={styles.modeTabs} accessibilityRole="tablist">
              {(
                [
                  { id: 'gym' as const, label: t('gym'), count: gymCount },
                  { id: 'home' as const, label: t('home'), count: homeCount }
                ] as const
              ).map((item) => {
                const active = mode === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => changeMode(item.id)}
                    style={[
                      styles.modeTab,
                      { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                      active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.modeText, { color: active ? colors.lime : colors.paperDim }]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.modeCount,
                        { color: active ? colors.lime : colors.paperFaint }
                      ]}
                    >
                      {item.count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('catalogSearchPlaceholder')}
            placeholderTextColor={colors.paperFaint}
            style={[
              styles.search,
              { backgroundColor: colors.panel, borderColor: colors.lineStrong, color: colors.paper }
            ]}
            accessibilityLabel={t('catalogSearchA11y')}
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
              accessibilityLabel={t('favoritesOnly')}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: showFavoritesOnly ? colors.lime : colors.paperDim }
                ]}
              >
                {t('favoritesChip')}{favoriteItems.length ? ` (${favoriteItems.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {recentItems.length > 0 && !showFavoritesOnly && !query && !muscle && !equipment ? (
            <View style={styles.recentBlock}>
              <Text style={[styles.recentLabel, { color: colors.paperFaint }]}>{t('recentLabel')}</Text>
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
                    accessibilityLabel={t('catalogRecentA11y', { name: item.name })}
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
                  equipment === null && {
                    borderColor: colors.lime,
                    backgroundColor: colors.limeDim
                  }
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: equipment === null }}
                accessibilityLabel={t('catalogEquipmentAll')}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: equipment === null ? colors.lime : colors.paperDim }
                  ]}
                >
                  {t('catalogEquipmentAllChip')}
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
                  accessibilityLabel={equipmentLabel(item, lang)}
                >
                  <Text
                    style={[styles.chipText, { color: active ? colors.lime : colors.paperDim }]}
                  >
                    {equipmentLabel(item, lang)}
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
                  <Text
                    style={[styles.chipText, { color: active ? colors.cyan : colors.paperDim }]}
                  >
                    {muscleLabel(item, lang)}
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
                  accessibilityLabel={t('catalogOpenDetailsA11y', { name: item.name })}
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
                        {item.dayName} · {equipmentLabel(inferEquipment(item), lang)}
                      </Text>
                    </View>
                    <Text style={[styles.load, { color: colors.paperDim }]}>
                      {item.workingWeight > 0
                        ? `${item.workingWeight} ${t('kg')}`
                        : t('bodyweightLabel')}
                    </Text>
                  </View>
                  <Text style={[styles.muscles, { color: colors.paperDim }]}>
                    {item.targetMuscles.map((key) => muscleLabel(key, lang)).join(' · ')}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.paperFaint }]}>
                {showFavoritesOnly ? t('catalogFavoritesEmpty') : t('catalogNothingFound')}
              </Text>
            }
            keyboardShouldPersistTaps="handled"
          />
        </>
      )}
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
  replaceBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 4
  },
  replaceBannerTitle: { fontFamily: fonts.bodySemi, fontSize: 13 },
  replaceBannerBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  replaceBannerCancel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    marginTop: 6,
    textDecorationLine: 'underline'
  },
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
    paddingVertical: 10
  },
  /** issue #171: сегменты каталога — контентная ширина в горизонтальном скролле. */
  segmentTab: {
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  modeText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  modeCount: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: 8
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  index: { fontFamily: fonts.mono, fontSize: 14, width: 28 },
  cardCopy: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12 },
  load: { fontFamily: fonts.mono, fontSize: 12 },
  muscles: { fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  empty: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    paddingVertical: 40,
    paddingHorizontal: spacing.lg
  }
});
