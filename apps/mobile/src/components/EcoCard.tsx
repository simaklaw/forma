import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { selectEcoSummary } from '@/engines/ecoStats';
import type { ImportedActivity } from '@forma/core';
import type { UserActivity } from '@/state/useFitPulseStore';

interface Props {
  loggedActivities: UserActivity[];
  importedActivities: ImportedActivity[];
  /** Окно сводки в днях; по умолчанию — неделя, как у статистик выше. */
  windowDays?: number;
}

const DEFAULT_WINDOW_DAYS = 7;

/**
 * Карточка эко-эффекта на ProgressScreen: километры активным транспортом
 * и CO₂, который выбросила бы машина на этой дистанции. Идея карточки —
 * из AOSSIE-Org/CarbonTracker (GPLv3, ideas-only); реализация — своя,
 * см. engines/ecoStats.ts. Рисуется только при ненулевой дистанции.
 */
export default function EcoCard({
  loggedActivities,
  importedActivities,
  windowDays = DEFAULT_WINDOW_DAYS
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  const summary = useMemo(
    () => selectEcoSummary(loggedActivities, importedActivities, windowDays),
    [loggedActivities, importedActivities, windowDays]
  );

  if (summary.distanceKm <= 0) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
      accessibilityRole="summary"
    >
      <Text style={[styles.kicker, { color: colors.paperFaint }]}>{t('ecoKicker')}</Text>
      <Text style={[styles.value, { color: colors.lime }]}>
        {t('ecoCo2Saved', { kg: summary.co2SavedKg.toFixed(1) })}
      </Text>
      <Text style={[styles.distance, { color: colors.paperDim }]}>
        {t('ecoDistanceKm', { km: summary.distanceKm.toFixed(1), days: windowDays })}
      </Text>
      <Text style={[styles.hint, { color: colors.paperFaint }]}>{t('ecoHint')}</Text>
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
    value: { fontFamily: fonts.mono, fontSize: 30 },
    distance: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 6 },
    hint: { fontFamily: fonts.body, fontSize: 11, marginTop: 8, lineHeight: 15 }
  });
}
