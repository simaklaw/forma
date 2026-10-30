import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT } from '@/i18n/strings';
import type { MuscleKey } from '@/domain/muscleKeys';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import {
  WARMUP_ROUTINES,
  selectWarmupRoutine,
  warmupRoutineTotalSec
} from './warmup';

interface Props {
  /** Целевые мышцы дня (все упражнения, включая кастомную тренировку). */
  muscles: MuscleKey[];
}

/**
 * Сворачиваемая карточка разминки над списком упражнений: комплекс подбирается
 * по целевым мышцам дня, пошаговый таймер идёт через RestTimerEngine
 * (wall-clock — корректно переживает блокировку экрана).
 */
export function WarmupCard({ muscles }: Props) {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);

  const routineKey = useMemo(() => selectWarmupRoutine(muscles), [muscles]);
  const routine = WARMUP_ROUTINES[routineKey];
  const totalSec = useMemo(() => warmupRoutineTotalSec(routine), [routine]);
  const totalMin = Math.max(1, Math.round(totalSec / 60));

  const [expanded, setExpanded] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);

  // Смена дня/кастомной тренировки — сбрасываем прогресс и гасим таймер.
  useEffect(() => {
    setDoneIds([]);
    setRunningId(null);
    RestTimerEngine.stopTimer();
  }, [routineKey]);

  // Не оставляем висящий интервал при уходе с экрана.
  useEffect(() => () => RestTimerEngine.stopTimer(), []);

  const markDone = (id: string) => {
    setDoneIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const startStep = (stepId: string, durationSec: number) => {
    setRunningId(stepId);
    setRemainingSec(durationSec);
    RestTimerEngine.startTimer(
      durationSec,
      (remaining) => setRemainingSec(remaining),
      () => {
        markDone(stepId);
        setRunningId((current) => (current === stepId ? null : current));
      }
    );
  };

  const stopStep = () => {
    RestTimerEngine.stopTimer();
    setRunningId(null);
  };

  const allDone = routine.exercises.every((e) => doneIds.includes(e.id));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: allDone ? colors.primaryContainer : colors.surfaceContainer }
      ]}
    >
      <TouchableOpacity
        style={styles.head}
        onPress={() => {
          RestTimerEngine.hapticTabSwitch();
          setExpanded((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('warmupToggleA11y')}
        accessibilityState={{ expanded }}
      >
        <View style={styles.headTexts}>
          <Text style={[styles.title, { color: colors.paper }]}>{t('warmupTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.paperDim }]} numberOfLines={1}>
            {routine.title[lang]} · {t('warmupMinutesShort', { min: totalMin })}
          </Text>
        </View>
        {allDone ? (
          <Text style={[styles.doneBadge, { color: colors.lime }]}>✓</Text>
        ) : (
          <Text style={[styles.chevron, { color: colors.paperFaint }]}>{expanded ? '▴' : '▾'}</Text>
        )}
      </TouchableOpacity>

      {expanded ? (
        <View style={[styles.steps, { borderTopColor: colors.line }]}>
          {routine.exercises.map((step, i) => {
            const done = doneIds.includes(step.id);
            const running = runningId === step.id;
            return (
              <View
                key={step.id}
                style={[
                  styles.stepRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }
                ]}
                accessibilityLabel={t('warmupStepA11y', {
                  name: step.name[lang],
                  sec: step.durationSec
                })}
              >
                <Text
                  style={[
                    styles.stepIndex,
                    { color: done ? colors.lime : colors.paperFaint },
                    running && { color: colors.ember }
                  ]}
                >
                  {done ? '✓' : `${i + 1}`}
                </Text>
                <View style={styles.stepTexts}>
                  <Text style={[styles.stepName, { color: colors.paper }]}>{step.name[lang]}</Text>
                  <Text style={[styles.stepDesc, { color: colors.paperFaint }]}>
                    {step.description[lang]}
                  </Text>
                  {running ? (
                    <Text style={[styles.stepCountdown, { color: colors.ember }]}>
                      {remainingSec} с
                    </Text>
                  ) : null}
                </View>
                {running ? (
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                    onPress={stopStep}
                    accessibilityRole="button"
                    accessibilityLabel={t('warmupStop')}
                  >
                    <Text style={[styles.stepBtnText, { color: colors.paperDim }]}>
                      {t('warmupStop')}
                    </Text>
                  </TouchableOpacity>
                ) : done ? (
                  <Text style={[styles.stepDoneMark, { color: colors.lime }]}>✓</Text>
                ) : (
                  <View style={styles.stepActions}>
                    <TouchableOpacity
                      style={[
                        styles.stepBtn,
                        { backgroundColor: colors.primaryContainer }
                      ]}
                      onPress={() => startStep(step.id, step.durationSec)}
                      accessibilityRole="button"
                      accessibilityLabel={t('warmupStart')}
                    >
                      <Text style={[styles.stepBtnText, { color: colors.onPrimaryContainer }]}>
                        {t('warmupStart')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.markBtn}
                      onPress={() => markDone(step.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('warmupMarkDone')}
                    >
                      <Text style={[styles.markBtnText, { color: colors.paperFaint }]}>✓</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          {allDone ? (
            <Text style={[styles.allDone, { color: colors.lime }]}>{t('warmupDoneBadge')}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    marginBottom: spacing.sm
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md
  },
  headTexts: { flex: 1 },
  title: { fontSize: 14, fontFamily: fonts.bodySemi },
  subtitle: { fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
  doneBadge: { fontSize: 16, fontFamily: fonts.bodySemi },
  chevron: { fontSize: 12 },
  steps: { borderTopWidth: 1 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  stepIndex: { width: 20, fontSize: 13, fontFamily: fonts.mono, textAlign: 'center' },
  stepTexts: { flex: 1 },
  stepName: { fontSize: 13, fontFamily: fonts.bodySemi },
  stepDesc: { fontSize: 11, fontFamily: fonts.body, marginTop: 2 },
  stepCountdown: { fontSize: 14, fontFamily: fonts.mono, marginTop: 4 },
  stepActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    borderRadius: radius.control,
    paddingHorizontal: 12,
    minHeight: 32,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepBtnText: { fontSize: 12, fontFamily: fonts.bodySemi },
  markBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  markBtnText: { fontSize: 16 },
  stepDoneMark: { fontSize: 16, fontFamily: fonts.bodySemi },
  allDone: {
    fontSize: 12,
    fontFamily: fonts.bodySemi,
    textAlign: 'center',
    paddingVertical: 10
  }
});
