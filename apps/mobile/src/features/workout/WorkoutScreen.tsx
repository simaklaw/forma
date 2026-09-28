import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { estimateBurnFromSetLogs, toDateKey as coreToDateKey } from '@forma/core';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import ExerciseSheet, { ExerciseDef } from './ExerciseSheet';
import { WorkoutCoachCard } from './WorkoutCoachCard';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { useTrainingModeStore } from '@/state/useTrainingModeStore';
import { EXERCISE_THUMBNAILS } from './exerciseMedia';
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
import type { TabParamList } from '@/navigation/types';

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
                {activeDay.exercises.length} упражнения · {activeDay.meta}
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
                      <Text style={[styles.startPillText, { color: colors.ink }]}>▶  Продолжить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.restartPill, { borderColor: colors.lineStrong }]}
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
                      <Text style={[styles.restartPillText, { color: colors.paperDim }]}>Начать заново</Text>
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
                        ? { backgroundColor: colors.mint }
                        : { backgroundColor: colors.lineStrong }
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
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>Упражнения дня</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>
            {todayDoneCount}/{activeDay.exercises.length} готово
          </Text>
        </View>

        {resumable && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id ? (
          <View style={styles.sessionBar} accessibilityRole="progressbar">
            <Text style={[styles.sessionBarLabel, { color: colors.paperDim }]}>
              Сессия · шаг {resumable.currentStepIndex + 1}/{resumable.steps.length}
            </Text>
            <View style={[styles.sessionTrack, { backgroundColor: colors.line }]}>
              <View
                style={[
                  styles.sessionFill,
                  {
                    backgroundColor: colors.lime,
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
                { backgroundColor: colors.panel, borderColor: colors.line },
                done && { borderColor: colors.lime },
                isCurrentStep && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isCurrentStep ? `${ex.name}, текущий шаг` : ex.name
              }
              onPress={() => openExercise(ex.id)}
            >
              <Text style={[styles.logIndex, { color: colors.paperFaint }, isCurrentStep && { color: colors.lime }]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              {ex.mediaKey ? (
                <Image
                  source={EXERCISE_THUMBNAILS[ex.mediaKey]}
                  style={styles.logThumb}
                  resizeMode="cover"
                  accessibilityLabel={`Иллюстрация: ${ex.name}`}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <View style={styles.logNameRow}>
                  <Text
                    style={[styles.logName, { color: colors.paper }, isCurrentStep && { color: colors.lime }]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                  {isCurrentStep ? (
                    <View style={[styles.nowBadge, { backgroundColor: colors.limeDim }]}>
                      <Text style={[styles.nowBadgeText, { color: colors.lime }]}>сейчас</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.logSpec, { color: colors.paperFaint }]}>
                  {setsDone}/{ex.totalSets} подх. · {formatLoadLabel(ex, safeWeightKg)}
                  {inProgress ? ' · в работе' : done ? ' · готово' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.logPr, { color: colors.paper }]}>{exPr !== null ? `${exPr}` : '—'}</Text>
                <Text style={[styles.logPrLbl, { color: colors.paperFaint }]}>рекорд</Text>
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
        onClose={() => setSelectedExerciseId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  eyebrow: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontFamily: fonts.mono },
  catalogButton: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  catalogButtonText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  modeTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  modeTab: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center' },
  modeTabText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  dayTabs: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.sm },
  dayTab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, minWidth: 72, alignItems: 'center' },
  dayTabText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  ticket: { borderRadius: radius.card, borderWidth: 1, marginTop: spacing.sm, overflow: 'hidden' },
  ticketMain: { flexDirection: 'row', padding: spacing.lg },
  ticketLabel: { fontSize: 11, fontFamily: fonts.bodySemi, marginBottom: 4 },
  ticketName: { fontSize: 18, fontFamily: fonts.bodySemi, marginBottom: 4 },
  ticketMeta: { fontSize: 13, fontFamily: fonts.body, marginBottom: 12 },
  resumeBlock: { gap: 8 },
  resumeHint: { fontSize: 12, fontFamily: fonts.bodySemi },
  resumeActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  startPill: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.pill, alignSelf: 'flex-start' },
  startPillText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  restartPill: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, alignSelf: 'flex-start' },
  restartPillText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  ticketPerf: { flexDirection: 'row', borderTopWidth: 1 },
  perfCell: { flex: 1, padding: 12, alignItems: 'center', borderRightWidth: 1 },
  perfVal: { fontSize: 18, fontFamily: fonts.mono },
  perfLbl: { fontSize: 10, marginTop: 2 },
  streakRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: spacing.lg, borderRadius: radius.card, borderWidth: 1, marginTop: spacing.md },
  streakText: { fontSize: 13, fontFamily: fonts.body, lineHeight: 18 },
  ticks: { flexDirection: 'row', gap: 4, marginTop: 8 },
  tick: { flex: 1, height: 4, borderRadius: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontFamily: fonts.bodySemi },
  sectionCount: { fontFamily: fonts.mono, fontSize: 13 },
  sessionBar: { marginBottom: spacing.sm },
  sessionBarLabel: { fontSize: 12, fontFamily: fonts.bodySemi, marginBottom: 6 },
  sessionTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  sessionFill: { height: '100%', borderRadius: 2 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, marginBottom: spacing.sm },
  logIndex: { fontFamily: fonts.mono, fontSize: 14, width: 28 },
  logThumb: { width: 52, height: 52, borderRadius: 10 },
  logNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logName: { fontSize: 15, fontFamily: fonts.bodySemi, flexShrink: 1 },
  nowBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  nowBadgeText: { fontSize: 10, fontFamily: fonts.bodySemi },
  logSpec: { fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
  logPr: { fontFamily: fonts.mono, fontSize: 14 },
  logPrLbl: { fontSize: 10, marginTop: 2 }
});
