import React, { forwardRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import AppBottomSheet from '@/components/BottomSheet';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { FeelRating, PerceivedDifficulty } from '@/state/useSessionFeedbackStore';

interface Props {
  onSubmit: (feedback: {
    feel: FeelRating;
    difficulty: PerceivedDifficulty;
    hadPain: boolean;
    wouldRepeat: boolean;
  }) => void;
  onSkip: () => void;
}

const FEEL_OPTIONS: { value: FeelRating; emoji: string }[] = [
  { value: 1, emoji: '😩' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '🔥' }
];

const DIFFICULTY_OPTIONS: { value: PerceivedDifficulty; label: string }[] = [
  { value: 'too_easy', label: 'Легко' },
  { value: 'just_right', label: 'В самый раз' },
  { value: 'too_hard', label: 'Тяжело' }
];

const CompletionFeedbackSheet = forwardRef<GorhomBottomSheet, Props>(
  ({ onSubmit, onSkip }, ref) => {
    const colors = useThemeColors();
    const styles = createStyles(colors);

    const [feel, setFeel] = useState<FeelRating | null>(null);
    const [difficulty, setDifficulty] = useState<PerceivedDifficulty | null>(null);
    const [hadPain, setHadPain] = useState<boolean | null>(null);
    const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);

    const canSubmit = feel != null && difficulty != null && hadPain != null && wouldRepeat != null;

    return (
      <AppBottomSheet
        ref={ref}
        title="Тренировка завершена 🎉"
        snapPoints={['70%']}
        onClose={onSkip}
      >
        <View style={styles.body}>
          <Text style={[styles.question, { color: colors.paperDim }]}>Как самочувствие?</Text>
          <View style={styles.row}>
            {FEEL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.feelBtn,
                  { borderColor: colors.lineStrong },
                  feel === opt.value && {
                    borderColor: colors.lime,
                    backgroundColor: colors.limeDim
                  }
                ]}
                onPress={() => setFeel(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={`Оценка ${opt.value} из 5`}
              >
                <Text style={styles.feelEmoji}>{opt.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.question, { color: colors.paperDim }]}>Сложность тренировки?</Text>
          <View style={styles.row}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  { borderColor: colors.lineStrong },
                  difficulty === opt.value && {
                    borderColor: colors.lime,
                    backgroundColor: colors.limeDim
                  }
                ]}
                onPress={() => setDifficulty(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.paperDim },
                    difficulty === opt.value && { color: colors.lime }
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.question, { color: colors.paperDim }]}>
            Была боль или дискомфорт?
          </Text>
          <View style={styles.row}>
            {(
              [
                { v: true, l: 'Да' },
                { v: false, l: 'Нет' }
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={String(opt.v)}
                style={[
                  styles.chip,
                  { borderColor: colors.lineStrong },
                  hadPain === opt.v && {
                    borderColor: colors.ember,
                    backgroundColor: 'rgba(255,107,107,0.1)'
                  }
                ]}
                onPress={() => setHadPain(opt.v)}
                accessibilityRole="button"
                accessibilityLabel={opt.l}
              >
                <Text style={[styles.chipText, { color: colors.paperDim }]}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.question, { color: colors.paperDim }]}>
            Повторили бы этот день снова?
          </Text>
          <View style={styles.row}>
            {(
              [
                { v: true, l: 'Да' },
                { v: false, l: 'Нет' }
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={String(opt.v)}
                style={[
                  styles.chip,
                  { borderColor: colors.lineStrong },
                  wouldRepeat === opt.v && {
                    borderColor: colors.lime,
                    backgroundColor: colors.limeDim
                  }
                ]}
                onPress={() => setWouldRepeat(opt.v)}
                accessibilityRole="button"
                accessibilityLabel={opt.l}
              >
                <Text style={[styles.chipText, { color: colors.paperDim }]}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? colors.lime : colors.panelRaised }
            ]}
            disabled={!canSubmit}
            onPress={() =>
              canSubmit &&
              onSubmit({
                feel: feel!,
                difficulty: difficulty!,
                hadPain: hadPain!,
                wouldRepeat: wouldRepeat!
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Отправить"
          >
            <Text
              style={[styles.submitBtnText, { color: canSubmit ? colors.ink : colors.paperFaint }]}
            >
              Готово
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Пропустить"
          >
            <Text style={[styles.skipText, { color: colors.paperFaint }]}>Пропустить</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    );
  }
);

CompletionFeedbackSheet.displayName = 'CompletionFeedbackSheet';
export default CompletionFeedbackSheet;

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
    question: { fontFamily: fonts.bodySemi, fontSize: 13, marginTop: spacing.md, marginBottom: 8 },
    row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    feelBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.control,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    feelEmoji: { fontSize: 22 },
    chip: {
      paddingHorizontal: 14,
      height: 40,
      borderRadius: radius.control,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    chipText: { fontFamily: fonts.bodySemi, fontSize: 13 },
    submitBtn: {
      height: 52,
      borderRadius: radius.control,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl
    },
    submitBtnText: { fontFamily: fonts.bodySemi, fontSize: 16 },
    skipText: { textAlign: 'center', fontFamily: fonts.body, fontSize: 13, marginTop: spacing.md }
  });
}
