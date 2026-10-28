import React, { useMemo } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import {
  buildLastWorkoutSummary,
  formatWorkoutShareText,
  type ShareSetLog
} from '@/engines/shareSummary';
import { allExerciseNames } from '@/features/workout/catalog';
import { allImportedExerciseNames } from '@/features/workout/importedExerciseBridge';

interface Props {
  setLogs: ShareSetLog[];
}

/** Сколько упражнений показывать в превью карточки. */
const PREVIEW_EXERCISES = 3;

/**
 * Карточка «поделиться итогом тренировки» на ProgressScreen: показывает
 * сводку последней тренировки и открывает системный шер-шит (текст).
 * Идея — из NeXTormer/NeverSkip (AGPLv3, ideas-only), реализация своя,
 * см. engines/shareSummary.ts. Рисуется только при непустом сет-логу.
 */
export default function WorkoutShareCard({ setLogs }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);

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
  const dateLabel = new Date(`${summary.dateKey}T00:00:00`).toLocaleDateString(locale);
  const shareText = formatWorkoutShareText(summary, {
    title: t('shareWorkoutTitle', { date: dateLabel }),
    line: t('shareWorkoutLine'),
    lineBody: t('shareWorkoutLineBody'),
    total: t('shareWorkoutTotal'),
    totalSets: t('shareWorkoutTotalSets')
  });

  const preview = summary.exercises
    .slice(0, PREVIEW_EXERCISES)
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
          void Share.share({ message: shareText });
        }}
      >
        <Text style={[styles.buttonLabel, { color: colors.lime }]}>
          {t('shareCardButton')}
        </Text>
      </TouchableOpacity>
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
    buttonLabel: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.4 }
  });
}
