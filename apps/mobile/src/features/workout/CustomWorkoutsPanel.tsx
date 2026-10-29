/**
 * Custom Workouts (P0, clean-room по мотивам разбора Fitify Pro):
 * сегмент «Мои» в каталоге — список своих тренировок, редактор
 * (имя, упражнения, подходы/повторы/отдых, порядок) и запуск в
 * WorkoutScreen как «день» `custom-<id>` через обычный session engine.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { muscleLabel, useT } from '@/i18n/strings';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import type { TabParamList } from '@/navigation/types';
import { useCustomWorkoutStore } from '@/state/useCustomWorkoutStore';
import { CATALOGS } from './catalog';
import {
  customExerciseById,
  estimateCustomWorkoutMinutes,
  resolveCustomWorkoutExercises,
  type CustomWorkout
} from './customWorkouts';
import { IMPORTED_EXERCISE_LIBRARY } from './importedExerciseLibrary.generated';
import { importedExerciseDefByNumericId, importedToExerciseDef } from './importedExerciseBridge';
import { matchesAllTokens } from '@/lib/normalizeSearch';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { MUSCLE_LABELS, type MuscleKey } from '@/domain/muscleKeys';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { isBodyweightExercise } from './catalog';
import { formatSchemeDate, lastSchemeForMuscle } from './lastScheme';

/** Единый список для пикера: gym → home → импортированная библиотека (как в resolve). */
interface PickerEntry {
  id: number;
  name: string;
  source: 'gym' | 'home' | 'lib';
}

const PICKER_ENTRIES: PickerEntry[] = (() => {
  const byId = new Map<number, PickerEntry>();
  for (const day of CATALOGS.gym) {
    for (const ex of day.exercises) byId.set(ex.id, { id: ex.id, name: ex.name, source: 'gym' });
  }
  for (const day of CATALOGS.home) {
    for (const ex of day.exercises) {
      if (!byId.has(ex.id)) byId.set(ex.id, { id: ex.id, name: ex.name, source: 'home' });
    }
  }
  for (const ex of IMPORTED_EXERCISE_LIBRARY) {
    const def = importedToExerciseDef(ex);
    if (!byId.has(def.id)) byId.set(def.id, { id: def.id, name: def.name, source: 'lib' });
  }
  return [...byId.values()];
})();

export default function CustomWorkoutsPanel() {
  const colors = useThemeColors();
  const t = useT();
  const styles = createStyles(colors);
  const workouts = useCustomWorkoutStore((s) => s.workouts);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = workouts.find((w) => w.id === editingId) ?? null;

  function start(id: string) {
    const workout = useCustomWorkoutStore.getState().workouts.find((w) => w.id === id);
    if (!workout) return;
    if (resolveCustomWorkoutExercises(workout.items, customExerciseById).length === 0) return;
    RestTimerEngine.hapticTabSwitch();
    navigation.navigate('Тренировки', { customWorkoutId: id });
  }

  function remove(id: string, name: string) {
    Alert.alert(t('customDeleteTitle'), t('customDeleteBody', { name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => useCustomWorkoutStore.getState().deleteWorkout(id)
      }
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.primaryContainer }]}
        onPress={() => {
          const id = useCustomWorkoutStore.getState().createWorkout('');
          setEditingId(id);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('customCreateCta')}
      >
        <Text style={[styles.createBtnText, { color: colors.onPrimaryContainer }]}>{t('customCreateCta')}</Text>
      </TouchableOpacity>

      {workouts.length === 0 ? (
        <Text style={[styles.empty, { color: colors.paperDim }]}>{t('customEmptyHint')}</Text>
      ) : (
        workouts.map((w) => {
          const defs = resolveCustomWorkoutExercises(w.items, customExerciseById);
          const minutes = estimateCustomWorkoutMinutes(defs);
          const canStart = defs.length > 0;
          return (
            <View
              key={w.id}
              style={[styles.card, { backgroundColor: colors.surfaceContainer }]}
            >
              <Text style={[styles.cardName, { color: colors.paper }]} numberOfLines={1}>
                {w.name || t('customUntitled')}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.paperDim }]}>
                {t('customExercisesCount', { count: defs.length })} ·{' '}
                {t('customMinutesCount', { count: minutes })}
              </Text>
              {!canStart ? (
                <Text style={[styles.cardHint, { color: colors.ember }]}>
                  {t('customEmptyItemsHint')}
                </Text>
              ) : null}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.startBtn, { backgroundColor: canStart ? colors.lime : colors.line }]}
                  disabled={!canStart}
                  onPress={() => start(w.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('customStartCta')}
                >
                  <Text style={[styles.startBtnText, { color: colors.onAccent }]}>
                    ▶ {t('customStartCta')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: colors.surfaceContainer }]}
                  onPress={() => setEditingId(w.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('customEditCta')}
                >
                  <Text style={[styles.miniBtnText, { color: colors.paperDim }]}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: colors.surfaceContainer }]}
                  onPress={() => {
                    useCustomWorkoutStore
                      .getState()
                      .duplicateWorkout(w.id, `${w.name || t('customUntitled')}${t('customCopySuffix')}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('customDuplicateCta')}
                >
                  <Text style={[styles.miniBtnText, { color: colors.paperDim }]}>⧉</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: colors.surfaceContainer }]}
                  onPress={() => remove(w.id, w.name || t('customUntitled'))}
                  accessibilityRole="button"
                  accessibilityLabel={t('delete')}
                >
                  <Text style={[styles.miniBtnText, { color: colors.ember }]}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <CustomWorkoutEditor workout={editing} onClose={() => setEditingId(null)} />
    </ScrollView>
  );
}

/** Редактор тренировки: имя + элементы со степперами, автосохранение в стор. */
function CustomWorkoutEditor({
  workout,
  onClose
}: {
  workout: CustomWorkout | null;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const t = useT();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const lang = useLanguageStore((s) => s.lang);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const [schemeNote, setSchemeNote] = useState<string | null>(null);

  useEffect(() => {
    setName(workout?.name ?? '');
    setExpanded(null);
  }, [workout?.id]);

  if (!workout) return null;

  const items = workout.items;

  /** Определение для схемы: gym → home → импортированная библиотека. */
  const schemeDefOf = (id: number) =>
    customExerciseById(id) ?? importedExerciseDefByNumericId(id);

  /** Автозаполнение (идея fit_tracker): схема последней тренировки группы мышц. */
  function applyScheme(muscle: MuscleKey) {
    const scheme = lastSchemeForMuscle(setLogs, muscle, {
      musclesOf: (id) => schemeDefOf(id)?.targetMuscles ?? null,
      restOf: (id) => schemeDefOf(id)?.restSeconds ?? null,
      isWeighted: (id) => {
        const def = schemeDefOf(id);
        return def ? !isBodyweightExercise(def) : true;
      }
    });
    if (!scheme) {
      setSchemeNote(t('customSchemeNoHistory'));
      return;
    }
    const existingIds = new Set(items.map((it) => it.exerciseId));
    const fresh = scheme.items.filter((it) => !existingIds.has(it.exerciseId));
    if (fresh.length === 0) {
      setSchemeNote(t('customSchemeAllHere', { date: formatSchemeDate(scheme.dateKey) }));
      return;
    }
    useCustomWorkoutStore.getState().setWorkoutItems(workout!.id, [...items, ...fresh]);
    setSchemeNote(
      t('customSchemeLoaded', { date: formatSchemeDate(scheme.dateKey), count: fresh.length })
    );
  }

  function commitName() {
    useCustomWorkoutStore.getState().renameWorkout(workout!.id, name);
  }

  function updateItem(
    index: number,
    patch: Partial<{ sets: number; reps: number; restSeconds: number; supersetWithPrev: boolean }>
  ) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    useCustomWorkoutStore.getState().setWorkoutItems(workout!.id, next);
  }

  function moveItem(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const moved = next[index]!;
    next[index] = next[target]!;
    next[target] = moved;
    useCustomWorkoutStore.getState().setWorkoutItems(workout!.id, next);
    setExpanded(target);
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    useCustomWorkoutStore.getState().setWorkoutItems(workout!.id, next);
    setExpanded(null);
  }

  function addItem(exerciseId: number) {
    const def = customExerciseById(exerciseId);
    const item = {
      exerciseId,
      sets: def?.totalSets ?? 3,
      reps: def?.workingReps ?? 10,
      restSeconds: def?.restSeconds ?? 60
    };
    useCustomWorkoutStore.getState().setWorkoutItems(workout!.id, [...items, item]);
    setPickerOpen(false);
    setQuery('');
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.ink }]}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: colors.paper }]}>{t('customEditorTitle')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              commitName();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Text style={[styles.modalClose, { color: colors.lime }]}>{t('close')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <TextInput
            value={name}
            onChangeText={setName}
            onEndEditing={commitName}
            onSubmitEditing={commitName}
            placeholder={t('customNamePlaceholder')}
            placeholderTextColor={colors.paperFaint}
            style={[styles.nameInput, { backgroundColor: colors.surfaceContainer, color: colors.paper }]}
            accessibilityLabel={t('customNamePlaceholder')}
            returnKeyType="done"
          />

          <View
            style={[styles.schemeCard, { backgroundColor: colors.surfaceContainer }]}
          >
            <Text style={[styles.schemeTitle, { color: colors.paper }]}>
              {t('customSchemeTitle')}
            </Text>
            <Text style={[styles.schemeHint, { color: colors.paperDim }]}>
              {t('customSchemeHint')}
            </Text>
            <View style={styles.schemeChips}>
              {(Object.keys(MUSCLE_LABELS) as MuscleKey[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.schemeChip,
                    { backgroundColor: colors.surfaceContainerHigh }
                  ]}
                  onPress={() => applyScheme(key)}
                  accessibilityRole="button"
                  accessibilityLabel={t('customSchemeChipA11y', {
                    muscle: muscleLabel(key, lang)
                  })}
                >
                  <Text style={[styles.schemeChipText, { color: colors.lime }]}>
                    {muscleLabel(key, lang)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {schemeNote ? (
              <Text style={[styles.schemeNote, { color: colors.paperFaint }]}>{schemeNote}</Text>
            ) : null}
          </View>

          <FlatList
            data={items}
            keyExtractor={(_, index) => String(index)}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.paperDim }]}>{t('customEmptyItemsHint')}</Text>
            }
            renderItem={({ item, index }) => {
              const def = customExerciseById(item.exerciseId);
              const name = def?.name ?? `#${item.exerciseId}`;
              const open = expanded === index;
              return (
                <View style={[styles.itemCard, { backgroundColor: colors.surfaceContainer }]}>
                  <TouchableOpacity
                    onPress={() => setExpanded(open ? null : index)}
                    accessibilityRole="button"
                    accessibilityLabel={t('customItemA11y', {
                      name,
                      sets: item.sets,
                      reps: item.reps,
                      rest: item.restSeconds
                    })}
                  >
                    <View style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: colors.paper }]} numberOfLines={1}>
                          {index + 1}. {name}
                        </Text>
                        <Text style={[styles.itemMeta, { color: colors.paperDim }]}>
                          {item.sets}×{item.reps} · {t('statRest')} {item.restSeconds} {t('secShort')}
                        </Text>
                        {item.supersetWithPrev ? (
                          <Text style={[styles.ssBadge, { color: colors.lime }]}>
                            {t('supersetBadge')}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[styles.chevron, { color: colors.paperFaint }]}>{open ? '▾' : '▸'}</Text>
                    </View>
                  </TouchableOpacity>

                  {open ? (
                    <View style={styles.steppers}>
                      <Stepper
                        label={t('statSets')}
                        value={item.sets}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(v) => updateItem(index, { sets: v })}
                      />
                      <Stepper
                        label={t('statReps')}
                        value={item.reps}
                        min={1}
                        max={100}
                        step={1}
                        onChange={(v) => updateItem(index, { reps: v })}
                      />
                      <Stepper
                        label={t('statRest')}
                        value={item.restSeconds}
                        min={15}
                        max={600}
                        step={5}
                        unit={t('secShort')}
                        onChange={(v) => updateItem(index, { restSeconds: v })}
                      />
                      {index > 0 ? (
                        <TouchableOpacity
                          style={[
                            styles.ssToggle,
                            { backgroundColor: colors.surfaceContainer },
                            item.supersetWithPrev && { backgroundColor: colors.primaryContainer }
                          ]}
                          onPress={() =>
                            updateItem(index, { supersetWithPrev: !item.supersetWithPrev })
                          }
                          accessibilityRole="switch"
                          accessibilityState={{ checked: Boolean(item.supersetWithPrev) }}
                          accessibilityLabel={t('customSupersetChipA11y')}
                        >
                          <Text
                            style={[
                              styles.ssToggleText,
                              { color: item.supersetWithPrev ? colors.onPrimaryContainer : colors.paperDim }
                            ]}
                          >
                            {t('customSupersetChip')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: colors.surfaceContainer }]}
                          disabled={index === 0}
                          onPress={() => moveItem(index, -1)}
                          accessibilityRole="button"
                          accessibilityLabel={t('customMoveUp')}
                        >
                          <Text style={[styles.miniBtnText, { color: colors.paperDim }]}>▲</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: colors.surfaceContainer }]}
                          disabled={index === items.length - 1}
                          onPress={() => moveItem(index, 1)}
                          accessibilityRole="button"
                          accessibilityLabel={t('customMoveDown')}
                        >
                          <Text style={[styles.miniBtnText, { color: colors.paperDim }]}>▼</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: colors.surfaceContainer }]}
                          onPress={() => removeItem(index)}
                          accessibilityRole="button"
                          accessibilityLabel={t('customRemoveItem')}
                        >
                          <Text style={[styles.miniBtnText, { color: colors.ember }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            }}
          />

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.surfaceContainer }]}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('customAddExercise')}
          >
            <Text style={[styles.addBtnText, { color: colors.lime }]}>{t('customAddExercise')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ExercisePickerModal
        visible={pickerOpen}
        query={query}
        onQuery={setQuery}
        onPick={addItem}
        onClose={() => setPickerOpen(false)}
      />
    </Modal>
  );
}

/** Компактный степпер «− значение +». */
function Stepper({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (next: number) => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.stepperLabel, { color: colors.paperDim }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperBtn, { borderColor: colors.lineStrong }]}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityRole="button"
          accessibilityLabel={`${label} −`}
        >
          <Text style={[styles.stepperBtnText, { color: colors.paperDim }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: colors.paper }]}>
          {value}
          {unit ?? ''}
        </Text>
        <TouchableOpacity
          style={[styles.stepperBtn, { borderColor: colors.lineStrong }]}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
          accessibilityRole="button"
          accessibilityLabel={`${label} +`}
        >
          <Text style={[styles.stepperBtnText, { color: colors.paperDim }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Пикер упражнения: поиск по планам и импортированной библиотеке. */
function ExercisePickerModal({
  visible,
  query,
  onQuery,
  onPick,
  onClose
}: {
  visible: boolean;
  query: string;
  onQuery: (next: string) => void;
  onPick: (exerciseId: number) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const t = useT();
  const styles = createStyles(colors);
  const filtered = useMemo(
    () => PICKER_ENTRIES.filter((entry) => matchesAllTokens(entry.name, query)),
    [query]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.ink }]}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: colors.paper }]}>{t('customAddExercise')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')}>
            <Text style={[styles.modalClose, { color: colors.lime }]}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <TextInput
            value={query}
            onChangeText={onQuery}
            placeholder={t('customSearchPlaceholder')}
            placeholderTextColor={colors.paperFaint}
            style={[styles.nameInput, { backgroundColor: colors.surfaceContainer, color: colors.paper }]}
            accessibilityLabel={t('customSearchPlaceholder')}
          />
          <FlatList
            data={filtered}
            keyExtractor={(entry) => String(entry.id)}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.paperDim }]}>{t('catalogNothingFound')}</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerRow, { borderBottomColor: colors.line }]}
                onPress={() => onPick(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.paper }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                {item.source !== 'lib' ? (
                  <Text style={[styles.sourceBadge, { color: colors.paperFaint }]}>
                    {item.source === 'gym' ? t('gymShort') : t('homeShort')}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    list: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 10, paddingTop: spacing.md },
    createBtn: {
      borderRadius: radius.card,
      paddingVertical: 14,
      alignItems: 'center'
    },
    createBtnText: { fontFamily: fonts.bodySemi, fontSize: 14 },
    card: { borderRadius: radius.card, padding: spacing.md, gap: 8 },
    cardName: { fontFamily: fonts.bodySemi, fontSize: 15 },
    cardMeta: { fontFamily: fonts.body, fontSize: 12 },
    cardHint: { fontFamily: fonts.body, fontSize: 12 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    startBtn: {
      borderRadius: radius.control,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center'
    },
    startBtnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
    miniBtn: {
      borderRadius: radius.control,
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center'
    },
    miniBtnText: { fontFamily: fonts.bodySemi, fontSize: 14 },
    empty: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
    modalRoot: { flex: 1 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingHorizontal: spacing.xl, paddingBottom: 8 },
    modalTitle: { fontFamily: fonts.mono, fontSize: 18 },
    modalClose: { fontFamily: fonts.bodySemi, fontSize: 15 },
    modalBody: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 24, gap: 10 },
    nameInput: {
      borderRadius: radius.control,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.body,
      fontSize: 15
    },
    schemeCard: { borderRadius: radius.card, padding: spacing.md, gap: 8 },
    schemeTitle: { fontFamily: fonts.bodySemi, fontSize: 14 },
    schemeHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
    schemeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    schemeChip: {
      borderRadius: radius.control,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    schemeChipText: { fontFamily: fonts.bodySemi, fontSize: 12, textTransform: 'capitalize' },
    schemeNote: { fontFamily: fonts.body, fontSize: 12 },
    itemCard: { borderRadius: radius.card, padding: spacing.md, gap: 8 },
    itemRow: { flexDirection: 'row', alignItems: 'center' },
    itemName: { fontFamily: fonts.bodySemi, fontSize: 14 },
    itemMeta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
    ssBadge: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
    chevron: { fontFamily: fonts.mono, fontSize: 14 },
    steppers: { gap: 6, marginTop: 4 },
    stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepperLabel: { fontFamily: fonts.body, fontSize: 12 },
    stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepperBtn: {
      borderRadius: radius.control,
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center'
    },
    stepperBtnText: { fontFamily: fonts.bodySemi, fontSize: 16 },
    stepperValue: { fontFamily: fonts.mono, fontSize: 14, minWidth: 52, textAlign: 'center' },
    itemActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
    ssToggle: {
      alignSelf: 'flex-start',
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginTop: 6
    },
    ssToggleText: { fontFamily: fonts.bodySemi, fontSize: 12 },
    addBtn: {
      borderRadius: radius.control,
      paddingVertical: 12,
      alignItems: 'center'
    },
    addBtnText: { fontFamily: fonts.bodySemi, fontSize: 14 },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      gap: 8
    },
    sourceBadge: { fontFamily: fonts.mono, fontSize: 10 }
  });
}
