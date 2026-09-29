import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { estimateBurnFromSetLogs, toDateKey as coreToDateKey } from '@forma/core';
import { fonts } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import ExerciseSheet from './ExerciseSheet';
import { WorkoutCoachCard } from './WorkoutCoachCard';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { useTrainingModeStore } from '@/state/useTrainingModeStore';
import { ruDayWord, toDateKey } from '@/engines/WorkoutStats';
import type { WorkoutSession } from '@forma/workout-domain';
import { ActiveSessionController, dayIdFromTemplate } from './session/ActiveSessionController';
import { applySessionProjection } from './data/applySessionProjection';
import { catalogFor, formatLoadLabel, type TrainingMode } from './catalog';
import { clearDayOverride, loadDayOverrideIds, resolveDayExercises } from './dayPlanOverrides';
import { setReplaceTarget } from './replaceTarget';
import type { TabParamList } from '@/navigation/types';
import { EXERCISE_THUMBNAILS } from './exerciseMedia';
import { presentEarlyLeave } from './session/earlyLeave';
import { workoutScreenStyles as styles } from './workoutScreenStyles';
import {
  WEEKDAY_RU_FULL,
  SHOW_GYM_MODE_TOGGLE,
  isAnyPlanComplete,
  selectPlanWeekDaysCompleted,
  selectPlanCurrentStreak,
  selectPlanStreakDays
} from './workoutScreenHelpers';

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
  const activeDay = plan.find((d) => d.id === (selectedDayId ?? plan[0]?.id)) ?? plan[0];

  const [overrideIds, setOverrideIds] = useState<number[] | null>(null);
  const [overrideTick, setOverrideTick] = useState(0);

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
    if (selectedExerciseId != null && !effectiveExercises.some((ex) => ex.id === selectedExerciseId)) {
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

  const selectedExercise = effectiveExercises.find((e) => e.id === selectedExerciseId) ?? null;
  const todayLabel = WEEKDAY_RU_FULL[new Date().getDay()];
  const todayDoneCount = effectiveExercises.length
    ? effectiveExercises.filter((ex) => completedSetsToday(ex.id) >= ex.totalSets).length
    : 0;
  const anyDoneToday = useMemo(
    () => isAnyPlanComplete(plan, dayProgress, toDateKey(new Date())),
    [plan, dayProgress]
  );
  const weekDaysCompleted = useMemo(() => selectPlanWeekDaysCompleted(plan, dayProgress), [plan, dayProgress]);
  const overallPr = useMemo(() => {
    const values = Object.values(personalRecords);
    return values.length ? Math.max(...values) : null;
  }, [personalRecords]);
  const currentStreak = useMemo(() => selectPlanCurrentStreak(plan, dayProgress), [plan, dayProgress]);
  const streakDays = useMemo(() => selectPlanStreakDays(plan, dayProgress), [plan, dayProgress]);
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

  const sessionDoneSets = resumable
    ? resumable.steps.reduce((n, s) => n + s.completedSets.length, 0)
    : 0;
  const sessionTargetSets = resumable
    ? resumable.steps.reduce((n, s) => n + s.snapshot.targetSets, 0)
    : 0;
  const sessionPct =
    sessionTargetSets > 0 ? Math.min(100, Math.round((sessionDoneSets / sessionTargetSets) * 100)) : 0;

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
          {([{ id: 'gym' as const, label: 'Зал' }, { id: 'home' as const, label: 'Дом' }] as const).map((m) => {
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs} accessibilityRole="tablist">
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
                    Есть незавершённая сессия · шаг {resumable.currentStepIndex + 1}/{resumable.steps.length}
                  </Text>
                  <View
                    style={styles.sessionProgress}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: sessionPct }}
                    accessibilityLabel={`Прогресс сессии ${sessionDoneSets} из ${sessionTargetSets} подходов`}
                  >
                    <View style={[styles.sessionProgressTrack, { backgroundColor: colors.line }]}>
                      <View style={[styles.sessionProgressFill, { backgroundColor: colors.lime, width: `${sessionPct}%` }]} />
                    </View>
                    <Text style={[styles.sessionProgressLbl, { color: colors.paperFaint }]}>
                      {sessionDoneSets}/{sessionTargetSets} подходов · {sessionPct}%
                    </Text>
                  </View>
                  <View style={styles.resumeActions}>
                    <TouchableOpacity
                      style={[styles.startPill, { backgroundColor: colors.lime }]}
                      accessibilityRole="button"
                      accessibilityLabel="Продолжить тренировку"
                      onPress={() => {
                        void ActiveSessionController.ensureDaySession(activeDay.id, effectiveExercises)
                          .then((session) => {
                            if (!session) return;
                            void refreshResumable();
                            const step = session.steps[session.currentStepIndex];
                            const exId = step ? Number(step.snapshot.exerciseId) : effectiveExercises[0]?.id;
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
                        void ActiveSessionController.restartDaySession(activeDay.id, effectiveExercises)
                          .then((session) => {
                            if (!session) return;
                            void refreshResumable();
                            const first = session.steps[0];
                            const exId = first ? Number(first.snapshot.exerciseId) : effectiveExercises[0]?.id;
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
                    void ActiveSessionController.ensureDaySession(activeDay.id, effectiveExercises)
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
                        : { backgroundColor: colors.line }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <WorkoutCoachCard dayName={activeDay.name} anyDoneToday={anyDoneToday} exerciseNames={exerciseNames} />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>УПРАЖНЕНИЯ</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>
            {todayDoneCount}/{effectiveExercises.length}
          </Text>
        </View>

        {overrideIds != null && (
          <TouchableOpacity
            style={[styles.resetOverride, { borderColor: colors.lineStrong }]}
            onPress={() => {
              void clearDayOverride(trainingMode, activeDay.id).then(() => setOverrideTick((t) => t + 1));
            }}
            accessibilityRole="button"
            accessibilityLabel="Сбросить замены упражнений"
          >
            <Text style={[styles.resetOverrideText, { color: colors.paperDim }]}>Сбросить замены</Text>
          </TouchableOpacity>
        )}

        {effectiveExercises.map((ex, i) => {
          const done = completedSetsToday(ex.id) >= ex.totalSets;
          const inProgress = !done && completedSetsToday(ex.id) > 0;
          const isCurrentStep = currentStepExerciseId === ex.id && !done;
          const setsDone = completedSetsToday(ex.id);
          const exPr = personalRecords[ex.id] ?? null;
          const thumb = ex.mediaKey ? EXERCISE_THUMBNAILS[ex.mediaKey] : undefined;
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
              accessibilityLabel={`${ex.name}, ${setsDone} из ${ex.totalSets} подходов`}
              onPress={() => openExercise(ex.id)}
              onLongPress={() => {
                setReplaceTarget({
                  mode: trainingMode,
                  dayId: activeDay.id,
                  dayName: activeDay.name,
                  slotIndex: i,
                  currentExerciseId: ex.id,
                  currentName: ex.name
                });
                navigation.navigate('Каталог');
              }}
            >
              {thumb != null ? (
                <Image source={thumb} style={{ width: 44, height: 44, borderRadius: 8 }} />
              ) : (
                <Text style={[styles.logIndex, { color: colors.paperFaint }]}>{String(i + 1).padStart(2, '0')}</Text>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.logNameRow}>
                  <Text style={[styles.logName, { color: colors.paper }]} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  {isCurrentStep && (
                    <View style={[styles.nowBadge, { backgroundColor: colors.lime }]}>
                      <Text style={[styles.nowBadgeText, { color: colors.ink }]}>сейчас</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.logSpec, { color: colors.paperDim }]}>
                  {setsDone}/{ex.totalSets} · {formatLoadLabel(ex, safeWeightKg)} × {ex.workingReps}
                </Text>
              </View>
              {exPr != null && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.logPr, { color: colors.lime }]}>{exPr}</Text>
                  <Text style={[styles.logPrLbl, { color: colors.paperFaint }]}>кг PR</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ExerciseSheet
        ref={sheetRef}
        exercise={selectedExercise}
        dayId={activeDay.id}
        dayExercises={effectiveExercises}
        onFinished={() => {
          void refreshResumable();
        }}
        onGoToExpected={(id) => openExercise(id)}
      />
    </SafeAreaView>
  );
}
