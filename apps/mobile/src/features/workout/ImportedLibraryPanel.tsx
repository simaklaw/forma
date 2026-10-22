import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  IMPORTED_EXERCISE_LIBRARY,
  type ImportedExercise
} from './importedExerciseLibrary.generated';
import { IMPORTED_EXERCISE_IMAGES } from './importedExerciseImages.generated';
import { ExerciseMediaService } from './ExerciseMediaService';
import { gifEntryForLibraryId } from './exerciseGifManifest.generated';
import ExerciseVideo from '@/components/ExerciseVideo';
import { filterImportedLibrary } from './importedLibraryFilter';
import { catalogFor } from './catalog';
import { replaceDaySlot } from './dayPlanOverrides';
import {
  clearReplaceTarget,
  getReplaceTarget,
  subscribeReplaceTarget,
  type ReplaceTarget
} from './replaceTarget';
import { importedMuscleKeys, importedToExerciseDef, numericIdForImportedLibId } from './importedExerciseBridge';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { premiumExerciseGifFor } from './exercisePremiumMedia';
import { useT, categoryLabel, equipmentLabel, levelLabel, muscleLabel } from '@/i18n/strings';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '@/navigation/types';

function displayName(ex: ImportedExercise): string {
  return ex.nameRu ?? ex.nameEn;
}

const LEVEL_ORDER = ['beginner', 'intermediate', 'expert'] as const;

const EQUIPMENT_ORDER: ImportedExercise['equipment'][] = [
  'bodyweight',
  'bands',
  'dumbbells',
  'barbell',
  'cable',
  'machine',
  'kettlebell',
  'ez-bar'
];

export default function ImportedLibraryPanel() {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const profileSex = useFitPulseStore((s) => s.profile.sex);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ImportedExercise['category'] | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<ImportedExercise['equipment'] | null>(null);
  const [selected, setSelected] = useState<ImportedExercise | null>(null);
  const [resolvedVideo, setResolvedVideo] = useState<{ id: string; source: { uri: string } | number } | null>(null);
  const [gifUri, setGifUri] = useState<string | null>(null);
  const [replaceTarget, setReplaceTargetState] = useState<ReplaceTarget | null>(getReplaceTarget());
  const [replacing, setReplacing] = useState(false);
  const videoSource = resolvedVideo?.id === selected?.id ? resolvedVideo?.source : null;

  useEffect(() => subscribeReplaceTarget(() => setReplaceTargetState(getReplaceTarget())), []);

  const canReplace = replaceTarget != null;

  async function handleReplaceIntoPlan() {
    if (!selected || !replaceTarget) return;
    const day = catalogFor(replaceTarget.mode).find((d) => d.id === replaceTarget.dayId);
    if (!day) return;
    setReplacing(true);
    try {
      const def = importedToExerciseDef(selected);
      await replaceDaySlot(
        replaceTarget.mode,
        replaceTarget.dayId,
        replaceTarget.slotIndex,
        def.id,
        day.exercises
      );
      clearReplaceTarget();
      setSelected(null);
      navigation.navigate('Тренировки');
    } finally {
      setReplacing(false);
    }
  }

  useEffect(() => {
    setResolvedVideo(null);
    setGifUri(null);
    if (!selected) return;
    let cancelled = false;
    const gif = gifEntryForLibraryId(selected.id);
    if (gif?.gifUrl) setGifUri(gif.gifUrl);
    void ExerciseMediaService.getPlaybackSource(selected.id)
      .then((src) => {
        if (!cancelled && src != null) setResolvedVideo({ id: selected.id, source: src });
      })
      .catch(() => {
        if (!cancelled) setResolvedVideo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const filtered = useMemo(
    () => filterImportedLibrary(IMPORTED_EXERCISE_LIBRARY, query, category, { level, equipment }),
    [query, category, level, equipment]
  );

  const equipmentOptions = useMemo(() => {
    const present = new Set(IMPORTED_EXERCISE_LIBRARY.map((ex) => ex.equipment));
    return EQUIPMENT_ORDER.filter((key) => present.has(key));
  }, []);

  const categories = useMemo(
    () =>
      (['chest', 'back', 'legs', 'abs', 'arms', 'glutes'] as ImportedExercise['category'][]).filter(
        (key) => IMPORTED_EXERCISE_LIBRARY.some((ex) => ex.category === key)
      ),
    []
  );

  return (
    <View style={styles.flex}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('panelSearchPlaceholder')}
        placeholderTextColor={colors.paperFaint}
        style={[
          styles.search,
          { backgroundColor: colors.panel, borderColor: colors.lineStrong, color: colors.paper }
        ]}
        accessibilityLabel={t('panelSearchA11y')}
        returnKeyType="search"
      />
      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = category === item;
          return (
            <TouchableOpacity
              onPress={() => setCategory(active ? null : item)}
              style={[
                styles.chip,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? colors.lime : colors.paperDim }]}>
                {categoryLabel(item, lang)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <View style={[styles.chips, styles.chipsRow]}>
        <TouchableOpacity
          onPress={() => setLevel(null)}
          style={[
            styles.chip,
            { borderColor: colors.lineStrong, backgroundColor: colors.panel },
            level === null && { borderColor: colors.lime, backgroundColor: colors.limeDim }
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: level === null }}
          accessibilityLabel={t('catalogLevelAllChip')}
        >
          <Text style={[styles.chipText, { color: level === null ? colors.lime : colors.paperDim }]}>
            {t('catalogLevelAllChip')}
          </Text>
        </TouchableOpacity>
        {LEVEL_ORDER.map((value) => {
          const active = level === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setLevel(active ? null : value)}
              style={[
                styles.chip,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={levelLabel(value, lang)}
            >
              <Text style={[styles.chipText, { color: active ? colors.lime : colors.paperDim }]}>
                {levelLabel(value, lang)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.chips, styles.chipsRow]}>
        <TouchableOpacity
          onPress={() => setEquipment(null)}
          style={[
            styles.chip,
            { borderColor: colors.lineStrong, backgroundColor: colors.panel },
            equipment === null && { borderColor: colors.lime, backgroundColor: colors.limeDim }
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: equipment === null }}
          accessibilityLabel={t('catalogEquipmentAllChip')}
        >
          <Text
            style={[styles.chipText, { color: equipment === null ? colors.lime : colors.paperDim }]}
          >
            {t('catalogEquipmentAllChip')}
          </Text>
        </TouchableOpacity>
        {equipmentOptions.map((value) => {
          const active = equipment === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setEquipment(active ? null : value)}
              style={[
                styles.chip,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={equipmentLabel(value, lang)}
            >
              <Text style={[styles.chipText, { color: active ? colors.lime : colors.paperDim }]}>
                {equipmentLabel(value, lang)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.count, { color: colors.paperFaint }]}>
        {t('panelCount', { shown: filtered.length, total: IMPORTED_EXERCISE_LIBRARY.length })}
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.paperFaint }]}>
            {t('catalogNothingFound')}
          </Text>
        }
        renderItem={({ item }) => {
          const premiumThumb = premiumExerciseGifFor(
            { id: numericIdForImportedLibId(item.id) ?? -1, wgerSearchTerm: item.nameEn },
            profileSex
          );
          const thumbKey = item.imageKeys[0];
          const src = thumbKey ? IMPORTED_EXERCISE_IMAGES[thumbKey] : undefined;
          return (
            <TouchableOpacity
              style={[styles.row, { borderColor: colors.line, backgroundColor: colors.panel }]}
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={displayName(item)}
            >
              {premiumThumb != null ? (
                <Image source={premiumThumb} style={styles.thumb} resizeMode="contain" accessibilityLabel={displayName(item)} />
              ) : src ? (
                <Image source={src} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.ink }]} />
              )}
              <View style={styles.rowBody}>
                <View style={styles.titleRow}>
                  <Text style={[styles.name, { color: colors.paper }]} numberOfLines={2}>
                    {displayName(item)}
                  </Text>
                  {!item.nameRu ? (
                    <View style={[styles.enBadge, { borderColor: colors.lineStrong }]}>
                      <Text style={[styles.enBadgeText, { color: colors.paperFaint }]}>EN</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.meta, { color: colors.paperFaint }]}>
                  {categoryLabel(item.category, lang)} ·{' '}
                  {equipmentLabel(item.equipment, lang)}
                  {item.level ? ` · ${levelLabel(item.level, lang)}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={selected != null}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          <View style={[styles.modalRoot, { backgroundColor: colors.ink }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)} accessibilityRole="button">
                <Text style={[styles.close, { color: colors.lime }]}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {premiumExerciseGifFor(
                { id: numericIdForImportedLibId(selected.id) ?? -1, wgerSearchTerm: selected.nameEn },
                profileSex
              ) != null ? (
                <ExerciseVideo
                  premiumGifAsset={premiumExerciseGifFor(
                    { id: numericIdForImportedLibId(selected.id) ?? -1, wgerSearchTerm: selected.nameEn },
                    profileSex
                  )}
                  label={displayName(selected)}
                />
              ) : videoSource ? (
                <ExerciseVideo source={videoSource} label={displayName(selected)} />
              ) : gifUri ? (
                <Image
                  source={{ uri: gifUri }}
                  style={styles.hero}
                  resizeMode="contain"
                  accessibilityLabel={t('panelAnimationOf', { name: displayName(selected) })}
                />
              ) : null}
              {!premiumExerciseGifFor(
                { id: numericIdForImportedLibId(selected.id) ?? -1, wgerSearchTerm: selected.nameEn },
                profileSex
              ) && !videoSource && !gifUri
                ? selected.imageKeys.map((imageKey) => {
                    const source = IMPORTED_EXERCISE_IMAGES[imageKey];
                    return source ? (
                      <Image key={imageKey} source={source} style={styles.hero} resizeMode="contain" />
                    ) : null;
                  })
                : null}
              <View style={styles.titleRow}>
                <Text style={[styles.modalTitle, { color: colors.paper }]}>
                  {displayName(selected)}
                </Text>
                {!selected.nameRu ? (
                  <View style={[styles.enBadge, { borderColor: colors.lineStrong }]}>
                    <Text style={[styles.enBadgeText, { color: colors.paperFaint }]}>EN</Text>
                  </View>
                ) : null}
              </View>
              {selected.nameRu ? (
                <Text style={[styles.meta, { color: colors.paperFaint }]}>{selected.nameEn}</Text>
              ) : null}
              <Text style={[styles.meta, { color: colors.paperDim, marginTop: 6 }]}>
                {categoryLabel(selected.category, lang)} ·{' '}
                {equipmentLabel(selected.equipment, lang)}
                {selected.level ? ` · ${levelLabel(selected.level, lang)}` : ''}
              </Text>
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.paperFaint }]}>
                  {t('importedModalMuscles')}
                </Text>
                <View style={styles.chipWrapRow}>
                  {importedMuscleKeys(selected.primaryMuscles).map((key) => (
                    <View
                      key={key}
                      style={[styles.muscleChip, { borderColor: colors.lineStrong }]}
                    >
                      <Text style={[styles.muscleChipText, { color: colors.paperDim }]}>
                        {muscleLabel(key, lang)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {(selected.instructionsRu.length > 0 || selected.instructionsEn.length > 0) ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.paperFaint }]}>
                    {t('technique')}
                  </Text>
                  {(selected.instructionsRu.length > 0
                    ? selected.instructionsRu
                    : selected.instructionsEn
                  ).map((line, i) => (
                    <Text key={i} style={[styles.instruction, { color: colors.paperDim }]}>
                      {i + 1}. {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              {canReplace ? (
                <TouchableOpacity
                  style={[styles.replaceCta, { backgroundColor: colors.lime }]}
                  disabled={replacing}
                  onPress={() => void handleReplaceIntoPlan()}
                  accessibilityRole="button"
                >
                  <Text style={[styles.replaceCtaText, { color: colors.ink }]}>
                    {replacing
                      ? t('panelSubstituting')
                      : t('panelSubstituteFor', { name: replaceTarget!.currentName })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.hint, { color: colors.paperFaint }]}>
                  {t('panelReplaceHint')}
                </Text>
              )}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14
  },
  chips: { paddingHorizontal: spacing.xl, paddingVertical: 10, gap: 8 },
  /** issue #175: чипы в ряды, а не вертикальная колонка. */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  muscleChipText: { fontSize: 12, fontFamily: fonts.body },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    marginRight: 8
  },
  chipText: { fontSize: 13, fontFamily: fonts.bodySemi },
  count: {
    marginHorizontal: spacing.xl,
    marginBottom: 8,
    fontSize: 11,
    fontFamily: fonts.mono
  },
  /** issue #171: явное пустое состояние вместо белого экрана списка. */
  empty: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    paddingVertical: 40,
    paddingHorizontal: spacing.xl
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120, gap: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 8
  },
  thumb: { width: 64, height: 64, borderRadius: radius.control },
  rowBody: { flex: 1, justifyContent: 'center', gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.bodySemi },
  meta: { fontSize: 12, fontFamily: fonts.body },
  enBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  enBadgeText: { fontSize: 10, fontFamily: fonts.mono },
  modalRoot: { flex: 1 },
  modalHeader: {
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: 8
  },
  close: { fontFamily: fonts.bodySemi, fontSize: 15 },
  modalBody: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  hero: { width: '100%', height: 220, marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 22, fontFamily: fonts.mono },
  section: { marginTop: spacing.lg, gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: fonts.bodySemi, letterSpacing: 0.3 },
  instruction: { fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  replaceCta: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.control,
    alignItems: 'center'
  },
  replaceCtaText: { fontFamily: fonts.bodySemi, fontSize: 14, textAlign: 'center' },
  hint: { marginTop: spacing.lg, fontSize: 12, lineHeight: 18, fontFamily: fonts.body }
});
