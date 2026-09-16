import React, { forwardRef, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import AppBottomSheet from '@/components/BottomSheet';
import ExerciseVideo from '@/components/ExerciseVideo';
import MuscleMap, { MuscleKey } from '@/components/MuscleMap';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import { estimateOneRepMax, rpeFromRir } from '@/engines/MetabolicEngine';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { toDateKey, roundToStep } from '@/engines/WorkoutStats';
import { useExerciseReference } from './useExerciseReference';

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
  onFinished?: (exerciseId: number) => void;
}

const ExerciseSheet = forwardRef<GorhomBottomSheet, Props>(({ exercise, onFinished }, ref) => {
  const recordSet = useFitPulseStore((s) => s.recordSet);
  const completedSetsToday = useFitPulseStore((s) => s.completedSetsToday);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const reference = useExerciseReference(exercise?.wgerSearchTerm ?? null);

  const [completedSets, setCompletedSets] = useState(0);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [rir, setRir] = useState(2);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!exercise) return;
    setCompletedSets(completedSetsToday(exercise.id));
    setWeight(exercise.workingWeight);
    setReps(exercise.workingReps);
    setRestRemaining(null);
  }, [exercise?.id]);

  if (!exercise) return null;

  const weightStep = exercise.weightStep ?? 2.5;
  const oneRm = Math.round(estimateOneRepMax(weight, reps));
  const rpe = rpeFromRir(rir);
  const finished = completedSets >= exercise.totalSets;

  const todayKey = toDateKey(new Date());
  const loggedToday = setLogs.filter((e) => e.exerciseId === exercise.id && e.dateKey === todayKey);

  function recordNextSet() {
    if (!exercise || completedSets >= exercise.totalSets) return;
    const next = recordSet(exercise.id, weight, reps, rir);
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
  }

  return (
    <AppBottomSheet ref={ref} eyebrow={`Упражнение ${String(exercise.index).padStart(2, '0')}`} title={exercise.name}>
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
            onPress={() => setWeight((w) => Math.max(0, roundToStep(w - weightStep, weightStep)))}
            accessibilityRole="button"
            accessibilityLabel="Уменьшить вес"
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
          <Text style={styles.gridVal}>{oneRm}</Text>
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
          const isNext = !done && setNum === completedSets + 1;
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
        style={[styles.cta, (finished || restRemaining !== null) && styles.ctaDisabled]}
        disabled={finished || restRemaining !== null}
        onPress={recordNextSet}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>
          {finished ? 'Упражнение завершено' : `Записать подход ${completedSets + 1}`}
        </Text>
      </TouchableOpacity>
    </AppBottomSheet>
  );
});

ExerciseSheet.displayName = 'ExerciseSheet';
export default ExerciseSheet;

const styles = StyleSheet.create({
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
    borderColor: colors.lineStrong,
    borderRadius: radius.control
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
