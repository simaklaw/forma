import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import type { WorkoutSession } from '@forma/workout-domain';
import AppBottomSheet from '@/components/BottomSheet';
import ExerciseVideo from '@/components/ExerciseVideo';
import MuscleMap, { MuscleKey } from '@/components/MuscleMap';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { estimateOneRepMax, rpeFromRir } from '@/engines/MetabolicEngine';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { toDateKey, roundToStep } from '@/engines/WorkoutStats';
import { formatRestClock, techniqueCuesFromNote } from '@/lib/techniqueCues';
import { useExerciseReference } from './useExerciseReference';
import { ActiveSessionController } from './session/ActiveSessionController';
import { sequentialStepInfo } from './session/sequentialStep';
import { applySessionProjection } from './data/applySessionProjection';
import { getSessionService } from './data';
import { formatLoadLabel, isBodyweightExercise, resolveWorkingLoadKg } from './catalog';

const beepSource = require('../../../assets/sfx/beep.wav');

export interface ExerciseDef {
  id: number;
  index: number;
  name: string;
  workingWeight: number;
  workingReps: number;
  weightStep?: number;
  totalSets: number;
  restSeconds: number;
  targetMuscles: MuscleKey[];
  note: string;
  wgerSearchTerm?: string;
}

interface Props {
  exercise: ExerciseDef | null;
  dayId?: string;
  dayExercises?: ExerciseDef[];
  onFinished?: (exerciseId: number) => void;
  onGoToExpected?: (exerciseId: number) => void;
}

function remainingRestSeconds(restEndsAtMs: number | null | undefined, nowMs = Date.now()): number | null {
  if (restEndsAtMs == null) return null;
  const sec = Math.ceil((restEndsAtMs - nowMs) / 1000);
  return sec > 0 ? sec : null;
}

const ExerciseSheet = forwardRef<GorhomBottomSheet, Props>(
  ({ exercise, dayId, dayExercises, onFinished, onGoToExpected }, ref) => {
    const colors = useThemeColors();
    const styles = createStyles(colors);
    const completedSetsToday = useFitPulseStore((s) => s.completedSetsToday);
    const setLogs = useFitPulseStore((s) => s.setLogs);
    const profileWeight = useFitPulseStore((s) => s.profile.weight);
    const reference = useExerciseReference(exercise?.wgerSearchTerm ?? null);

    const [completedSets, setCompletedSets] = useState(0);
    const [weight, setWeight] = useState(() => exercise?.workingWeight ?? 0);
    const [reps, setReps] = useState(() => exercise?.workingReps ?? 0);
    const [rir, setRir] = useState(2);
    const [restRemaining, setRestRemaining] = useState<number | null>(null);
    const [sessionSnap, setSessionSnap] = useState<WorkoutSession | null>(null);

    const startRestFromDeadline = useCallback((restEndsAtMs: number) => {
      const sec = remainingRestSeconds(restEndsAtMs);
      if (sec == null) {
        setRestRemaining(null);
        return;
      }
      RestTimerEngine.startTimer(
        sec,
        (remaining) => setRestRemaining(remaining),
        () => setRestRemaining(null),
        beepSource
      );
    }, []);

    const nameById = useCallback(
      (id: number) => dayExercises?.find((e) => e.id === id)?.name,
      [dayExercises]
    );

    const bodyKg =
      typeof profileWeight === 'number' && Number.isFinite(profileWeight) && profileWeight > 0
        ? profileWeight
        : 0;

    useEffect(() => {
      if (!exercise) return;
      setCompletedSets(completedSetsToday(exercise.id));
      const seed = resolveWorkingLoadKg(exercise, bodyKg);
      setWeight(seed > 0 ? seed : exercise.workingWeight > 0 ? exercise.workingWeight : bodyKg);
      setReps(exercise.workingReps);
      setRestRemaining(null);
      RestTimerEngine.stopTimer();

      let cancelled = false;
      void (async () => {
        const session = await ActiveSessionController.load();
        if (cancelled) return;
        setSessionSnap(session);
        if (!session) return;
        const step = session.steps[session.currentStepIndex];
        if (!step || step.snapshot.exerciseId !== String(exercise.id)) return;
        if (session.restEndsAtMs != null) {
          startRestFromDeadline(session.restEndsAtMs);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [exercise?.id, bodyKg, startRestFromDeadline]);

    if (!exercise) return null;

    const seq =
      dayId && dayExercises?.length
        ? sequentialStepInfo(sessionSnap, exercise.id, nameById)
        : {
            isCurrent: true,
            expectedName: null,
            expectedExerciseId: null,
            currentStepIndex: 0,
            totalSteps: 0
          };

    const weightStep = exercise.weightStep ?? 2.5;
    const oneRm =
      Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps >= 1
        ? Math.round(estimateOneRepMax(weight, reps))
        : 0;
    const rpe = rpeFromRir(rir);
    const finished = completedSets >= exercise.totalSets;
    const blockedBySequence = !seq.isCurrent && !finished;

    const todayKey = toDateKey(new Date());
    const loggedToday = setLogs.filter((e) => e.exerciseId === exercise.id && e.dateKey === todayKey);

    const restTotal = Math.max(1, exercise.restSeconds);
    const restPct =
      restRemaining != null ? Math.min(100, Math.round((restRemaining / restTotal) * 100)) : 0;

    function recordNextSet() {
      if (!exercise || completedSets >= exercise.totalSets || blockedBySequence) return;
      if (!(Number.isFinite(weight) && weight > 0)) return;
      if (dayId && dayExercises?.length) {
        void ActiveSessionController.recordSetForExercise({
          dayId,
          exercises: dayExercises,
          exerciseId: exercise.id,
          weightKg: weight,
          reps,
          rir
        }).then(async (session) => {
          if (!session) {
            setSessionSnap(await ActiveSessionController.load());
            return;
          }
          setSessionSnap(session);
          const projection = await ActiveSessionController.getLegacyProjection(session.sessionId);
          if (!projection) return;
          applySessionProjection(projection);
          const next =
            useFitPulseStore.getState().dayProgress[toDateKey(new Date())]?.[exercise.id] ?? 0;
          setCompletedSets(next);
          await ActiveSessionController.completeDayIfDone();
          if (next >= exercise.totalSets) {
            RestTimerEngine.hapticDayComplete();
            onFinished?.(exercise.id);
            return;
          }
          RestTimerEngine.hapticSetComplete();
          if (session.restEndsAtMs != null) startRestFromDeadline(session.restEndsAtMs);
        });
        return;
      }

      const current = useFitPulseStore.getState();
      const next = current.recordSet(exercise.id, weight, reps, rir);
      setCompletedSets(next);

      if (next >= exercise.totalSets) {
        RestTimerEngine.hapticDayComplete();
        onFinished?.(exercise.id);
        return;
      }

      RestTimerEngine.hapticSetComplete();
      RestTimerEngine.startTimer(
        exercise.restSeconds,
        (remaining) => setRestRemaining(remaining),
        () => setRestRemaining(null),
        beepSource
      );
    }

    function skipRest() {
      RestTimerEngine.stopTimer();
      setRestRemaining(null);
      const sessionId = ActiveSessionController.getSessionId();
      if (sessionId) {
        void getSessionService()
          .dispatch(sessionId, { type: 'skip_rest' })
          .then(async () => {
            setSessionSnap(await ActiveSessionController.load());
          })
          .catch(() => {});
      }
    }

    const ctaDisabled = finished || restRemaining !== null || blockedBySequence;
    const cues = techniqueCuesFromNote(exercise.note);

    return (
      <AppBottomSheet
        ref={ref}
        eyebrow={
          seq.totalSteps > 0
            ? `Упр. ${String(exercise.index).padStart(2, '0')} · шаг ${seq.currentStepIndex + 1}/${seq.totalSteps}`
            : `Упражнение ${String(exercise.index).padStart(2, '0')}`
        }
        title={exercise.name}
      >
        {seq.isCurrent && !finished && seq.totalSteps > 0 && (
          <View style={styles.currentChip}>
            <Text style={styles.currentChipText}>Текущий шаг сессии</Text>
          </View>
        )}
        {blockedBySequence && (
          <View style={styles.seqBanner} accessibilityRole="text">
            <Text style={styles.seqBannerTitle}>Сначала другое упражнение</Text>
            <Text style={styles.seqBannerBody}>
              По плану сейчас: {seq.expectedName ?? 'предыдущее'} · шаг {seq.currentStepIndex + 1}/
              {seq.totalSteps}
            </Text>
            {seq.expectedExerciseId != null && onGoToExpected && (
              <TouchableOpacity
                style={styles.seqBannerCta}
                onPress={() => onGoToExpected(seq.expectedExerciseId!)}
                accessibilityRole="button"
                accessibilityLabel="Перейти к текущему упражнению"
              >
                <Text style={styles.seqBannerCtaText}>Перейти к нему</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ExerciseVideo posterUri={reference?.imageUrl} cues={cues} />

        {reference && (
          <View style={styles.refPhotoWrap}>
            <Image
              source={{ uri: reference.imageUrl }}
              style={styles.refPhoto}
              resizeMode="cover"
              accessibilityLabel={reference.name}
            />
            <Text style={styles.refPhotoCaption}>фото техники: wger.de · {reference.name}</Text>
          </View>
        )}

        <View style={[styles.grid, { marginTop: spacing.md }]}>
          <View style={styles.gridCell}>
            <Text style={styles.gridVal}>
              {exercise.totalSets}×{exercise.workingReps}
            </Text>
            <Text style={styles.gridLbl}>подходы</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridVal}>
              {isBodyweightExercise(exercise)
                ? formatLoadLabel(exercise, bodyKg)
                : `${exercise.workingWeight} кг`}
            </Text>
            <Text style={styles.gridLbl}>рабочий вес</Text>
          </View>
          <View style={[styles.gridCell, { borderRightWidth: 0 }]}>
            <Text style={styles.gridVal}>{exercise.restSeconds}с</Text>
            <Text style={styles.gridLbl}>отдых</Text>
          </View>
        </View>

        <MuscleMap targetMuscles={exercise.targetMuscles} />

        <View style={styles.note}>
          <Text style={styles.noteText}>{exercise.note}</Text>
        </View>

        <Text style={styles.rirLabel}>Вес и повторы для следующего подхода</Text>
        <View style={styles.stepperRow}>
          <View style={styles.stepperBlock}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() =>
                setWeight((w) => Math.max(weightStep, roundToStep(w - weightStep, weightStep)))
              }
              accessibilityRole="button"
              accessibilityLabel="Уменьшить вес"
              disabled={blockedBySequence}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValueWrap}>
              <Text style={styles.stepperValue}>{weight}</Text>
              <Text style={styles.stepperUnit}>кг</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setWeight((w) => roundToStep(w + weightStep, weightStep))}
              accessibilityRole="button"
              accessibilityLabel="Увеличить вес"
              disabled={blockedBySequence}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepperBlock}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setReps((r) => Math.max(1, r - 1))}
              accessibilityRole="button"
              accessibilityLabel="Уменьшить повторы"
              disabled={blockedBySequence}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValueWrap}>
              <Text style={styles.stepperValue}>{reps}</Text>
              <Text style={styles.stepperUnit}>повт.</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setReps((r) => r + 1)}
              accessibilityRole="button"
              accessibilityLabel="Увеличить повторы"
              disabled={blockedBySequence}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.rirLabel}>Сколько повторений в запасе (RIR)?</Text>
        <View style={styles.rirRow}>
          {[1, 2, 3].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.rirBtn, rir === val && styles.rirBtnActive]}
              onPress={() => setRir(val)}
              accessibilityRole="radio"
              accessibilityState={{ checked: rir === val }}
              disabled={blockedBySequence}
            >
              <Text style={[styles.rirBtnText, rir === val && styles.rirBtnTextActive]}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.grid, { marginTop: spacing.lg }]}>
          <View style={styles.gridCell}>
            <Text style={styles.gridVal}>{rpe.toFixed(1)}</Text>
            <Text style={styles.gridLbl}>RPE (10 − RIR)</Text>
          </View>
          <View style={[styles.gridCell, { borderRightWidth: 0 }]}>
            <Text style={styles.gridVal}>{oneRm > 0 ? oneRm : '—'}</Text>
            <Text style={styles.gridLbl}>прогноз 1ПМ, кг</Text>
          </View>
        </View>

        {restRemaining !== null && (
          <View style={styles.restTimer} accessibilityLiveRegion="polite">
            <Text style={styles.restLabel}>Отдых между подходами</Text>
            <Text style={styles.restVal}>{formatRestClock(restRemaining)}</Text>
            <View style={styles.restBarTrack}>
              <View style={[styles.restBarFill, { width: `${restPct}%` }]} />
            </View>
            <TouchableOpacity onPress={skipRest} accessibilityRole="button">
              <Text style={styles.restSkip}>пропустить</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sets}>
          {Array.from({ length: exercise.totalSets }).map((_, i) => {
            const setNum = i + 1;
            const logged = loggedToday[i];
            const done = Boolean(logged);
            const isNext = !done && setNum === completedSets + 1 && !blockedBySequence;
            return (
              <View key={setNum} style={styles.setRow}>
                <Text style={styles.setNum}>{setNum}</Text>
                <Text style={styles.setSpec}>
                  {done
                    ? `${logged!.weight} кг × ${logged!.reps}`
                    : isNext
                      ? `→ ${weight} кг × ${reps}`
                      : `план: ${formatLoadLabel(exercise, bodyKg)} × ${exercise.workingReps}`}
                </Text>
                <Text style={done ? styles.setDone : styles.setPending}>
                  {done ? '✓ выполнен' : isNext ? 'следующий' : 'не начат'}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
          disabled={ctaDisabled}
          onPress={recordNextSet}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            {finished
              ? 'Упражнение завершено'
              : blockedBySequence
                ? 'Сначала предыдущее'
                : restRemaining !== null
                  ? `Отдых ${formatRestClock(restRemaining)}`
                  : `Записать подход ${completedSets + 1}`}
          </Text>
        </TouchableOpacity>
      </AppBottomSheet>
    );
  }
);

ExerciseSheet.displayName = 'ExerciseSheet';
export default ExerciseSheet;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    currentChip: {
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.limeDim,
      borderWidth: 1,
      borderColor: colors.lime
    },
    currentChipText: { color: colors.lime, fontFamily: fonts.mono, fontSize: 11 },
    seqBanner: {
      marginBottom: spacing.md,
      padding: 12,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.ember,
      backgroundColor: 'rgba(255,107,74,0.1)'
    },
    seqBannerTitle: {
      color: colors.ember,
      fontFamily: fonts.mono,
      fontSize: 13,
      marginBottom: 4
    },
    seqBannerBody: {
      color: colors.paperDim,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17
    },
    seqBannerCta: { marginTop: 10 },
    seqBannerCtaText: {
      color: colors.lime,
      fontFamily: fonts.mono,
      fontSize: 13,
      textDecorationLine: 'underline'
    },
    grid: {
      flexDirection: 'row',
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
      backgroundColor: colors.panel
    },
    gridCell: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRightWidth: 1,
      borderColor: colors.line
    },
    refPhotoWrap: { marginTop: spacing.md },
    refPhoto: {
      width: '100%',
      height: 160,
      backgroundColor: colors.panel,
      borderRadius: radius.control
    },
    refPhotoCaption: { color: colors.paperFaint, fontSize: 10, marginTop: 4, fontFamily: fonts.body },
    gridVal: { color: colors.paper, fontSize: 20, fontFamily: fonts.mono },
    gridLbl: { color: colors.paperFaint, fontSize: 10, marginTop: 2 },
    note: {
      marginTop: 10,
      padding: 12,
      borderLeftWidth: 2,
      borderColor: colors.cyan,
      borderRadius: radius.control,
      backgroundColor: 'rgba(45,212,191,0.08)'
    },
    noteText: { color: colors.paperDim, fontSize: 11.5, lineHeight: 17, fontFamily: fonts.body },
    rirLabel: { color: colors.paperFaint, fontSize: 11.5, marginTop: 14, marginBottom: 8 },
    stepperRow: { flexDirection: 'row', gap: 10 },
    stepperBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: radius.control,
      overflow: 'hidden',
      backgroundColor: colors.panel
    },
    stepperBtn: {
      width: 40,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.ink
    },
    stepperBtnText: { color: colors.paper, fontSize: 20, fontFamily: fonts.mono },
    stepperValueWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    stepperValue: { color: colors.paper, fontSize: 18, fontFamily: fonts.mono },
    stepperUnit: { color: colors.paperFaint, fontSize: 9.5, marginTop: 1 },
    rirRow: { flexDirection: 'row', gap: 8 },
    rirBtn: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: radius.control,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.panel
    },
    rirBtnActive: { borderColor: colors.lime, backgroundColor: colors.limeDim },
    rirBtnText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 16 },
    rirBtnTextActive: { color: colors.lime },
    restTimer: {
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.lime,
      backgroundColor: colors.limeDim,
      alignItems: 'center'
    },
    restLabel: {
      color: colors.paperDim,
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      letterSpacing: 0.6
    },
    restVal: {
      color: colors.lime,
      fontFamily: fonts.mono,
      fontSize: 42,
      marginTop: 4
    },
    restBarTrack: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.lineStrong,
      marginTop: 12,
      overflow: 'hidden'
    },
    restBarFill: {
      height: '100%',
      backgroundColor: colors.lime,
      borderRadius: 3
    },
    restSkip: {
      color: colors.paperDim,
      fontFamily: fonts.mono,
      fontSize: 13,
      marginTop: 12,
      textDecorationLine: 'underline'
    },
    sets: { marginTop: spacing.lg, gap: 8 },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line
    },
    setNum: { width: 22, color: colors.lime, fontFamily: fonts.mono, fontSize: 14 },
    setSpec: { flex: 1, color: colors.paper, fontFamily: fonts.body, fontSize: 13 },
    setDone: { color: colors.lime, fontFamily: fonts.mono, fontSize: 11 },
    setPending: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 },
    cta: {
      marginTop: spacing.lg,
      backgroundColor: colors.lime,
      borderRadius: radius.control,
      paddingVertical: 16,
      alignItems: 'center'
    },
    ctaDisabled: { opacity: 0.45 },
    ctaText: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 15 }
  });
}
