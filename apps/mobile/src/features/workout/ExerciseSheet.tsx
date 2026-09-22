import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import type { WorkoutSession } from '@forma/workout-domain';
import AppBottomSheet from '@/components/BottomSheet';
import ExerciseVideo from '@/components/ExerciseVideo';
import MuscleMap, { MuscleKey } from '@/components/MuscleMap';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import { estimateOneRepMax, rpeFromRir } from '@/engines/MetabolicEngine';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { toDateKey, roundToStep } from '@/engines/WorkoutStats';
import { useExerciseReference } from './useExerciseReference';
import { ActiveSessionController } from './session/ActiveSessionController';
import { sequentialStepInfo } from './session/sequentialStep';
import { applySessionProjection } from './data/applySessionProjection';
import { getSessionService } from './data';

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
    const completedSetsToday = useFitPulseStore((s) => s.completedSetsToday);
    const setLogs = useFitPulseStore((s) => s.setLogs);
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

    useEffect(() => {
      if (!exercise) return;
      setCompletedSets(completedSetsToday(exercise.id));
      setWeight(exercise.workingWeight);
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
    }, [exercise?.id, startRestFromDeadline]);

    if (!exercise) return null;

    const seq =
      dayId && dayExercises?.length
        ? sequentialStepInfo(sessionSnap, exercise.id, nameById)
        : { isCurrent: true, expectedName: null, expectedExerciseId: null, currentStepIndex: 0, totalSteps: 0 };

    const weightStep = exercise.weightStep ?? 2.5;
    // Domain requires weightKg > 0 — never call estimateOneRepMax with 0/NaN on first paint.
    const oneRm =
      Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps >= 1
        ? Math.round(estimateOneRepMax(weight, reps))
        : 0;
    const rpe = rpeFromRir(rir);
    const finished = completedSets >= exercise.totalSets;
    const blockedBySequence = !seq.isCurrent && !finished;

    const todayKey = toDateKey(new Date());
    const loggedToday = setLogs.filter((e) => e.exerciseId === exercise.id && e.dateKey === todayKey);

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

    return (
      <AppBottomSheet ref={ref} eyebrow={`Упражнение ${String(exercise.index).padStart(2, '0')}`} title={exercise.name}>
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

        <ExerciseVideo />

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
            <Text style={styles.gridVal}>{exercise.workingWeight} кг</Text>
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
          <View style={styles.restTimer}>
            <Text style={styles.restLabel}>Отдых</Text>
            <Text style={styles.restVal}>{restRemaining}</Text>
            <TouchableOpacity onPress={skipRest}>
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
                      : `план: ${exercise.workingWeight} кг × ${exercise.workingReps}`}
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
                : `Записать подход ${completedSets + 1}`}
          </Text>
        </TouchableOpacity>
      </AppBottomSheet>
    );
  }
);

ExerciseSheet.displayName = 'ExerciseSheet';
export default ExerciseSheet;

const styles = StyleSheet.create({
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    alignItems: 'center',
    backgroundColor: colors.panel
  },
  rirBtnActive: { borderColor: colors.lime, backgroundColor: colors.limeDim },
  rirBtnText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 15, fontWeight: '700' },
  rirBtnTextActive: { color: colors.lime },
  restTimer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.control,
    borderColor: colors.lineStrong
  },
  restLabel: { flex: 1, color: colors.paperFaint, fontSize: 11 },
  restVal: { color: colors.ember, fontSize: 26, fontFamily: fonts.mono },
  restSkip: { color: colors.paperFaint, fontSize: 11, textDecorationLine: 'underline' },
  sets: { marginTop: 12 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  setNum: { width: 24, color: colors.paperFaint, fontSize: 13, fontFamily: fonts.mono },
  setSpec: { flex: 1, color: colors.paper, fontFamily: fonts.mono, fontSize: 15 },
  setDone: { color: colors.lime, fontFamily: fonts.mono },
  setPending: { color: colors.paperFaint, fontFamily: fonts.mono },
  cta: {
    marginTop: 18,
    marginBottom: 24,
    padding: 14,
    backgroundColor: colors.lime,
    alignItems: 'center',
    borderRadius: radius.control
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: colors.ink, fontSize: 16, fontFamily: fonts.mono }
});
