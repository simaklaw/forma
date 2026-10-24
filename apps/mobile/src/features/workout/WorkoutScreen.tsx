import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { estimateBurnFromSetLogs, resolveSetMeasure, toDateKey as coreToDateKey } from '@forma/core';
import { fonts } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { levelLabel, programTemplateTitle, streakDayWord, useT } from '@/i18n/strings';
import ExerciseSheet from './ExerciseSheet';
import WorkoutPreviewSheet from './WorkoutPreviewSheet';
import CompletionFeedbackSheet from './CompletionFeedbackSheet';
import { summarizeWorkoutResult, type WorkoutResult } from './workoutResult';
import { WorkoutCoachCard } from './WorkoutCoachCard';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { useSessionFeedbackStore } from '@/state/useSessionFeedbackStore';
import { useTrainingModeStore } from '@/state/useTrainingModeStore';
import { useProgramStore } from '@/state/useProgramStore';
import { lastNDays, toDateKey } from '@/engines/WorkoutStats';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import type { WorkoutSession } from '@forma/workout-domain';
import { ActiveSessionController, dayIdFromTemplate } from './session/ActiveSessionController';
import { applySessionProjection } from './data/applySessionProjection';
import { catalogFor, formatLoadLabel, allExerciseMetKeys, allExerciseBurnMeta, type TrainingMode } from './catalog';
import {
  PROGRAM_LENGTHS,
  applyProgramTargets,
  programTodayDayId,
  programView as buildProgramView,
  type ProgramLengthWeeks
} from './program/programEngine';
import { readyProgramDays } from './program/readyPrograms';
import { clearDayOverride, loadDayOverrideIds, resolveDayExercises } from './dayPlanOverrides';
import { applyLoadProgression, loadLoadProgression, type LoadProgressionMap } from './loadProgression';
import { setReplaceTarget } from './replaceTarget';
import { formatPlanAmount } from './exerciseMeasures';
import type { TabParamList } from '@/navigation/types';
import { EXERCISE_THUMBNAILS } from './exerciseMedia';
import { useExerciseListThumbs } from './useExerciseListThumbs';
import { realThumbForMediaKey } from './exerciseRealMedia';
import { presentEarlyLeave } from './session/earlyLeave';
import { BusyGuard } from './sessionActionGuard';
import { workoutScreenStyles as styles } from './workoutScreenStyles';
import {
  WEEKDAY_RU_FULL,
  SHOW_GYM_MODE_TOGGLE,
  dayChipLabel,
  exerciseInitials,
  isAnyPlanComplete,
  selectPlanWeekDaysCompleted,
  selectPlanCurrentStreak,
  selectPlanStreakDays
} from './workoutScreenHelpers';

export default function WorkoutScreen() {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const previewSheetRef = useRef<GorhomBottomSheet>(null);
  const feedbackSheetRef = useRef<GorhomBottomSheet>(null);
  const [feedbackContext, setFeedbackContext] = useState<{
    sessionId: string;
    dayId: string;
    result: WorkoutResult;
  } | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [userPickedDay, setUserPickedDay] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [resumable, setResumable] = useState<WorkoutSession | null>(null);
  const [sessionActionBusy, setSessionActionBusy] = useState(false);
  // issue #167: state-флаг в замыкании onPress видит устаревшее значение между тапами,
  // поэтому захват выполняет синхронный guard в ref, а state отражает занятость для UI.
  const sessionGuard = useRef(new BusyGuard());
  const [selectedProgramLength, setSelectedProgramLength] = useState<ProgramLengthWeeks>(4);
  const [streakDetail, setStreakDetail] = useState<string | null>(null);

  const trainingMode = useTrainingModeStore((s) => s.trainingMode);
  const setTrainingMode = useTrainingModeStore((s) => s.setTrainingMode);
  const dayProgress = useFitPulseStore((s) => s.dayProgress);
  const completedSetsToday = useFitPulseStore((s) => s.completedSetsToday);
  const personalRecords = useFitPulseStore((s) => s.personalRecords);
  const profileFocusAreas = useFitPulseStore((s) => s.profile.focusAreas) ?? [];
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profileWeight = useFitPulseStore((s) => s.profile.weight);
  const profileSex = useFitPulseStore((s) => s.profile.sex);
  const profileGoal = useFitPulseStore((s) => s.profile.goal);
  const program = useProgramStore((s) => s.program);
  const startProgram = useProgramStore((s) => s.startProgram);
  const skipDay = useProgramStore((s) => s.skipDay);
  const resetProgram = useProgramStore((s) => s.resetProgram);

  const templatePlan = useMemo(
    () =>
      program?.templateId
        ? readyProgramDays(program.templateId, program.templateLevel ?? 'intermediate')
        : null,
    [program?.templateId, program?.templateLevel]
  );
  const plan = useMemo(
    () => templatePlan ?? catalogFor(trainingMode, profileSex),
    [templatePlan, trainingMode, profileSex]
  );
  const programInfo = useMemo(
    () => (program ? buildProgramView(plan, program, dayProgress) : null),
    [program, plan, dayProgress]
  );
  const todayDayId = programTodayDayId(plan, program);
  const planDayIds = useMemo(() => new Set(plan.map((d) => d.id)), [plan]);
  const activeDay = plan.find((d) => d.id === (selectedDayId ?? plan[0]?.id)) ?? plan[0];

  const [overrideIds, setOverrideIds] = useState<number[] | null>(null);
  const [overrideTick, setOverrideTick] = useState(0);
  const [loadProgression, setLoadProgression] = useState<LoadProgressionMap>({});

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

  // Автопрогрессия веса: карта рекомендаций обновляется после завершённой сессии,
  // перечитываем её при каждом возврате на экран тренировки.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadLoadProgression().then((map) => {
        if (!cancelled) setLoadProgression(map);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const effectiveExercises = useMemo(() => {
    if (!activeDay) return [];
    const resolved = resolveDayExercises(trainingMode, activeDay.exercises, overrideIds);
    const targeted = programInfo ? applyProgramTargets(resolved, programInfo.progression) : resolved;
    return applyLoadProgression(targeted, loadProgression);
  }, [activeDay, trainingMode, overrideIds, programInfo, loadProgression]);

  // issue #173: реальные превью для упражнений без бандл-медиа (gym-план) —
  // общий кэш AsyncStorage с useExerciseReference, оффлайн — заглушка с инициалами.
  const thumbUris = useExerciseListThumbs(effectiveExercises);

  useEffect(() => {
    if (selectedExerciseId != null && !effectiveExercises.some((ex) => ex.id === selectedExerciseId)) {
      setSelectedExerciseId(null);
    }
  }, [effectiveExercises, selectedExerciseId]);

  useFocusEffect(
    useCallback(() => {
      if (plan.length === 0) return;
      if (!userPickedDay || !plan.some((d) => d.id === selectedDayId)) {
        setSelectedDayId(todayDayId);
        if (!userPickedDay) setSelectedExerciseId(null);
      }
    }, [plan, userPickedDay, selectedDayId, todayDayId])
  );

  useEffect(() => {
    if (selectedDayId && !plan.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(todayDayId || plan[0]?.id || null);
      setSelectedExerciseId(null);
      setUserPickedDay(false);
    }
  }, [plan, selectedDayId]);

  const exerciseMetKeys = useMemo(() => allExerciseMetKeys(), []);
  const exerciseBurnMeta = useMemo(() => allExerciseBurnMeta(), []);
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
        exerciseNames: exerciseMetKeys,
        exerciseMeta: exerciseBurnMeta
      }),
    [safeWeightKg, setLogs, exerciseMetKeys, exerciseBurnMeta]
  );
  const currentStepExerciseId =
    resumable && activeDay && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id
      ? Number((resumable.steps ?? [])[resumable.currentStepIndex]?.snapshot.exerciseId)
      : null;

  function openExercise(id: number) {
    setSelectedExerciseId(id);
    sheetRef.current?.expand();
  }
  function selectDay(id: string) {
    RestTimerEngine.hapticTabSwitch();
    setUserPickedDay(true);
    setSelectedDayId(id);
    setSelectedExerciseId(null);
  }
  function switchMode(mode: TrainingMode) {
    if (mode === trainingMode) return;
    setTrainingMode(mode);
    setSelectedExerciseId(null);
  }

  function confirmSkipDay() {
    Alert.alert(
      t('programSkipDayTitle'),
      t('programSkipDayBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('programSkipDayConfirm'),
          onPress: () => {
            skipDay(toDateKey(new Date()));
            setUserPickedDay(false);
            setSelectedExerciseId(null);
          }
        }
      ],
      { cancelable: true }
    );
  }

  function streakDayLabel(index: number): string {
    const status = streakDays[index];
    const date = lastNDays(7)[index];
    const dateStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (status === 'done') return t('streakTickDone', { date: dateStr });
    if (status === 'today-in-progress') return t('streakTickToday', { date: dateStr });
    return t('streakTickMissed', { date: dateStr });
  }

  function showStreakDay(index: number) {
    const label = streakDayLabel(index);
    setStreakDetail((prev) => (prev === label ? null : label));
  }

  /** Захват session-действия: false — действие уже выполняется (двойной тап). */
  function acquireSessionAction(): boolean {
    if (!sessionGuard.current.tryAcquire()) return false;
    setSessionActionBusy(true);
    return true;
  }
  function releaseSessionAction() {
    sessionGuard.current.release();
    setSessionActionBusy(false);
  }

  if (!activeDay) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
        <Text style={[styles.title, { color: colors.paper }]}>{t('workoutNoPlan')}</Text>
      </SafeAreaView>
    );
  }

  const sessionDoneSets = resumable
    ? (resumable.steps ?? []).reduce((n, s) => n + s.completedSets.length, 0)
    : 0;
  const sessionTargetSets = resumable
    ? (resumable.steps ?? []).reduce((n, s) => n + s.snapshot.targetSets, 0)
    : 0;
  const sessionPct =
    sessionTargetSets > 0 ? Math.min(100, Math.round((sessionDoneSets / sessionTargetSets) * 100)) : 0;
  const ticketSex = profileSex === 'female' ? t('sexShortFemale') : t('sexShortMale');
  const ticketMode = trainingMode === 'gym' ? t('modeGymLower') : t('modeHomeLower');
  const ticketGoal =
    profileGoal === 'recomp'
      ? t('profileGoalDeficit')
      : profileGoal === 'gain'
        ? t('profileGoalSurplus')
        : t('profileGoalMaintain');

  const ticket = (
    <View style={[styles.ticket, { backgroundColor: colors.panelRaised, borderColor: colors.lineStrong }]}>
      <View style={styles.ticketMain}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.ticketLabel, { color: colors.paperFaint }]}>
            {t('today')} · {ticketSex} · {ticketMode}
            {t('ticketGoal', { goal: ticketGoal })}
          </Text>
          <Text style={[styles.ticketName, { color: colors.paper }]}>{activeDay.name}</Text>
          <Text style={[styles.ticketMeta, { color: colors.paperDim }]}>
            {t('workoutExerciseCount', { count: effectiveExercises.length })} · {activeDay.meta}
            {burnedToday > 0 ? t('workoutBurnedToday', { kcal: burnedToday }) : ''}
          </Text>
          {resumable && dayIdFromTemplate(resumable.templateRevisionId) === activeDay.id ? (
            <View style={styles.resumeBlock}>
              <Text style={[styles.resumeHint, { color: colors.lime }]}>
                {t('workoutResumeHint', {
                  step: resumable.currentStepIndex + 1,
                  total: (resumable.steps ?? []).length
                })}
              </Text>
              <View
                style={styles.sessionProgress}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: sessionPct }}
                accessibilityLabel={t('workoutProgressSession', {
                  done: sessionDoneSets,
                  total: sessionTargetSets
                })}
              >
                <View style={[styles.sessionProgressTrack, { backgroundColor: colors.line }]}>
                  <View style={[styles.sessionProgressFill, { backgroundColor: colors.lime, width: `${sessionPct}%` }]} />
                </View>
                <Text style={[styles.sessionProgressLbl, { color: colors.paperFaint }]}>
                  {sessionDoneSets}/{sessionTargetSets} {t('workoutSetsWord')} · {sessionPct}%
                </Text>
              </View>
              <View style={styles.resumeActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.startPill,
                    { backgroundColor: colors.lime },
                    pressed && { backgroundColor: colors.accentPressed },
                    sessionActionBusy && { opacity: 0.6 }
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('workoutResume')}
                  disabled={sessionActionBusy}
                  onPress={() => {
                    if (sessionActionBusy || !acquireSessionAction()) return;
                    RestTimerEngine.hapticTabSwitch();
                    void ActiveSessionController.ensureDaySession(activeDay.id, effectiveExercises)
                      .then((session) => {
                        if (!session) return;
                        void refreshResumable();
                        const steps = session.steps ?? [];
                        const step = steps[session.currentStepIndex];
                        const exId = step ? Number(step.snapshot.exerciseId) : effectiveExercises[0]?.id;
                        if (exId) openExercise(exId);
                      })
                      .catch(() => {})
                      .finally(releaseSessionAction);
                  }}
                >
                  <Text style={[styles.startPillText, { color: colors.onAccent }]}>▶  {t('workoutResumeShort')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.restartPill,
                    { borderColor: colors.lineStrong },
                    pressed && { backgroundColor: colors.surfacePressed },
                    sessionActionBusy && { opacity: 0.6 }
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('workoutRestart')}
                  disabled={sessionActionBusy}
                  onPress={() => {
                    if (sessionActionBusy || !acquireSessionAction()) return;
                    void ActiveSessionController.restartDaySession(activeDay.id, effectiveExercises)
                      .then((session) => {
                        if (!session) return;
                        void refreshResumable();
                        const steps = session.steps ?? [];
                        const first = steps[0];
                        const exId = first ? Number(first.snapshot.exerciseId) : effectiveExercises[0]?.id;
                        if (exId) openExercise(exId);
                      })
                      .catch(() => {})
                      .finally(releaseSessionAction);
                  }}
                >
                  <Text style={[styles.restartPillText, { color: colors.paperDim }]}>{t('workoutRestart')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.restartPill,
                    { borderColor: colors.ember },
                    pressed && { backgroundColor: colors.surfacePressed },
                    sessionActionBusy && { opacity: 0.6 }
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('workoutExit')}
                  disabled={sessionActionBusy}
                  onPress={() => {
                    if (sessionActionBusy || !acquireSessionAction()) return;
                    presentEarlyLeave((outcome) => {
                      releaseSessionAction();
                      if (outcome === 'cancelled') return;
                      void refreshResumable();
                    });
                  }}
                >
                  <Text style={[styles.restartPillText, { color: colors.ember }]}>{t('workoutExitShort')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.startPill,
                { backgroundColor: colors.lime },
                pressed && { backgroundColor: colors.accentPressed }
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('workoutViewWorkout')}
              onPress={() => {
                RestTimerEngine.hapticTabSwitch();
                previewSheetRef.current?.expand();
              }}
            >
              <Text style={[styles.startPillText, { color: colors.onAccent }]}>▶  {t('workoutStart')}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={[styles.ticketPerf, { borderTopColor: colors.line }]}>
        <View style={[styles.perfCell, { borderRightColor: colors.line }]}>
          <Text style={[styles.perfVal, { color: colors.paper }]}>{weekDaysCompleted}/7</Text>
          <Text style={[styles.perfLbl, { color: colors.paperFaint }]}>{t('perfWeekDays')}</Text>
        </View>
        <View style={[styles.perfCell, { borderRightColor: colors.line }]}>
          <Text style={[styles.perfVal, { color: colors.paper }]}>{burnedToday > 0 ? `~${burnedToday}` : '—'}</Text>
          <Text style={[styles.perfLbl, { color: colors.paperFaint }]}>{t('perfBurned')}</Text>
        </View>
        <View style={[styles.perfCell, { borderRightWidth: 0 }]}>
          <Text style={[styles.perfVal, { color: colors.paper }]}>{overallPr !== null ? `${overallPr}` : '—'}</Text>
          <Text style={[styles.perfLbl, { color: colors.paperFaint }]}>{t('perfRecord')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>FITPULSE  /  {todayLabel}</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.paper }]}>{t('myWorkoutTitle')}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Каталог')}
            style={[styles.catalogButton, { borderColor: colors.lineStrong, backgroundColor: colors.panel }]}
            accessibilityRole="button"
            accessibilityLabel={t('workoutOpenCatalog')}
          >
            <Text style={[styles.catalogButtonText, { color: colors.lime }]}>{t('workoutCatalogShort')}</Text>
          </TouchableOpacity>
        </View>
        {programInfo && !programInfo.finished && (
          <View
            style={styles.programRow}
            accessibilityLabel={t('programWeekLine', {
              week: programInfo.weekIndex + 1,
              total: programInfo.lengthWeeks
            })}
          >
            <View
              style={[
                styles.programChip,
                { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
            >
              <Text style={[styles.programChipText, { color: colors.lime }]}>
                {t('programWeekLine', {
                  week: programInfo.weekIndex + 1,
                  total: programInfo.lengthWeeks
                })}
                {t('programWeekDays', { done: programInfo.weekDone, total: programInfo.weekTotal })}
              </Text>
            </View>
            {program?.templateId ? (
              <View
                style={[
                  styles.programChip,
                  { borderColor: colors.cyan, backgroundColor: colors.panel }
                ]}
              >
                <Text style={[styles.programChipText, { color: colors.cyan }]} numberOfLines={1}>
                  {t('programTemplateLine', {
                    name: programTemplateTitle(program.templateId, lang),
                    level: levelLabel(program.templateLevel ?? 'intermediate', lang)
                  })}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.programChip,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel }
              ]}
            >
              <Text style={[styles.programChipText, { color: colors.paperDim }]}>
                {programInfo.progression.isDeload
                  ? t('programDeloadBadge')
                  : programInfo.progression.repBonus > 0 || programInfo.progression.setBonus > 0
                    ? t('programProgressBadge', { reps: programInfo.progression.repBonus })
                    : t('programBaseBadge')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.programSkip, { borderColor: colors.lineStrong }]}
              onPress={confirmSkipDay}
              accessibilityRole="button"
              accessibilityLabel={t('programSkipDay')}
            >
              <Text style={[styles.programSkipText, { color: colors.paperDim }]}>
                {t('programSkipDay')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {SHOW_GYM_MODE_TOGGLE && (
        <View style={styles.modeTabs} accessibilityRole="tablist">
          {([{ id: 'gym' as const, label: t('gym') }, { id: 'home' as const, label: t('home') }] as const).map((m) => {
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

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>{ticket}</View>

      {!program && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <View
            style={[
              styles.programCard,
              { backgroundColor: colors.panelRaised, borderColor: colors.lineStrong }
            ]}
          >
            <Text style={[styles.programCardTitle, { color: colors.paper }]}>
              {t('programSectionTitle')}
            </Text>
            <Text style={[styles.programCardBody, { color: colors.paperDim }]}>
              {t('programChooseLength')}
            </Text>
            <View style={styles.programLengthRow}>
              {PROGRAM_LENGTHS.map((weeks) => {
                const active = selectedProgramLength === weeks;
                const label =
                  weeks === 4
                    ? t('programWeeks4')
                    : weeks === 6
                      ? t('programWeeks6')
                      : t('programWeeks8');
                return (
                  <TouchableOpacity
                    key={weeks}
                    style={[
                      styles.programLengthBtn,
                      { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                      active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                    ]}
                    onPress={() => setSelectedProgramLength(weeks)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                  >
                    <Text
                      style={[
                        styles.programLengthText,
                        { color: colors.paperDim },
                        active && { color: colors.lime }
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.programStartBtn,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: colors.lime
                },
                pressed && { backgroundColor: colors.surfacePressed }
              ]}
              onPress={() => {
                RestTimerEngine.hapticTabSwitch();
                startProgram(selectedProgramLength);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('programStartCta')}
            >
              <Text style={[styles.programStartText, { color: colors.lime }]}>
                {t('programStartCta')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {programInfo?.finished && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <View
            style={[
              styles.programCard,
              { backgroundColor: colors.panelRaised, borderColor: colors.lime }
            ]}
          >
            <Text style={[styles.programCardTitle, { color: colors.paper }]}>
              {t('programDoneBadge')}
            </Text>
            <Text style={[styles.programCardBody, { color: colors.paperDim }]}>
              {t('programDoneStats', {
                done: programInfo.overallDone,
                total: programInfo.overallTotal
              })}
            </Text>
            <TouchableOpacity
              style={[styles.programDoneBtn, { borderColor: colors.lime }]}
              onPress={() => resetProgram()}
              accessibilityRole="button"
              accessibilityLabel={t('programNewCta')}
            >
              <Text style={[styles.programDoneBtnText, { color: colors.lime }]}>
                {t('programNewCta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs} accessibilityRole="tablist">
        {plan.map((day) => {
          const active = day.id === activeDay.id;
          const isToday = day.id === todayDayId;
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayTab, { borderColor: colors.lineStrong, backgroundColor: colors.panel }, active && { borderColor: colors.lime, backgroundColor: colors.limeDim }]}
              onPress={() => selectDay(day.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={isToday ? t('workoutDayToday', { day: day.name }) : day.name}
            >
              <Text
                style={[styles.dayTabText, { color: colors.paperDim }, active && { color: colors.lime }]}
                numberOfLines={1}
              >
                {isToday ? '· ' : ''}
                {dayChipLabel(day.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        <View
          style={[styles.streakRow, { backgroundColor: colors.panel, borderColor: colors.line }]}
          accessibilityLabel={
            currentStreak > 0
              ? t('workoutStreakActive', {
                  count: currentStreak,
                  days: streakDayWord(currentStreak, lang)
                })
              : t('workoutStreakNone')
          }
        >
          <Text style={[styles.streakText, { color: colors.paperDim, flex: 1 }]} numberOfLines={2}>
            {currentStreak > 0 ? (
              <>
                <Text style={{ color: colors.ember, fontFamily: fonts.bodySemi }}>
                  {currentStreak} {streakDayWord(currentStreak, lang)}
                </Text>
                {t('workoutStreakSuffix')}
              </>
            ) : (
              t('workoutStreakHint')
            )}
          </Text>
          <View style={styles.ticks}>
            {streakDays.map((status, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.tick,
                  status === 'done'
                    ? { backgroundColor: colors.lime }
                    : status === 'today-in-progress'
                      ? { backgroundColor: colors.ember }
                      : { backgroundColor: colors.line }
                ]}
                onPress={() => showStreakDay(i)}
                accessibilityRole="button"
                accessibilityLabel={streakDayLabel(i)}
              />
            ))}
          </View>
        </View>
        {streakDetail && (
          <Text style={[styles.streakDetail, { color: colors.paperDim }]}>{streakDetail}</Text>
        )}

        <WorkoutCoachCard dayName={activeDay.name} anyDoneToday={anyDoneToday} />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionExercises')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>
            {todayDoneCount}/{effectiveExercises.length}
          </Text>
          {overrideIds != null && overrideIds.length > 0 ? (
            <TouchableOpacity
              style={[styles.resetOverride, { borderColor: colors.lineStrong }]}
              onPress={() => {
                void clearDayOverride(trainingMode, activeDay.id).then(() => setOverrideTick((t) => t + 1));
              }}
              accessibilityRole="button"
              accessibilityLabel={t('workoutResetReplacements')}
            >
              <Text style={[styles.resetOverrideText, { color: colors.paperDim }]}>{t('workoutResetReplacements')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {effectiveExercises.map((ex, i) => {
          const doneSets = completedSetsToday(ex.id);
          const finished = doneSets >= ex.totalSets;
          const isCurrent = currentStepExerciseId === ex.id;
          const exPr = personalRecords[ex.id];
          const thumbKey = ex.mediaKey;
          const thumb =
            realThumbForMediaKey(thumbKey) ??
            (thumbKey ? EXERCISE_THUMBNAILS[thumbKey] : undefined);
          const remoteThumbUri = thumb ? undefined : thumbUris[ex.id];
          const matchesFocus =
            profileFocusAreas.length > 0 &&
            ex.targetMuscles.some((m) => profileFocusAreas.includes(m));
          return (
            <TouchableOpacity
              key={ex.id}
              style={[
                styles.logRow,
                { backgroundColor: colors.panel, borderColor: colors.line },
                isCurrent && { borderColor: colors.lime },
                matchesFocus && !isCurrent && { borderColor: colors.cyan }
              ]}
              onPress={() => {
                RestTimerEngine.hapticTabSwitch();
                openExercise(ex.id);
              }}
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
              accessibilityRole="button"
              accessibilityLabel={t('workoutExerciseProgress', {
                name: ex.name,
                done: doneSets,
                total: ex.totalSets
              })}
            >
              {thumb ? (
                <Image source={thumb} style={styles.logThumb} />
              ) : remoteThumbUri ? (
                <Image
                  source={{ uri: remoteThumbUri }}
                  style={[styles.logThumb, { backgroundColor: colors.ink }]}
                  resizeMode="cover"
                  accessibilityLabel={ex.name}
                />
              ) : (
                <View
                  style={[
                    styles.logThumb,
                    styles.logThumbFallback,
                    { backgroundColor: colors.ink, borderColor: colors.line }
                  ]}
                >
                  <Text style={[styles.logThumbInitials, { color: colors.paperFaint }]}>
                    {exerciseInitials(ex.name)}
                  </Text>
                </View>
              )}
              <Text style={[styles.logIndex, { color: colors.paperFaint }]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={{ flex: 1 }}>
                <View style={styles.logNameRow}>
                  <Text style={[styles.logName, { color: colors.paper }]} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  {isCurrent ? (
                    <View style={[styles.nowBadge, { backgroundColor: colors.lime }]}>
                      <Text style={[styles.nowBadgeText, { color: colors.ink }]}>{t('nowBadge')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.logSpec, { color: colors.paperDim }]}>
                  {ex.totalSets}×{formatPlanAmount(resolveSetMeasure(ex.measure), ex.workingReps, t('secShort'))} · {formatLoadLabel(ex, safeWeightKg)}
                  {finished
                    ? t('workoutDoneSuffix')
                    : doneSets > 0
                      ? ` · ${doneSets}/${ex.totalSets}`
                      : ''}
                </Text>
              </View>
              {exPr != null ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.logPr, { color: colors.lime }]}>{exPr}</Text>
                  <Text style={[styles.logPrLbl, { color: colors.paperFaint }]}>{t('kgPr')}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <WorkoutPreviewSheet
        ref={previewSheetRef}
        dayName={activeDay.name}
        dayMeta={activeDay.meta}
        exercises={effectiveExercises}
        onClose={() => previewSheetRef.current?.close()}
        onStart={() => {
          if (sessionActionBusy || !acquireSessionAction()) return;
          RestTimerEngine.hapticTabSwitch();
          previewSheetRef.current?.close();
          void ActiveSessionController.ensureDaySession(activeDay.id, effectiveExercises)
            .then((session) => {
              if (!session) return;
              void refreshResumable();
              const first = effectiveExercises[0];
              if (first) openExercise(first.id);
            })
            .catch(() => {})
            .finally(releaseSessionAction);
        }}
      />
      <ExerciseSheet
        ref={sheetRef}
        exercise={selectedExercise}
        dayId={activeDay.id}
        dayExercises={effectiveExercises}
        onFinished={() => {
          void refreshResumable();
        }}
        onDayComplete={(ctx) => {
          sheetRef.current?.close();
          setFeedbackContext({
            sessionId: ctx.sessionId,
            dayId: ctx.dayId,
            result: summarizeWorkoutResult(
              ctx.session,
              plan.find((day) => day.id === ctx.dayId)?.name ?? activeDay.name,
              selectPlanCurrentStreak(plan, useFitPulseStore.getState().dayProgress)
            )
          });
          setTimeout(() => feedbackSheetRef.current?.expand(), 300);
        }}
        onGoToExpected={(id) => openExercise(id)}
      />
      <CompletionFeedbackSheet
        ref={feedbackSheetRef}
        dayName={feedbackContext?.result.dayName ?? activeDay.name}
        burnedKcal={feedbackContext?.result.burnedKcal ?? 0}
        totalSets={feedbackContext?.result.totalSets ?? 0}
        currentStreak={feedbackContext?.result.currentStreak ?? 0}
        onSkip={() => feedbackSheetRef.current?.close()}
        onSubmit={(feedback) => {
          if (feedbackContext) {
            useSessionFeedbackStore
              .getState()
              .recordCompletionFeedback(feedbackContext.sessionId, feedbackContext.dayId, feedback);
          }
          feedbackSheetRef.current?.close();
        }}
      />
    </SafeAreaView>
  );
}
