import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { isProfileComplete } from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { muscleLabel, useT } from '@/i18n/strings';
import type { Sex } from '@/engines/MetabolicEngine';
import { MUSCLE_LABELS, type MuscleKey } from '@/domain/muscleKeys';

export type ProfileFormValues = {
  weight: number | null;
  height: number | null;
  age: number | null;
  sex: Sex | null;
  focusAreas: MuscleKey[];
};

type Props = {
  initial: ProfileFormValues;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => void;
};

export function ProfileForm({ initial, submitLabel, onSubmit }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const [weight, setWeight] = useState(initial.weight != null ? String(initial.weight) : '');
  const [height, setHeight] = useState(initial.height != null ? String(initial.height) : '');
  const [age, setAge] = useState(initial.age != null ? String(initial.age) : '');
  const [sex, setSex] = useState<Sex | null>(initial.sex);
  const [focusAreas, setFocusAreas] = useState<MuscleKey[]>(initial.focusAreas ?? []);

  const draft = useMemo(() => {
    const w = Number(weight.replace(',', '.'));
    const h = Number(height.replace(',', '.'));
    const a = Number.parseInt(age, 10);
    return {
      weight: Number.isFinite(w) && w > 0 ? w : null,
      height: Number.isFinite(h) && h > 0 ? h : null,
      // Must match MetabolicEngine validateProfile (13–120) and isProfileComplete.
      age: Number.isInteger(a) && a >= 13 && a <= 120 ? a : null,
      sex,
      focusAreas
    };
  }, [weight, height, age, sex, focusAreas]);

  function toggleFocusArea(key: MuscleKey) {
    setFocusAreas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const ready = isProfileComplete({
    weightKg: draft.weight,
    heightCm: draft.height,
    age: draft.age,
    gender: draft.sex
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.sexRow} accessibilityRole="radiogroup" accessibilityLabel={t('labelSex')}>
        {(['male', 'female'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.sexBtn, sex === g && styles.sexBtnOn]}
            onPress={() => setSex(g)}
            accessibilityRole="radio"
            accessibilityState={{ selected: sex === g }}
            accessibilityLabel={g === 'male' ? t('male') : t('female')}
          >
            <Text style={[styles.sexText, sex === g && styles.sexTextOn]}>
              {g === 'male' ? t('male') : t('female')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field
        label={t('labelWeight')}
        value={weight}
        onChange={setWeight}
        placeholder={t('formPlaceholderWeight')}
        a11yLabel={t('labelWeight')}
      />
      <Field
        label={t('labelHeight')}
        value={height}
        onChange={setHeight}
        placeholder={t('formPlaceholderHeight')}
        a11yLabel={t('labelHeight')}
      />
      <Field
        label={t('formAgeLabel')}
        value={age}
        onChange={setAge}
        placeholder={t('formPlaceholderAge')}
        a11yLabel={t('formAgeA11y')}
      />
      <View style={styles.field}>
        <Text style={styles.label}>{t('formFocusZone')}</Text>
        <Text style={styles.focusHint}>{t('formFocusHint')}</Text>
        <View style={styles.focusGrid}>
          {(Object.keys(MUSCLE_LABELS) as MuscleKey[]).map((key) => {
            const on = focusAreas.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.focusChip, on && styles.focusChipOn]}
                onPress={() => toggleFocusArea(key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={muscleLabel(key, lang)}
              >
                <Text style={[styles.focusChipText, on && styles.focusChipTextOn]}>
                  {muscleLabel(key, lang)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.cta, !ready && styles.ctaDisabled]}
        disabled={!ready}
        onPress={() => ready && onSubmit(draft)}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        accessibilityState={{ disabled: !ready }}
      >
        <Text style={styles.ctaText}>{submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  a11yLabel
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  a11yLabel: string;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.paperFaint}
        keyboardType="numeric"
        accessibilityLabel={a11yLabel}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: { gap: spacing.md },
    sexRow: { flexDirection: 'row', gap: spacing.sm },
    sexBtn: {
      flex: 1,
      height: 44,
      borderRadius: radius.control,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center'
    },
    sexBtnOn: { backgroundColor: colors.primaryContainer },
    sexText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 14 },
    sexTextOn: { color: colors.onPrimaryContainer },
    field: { gap: 6 },
    label: {
      color: colors.paperFaint,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.6
    },
    input: {
      height: 48,
      borderRadius: radius.control,
      backgroundColor: colors.surfaceContainerHigh,
      color: colors.paper,
      paddingHorizontal: 12,
      fontFamily: fonts.mono,
      fontSize: 20
    },
    cta: {
      marginTop: spacing.sm,
      height: 52,
      borderRadius: radius.control,
      backgroundColor: colors.lime,
      alignItems: 'center',
      justifyContent: 'center'
    },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { color: colors.onAccent, fontFamily: fonts.mono, fontSize: 18 },
    focusHint: { color: colors.paperFaint, fontSize: 12, fontFamily: fonts.body, marginTop: -2 },
    focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    focusChip: {
      paddingHorizontal: 12,
      height: 34,
      borderRadius: radius.control,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center'
    },
    focusChipOn: { backgroundColor: colors.primaryContainer },
    focusChipText: { color: colors.paperDim, fontFamily: fonts.body, fontSize: 12 },
    focusChipTextOn: { color: colors.onPrimaryContainer, fontFamily: fonts.bodySemi }
  });
}
