import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { estimateBurnFromSetLogs, toDateKey as coreToDateKey } from '@forma/core';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import ExerciseSheet, { ExerciseDef } from './ExerciseSheet';
import { WorkoutCoachCard } from './WorkoutCoachCard';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { DayProgress, lastNDays, ruDayWord, toDateKey } from '@/engines/WorkoutStats';
import type { WorkoutSession } from '@forma/workout-domain';
import {
  ActiveSessionController,
  dayIdFromTemplate
} from './session/ActiveSessionController';
import { mergeSessionProjection } from './data/sessionProjections';

interface WorkoutDay {
  id: string;
  name: string;
  meta: string;
  exercises: ExerciseDef[];
}

const WORKOUT_PLAN: WorkoutDay[] = [
  {
    id: 'push',
    name: 'Жим — грудь, плечи, трицепс',
    meta: '≈50 мин',
    exercises: [
      {
        id: 4,
        index: 1,
        name: 'Жим штанги лёжа',
        workingWeight: 60,
        workingReps: 6,
        totalSets: 4,
        restSeconds: 120,
        targetMuscles: ['chest', 'shoulders', 'triceps'],
        note: 'Базовый жим для верха тела — лопатки сведены и прижаты к скамье весь подход, гриф идёт к нижней трети груди, а не к шее.',
        wgerSearchTerm: 'Bench Press'
      },
      {
        id: 5,
        index: 2,
        name: 'Жим гантелей сидя',
        workingWeight: 18,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['shoulders', 'triceps'],
        note: 'Изоляция передней и средней дельты после тяжёлого жима — амплитуда полная, без раскачки корпусом.',
        wgerSearchTerm: 'Dumbbell Shoulder Press'
      },
      {
        id: 6,
        index: 3,
        name: 'Разгибания на трицепс на блоке',
        workingWeight: 25,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['triceps'],
        note: 'Завершающая изоляция — локти прижаты к корпусу весь подход, работает только предплечье.',
        wgerSearchTerm: 'Triceps Pushdown'
      }
    ]
  },
  {
    id: 'pull',
    name: 'Тяга — спина, задняя дельта, бицепс',
    meta: '≈50 мин',
    exercises: [
      {
        id: 7,
        index: 1,
        name: 'Тяга штанги в наклоне',
        workingWeight: 60,
        workingReps: 8,
        totalSets: 4,
        restSeconds: 120,
        targetMuscles: ['back', 'lowerback', 'biceps'],
        note: 'Корпус фиксирован под 45°, спина нейтральная весь подход — тянем локтями к тазу, не руками к груди.',
        wgerSearchTerm: 'Bent Over Row'
      },
      {
        id: 8,
        index: 2,
        name: 'Тяга верхнего блока',
        workingWeight: 50,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['back', 'biceps'],
        note: 'Широчайшие в приоритете — тянем локтями вниз-назад, не грудью вверх навстречу рукояти.',
        wgerSearchTerm: 'Lat Pulldown'
      },
      {
        id: 9,
        index: 3,
        name: 'Сгибания на бицепс со штангой',
        workingWeight: 30,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['biceps'],
        note: 'Локти неподвижны у корпуса — амплитуда за счёт предплечья, не за счёт раскачки плечом.',
        wgerSearchTerm: 'Barbell Curl'
      }
    ]
  },
  {
    id: 'legs',
    name: 'Ноги — сила',
    meta: '≈45 мин',
    exercises: [
      {
        id: 1,
        index: 1,
        name: 'Приседания со штангой',
        workingWeight: 80,
        workingReps: 8,
        totalSets: 4,
        restSeconds: 90,
        targetMuscles: ['quads', 'glutes', 'core'],
        note: 'Почему RIR 1–3: высокопороговые волокна рекрутируются только у отказа (принцип Хеннемана) — так работает механическое напряжение на гипертрофию.',
        wgerSearchTerm: 'Barbell Squat'
      },
      {
        id: 2,
        index: 2,
        name: 'Становая тяга',
        workingWeight: 100,
        workingReps: 5,
        totalSets: 3,
        restSeconds: 120,
        targetMuscles: ['hamstrings', 'glutes', 'back', 'core'],
        note: 'Тяжёлый базовый подход низкой повторности — держите нейтральную спину и не гонитесь за амплитудой в ущерб технике на последних повторах.',
        wgerSearchTerm: 'Deadlift'
      },
      {
        id: 3,
        index: 3,
        name: 'Выпады с гантелями',
        workingWeight: 14,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes', 'hamstrings'],
        note: 'Завершающее упражнение на объём: короткий отдых держит метаболический стресс высоким, вес — умеренный, фокус на контролируемом негативе.',
        wgerSearchTerm: 'Dumbbell Lunge'
      }
    ]
  }
];

const EXERCISE_NAMES: Record<number, string> = Object.fromEntries(
  WORKOUT_PLAN.flatMap((day) => day.exercises.map((ex) => [ex.id, ex.name]))
);

const WEEKDAY_RU_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function isDayPlanComplete(dayProgress: DayProgress, dateKey: string, exercises: { id: number; totalSets: number }[]): boolean {
  const progress = dayProgress[dateKey];
  if (!progress) return false;
  return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
}

function isAnyPlanComplete(dayProgress: DayProgress, dateKey: string): boolean {
  return WORKOUT_PLAN.some((day) => isDayPlanComplete(dayProgress, dateKey, day.exercises));
}

function selectPlanWeekDaysCompleted(dayProgress: DayProgress, days = 7, now: Date = new Date()): number {
  return lastNDays(days, now).filter((d) => isAnyPlanComplete(dayProgress, toDateKey(d))).length;
}

function selectPlanCurrentStreak(dayProgress: DayProgress, now: Date = new Date()): number {
  const cursor = new Date(now);
  if (!isAnyPlanComplete(dayProgress, toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (isAnyPlanComplete(dayProgress, toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type DayStatus = 'done' | 'today-in-progress' | 'missed';

function selectPlanStreakDays(dayProgress: DayProgress, days = 7, now: Date = new Date()): DayStatus[] {
  const window = lastNDays(days, now);
  const todayKey = toDateKey(now);
  return window.map((d) => {
    const key = toDateKey(d);
    if (isAnyPlanComplete(dayProgress, key)) return 'done';
    return key === todayKey ? 'today-in-progress' : 'missed';
  });
}

export default function WorkoutScreen() {
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [selectedDayId, setSelectedDayId] = useState('legs');
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const [resumable, setResumable] = useState<WorkoutSession | null>(null);

  const planDayIds = useMemo(() => new Set(WORKOUT_PLAN.map((d) => d.id)), []);

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
    if (projection) {
      const current = useFitPulseStore.getState();
      const merged = mergeSessionProjection(
        { setLogs: current.setLogs, dayProgress: current.dayProgress },
        projection
      );
      current.hydrate({ setLogs: merged.setLogs, dayProgress: merged.dayProgress });
    }
    setResumable(session);
  }, [planDayIds]);

  useEffect(() => {
    void refreshResumable();
  }, [refreshResumable]);

  const dayProgress = useFitPulseStore((s) => s.dayProgress);
  const completedSetsToday = useFitPulseStore((s) => s.completedSetsToday);
  const personalRecords = useFitPulseStore((s) => s.personalRecords);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profileWeight = useFitPulseStore((s) => s.profile.weight);

  const activeDay = WORKOUT_PLAN.find((d) => d.id === selectedDayId) ?? WORKOUT_PLAN[0];
  const selectedExercise = activeDay.exercises.find((e) => e.id === selectedExerciseId) ?? null;
  const todayLabel = WEEKDAY_RU_FULL[new Date().getDay()];

  const todayDoneCount = activeDay.exercises.filter((ex) => completedSetsToday(ex.id) >= ex.totalSets).length;
  const anyDoneToday = useMemo(
    () => isAnyPlanComplete(dayProgress, toDateKey(new Date())),
    [dayProgress]
  );
  const weekDaysCompleted = useMemo(() => selectPlanWeekDaysCompleted(dayProgress), [dayProgress]);
  const overallPr = useMemo(() => {
    const values = Object.values(personalRecords);
    return values.length ? Math.max(...values) : null;
  }, [personalRecords]);
  const currentStreak = useMemo(() => selectPlanCurrentStreak(dayProgress), [dayProgress]);
  const streakDays = useMemo(() => selectPlanStreakDays(dayProgress), [dayProgress]);
  const burnedToday = useMemo(
    () =>
      estimateBurnFromSetLogs({
        weightKg: profileWeight,
        setLogs,
        dateKey: coreToDateKey(new Date()),
        exerciseNames: EXERCISE_NAMES
      }),
    [profileWeight, setLogs]
  );

  const currentStepExerciseId =
    resumable && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{todayLabel}, тренировочный день</Text>
        <Text style={styles.title}>Тренировка</Text>
      </View>

      <View style={styles.dayTabs} accessibilityRole="tablist">
        {WORKOUT_PLAN.map((day) => {
          const active = day.id === activeDay.id;
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayTab, active && styles.dayTabActive]}
              onPress={() => selectDay(day.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>{day.name.split(' — ')[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.ticket}>
          <View style={styles.ticketMain}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.ticketLabel}>План дня</Text>
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
                          const exId = step ? Number(step.snapshot.exerciseId) : activeDay.exercises[0]?.id;
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
          exerciseNames={EXERCISE_NAMES}
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
                  {ex.totalSets}×{ex.workingReps} · {ex.workingWeight} кг · отдых {ex.restSeconds}с
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    styles.logPr,
                    done && { color: colors.lime },
                    isCurrentStep && { color: colors.cyan }
                  ]}
                >
                  {exPr !== null ? exPr : '—'}
                </Text>
                <Text style={[styles.logPrLbl, isCurrentStep && { color: colors.cyan }]}>
                  {done
                    ? 'готово ✓'
                    : isCurrentStep
                      ? 'сейчас'
                      : inProgress
                        ? 'в процессе'
                        : exPr !== null
                          ? 'рекорд, кг'
                          : 'пока нет данных'}
                </Text>
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
        onGoToExpected={(id) => openExercise(id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  eyebrow: { color: colors.paperFaint, fontSize: 11, fontFamily: fonts.body },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono },
  dayTabs: { flexDirection: 'row', marginHorizontal: spacing.xxl, marginTop: spacing.md, gap: 8 },
  dayTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    backgroundColor: colors.panel
  },
  dayTabActive: { borderColor: colors.lime, backgroundColor: colors.limeDim },
  dayTabText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 12 },
  dayTabTextActive: { color: colors.lime },
  body: { padding: spacing.xxl, paddingBottom: 40 },
  ticket: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: colors.panel
  },
  ticketMain: { padding: 16 },
  ticketLabel: { color: colors.paperFaint, fontSize: 11, fontFamily: fonts.body },
  ticketName: { color: colors.paper, fontSize: 18, fontFamily: fonts.mono, marginTop: 4 },
  ticketMeta: { color: colors.paperDim, fontSize: 12, marginTop: 6, fontFamily: fonts.body },
  resumeBlock: { marginTop: 12 },
  resumeHint: { color: colors.cyan, fontSize: 12, fontFamily: fonts.body, marginBottom: 8 },
  resumeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  startPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.control,
    backgroundColor: colors.lime
  },
  startPillText: { color: colors.ink, fontFamily: fonts.mono, fontSize: 13 },
  restartPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.ink
  },
  restartPillText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 13 },
  ticketPerf: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line },
  perfCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: colors.line
  },
  perfVal: { color: colors.paper, fontSize: 18, fontFamily: fonts.mono },
  perfLbl: { color: colors.paperFaint, fontSize: 10, marginTop: 2 },
  streakRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
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
