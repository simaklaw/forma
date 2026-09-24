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
        <Text style={styles.eyebrow}>FORMA · {todayLabel}</Text>
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
      </ScrollView>

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
                        )
                          .then((session) => {
                            if (!session) return;
                            void refreshResumable();
                            const step = session.steps[session.currentStepIndex];
                            const exId = step
                              ? Number(step.snapshot.exerciseId)
                              : activeDay.exercises[0]?.id;
                            if (exId) openExercise(exId);
                          })
                          .catch(() => {});
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
                        )
                          .then((session) => {
                            if (!session) return;
                            void refreshResumable();
                            const first = session.steps[0];
                            const exId = first
                              ? Number(first.snapshot.exerciseId)
                              : activeDay.exercises[0]?.id;
                            if (exId) openExercise(exId);
                          })
                          .catch(() => {});
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
                    )
                      .then((session) => {
                        if (!session) return;
                        void refreshResumable();
                        const first = activeDay.exercises[0];
                        if (first) openExercise(first.id);
                      })
                      .catch(() => {});
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

        {resumable && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id ? (
          <View style={styles.sessionBar} accessibilityRole="progressbar">
            <Text style={styles.sessionBarLabel}>
              Сессия · шаг {resumable.currentStepIndex + 1}/{resumable.steps.length}
            </Text>
            <View style={styles.sessionTrack}>
              <View
                style={[
                  styles.sessionFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((resumable.currentStepIndex +
                          (resumable.status === 'completed' ? 1 : 0)) /
                          Math.max(1, resumable.steps.length)) *
                          100
                      )
                    )}%`
                  }
                ]}
              />
            </View>
          </View>
        ) : null}

        {activeDay.exercises.map((ex, i) => {
          const done = completedSetsToday(ex.id) >= ex.totalSets;
          const inProgress = !done && completedSetsToday(ex.id) > 0;
          const isCurrentStep = currentStepExerciseId === ex.id && !done;
          const setsDone = completedSetsToday(ex.id);
          const exPr = personalRecords[ex.id] ?? null;
          return (
            <TouchableOpacity
              key={ex.id}
              style={[
                styles.logRow,
                done && styles.logRowDone,
                isCurrentStep && styles.logRowCurrent
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isCurrentStep ? `${ex.name}, текущий шаг` : ex.name
              }
              onPress={() => openExercise(ex.id)}
            >
              <Text style={[styles.logIndex, isCurrentStep && styles.logIndexCurrent]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={{ flex: 1 }}>
                <View style={styles.logNameRow}>
                  <Text
                    style={[styles.logName, isCurrentStep && styles.logNameCurrent]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                  {isCurrentStep ? (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>сейчас</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.logSpec}>
                  {setsDone}/{ex.totalSets} подх. · {formatLoadLabel(ex, safeWeightKg)}
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  eyebrow: { color: colors.lime, fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono, marginTop: 2 },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    alignItems: 'center'
  },
  modeTabActive: { borderColor: colors.lime, backgroundColor: colors.limeDim },
  modeTabText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 13 },
  modeTabTextActive: { color: colors.lime },
  dayTabs: {
    flexDirection: 'row',
    alignItems: 'center',
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
  resumeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  restartPill: {
    marginTop: 0,
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
    borderColor: colors.line,
    backgroundColor: colors.ink
  },
  perfCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: colors.line,
    alignItems: 'center'
  },
  perfVal: { color: colors.paper, fontFamily: fonts.mono, fontSize: 16 },
  perfLbl: { color: colors.paperFaint, fontSize: 10, marginTop: 2, fontFamily: fonts.body },
  streakRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel
  },
  streakText: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.body, lineHeight: 18 },
  ticks: { flexDirection: 'row', gap: 4, marginTop: 8 },
  tick: { flex: 1, height: 4, borderRadius: 2 },
  tickDone: { backgroundColor: colors.lime },
  tickToday: { backgroundColor: colors.cyan },
  tickMissed: { backgroundColor: colors.lineStrong },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: 10
  },
  sectionTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
  sectionCount: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 13 },
  sessionBar: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel
  },
  sessionBarLabel: { color: colors.cyan, fontFamily: fonts.mono, fontSize: 12, marginBottom: 6 },
  sessionTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    overflow: 'hidden'
  },
  sessionFill: { height: '100%', backgroundColor: colors.cyan },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel
  },
  logRowDone: { opacity: 0.7 },
  logRowCurrent: {
    borderColor: colors.lime,
    backgroundColor: colors.limeDim
  },
  logIndex: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 14, width: 28 },
  logIndexCurrent: { color: colors.lime },
  logNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logName: { flexShrink: 1, color: colors.paper, fontSize: 15, fontFamily: fonts.bodySemi },
  logNameCurrent: { color: colors.lime },
  nowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.lime
  },
  nowBadgeText: {
    color: colors.ink,
    fontSize: 10,
    fontFamily: fonts.bodySemi,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  logSpec: { color: colors.paperFaint, fontSize: 12, marginTop: 2, fontFamily: fonts.body },
  logPr: { color: colors.paper, fontFamily: fonts.mono, fontSize: 14 },
  logPrLbl: { color: colors.paperFaint, fontSize: 10, fontFamily: fonts.body }
});
