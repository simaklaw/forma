import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { estimateBurnFromSetLogs, toDateKey as coreToDateKey } from '@forma/core';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import ExerciseSheet, { ExerciseDef } from './ExerciseSheet';
import { WorkoutCoachCard } from './WorkoutCoachCard';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { useTrainingModeStore } from '@/state/useTrainingModeStore';
import { DayProgress, lastNDays, ruDayWord, toDateKey } from '@/engines/WorkoutStats';
import type { WorkoutSession } from '@forma/workout-domain';
import {
  ActiveSessionController,
  dayIdFromTemplate
} from './session/ActiveSessionController';
import { applySessionProjection } from './data/applySessionProjection';
import {
  catalogFor,
  formatLoadLabel,
  type TrainingMode,
  type WorkoutDay
} from './catalog';
import {
  clearDayOverride,
  loadDayOverrideIds,
  resolveDayExercises
} from './dayPlanOverrides';
import { setReplaceTarget } from './replaceTarget';
import type { TabParamList } from '@/navigation/types';
import { EXERCISE_THUMBNAILS } from './exerciseMedia';
import { presentEarlyLeave } from './session/earlyLeave';

const WEEKDAY_RU_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/** Временно скрыт по продуктовому решению — приложение сейчас только про домашние
 *  тренировки без оборудования. Код переключателя оставлен нетронутым: чтобы
 *  вернуть — просто верни этот флаг в true, JSX ниже не менялся. */
const SHOW_GYM_MODE_TOGGLE = false;

function isDayPlanComplete(
  dayProgress: DayProgress,
  dateKey: string,
  exercises: { id: number; totalSets: number }[]
): boolean {
  const progress = dayProgress[dateKey];
  if (!progress) return false;
  return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
}

function isAnyPlanComplete(plan: WorkoutDay[], dayProgress: DayProgress, dateKey: string): boolean {
  return plan.some((day) => isDayPlanComplete(dayProgress, dateKey, day.exercises));
}

function selectPlanWeekDaysCompleted(
  plan: WorkoutDay[],
  dayProgress: DayProgress,
  days = 7,
  now: Date = new Date()
): number {
  return lastNDays(days, now).filter((d) => isAnyPlanComplete(plan, dayProgress, toDateKey(d))).length;
}

function selectPlanCurrentStreak(
  plan: WorkoutDay[],
  dayProgress: DayProgress,
  now: Date = new Date()
): number {
  const cursor = new Date(now);
  if (!isAnyPlanComplete(plan, dayProgress, toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (isAnyPlanComplete(plan, dayProgress, toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type DayStatus = 'done' | 'today-in-progress' | 'missed';

function selectPlanStreakDays(
  plan: WorkoutDay[],
  dayProgress: DayProgress,
  days = 7,
  now: Date = new Date()
): DayStatus[] {
  const window = lastNDays(days, now);
  const todayKey = toDateKey(now);
  return window.map((d) => {
    const key = toDateKey(d);
    if (isAnyPlanComplete(plan, dayProgress, key)) return 'done';
    return key === todayKey ? 'today-in-progress' : 'missed';
  });
}

export default function WorkoutScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [resumable, setResumable] = useState<WorkoutSession | null>(null);

  const trainingMode = useTrainingModeStore((s) => s.trainingMode);
  const setTrainingMode = useTrainingModeStore((s) => s.setTrainingMode);
  const dayProgress = useFitPulseStore((s) => s.dayProgress);
  const completedSetsToday = useFitPulseStore((s) => s.completedSetsToday);
  const personalRecords = useFitPulseStore((s) => s.personalRecords);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profileWeight = useFitPulseStore((s) => s.profile.weight);

  const plan = useMemo(() => catalogFor(trainingMode), [trainingMode]);
  const planDayIds = useMemo(() => new Set(plan.map((d) => d.id)), [plan]);

  const activeDay =
    plan.find((d) => d.id === (selectedDayId ?? plan[0]?.id)) ?? plan[0];

  const [overrideIds, setOverrideIds] = useState<number[] | null>(null);
  const [overrideTick, setOverrideTick] = useState(0);

  // Reload overrides whenever this tab gains focus (e.g. after catalog replace).
  useFocusEffect(
    useCallback(() => {
      if (!activeDay) {
        setOverrideIds(null);
        return;
      }
      let cancelled = false;
      void loadDayOverrideIds(trainingMode, activeDay.id).then((ids) => {
        if (!cancelled) setOverrideIds(ids);
      });
      return () => {
        cancelled = true;
      };
    }, [activeDay?.id, trainingMode, overrideTick])
  );

  const effectiveExercises = useMemo(() => {
    if (!activeDay) return [];
    return resolveDayExercises(trainingMode, activeDay.exercises, overrideIds);
  }, [activeDay, trainingMode, overrideIds]);

  useEffect(() => {
    if (
      selectedExerciseId != null &&
      !effectiveExercises.some((ex) => ex.id === selectedExerciseId)
    ) {
      setSelectedExerciseId(null);
    }
  }, [effectiveExercises, selectedExerciseId]);

  useEffect(() => {
    if (!plan.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(plan[0]?.id ?? null);
      setSelectedExerciseId(null);
    }
  }, [plan, selectedDayId]);

  const exerciseNames = useMemo(
    () => Object.fromEntries(plan.flatMap((day) => day.exercises.map((ex) => [ex.id, ex.name]))),
    [plan]
  );

  const refreshResumable = useCallback(async () => {
    const session = await ActiveSessionController.load();
    if (!session) {
      setResumable(null);
      return;
    }
    const dayId = dayIdFromTemplate(session.templateRevisionId);
    if (!dayId || !planDayIds.has(dayId)) {
      setResumable(null);
      return;
    }
    const projection = await ActiveSessionController.getLegacyProjection(session.sessionId);
    if (projection) applySessionProjection(projection);
    setResumable(session);
  }, [planDayIds]);

  useEffect(() => {
    void refreshResumable();
  }, [refreshResumable]);

  const selectedExercise =
    effectiveExercises.find((e) => e.id === selectedExerciseId) ?? null;
  const todayLabel = WEEKDAY_RU_FULL[new Date().getDay()];

  const todayDoneCount = effectiveExercises.length
    ? effectiveExercises.filter((ex) => completedSetsToday(ex.id) >= ex.totalSets).length
    : 0;
  const anyDoneToday = useMemo(
    () => isAnyPlanComplete(plan, dayProgress, toDateKey(new Date())),
    [plan, dayProgress]
  );
  const weekDaysCompleted = useMemo(
    () => selectPlanWeekDaysCompleted(plan, dayProgress),
    [plan, dayProgress]
  );
  const overallPr = useMemo(() => {
    const values = Object.values(personalRecords);
    return values.length ? Math.max(...values) : null;
  }, [personalRecords]);
  const currentStreak = useMemo(
    () => selectPlanCurrentStreak(plan, dayProgress),
    [plan, dayProgress]
  );
  const streakDays = useMemo(
    () => selectPlanStreakDays(plan, dayProgress),
    [plan, dayProgress]
  );
  const safeWeightKg =
    typeof profileWeight === 'number' && Number.isFinite(profileWeight) && profileWeight > 0
      ? profileWeight
      : 0;

  const burnedToday = useMemo(
    () =>
      estimateBurnFromSetLogs({
        weightKg: safeWeightKg,
        setLogs,
        dateKey: coreToDateKey(new Date()),
        exerciseNames
      }),
    [safeWeightKg, setLogs, exerciseNames]
  );

  const currentStepExerciseId =
    resumable && activeDay && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id
      ? Number(resumable.steps[resumable.currentStepIndex]?.snapshot.exerciseId)
      : null;

  function openExercise(id: number) {
    setSelectedExerciseId(id);
    sheetRef.current?.expand();
  }

  function selectDay(id: string) {
    setSelectedDayId(id);
    setSelectedExerciseId(null);
  }

  function switchMode(mode: TrainingMode) {
    if (mode === trainingMode) return;
    setTrainingMode(mode);
    setSelectedExerciseId(null);
  }

  if (!activeDay) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
        <Text style={[styles.title, { color: colors.paper }]}>Нет плана</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>FITPULSE · {todayLabel}</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.paper }]}>Тренировка</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Каталог')}
            style={[styles.catalogButton, { borderColor: colors.lineStrong, backgroundColor: colors.panel }]}
            accessibilityRole="button"
            accessibilityLabel="Открыть каталог упражнений"
          >
            <Text style={[styles.catalogButtonText, { color: colors.lime }]}>Каталог</Text>
          </TouchableOpacity>
        </View>
      </View>

      {SHOW_GYM_MODE_TOGGLE && (
        <View style={styles.modeTabs} accessibilityRole="tablist">
          {(
            [
              { id: 'gym' as const, label: 'Зал' },
              { id: 'home' as const, label: 'Дом' }
            ] as const
          ).map((m) => {
            const active = trainingMode === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeTab, { borderColor: colors.lineStrong, backgroundColor: colors.panel }, active && { borderColor: colors.lime, backgroundColor: colors.limeDim }]}
                onPress={() => switchMode(m.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={m.label}
              >
                <Text style={[styles.modeTabText, { color: colors.paperDim }, active && { color: colors.lime }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabs}
        accessibilityRole="tablist"
      >
        {plan.map((day) => {
          const active = day.id === activeDay.id;
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayTab, { borderColor: colors.lineStrong, backgroundColor: colors.panel }, active && { borderColor: colors.lime, backgroundColor: colors.limeDim }]}
              onPress={() => selectDay(day.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={day.name}
            >
              <Text style={[styles.dayTabText, { color: colors.paperDim }, active && { color: colors.lime }]} numberOfLines={1}>
                {day.name.split(' — ')[0] || day.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.ticket, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <View style={styles.ticketMain}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.ticketLabel, { color: colors.paperFaint }]}>План дня · {trainingMode === 'gym' ? 'зал' : 'дом'}</Text>
              <Text style={[styles.ticketName, { color: colors.paper }]}>{activeDay.name}</Text>
              <Text style={[styles.ticketMeta, { color: colors.paperDim }]}>
                {effectiveExercises.length} упражнения · {activeDay.meta}
                {burnedToday > 0 ? ` · ~${burnedToday} ккал` : ''}
              </Text>
              {resumable && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id ? (
                <View style={styles.resumeBlock}>
                  <Text style={[styles.resumeHint, { color: colors.lime }]}>
                    Есть незавершённая сессия · шаг {resumable.currentStepIndex + 1}/
                    {resumable.steps.length}
                  </Text>
                  <View style={styles.resumeActions}>
                    <TouchableOpacity
                      style={[styles.startPill, { backgroundColor: colors.lime }]}
                      accessibilityRole="button"
                      accessibilityLabel="Продолжить тренировку"
                      onPress={() => {
                        void ActiveSessionController.ensureDaySession(
                          activeDay.id,
                          effectiveExercises
                        )
                          .then((session) => {
                            if (!session) return;
                            void refreshResumable();
                            const step = session.steps[session.currentStepIndex];
                            const exId = step
                              ? Number(step.snapshot.exerciseId)
                              : effectiveExercises[0]?.id;
                            if (exId) openExercise(exId);
                          })
                          .catch(() => {});
                      }}
                    >
                      <Text style={[styles.startPillText, { color: colors.ink }]}>▶  Продолжить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.restartPill, { borderColor: colors.lineStrong }]}
                      accessibilityRole="button"
                      accessibilityLabel="Начать заново"
                      onPress={() => {
                        void ActiveSessionController.restartDaySession(
                          activeDay.id,
                          effectiveExercises
                        )
                          .then((session) => {
                            if (!session) return;
                            void refreshResumable();
                            const first = session.steps[0];
                            const exId = first
                              ? Number(first.snapshot.exerciseId)
                              : effectiveExercises[0]?.id;
                            if (exId) openExercise(exId);
                          })
                          .catch(() => {});
                      }}
                    >
                      <Text style={[styles.restartPillText, { color: colors.paperDim }]}>Начать заново</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.restartPill, { borderColor: colors.ember }]}
                      accessibilityRole="button"
                      accessibilityLabel="Выйти из тренировки"
                      onPress={() => {
                        presentEarlyLeave((outcome) => {
                          if (outcome === 'cancelled') return;
                          void refreshResumable();
                        });
                      }}
                    >
                      <Text style={[styles.restartPillText, { color: colors.ember }]}>Выйти</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.startPill, { backgroundColor: colors.lime }]}
                  accessibilityRole="button"
                  accessibilityLabel="Начать тренировку"
                  onPress={() => {
                    void ActiveSessionController.ensureDaySession(
                      activeDay.id,
                      effectiveExercises
                    )
                      .then((session) => {
                        if (!session) return;
                        void refreshResumable();
                        const first = effectiveExercises[0];
                        if (first) openExercise(first.id);
                      })
                      .catch(() => {});
                  }}
                >
                  <Text style={[styles.startPillText, { color: colors.ink }]}>▶  Начать тренировку</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={[styles.ticketPerf, { borderTopColor: colors.line }]}>
            <View style={[styles.perfCell, { borderRightColor: colors.line }]}>
              <Text style={[styles.perfVal, { color: colors.paper }]}>{weekDaysCompleted}/7</Text>
              <Text style={[styles.perfLbl, { color: colors.paperFaint }]}>Дней на неделе</Text>
            </View>
            <View style={[styles.perfCell, { borderRightColor: colors.line }]}>
              <Text style={[styles.perfVal, { color: colors.paper }]}>{burnedToday > 0 ? `~${burnedToday}` : '—'}</Text>
              <Text style={[styles.perfLbl, { color: colors.paperFaint }]}>Сожжено, ккал</Text>
            </View>
            <View style={[styles.perfCell, { borderRightWidth: 0 }]}>
              <Text style={[styles.perfVal, { color: colors.paper }]}>{overallPr !== null ? `${overallPr}` : '—'}</Text>
              <Text style={[styles.perfLbl, { color: colors.paperFaint }]}>Рекорд, кг</Text>
            </View>
          </View>
        </View>

        <View style={[styles.streakRow, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={{ fontSize: 20 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.streakText, { color: colors.paperDim }]}>
              {currentStreak > 0 ? (
                <>
                  <Text style={{ color: colors.ember, fontFamily: fonts.bodySemi }}>
                    {currentStreak} {ruDayWord(currentStreak)}
                  </Text>{' '}
                  подряд без пропуска
                </>
              ) : (
                'Пока нет серии — выполните любой день плана полностью, чтобы начать'
              )}
            </Text>
            <View style={styles.ticks}>
              {streakDays.map((status, i) => (
                <View
                  key={i}
                  style={[
                    styles.tick,
                    status === 'done'
                      ? { backgroundColor: colors.lime }
                      : status === 'today-in-progress'
                        ? { backgroundColor: colors.ember }
                        : { backgroundColor: colors.lineStrong }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {overrideIds && overrideIds.length > 0 && (
          <View style={[styles.overrideBanner, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.overrideText, { color: colors.paperDim }]}>
              План дня изменён · {overrideIds.length} упр.
            </Text>
            <TouchableOpacity
              onPress={() => {
                void clearDayOverride(trainingMode, activeDay.id).then(() => {
                  setOverrideTick((t) => t + 1);
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Сбросить замены упражнений"
            >
              <Text style={{ color: colors.ember, fontFamily: fonts.bodySemi, fontSize: 13 }}>Сбросить замены</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.paperFaint }]}>
          УПРАЖНЕНИЯ · {todayDoneCount}/{effectiveExercises.length}
        </Text>

        {effectiveExercises.map((ex, idx) => {
          const done = completedSetsToday(ex.id);
          const target = ex.totalSets;
          const isCurrent = currentStepExerciseId === ex.id;
          const complete = done >= target;
          return (
            <TouchableOpacity
              key={ex.id}
              style={[
                styles.exCard,
                { backgroundColor: colors.panel, borderColor: colors.line },
                isCurrent && { borderColor: colors.lime },
                complete && { opacity: 0.7 }
              ]}
              onPress={() => openExercise(ex.id)}
              onLongPress={() => {
                setReplaceTarget({ dayId: activeDay.id, exerciseId: ex.id, mode: trainingMode });
                navigation.navigate('Каталог');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${ex.name}, ${done} из ${target} подходов`}
              delayLongPress={400}
            >
              <View style={styles.exRow}>
                {EXERCISE_THUMBNAILS[ex.id] ? (
                  <Image source={EXERCISE_THUMBNAILS[ex.id]} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumbPlaceholder, { backgroundColor: colors.line }]}>
                    <Text style={{ color: colors.paperFaint, fontSize: 12 }}>{idx + 1}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exName, { color: colors.paper }]} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  <Text style={[styles.exMeta, { color: colors.paperDim }]}>
                    {formatLoadLabel(ex, safeWeightKg)} · {done}/{target} подходов
                  </Text>
                </View>
                <View style={styles.exRight}>
                  {complete ? (
                    <Text style={{ color: colors.lime, fontSize: 18 }}>✓</Text>
                  ) : isCurrent ? (
                    <Text style={{ color: colors.lime, fontSize: 12, fontFamily: fonts.bodySemi }}>сейчас</Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <WorkoutCoachCard dayId={activeDay.id} exercises={effectiveExercises} />
      </ScrollView>

      <ExerciseSheet
        ref={sheetRef}
        exercise={selectedExercise}
        dayId={activeDay.id}
        exercises={effectiveExercises}
        onClose={() => {
          setSelectedExerciseId(null);
          void refreshResumable();
        }}
        onSetLogged={() => {
          void ActiveSessionController.completeDayIfDone();
          void refreshResumable();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  eyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28
  },
  catalogButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  catalogButtonText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  modeTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  modeTabText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13
  },
  dayTabs: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8
  },
  dayTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: 8
  },
  dayTabText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13
  },
  body: {
    padding: spacing.md,
    paddingBottom: 120,
    gap: spacing.sm
  },
  ticket: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden'
  },
  ticketMain: {
    flexDirection: 'row',
    padding: spacing.md
  },
  ticketLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  ticketName: {
    fontFamily: fonts.display,
    fontSize: 20,
    marginBottom: 4
  },
  ticketMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12
  },
  resumeBlock: {
    gap: 8
  },
  resumeHint: {
    fontFamily: fonts.body,
    fontSize: 12
  },
  resumeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  startPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill
  },
  startPillText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14
  },
  restartPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1
  },
  restartPillText: { fontFamily: fonts.body, fontSize: 13 },
  ticketPerf: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth
  },
  perfCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth
  },
  perfVal: {
    fontFamily: fonts.display,
    fontSize: 18
  },
  perfLbl: {
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 2
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1
  },
  streakText: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 6
  },
  ticks: {
    flexDirection: 'row',
    gap: 4
  },
  tick: {
    width: 18,
    height: 6,
    borderRadius: 3
  },
  overrideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1
  },
  overrideText: {
    fontFamily: fonts.body,
    fontSize: 13
  },
  sectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: spacing.sm
  },
  exCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  exName: {
    fontFamily: fonts.bodySemi,
    fontSize: 15
  },
  exMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2
  },
  exRight: {
    minWidth: 40,
    alignItems: 'flex-end'
  }
});
