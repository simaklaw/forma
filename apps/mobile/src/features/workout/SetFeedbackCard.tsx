import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRealtimeSetFeedback } from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';

type Props = {
  exerciseId: string;
  exerciseName: string;
  completedSets: number;
  totalSets: number;
  formCues?: string[];
};

export function SetFeedbackCard({
  exerciseId,
  exerciseName,
  completedSets,
  totalSets,
  formCues
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const setFeedback = getRealtimeSetFeedback({
    exerciseId,
    exerciseName,
    currentSetIndex: Math.min(completedSets, Math.max(0, totalSets - 1)),
    totalSets,
    formCues: formCues?.length ? formCues : undefined
  });
  return (
    <View style={styles.feedbackCard} accessibilityRole="summary">
      <Text style={styles.feedbackKicker}>
        Подход {setFeedback.setNumber}/{setFeedback.totalSets}
      </Text>
      <Text style={styles.feedbackNote}>{setFeedback.adjustmentNote}</Text>
      <Text style={styles.feedbackFocus}>{setFeedback.formFocus}</Text>
      <Text style={styles.feedbackSafety}>{setFeedback.safetyCheck}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    feedbackCard: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      padding: 12,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel
    },
    feedbackKicker: {
      color: colors.lime,
      fontFamily: fonts.mono,
      fontSize: 11,
      marginBottom: 4
    },
    feedbackNote: {
      color: colors.paper,
      fontFamily: fonts.bodySemi,
      fontSize: 14,
      marginBottom: 4
    },
    feedbackFocus: {
      color: colors.paperDim,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18
    },
    feedbackSafety: {
      color: colors.paperFaint,
      fontFamily: fonts.body,
      fontSize: 12,
      marginTop: 4,
      lineHeight: 16
    }
  });
}
