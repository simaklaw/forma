import React, { forwardRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import GorhomBottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AppBottomSheet from '@/components/BottomSheet';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { ExerciseDef } from './ExerciseSheet';
import { thumbnailForExercise } from './exerciseMedia';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { formatLoadLabel } from './catalog';

interface Props {
  dayName: string;
  dayMeta: string;
  exercises: ExerciseDef[];
  onStart: () => void;
  onClose: () => void;
}

const WorkoutPreviewSheet = forwardRef<GorhomBottomSheet, Props>(
  ({ dayName, dayMeta, exercises, onStart, onClose }, ref) => {
    const colors = useThemeColors();
    const styles = createStyles(colors);
    const profileSex = useFitPulseStore((s) => s.profile.sex);

    const totalSets = exercises.reduce((n, ex) => n + ex.totalSets, 0);
    const estMinutes = Math.round(
      exercises.reduce((sec, ex) => sec + ex.totalSets * (ex.restSeconds + 45), 0) / 60
    );

    return (
      <AppBottomSheet
        ref={ref}
        eyebrow="Сегодня"
        title={dayName}
        snapPoints={['75%']}
        onClose={onClose}
      >
        <Text style={[styles.meta, { color: colors.paperDim }]}>
          {exercises.length} упражнения · {totalSets} подходов · ~{estMinutes} мин · {dayMeta}
        </Text>

        <BottomSheetScrollView contentContainerStyle={styles.list}>
          {exercises.map((ex, i) => {
            const thumb = ex.mediaKey ? thumbnailForExercise(ex.mediaKey, profileSex) : undefined;
            return (
              <View key={ex.id} style={[styles.row, { borderColor: colors.line }]}>
                <Text style={[styles.rowIndex, { color: colors.paperFaint }]}>{i + 1}</Text>
                {thumb ? (
                  <Image source={thumb} style={styles.rowThumb} />
                ) : (
                  <View style={[styles.rowThumb, { backgroundColor: colors.panelRaised }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, { color: colors.paper }]} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.paperFaint }]}>
                    {ex.totalSets} × {formatLoadLabel(ex)}
                  </Text>
                </View>
              </View>
            );
          })}
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: colors.lime },
              pressed && { backgroundColor: colors.accentPressed }
            ]}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Начать тренировку"
          >
            <Text style={[styles.startBtnText, { color: colors.onAccent }]}>▶ Начать тренировку</Text>
          </Pressable>
        </View>
      </AppBottomSheet>
    );
  }
);

WorkoutPreviewSheet.displayName = 'WorkoutPreviewSheet';
export default WorkoutPreviewSheet;

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    meta: {
      fontFamily: fonts.body,
      fontSize: 13,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1
    },
    rowIndex: { width: 20, fontFamily: fonts.mono, fontSize: 13 },
    rowThumb: { width: 40, height: 40, borderRadius: radius.control },
    rowName: { fontFamily: fonts.bodySemi, fontSize: 14 },
    rowSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
    footer: { padding: spacing.lg },
    startBtn: {
      height: 52,
      borderRadius: radius.control,
      alignItems: 'center',
      justifyContent: 'center'
    },
    startBtnText: { fontFamily: fonts.bodySemi, fontSize: 16 }
  });
}
