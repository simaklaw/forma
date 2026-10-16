import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import type { WorkoutSession } from '@forma/workout-domain';
import { SetFeedbackCard } from './SetFeedbackCard';
import AppBottomSheet from '@/components/BottomSheet';
import ExerciseVideo from '@/components/ExerciseVideo';
import MuscleMap, { type MuscleKey } from '@/components/MuscleMap';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { estimateOneRepMax, rpeFromRir } from '@/engines/MetabolicEngine';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { VoiceCuesEngine } from '@/engines/VoiceCuesEngine';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { toDateKey, roundToStep } from '@/engines/WorkoutStats';
import { formatRestClock, techniqueCuesFromNote } from '@/lib/techniqueCues';
import { EXERCISE_GIF_MANIFEST } from './exerciseGifManifest.generated';
import { useExerciseReference } from './useExerciseReference';
import { ActiveSessionController, dayIdFromTemplate } from './session/ActiveSessionController';
import { sequentialStepInfo } from './session/sequentialStep';
import { applySessionProjection } from './data/applySessionProjection';
import { getSessionService } from './data';
import { formatLoadLabel, isBodyweightExercise, resolveWorkingLoadKg } from './catalog';
import { EXERCISE_VIDEOS } from './exerciseMedia';
import { importedByNumericId, IMPORTED_NUMERIC_ID_BASE } from './importedExerciseBridge';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT } from '@/i18n/strings';

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
  mediaKey?: import('./exerciseMedia').ExerciseMediaKey;
}

interface Props {
  exercise: ExerciseDef | null;
  dayId?: string;
  dayExercises?: ExerciseDef[];
  onFinished?: (exerciseId: number) => void;
  onGoToExpected?: (exerciseId: number) => void;
  /** Fired when the whole day session completes (all sets done). */
  onDayComplete?: (ctx: { sessionId: string; dayId: string; session: WorkoutSession }) => void;
}

function remainingRestSeconds(restEndsAtMs: number | null | undefined, nowMs = Date.now()): number | null {
  if (restEndsAtMs == null) return null;
  const sec = Math.ceil((restEndsAtMs - nowMs) / 1000);
  return sec > 0 ? sec : null;
}

function datasetMetaForExercise(name: string) {
  const n = name.trim().toLowerCase();
  const exact = EXERCISE_GIF_MANIFEST.find(
    (e) => e.sourceName.toLowerCase() === n || e.id.replace(/^lib-/, '').replace(/-/g, ' ') === n
  );
  if (exact) return exact;
  return (
    EXERCISE_GIF_MANIFEST.find((e) => n.includes(e.sourceName.toLowerCase()) || e.sourceName.toLowerCase().includes(n)) ??
    null
  );
}


const ExerciseSheet = forwardRef<GorhomBottomSheet, Props>(
  ({ exercise, dayId, dayExercises, onFinished, onGoToExpected, onDayComplete }, ref) => {
    const colors = useThemeColors();
    const styles = createStyles(colors);
    const t = useT();
    const lang = useLanguageStore((s) => s.lang);
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
    const [sheetOpen, setSheetOpen] = useState(true);

    const startRestFromDeadline = useCallback((restEndsAtMs: number) => {
      const sec = remainingRestSeconds(restEndsAtMs);
      if (sec == null) {
        setRestRemaining(null);
        return;
      }
      RestTimerEngine.startTimer(
        sec,
        (remaining) => {
          setRestRemaining(remaining);
          VoiceCuesEngine.announceRestCountdown(remaining);
        },
        () => {
          setRestRemaining(null);
          VoiceCuesEngine.announceRestOver();
        },
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
      VoiceCuesEngine.announceExercise(exercise.name);
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
        const steps = session.steps ?? [];
        const step = steps[session.currentStepIndex];
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
          const sessionIdForFeedback = session.sessionId;
          const dayIdForFeedback =
            dayIdFromTemplate(session.templateRevisionId) ?? dayId ?? '';
          await ActiveSessionController.completeDayIfDone();
          if (next >= exercise.totalSets) {
            const dayComplete = ActiveSessionController.getSessionId() == null;
            if (dayComplete) {
              RestTimerEngine.hapticDayComplete();
              VoiceCuesEngine.announceDayComplete();
              if (sessionIdForFeedback && dayIdForFeedback) {
                onDayComplete?.({ sessionId: sessionIdForFeedback, dayId: dayIdForFeedback, session });
              }
            } else {
              RestTimerEngine.hapticSetComplete();
              VoiceCuesEngine.announceSetComplete(next, exercise.totalSets);
            }
            onFinished?.(exercise.id);
            return;
          }
          RestTimerEngine.hapticSetComplete();
          VoiceCuesEngine.announceSetComplete(next, exercise.totalSets);
          if (session.restEndsAtMs != null) startRestFromDeadline(session.restEndsAtMs);
        });
        return;
      }

      const current = useFitPulseStore.getState();
      const next = current.recordSet(exercise.id, weight, reps, rir);
      setCompletedSets(next);

      if (next >= exercise.totalSets) {
        RestTimerEngine.hapticSetComplete();
        VoiceCuesEngine.announceSetComplete(next, exercise.totalSets);
        onFinished?.(exercise.id);
        return;
      }

      RestTimerEngine.hapticSetComplete();
      VoiceCuesEngine.announceSetComplete(next, exercise.totalSets);
      RestTimerEngine.startTimer(
        exercise.restSeconds,
        (remaining) => {
          setRestRemaining(remaining);
          VoiceCuesEngine.announceRestCountdown(remaining);
        },
        () => {
          setRestRemaining(null);
          VoiceCuesEngine.announceRestOver();
        },
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
    const videoSource =
      exercise.mediaKey && EXERCISE_VIDEOS[exercise.mediaKey]
        ? EXERCISE_VIDEOS[exercise.mediaKey]
        : undefined;

    return (
      <AppBottomSheet
        ref={ref}
        eyebrow={
          seq.totalSteps > 0
            ? t('sheetExerciseShort', {
                index: String(exercise.index).padStart(2, '0'),
                step: seq.currentStepIndex + 1,
                total: seq.totalSteps
              })
            : t('sheetExerciseFull', { index: String(exercise.index).padStart(2, '0') })
        }
        title={exercise.name}
        onChange={(index) => setSheetOpen(index >= 0)}
      >
        {seq.isCurrent && !finished && seq.totalSteps > 0 && (
          <View style={styles.currentChip}>
            <Text style={styles.currentChipText}>{t('sheetCurrentStep')}</Text>
          </View>
        )}
        {blockedBySequence && (
          <View style={styles.seqBanner} accessibilityRole="text">
            <Text style={styles.seqBannerTitle}>{t('sheetSeqBlockedTitle')}</Text>
            <Text style={styles.seqBannerBody}>
              {t('sheetSeqBannerBody', {
                name: seq.expectedName ?? t('sheetPrevExercise'),
                step: seq.currentStepIndex + 1,
                total: seq.totalSteps
              })}
            </Text>
            {seq.expectedExerciseId != null && onGoToExpected && (
              <TouchableOpacity
                style={styles.seqBannerCta}
                onPress={() => onGoToExpected(seq.expectedExerciseId!)}
                accessibilityRole="button"
                accessibilityLabel={t('sheetGoToCurrent')}
              >
                <Text style={styles.seqBannerCtaText}>{t('sheetGoToIt')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ExerciseVideo
          source={videoSource}
          posterUri={reference?.imageUrl}
          cues={cues}
          shouldPlay={sheetOpen}
        />

        {reference && (
          <View style={styles.refPhotoWrap}>
            <Image
              source={{ uri: reference.imageUrl }}
              style={styles.refPhoto}
              resizeMode="cover"
              accessibilityLabel={reference.name}
            />
          </View>
        )}

        <View style={[styles.grid, { marginTop: spacing.md }]}>
          <View style={styles.gridCell}>
            <Text style={styles.gridVal}>
              {exercise.totalSets}×{exercise.workingReps}
            </Text>
            <Text style={styles.gridLbl}>{t('gridSets')}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridVal}>
              {isBodyweightExercise(exercise)
                ? formatLoadLabel(exercise, bodyKg)
                : `${exercise.workingWeight} ${t('kg')}`}
            </Text>
            <Text style={styles.gridLbl}>{t('gridWeight')}</Text>
          </View>
          <View style={[styles.gridCell, { borderRightWidth: 0 }]}>
            <Text style={styles.gridVal}>{exercise.restSeconds}{t('secShort')}</Text>
            <Text style={styles.gridLbl}>{t('gridRest')}</Text>
          </View>
        </View>

        <MuscleMap targetMuscles={exercise.targetMuscles} />

        <View style={styles.note}>
          <Text style={styles.noteText}>{exercise.note}</Text>
        </View>

        {(() => {
          const imported =
            exercise.id > IMPORTED_NUMERIC_ID_BASE ? importedByNumericId(exercise.id) : null;
          const steps = imported
            ? lang === 'en'
              ? imported.instructionsEn
              : imported.instructionsRu
            : (datasetMetaForExercise(exercise.name)?.instructionsEn ?? []);
          if (!steps.length) return null;
          return (
            <View style={styles.datasetBlock}>
              <View style={styles.steps}>
                <Text style={styles.stepsTitle}>{t('technique')}</Text>
                {steps.map((step, i) => (
                  <Text key={i} style={styles.stepLine}>
                    {i + 1}. {step}
                  </Text>
                ))}
              </View>
            </View>
          );
        })()}

        <Text style={styles.rirLabel}>{t('sheetRirLabel')}</Text>
        <View style={styles.stepperRow}>
          <View style={styles.stepperBlock}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() =>
                setWeight((w) => Math.max(weightStep, roundToStep(w - weightStep, weightStep)))
              }
              accessibilityRole="button"
              accessibilityLabel={t('sheetDecreaseWeight')}
              disabled={blockedBySequence}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValueWrap}>
              <Text style={styles.stepperValue}>{weight}</Text>
              <Text style={styles.stepperUnit}>{t('kg')}</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setWeight((w) => roundToStep(w + weightStep, weightStep))}
              accessibilityRole="button"
              accessibilityLabel={t('sheetIncreaseWeight')}
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
              accessibilityLabel={t('sheetDecreaseReps')}
              disabled={blockedBySequence}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepperValueWrap}>
              <Text style={styles.stepperValue}>{reps}</Text>
              <Text style={styles.stepperUnit}>{t('sheetRepsUnit')}</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setReps((r) => r + 1)}
              accessibilityRole="button"
              accessibilityLabel={t('sheetIncreaseReps')}
              disabled={blockedBySequence}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.rirLabel}>{t('sheetRirQuestion')}</Text>
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
            <Text style={styles.gridLbl}>{t('sheetOneRmLabel')}</Text>
          </View>
        </View>

        {restRemaining !== null && (
          <View
            style={[styles.restTimer, { borderColor: colors.lime }]}
            accessibilityLiveRegion="polite"
            accessibilityLabel={t('sheetRestTimer', { time: formatRestClock(restRemaining) })}
          >
            <Text style={styles.restLabel}>{t('sheetRestHeader')}</Text>
            <Text style={styles.restVal}>{formatRestClock(restRemaining)}</Text>
            <View style={styles.restBarTrack}>
              <View style={[styles.restBarFill, { width: `${restPct}%` }]} />
            </View>
            <TouchableOpacity
              onPress={skipRest}
              accessibilityRole="button"
              accessibilityLabel={t('sheetSkipRest')}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <Text style={styles.restSkip}>{t('sheetRestSkipLower')}</Text>
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
                    ? t('sheetSetLogged', { weight: logged!.weight, reps: logged!.reps })
                    : isNext
                      ? t('sheetSetLoggedArrow', { weight, reps })
                      : t('sheetSetPlan', {
                          load: formatLoadLabel(exercise, bodyKg),
                          reps: exercise.workingReps
                        })}
                </Text>
                <Text style={done ? styles.setDone : styles.setPending}>
                  {done
                    ? t('sheetStatusDone')
                    : isNext
                      ? t('sheetStatusNext')
                      : t('sheetStatusNotStarted')}
                </Text>
              </View>
            );
          })}
        </View>

        {!finished && !blockedBySequence ? (
          <SetFeedbackCard
            exerciseId={String(exercise.id)}
            exerciseName={exercise.name}
            completedSets={completedSets}
            totalSets={exercise.totalSets}
            formCues={cues}
          />
        ) : null}

        <TouchableOpacity
          style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
          disabled={ctaDisabled}
          onPress={recordNextSet}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            {finished
              ? t('sheetExerciseDone')
              : blockedBySequence
                ? t('sheetDoPrevFirst')
                : restRemaining !== null
                  ? t('sheetRestTimer', { time: formatRestClock(restRemaining) })
                  : t('sheetLogSet', { number: completedSets + 1 })}
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
    refPhoto: { width: '100%', height: 160, borderRadius: radius.control },
    refPhotoCaption: {
      color: colors.paperFaint,
      fontSize: 11,
      fontFamily: fonts.body,
      marginTop: 4
    },
    gridVal: { color: colors.paper, fontFamily: fonts.mono, fontSize: 16 },
    gridLbl: { color: colors.paperFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
    note: {
      marginTop: spacing.md,
      padding: 12,
      borderRadius: radius.control,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.line
    },
    noteText: { color: colors.paperDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
    datasetBlock: {
      marginTop: spacing.md,
      padding: 12,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel
    },
    datasetMeta: {
      color: colors.paperFaint,
      fontFamily: fonts.mono,
      fontSize: 11,
      marginBottom: 8
    },
    steps: { gap: 4 },
    stepsTitle: {
      color: colors.lime,
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      marginBottom: 4,
      letterSpacing: 0.4
    },
    stepLine: {
      color: colors.paperDim,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 4
    },
    rirLabel: {
      marginTop: spacing.lg,
      marginBottom: 8,
      color: colors.paperFaint,
      fontFamily: fonts.body,
      fontSize: 12
    },
    stepperRow: { flexDirection: 'row', gap: 10 },
    stepperBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.control,
      backgroundColor: colors.panel
    },
    stepperBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
    stepperBtnText: { color: colors.lime, fontSize: 22, fontFamily: fonts.mono },
    stepperValueWrap: { flex: 1, alignItems: 'center' },
    stepperValue: { color: colors.paper, fontFamily: fonts.mono, fontSize: 18 },
    stepperUnit: { color: colors.paperFaint, fontFamily: fonts.body, fontSize: 11 },
    rirRow: { flexDirection: 'row', gap: 8 },
    rirBtn: {
      flex: 1,
      height: 40,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.panel
    },
    rirBtnActive: { borderColor: colors.lime, backgroundColor: colors.limeDim },
    rirBtnText: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 16 },
    rirBtnTextActive: { color: colors.lime },
    restTimer: {
      marginTop: spacing.lg,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderColor: colors.lime,
      backgroundColor: colors.limeDim,
      alignItems: 'center'
    },
    restLabel: {
      color: colors.lime,
      fontSize: 11,
      fontFamily: fonts.mono,
      letterSpacing: 1
    },
    restVal: {
      color: colors.paper,
      fontSize: 40,
      fontFamily: fonts.mono,
      marginVertical: 8,
      letterSpacing: 1
    },
    restBarTrack: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.line,
      marginBottom: 10,
      overflow: 'hidden'
    },
    restBarFill: { height: 6, borderRadius: 3, backgroundColor: colors.lime },
    restSkip: {
      color: colors.paperDim,
      fontSize: 13,
      fontFamily: fonts.bodySemi,
      textDecorationLine: 'underline'
    },
    sets: { marginTop: spacing.lg, gap: 6 },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderColor: colors.line
    },
    setNum: { width: 28, color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 13 },
    setSpec: { flex: 1, color: colors.paper, fontFamily: fonts.body, fontSize: 13 },
    setDone: { color: colors.lime, fontFamily: fonts.mono, fontSize: 12 },
    setPending: { color: colors.paperFaint, fontFamily: fonts.body, fontSize: 12 },
    cta: {
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
      height: 52,
      borderRadius: radius.control,
      backgroundColor: colors.lime,
      alignItems: 'center',
      justifyContent: 'center'
    },
    ctaDisabled: { opacity: 0.45 },
    ctaText: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 15 }
  });
}
