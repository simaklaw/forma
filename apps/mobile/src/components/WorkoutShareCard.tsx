import React, { useMemo, useRef } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import {
  buildLastWorkoutSummary,
  formatWorkoutShareText,
  workoutLines,
  type ShareSetLog,
  type ShareTextTemplates
} from '@/engines/shareSummary';
import { allExerciseNames } from '@/features/workout/catalog';
import { allImportedExerciseNames } from '@/features/workout/importedExerciseBridge';

interface Props {
  setLogs: ShareSetLog[];
}

/** В постере показываем несколько строк, остальное обозначаем счётчиком. */
const MAX_POSTER_EXERCISES = 3;

/** Фирменная палитра постера не зависит от текущей темы приложения. */
const POSTER = {
  ink: '#0B0F14',
  panel: '#121820',
  border: '#26313A',
  text: '#F8FAFC',
  muted: '#9AA6B2',
  lime: '#00E5A8'
} as const;

/**
 * Сводка тренировки на ProgressScreen.
 * Отправляет брендированный PNG через view-shot + expo-sharing; при любой
 * ошибке сохраняет прежний текстовый сценарий Share.share.
 */
export default function WorkoutShareCard({ setLogs }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const posterRef = useRef<View>(null);

  const names = useMemo(() => {
    const out: Record<number, string> = { ...allExerciseNames() };
    for (const ex of allImportedExerciseNames()) {
      out[ex.id] = ex.nameRu ?? ex.nameEn;
    }
    return out;
  }, []);

  const summary = useMemo(() => buildLastWorkoutSummary(setLogs, names), [setLogs, names]);

  if (!summary) return null;

  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const dateLabel = new Date(`${summary.dateKey}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const tpl: ShareTextTemplates = {
    title: t('shareWorkoutTitle', { date: dateLabel }),
    line: t('shareWorkoutLine'),
    lineBody: t('shareWorkoutLineBody'),
    total: t('shareWorkoutTotal'),
    totalSets: t('shareWorkoutTotalSets')
  };
  const shareText = formatWorkoutShareText(summary, tpl);
  const posterLines = workoutLines(summary, tpl).slice(0, MAX_POSTER_EXERCISES);
  const hiddenExerciseCount = Math.max(0, summary.exercises.length - posterLines.length);
  const volumeLabel =
    summary.totalVolumeKg > 0 ? summary.totalVolumeKg.toLocaleString(locale) : '—';

  const handleShare = async () => {
    try {
      const uri = await captureRef(posterRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('shareCardTitle', { date: dateLabel })
      });
    } catch {
      try {
        await Share.share({ message: shareText });
      } catch {
        // системный шеринг недоступен (например, веб) — тихо выходим
      }
    }
  };

  const preview = summary.exercises
    .slice(0, MAX_POSTER_EXERCISES)
    .map((e) => e.name)
    .join(' · ');

  return (
    <View
      style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
      accessibilityRole="summary"
    >
      <Text style={[styles.kicker, { color: colors.paperFaint }]}>{t('shareCardKicker')}</Text>
      <Text style={[styles.title, { color: colors.lime }]}>
        {t('shareCardTitle', { date: dateLabel })}
      </Text>
      {preview.length > 0 ? (
        <Text style={[styles.preview, { color: colors.paperDim }]} numberOfLines={1}>
          {preview}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[styles.button, { borderColor: colors.lime }]}
        accessibilityRole="button"
        accessibilityLabel={t('shareCardA11y')}
        onPress={() => {
          void handleShare();
        }}
      >
        <Text style={[styles.buttonLabel, { color: colors.lime }]}>{t('shareCardButton')}</Text>
      </TouchableOpacity>

      {/*
        Отдельная нативная View для captureRef. collapsable={false} не даёт
        Android схлопнуть её; содержимое карточки не зависит от темы экрана.
        Для скринридеров вью скрыта — декорация, не контент.
      */}
      <View
        ref={posterRef}
        collapsable={false}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.poster}
      >
        <View pointerEvents="none" style={styles.posterOrnament} />
        <View style={styles.posterHeader}>
          <View style={styles.posterMark}>
            <Text style={styles.posterMarkLetter}>F</Text>
          </View>
          <View style={styles.posterBrand}>
            <Text style={styles.posterWordmark}>FITPULSE</Text>
            <Text style={styles.posterEyebrow}>{t('sharePosterEyebrow')}</Text>
          </View>
          <Text style={styles.posterEdition}>FIT / 01</Text>
        </View>

        <View style={styles.posterIntro}>
          <View style={styles.posterAccent} />
          <Text style={styles.posterTitle}>{t('sharePosterTitle')}</Text>
          <Text style={styles.posterDate}>{dateLabel}</Text>
        </View>

        <View style={styles.posterStats}>
          <View style={styles.posterStat}>
            <Text style={styles.posterStatValue}>{summary.totalSets}</Text>
            <Text style={styles.posterStatLabel}>{t('sharePosterSetsLabel')}</Text>
          </View>
          <View style={styles.posterStat}>
            <Text style={styles.posterStatValue}>{volumeLabel}</Text>
            <Text style={styles.posterStatLabel}>{t('sharePosterVolumeLabel')}</Text>
          </View>
        </View>

        <View style={styles.posterSectionHeader}>
          <Text style={styles.posterSectionTitle}>{t('sharePosterExercisesLabel')}</Text>
          <Text style={styles.posterExerciseCount}>
            {String(summary.exercises.length).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.posterExerciseList}>
          {posterLines.map((line, index) => (
            <View
              key={`${summary.exercises[index]?.exerciseId ?? index}-${index}`}
              style={styles.posterExerciseRow}
            >
              <Text style={styles.posterExerciseIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.posterExerciseText} numberOfLines={2}>
                {line.replace(/^•\s*/, '')}
              </Text>
            </View>
          ))}
          {hiddenExerciseCount > 0 ? (
            <Text style={styles.posterMore}>
              {t('sharePosterMore', { count: hiddenExerciseCount })}
            </Text>
          ) : null}
        </View>

        <View style={styles.posterFooter}>
          <View style={styles.posterFooterLine} />
          <Text style={styles.posterFooterText}>{t('sharePosterFooter')}</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: radius.card,
      padding: spacing.md,
      marginBottom: spacing.md
    },
    kicker: {
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 0.6,
      marginBottom: 6
    },
    title: { fontFamily: fonts.mono, fontSize: 16, lineHeight: 22 },
    preview: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 6 },
    button: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: radius.control,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 12
    },
    buttonLabel: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.4 },
    poster: {
      position: 'absolute',
      top: -4096,
      left: 0,
      width: 360,
      minHeight: 500,
      padding: 24,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: POSTER.border,
      backgroundColor: POSTER.ink,
      overflow: 'hidden'
    },
    posterOrnament: {
      position: 'absolute',
      top: -78,
      right: -68,
      width: 210,
      height: 210,
      borderRadius: 105,
      borderWidth: 28,
      borderColor: POSTER.lime,
      opacity: 0.1
    },
    posterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
    },
    posterMark: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: POSTER.lime,
      alignItems: 'center',
      justifyContent: 'center'
    },
    posterMarkLetter: {
      color: POSTER.ink,
      fontFamily: fonts.mono,
      fontSize: 25,
      lineHeight: 28
    },
    posterBrand: { flex: 1, gap: 2 },
    posterWordmark: {
      color: POSTER.text,
      fontFamily: fonts.mono,
      fontSize: 18,
      letterSpacing: 1.7
    },
    posterEyebrow: {
      color: POSTER.muted,
      fontFamily: fonts.monoSemi,
      fontSize: 8,
      letterSpacing: 1.2
    },
    posterEdition: {
      color: POSTER.muted,
      fontFamily: fonts.mono,
      fontSize: 9,
      letterSpacing: 0.8
    },
    posterIntro: { marginTop: 27, marginBottom: 22 },
    posterAccent: {
      width: 34,
      height: 4,
      borderRadius: 2,
      backgroundColor: POSTER.lime,
      marginBottom: 12
    },
    posterTitle: {
      color: POSTER.text,
      fontFamily: fonts.mono,
      fontSize: 27,
      lineHeight: 31,
      letterSpacing: 0.25
    },
    posterDate: {
      color: POSTER.muted,
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      marginTop: 7
    },
    posterStats: { flexDirection: 'row', gap: 10 },
    posterStat: {
      flex: 1,
      minHeight: 72,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 15,
      backgroundColor: POSTER.panel,
      borderWidth: 1,
      borderColor: POSTER.border,
      justifyContent: 'center'
    },
    posterStatValue: {
      color: POSTER.lime,
      fontFamily: fonts.mono,
      fontSize: 25,
      lineHeight: 29
    },
    posterStatLabel: {
      color: POSTER.muted,
      fontFamily: fonts.monoSemi,
      fontSize: 9,
      letterSpacing: 0.8,
      marginTop: 4
    },
    posterSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 22,
      marginBottom: 4
    },
    posterSectionTitle: {
      color: POSTER.text,
      fontFamily: fonts.mono,
      fontSize: 13,
      letterSpacing: 1.2
    },
    posterExerciseCount: {
      color: POSTER.lime,
      fontFamily: fonts.mono,
      fontSize: 13
    },
    posterExerciseList: { gap: 0 },
    posterExerciseRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: POSTER.border
    },
    posterExerciseIndex: {
      width: 22,
      color: POSTER.lime,
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 18
    },
    posterExerciseText: {
      flex: 1,
      color: POSTER.text,
      fontFamily: fonts.body,
      fontSize: 11.5,
      lineHeight: 17
    },
    posterMore: {
      color: POSTER.lime,
      fontFamily: fonts.monoSemi,
      fontSize: 11,
      marginTop: 9
    },
    posterFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginTop: 22
    },
    posterFooterLine: {
      width: 22,
      height: 2,
      borderRadius: 1,
      backgroundColor: POSTER.lime
    },
    posterFooterText: {
      flex: 1,
      color: POSTER.muted,
      fontFamily: fonts.monoSemi,
      fontSize: 8,
      letterSpacing: 0.8
    }
  });
}
