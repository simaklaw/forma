import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import {
  evaluateExerciseGoal,
  parseTargetWeightKg,
  type GoalSetLog
} from '@/engines/exerciseGoals';
import { allExerciseNames } from '@/features/workout/catalog';
import { allImportedExerciseNames } from '@/features/workout/importedExerciseBridge';
import { useExerciseGoalStore } from '@/state/useExerciseGoalStore';
import type { ExerciseGoal } from '@/engines/exerciseGoals';

interface Props {
  setLogs: GoalSetLog[];
}

/**
 * Карточка целей по упражнению на ProgressScreen: целевой вес на упражнение,
 * прогресс-бар рекорда против цели, добавление цели через пикер в модалке.
 * Идея — из NeXTormer/NeverSkip (AGPLv3, ideas-only), реализация своя,
 * см. engines/exerciseGoals.ts и state/useExerciseGoalStore.ts.
 */
export default function ExerciseGoalCard({ setLogs }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);

  const goals = useExerciseGoalStore((s) => s.goals);
  const addGoal = useExerciseGoalStore((s) => s.addGoal);
  const removeGoal = useExerciseGoalStore((s) => s.removeGoal);
  const [pickerVisible, setPickerVisible] = useState(false);

  const names = useMemo(() => {
    const out: Record<number, string> = { ...allExerciseNames() };
    for (const ex of allImportedExerciseNames()) {
      out[ex.id] = ex.nameRu ?? ex.nameEn;
    }
    return out;
  }, []);

  const rows = useMemo(
    () =>
      goals.map((goal) => ({
        goal,
        view: evaluateExerciseGoal(setLogs, goal),
        name: names[goal.exerciseId] ?? `#${goal.exerciseId}`
      })),
    [goals, setLogs, names]
  );

  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const fmtDate = (key: string) =>
    new Date(`${key}T00:00:00`).toLocaleDateString(locale);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
      accessibilityRole="summary"
    >
      <Text style={[styles.kicker, { color: colors.paperFaint }]}>{t('goalKicker')}</Text>

      {rows.length === 0 ? (
        <Text style={[styles.emptyHint, { color: colors.paperDim }]}>
          {t('goalEmptyHint')}
        </Text>
      ) : (
        rows.map(({ goal, view, name }) => (
          <View key={goal.exerciseId} style={styles.goalRow}>
            <View style={styles.goalHead}>
              <Text style={[styles.goalName, { color: colors.paper }]} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.goalHeadRight}>
                <Text style={[styles.goalTarget, { color: colors.lime }]}>
                  {view.targetWeightKg} {t('kg')}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('goalDeleteA11y', { name })}
                  onPress={() => removeGoal(goal.exerciseId)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.deleteMark, { color: colors.paperFaint }]}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.bar, { backgroundColor: colors.line }]}>
              <View
                style={[
                  styles.barFill,
                  { backgroundColor: colors.lime, width: `${view.progressPct * 100}%` }
                ]}
              />
            </View>
            <Text style={[styles.goalCaption, { color: colors.paperDim }]}>
              {view.reached
                ? `✓ ${t('goalReached', { date: fmtDate(view.bestDateKey ?? '') })}`
                : view.bestWeightKg > 0
                  ? `${t('goalBest', { kg: view.bestWeightKg })} · ${t('goalRemaining', {
                      kg: view.remainingKg
                    })}`
                  : t('goalRemaining', { kg: view.remainingKg })}
            </Text>
          </View>
        ))
      )}

      <TouchableOpacity
        style={[styles.addBtn, { borderColor: colors.lime }]}
        accessibilityRole="button"
        accessibilityLabel={t('goalAdd')}
        onPress={() => setPickerVisible(true)}
      >
        <Text style={[styles.addBtnLabel, { color: colors.lime }]}>{t('goalAdd')}</Text>
      </TouchableOpacity>

      <GoalPickerModal
        visible={pickerVisible}
        names={names}
        goals={goals}
        onClose={() => setPickerVisible(false)}
        onSave={(exerciseId, targetWeightKg) => {
          addGoal(exerciseId, targetWeightKg);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

interface PickerProps {
  visible: boolean;
  names: Record<number, string>;
  goals: ExerciseGoal[];
  onClose: () => void;
  onSave: (exerciseId: number, targetWeightKg: number) => void;
}

/** Полноэкранный пикер: упражнение (планы + импортированные) + целевой вес. */
function GoalPickerModal({ visible, names, goals, onClose, onSave }: PickerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    if (visible) {
      setExerciseId(null);
      setWeightInput('');
    }
  }, [visible]);

  const items = useMemo(
    () =>
      Object.entries(names)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [names]
  );

  const parsed = parseTargetWeightKg(weightInput);
  const existing = useMemo(() => {
    const byId = new Map<number, ExerciseGoal>();
    for (const g of goals) byId.set(g.exerciseId, g);
    return byId;
  }, [goals]);
  const canSave = exerciseId != null && parsed != null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.pickerRoot, { backgroundColor: colors.ink }]}>
        <View style={[styles.pickerTopBar, { borderBottomColor: colors.line }]}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            style={[styles.pickerBarBtn, { borderColor: colors.lineStrong }]}
          >
            <Text style={[styles.pickerBarBtnText, { color: colors.lime }]}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pickerBody}>
          <Text style={[styles.pickerTitle, { color: colors.paper }]}>{t('goalModalTitle')}</Text>

          <Text style={[styles.pickerLabel, { color: colors.paperFaint }]}>
            {t('goalPickExercise')}
          </Text>
          <View style={[styles.pickerList, { borderColor: colors.line }]}>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const selected = item.id === exerciseId;
                const goal = existing.get(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerRow,
                      selected
                        ? { borderColor: colors.lime, backgroundColor: colors.limeDim }
                        : { borderColor: colors.line }
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    accessibilityState={{ selected }}
                    onPress={() => setExerciseId(item.id)}
                  >
                    <Text
                      style={[styles.pickerRowText, { color: colors.paperDim }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {goal ? (
                      <Text style={[styles.pickerRowTarget, { color: colors.paperFaint }]}>
                        {goal.targetWeightKg} {t('kg')}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          <Text style={[styles.pickerLabel, { color: colors.paperFaint }]}>
            {t('goalTargetLabel')}
          </Text>
          <TextInput
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            placeholder={t('goalTargetPlaceholder')}
            placeholderTextColor={colors.paperFaint}
            style={[styles.weightInput, { borderColor: colors.line, color: colors.paper }]}
          />
          {weightInput.length > 0 && parsed == null ? (
            <Text style={[styles.weightError, { color: colors.paperFaint }]}>
              {t('goalInvalidWeight')}
            </Text>
          ) : null}

          <TouchableOpacity
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel={t('save')}
            onPress={() => {
              if (exerciseId != null && parsed != null) onSave(exerciseId, parsed);
            }}
            style={[
              styles.saveBtn,
              canSave ? { backgroundColor: colors.lime } : { borderColor: colors.line }
            ]}
          >
            <Text
              style={[
                styles.saveBtnLabel,
                canSave ? { color: colors.ink } : { color: colors.paperFaint }
              ]}
            >
              {t('save')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: radius.card,
      padding: spacing.md,
      marginBottom: spacing.md
    },
    kicker: {
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 0.6,
      marginBottom: 6
    },
    emptyHint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17 },
    goalRow: { marginTop: 10 },
    goalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    },
    goalName: { fontFamily: fonts.bodySemi, fontSize: 13, flex: 1 },
    goalHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    goalTarget: { fontFamily: fonts.mono, fontSize: 13 },
    deleteMark: { fontFamily: fonts.mono, fontSize: 16, lineHeight: 18 },
    bar: {
      height: 6,
      borderRadius: 3,
      marginTop: 6,
      overflow: 'hidden'
    },
    barFill: { height: 6, borderRadius: 3 },
    goalCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 5 },
    addBtn: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: radius.control,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 12
    },
    addBtnLabel: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.4 },
    pickerRoot: { flex: 1 },
    pickerTopBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1
    },
    pickerBarBtn: {
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8
    },
    pickerBarBtnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
    pickerBody: { flex: 1, padding: spacing.lg, paddingBottom: 32, gap: 8 },
    pickerTitle: { fontFamily: fonts.mono, fontSize: 26 },
    pickerLabel: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1, marginTop: 6 },
    pickerList: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radius.card,
      overflow: 'hidden'
    },
    pickerRow: {
      borderWidth: 1,
      borderRadius: radius.control,
      marginHorizontal: 8,
      marginVertical: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    },
    pickerRowText: { fontFamily: fonts.body, fontSize: 13, flex: 1 },
    pickerRowTarget: { fontFamily: fonts.mono, fontSize: 12 },
    weightInput: {
      borderWidth: 1,
      borderRadius: radius.control,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.mono,
      fontSize: 16
    },
    weightError: { fontFamily: fonts.body, fontSize: 11 },
    saveBtn: {
      borderRadius: radius.pill,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 8
    },
    saveBtnLabel: { fontFamily: fonts.bodySemi, fontSize: 14 }
  });
}
