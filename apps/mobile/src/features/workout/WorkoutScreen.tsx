import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { estimateBurnFromSetLogs, toDateKey as coreToDateKey } from '@forma/core';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
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

const WEEKDAY_RU_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

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
    activeDay?.exercises.find((e) => e.id === selectedExerciseId) ?? null;
  const todayLabel = WEEKDAY_RU_FULL[new Date().getDay()];

  const todayDoneCount = activeDay
    ? activeDay.exercises.filter((ex) => completedSetsToday(ex.id) >= ex.totalSets).length
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
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.title}>Нет плана</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{todayLabel}, тренировочный день</Text>
        <Text style={styles.title}>Тренировка</Text>
      </View>

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
              style={[styles.modeTab, active && styles.modeTabActive]}
              onPress={() => switchMode(m.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={m.label}
            >
              <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.dayTabs} accessibilityRole="tablist">
        {plan.map((day) => {
          const active = day.id === activeDay.id;
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayTab, active && styles.dayTabActive]}
              onPress={() => selectDay(day.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                {day.name.split(' — ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.ticket}>
          <View style={styles.ticketMain}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.ticketLabel}>План дня · {trainingMode === 'gym' ? 'зал' : 'дом'}</Text>
              <Text style={styles.ticketName}>{activeDay.name}</Text>
              <Text style={styles.ticketMeta}>
                {activeDay.exercises.length} упражнения · {activeDay.meta}
                {burnedToday > 0 ? ` · ~${burnedToday} ккал` : ''}
              </Text>
              {resumable && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id ? (
                <View style={styles.resumeBlock}>
                  <Text style={styles.resumeHint}>
                    Есть незавершённая сессия · шаг {resumable.currentStepIndex + 1}/
                    {resumable.steps.length}
                  </Text>
                  <View style={styles.resumeActions}>
                    <TouchableOpacity
                      style={styles.startPill}
                      accessibilityRole="button"
                      accessibilityLabel="Продолжить тренировку"
                      onPress={() => {
                        void ActiveSessionController.ensureDaySession(
                          activeDay.id,
                          activeDay.exercises
                        ).then((session) => {
                          void refreshResumable();
                          const step = session.steps[session.currentStepIndex];
                          const exId = step
                            ? Number(step.snapshot.exerciseId)
                            : activeDay.exercises[0]?.id;
                          if (exId) openExercise(exId);
                        });
                      }}
                    >
                      <Text style={styles.startPillText}>▶  Продолжить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.restartPill}
                      accessibilityRole="button"
                      accessibilityLabel="Начать заново"
                      onPress={() => {
                        void ActiveSessionController.restartDaySession(
                          activeDay.id,
                          activeDay.exercises
                        ).then((session) => {
                          void refreshResumable();
                          const first = session.steps[0];
                          const exId = first
                            ? Number(first.snapshot.exerciseId)
                            : activeDay.exercises[0]?.id;
                          if (exId) openExercise(exId);
                        });
                      }}
                    >
                      <Text style={styles.restartPillText}>Начать заново</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.startPill}
                  accessibilityRole="button"
                  accessibilityLabel="Начать тренировку"
                  onPress={() => {
                    void ActiveSessionController.ensureDaySession(
                      activeDay.id,
                      activeDay.exercises
                    ).then(() => {
                      void refreshResumable();
                      const first = activeDay.exercises[0];
                      if (first) openExercise(first.id);
                    });
                  }}
                >
                  <Text style={styles.startPillText}>▶  Начать тренировку</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.ticketPerf}>
            <View style={styles.perfCell}>
              <Text style={styles.perfVal}>{weekDaysCompleted}/7</Text>
              <Text style={styles.perfLbl}>Дней на неделе</Text>
            </View>
            <View style={styles.perfCell}>
              <Text style={styles.perfVal}>{burnedToday > 0 ? `~${burnedToday}` : '—'}</Text>
              <Text style={styles.perfLbl}>Сожжено, ккал</Text>
            </View>
            <View style={[styles.perfCell, { borderRightWidth: 0 }]}>
              <Text style={styles.perfVal}>{overallPr !== null ? `${overallPr}` : '—'}</Text>
              <Text style={styles.perfLbl}>Рекорд, кг</Text>
            </View>
          </View>
        </View>

        <View style={styles.streakRow}>
          <Text style={{ fontSize: 20 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakText}>
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
                      ? styles.tickDone
                      : status === 'today-in-progress'
                        ? styles.tickToday
                        : styles.tickMissed
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <WorkoutCoachCard
          dayName={activeDay.name}
          anyDoneToday={anyDoneToday}
          exerciseNames={exerciseNames}
        />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Упражнения дня</Text>
          <Text style={styles.sectionCount}>
            {todayDoneCount}/{activeDay.exercises.length} готово
          </Text>
        </View>

        {activeDay.exercises.map((ex, i) => {
          const done = completedSetsToday(ex.id) >= ex.totalSets;
          const inProgress = !done && completedSetsToday(ex.id) > 0;
          const isCurrentStep = currentStepExerciseId === ex.id && !done;
          const exPr = personalRecords[ex.id] ?? null;
          return (
            <TouchableOpacity
              key={ex.id}
              style={[styles.logRow, isCurrentStep && styles.logRowCurrent]}
              accessibilityRole="button"
              accessibilityLabel={ex.name}
              onPress={() => openExercise(ex.id)}
            >
              <Text style={styles.logIndex}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.logName}>{ex.name}</Text>
                <Text style={styles.logSpec}>
                  {ex.totalSets}×{ex.workingReps} · {formatLoadLabel(ex, safeWeightKg)}
                  {inProgress ? ' · в работе' : done ? ' · готово' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.logPr}>{exPr !== null ? `${exPr}` : '—'}</Text>
                <Text style={styles.logPrLbl}>рекорд</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ExerciseSheet
        ref={sheetRef}
        exercise={selectedExercise}
        dayId={activeDay.id}
        dayExercises={activeDay.exercises}
        onFinished={() => void refreshResumable()}
        onGoToExpected={(id) => openExercise(id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  eyebrow: { color: colors.paperFaint, fontSize: 12, fontFamily: fonts.body },
  title: { color: colors.paper, fontSize: 28, fontFamily: fonts.mono, marginTop: 2 },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: 4
  },
  modeTab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panel
  },
  modeTabActive: { borderColor: colors.lime, backgroundColor: colors.limeDim },
  modeTabText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 13 },
  modeTabTextActive: { color: colors.lime },
  dayTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  dayTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel
  },
  dayTabActive: { borderColor: colors.cyan, backgroundColor: 'rgba(45,212,191,0.12)' },
  dayTabText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 12 },
  dayTabTextActive: { color: colors.cyan },
  body: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  ticket: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: colors.panel
  },
  ticketMain: { flexDirection: 'row', padding: 14 },
  ticketLabel: { color: colors.paperFaint, fontSize: 11, fontFamily: fonts.body },
  ticketName: { color: colors.paper, fontSize: 18, fontFamily: fonts.mono, marginTop: 2 },
  ticketMeta: { color: colors.paperDim, fontSize: 12, marginTop: 4, fontFamily: fonts.body },
  startPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: colors.lime
  },
  startPillText: { color: colors.ink, fontFamily: fonts.mono, fontSize: 13, fontWeight: '700' },
  resumeBlock: { marginTop: 10 },
  resumeHint: { color: colors.cyan, fontSize: 12, fontFamily: fonts.body, marginBottom: 8 },
  resumeActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  restartPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.ink
  },
  restartPillText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 13 },
  ticketPerf: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.line
  },
  perfCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: colors.line
  },
  perfVal: { color: colors.paper, fontSize: 16, fontFamily: fonts.mono },
  perfLbl: { color: colors.paperFaint, fontSize: 10, marginTop: 2 },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.md,
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel
  },
  streakText: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.body },
  ticks: { flexDirection: 'row', gap: 4, marginTop: 8 },
  tick: { width: 10, height: 10, borderRadius: 2 },
  tickDone: { backgroundColor: colors.lime },
  tickToday: { backgroundColor: colors.cyan },
  tickMissed: { backgroundColor: colors.lineStrong },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xl,
    marginBottom: spacing.sm
  },
  sectionTitle: { color: colors.paper, fontSize: 16, fontFamily: fonts.mono },
  sectionCount: { color: colors.paperFaint, fontSize: 12, fontFamily: fonts.body },
  logRowCurrent: { borderColor: colors.cyan },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel
  },
  logIndex: { color: colors.paperFaint, fontFamily: fonts.mono, width: 28 },
  logName: { color: colors.paper, fontFamily: fonts.mono, fontSize: 15 },
  logSpec: { color: colors.paperFaint, fontSize: 11, marginTop: 2, fontFamily: fonts.body },
  logPr: { color: colors.paper, fontSize: 16, fontFamily: fonts.mono },
  logPrLbl: { color: colors.paperFaint, fontSize: 9.5 }
});
